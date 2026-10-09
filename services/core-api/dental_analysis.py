"""Visible dental candidates only; local CV + a hash-checked trained ONNX."""
import hashlib,json
from pathlib import Path
import cv2,numpy as np
from scipy import ndimage
from skimage.segmentation import watershed
from appearance_analysis import decode_photo,row
ROOT=Path(__file__).resolve().parent
_session=None
_manifest=None
_model_runtime={}


class DentalModelError(RuntimeError):
    """Technical model failure; never converts to an empty valid detection."""


def mouth_geometry(points,shape):
    if len(points)<468:raise ValueError('LANDMARKS_MISSING')
    p=np.array([[v['x']*shape[1],v['y']*shape[0]] for v in points],np.float32)
    if not np.isfinite(p).all():raise ValueError('INVALID_LANDMARKS')
    indices=[78,81,82,13,312,311,308,402,317,14,87,178]
    polygon=p[indices].astype(np.int32);mask=np.zeros(shape[:2],np.uint8);cv2.fillPoly(mask,[polygon],255)
    width=float(np.linalg.norm(p[78]-p[308]));opening=float(np.linalg.norm(p[13]-p[14])/max(width,1))
    return mask>0,width,opening,p


def dental_pixels(image,mouth):
    hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV).astype(np.float32)
    gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY)
    # White/ivory within actual inner mouth; never equate open lips with teeth.
    tooth=mouth&(hsv[:,:,1]<100)&(hsv[:,:,2]>100)&(gray>90)
    tooth=cv2.morphologyEx(tooth.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8))>0
    glare=tooth&(hsv[:,:,2]>=250)&(hsv[:,:,1]<20)
    tooth&=~cv2.dilate(glare.astype(np.uint8),np.ones((3,3),np.uint8)).astype(bool)
    gum=mouth&(hsv[:,:,1]>60)&(image[:,:,2]>image[:,:,1]*1.10)&(gray>40)
    tongue=cv2.erode(gum.astype(np.uint8),np.ones((7,7),np.uint8))>0
    return tooth,glare,gum,tongue,gray


def dental_quality(image,points,bite=False):
    mouth,width,opening,p=mouth_geometry(points,image.shape)
    tooth,glare,gum,tongue,gray=dental_pixels(image,mouth)
    count=int(tooth.sum());area=int(mouth.sum());fraction=count/max(area,1)
    # The same native inner-mouth neighbourhood as the live capture gate.
    # Rectangular crop/background edges must not supply artificial sharpness.
    interior=cv2.erode(mouth.astype(np.uint8),np.array([[0,1,0],[1,1,1],[0,1,0]],np.uint8),borderType=cv2.BORDER_CONSTANT,borderValue=0)>0
    lap=cv2.Laplacian(gray,cv2.CV_32F)
    sharp=float(np.mean(lap[interior]**2)) if interior.any() else 0
    light=float(gray[mouth].mean()) if area else 0
    reasons=[]
    if width<65:reasons.append('INSUFFICIENT_TOOTH_DETAIL')
    if not bite and opening<.12:reasons.append('MOUTH_CLOSED')
    if bite and opening>.32:reasons.append('NATURAL_BITE_REQUIRED')
    if count<150 or fraction<.15:reasons.append('TEETH_NOT_VISIBLE')
    if light<45 or light>230:reasons.append('LIGHT_INVALID')
    if sharp<12:reasons.append('BLURRY')
    if glare.sum()/max(count+glare.sum(),1)>.12:reasons.append('SALIVA_OR_GLARE')
    if tongue.sum()/max(area,1)>.7:reasons.append('TONGUE_OCCLUSION')
    return dict(valid=not reasons,reasons=reasons,mouthOpeningRatio=opening,mouthWidthPixels=width,
                visibleToothPixels=count,toothFraction=fraction,sharpness=sharp,light=light,clippedPixels=int(glare.sum()))


def projected_contour_overlap(contours,axis):
    """Adjacent visible outline projections, not hidden/3-D tooth overlap."""
    direction=np.asarray(axis,np.float64);direction/=max(float(np.linalg.norm(direction)),1e-9)
    intervals=[]
    for item in contours:
        coordinates=np.asarray(item['points'],np.float64)@direction
        intervals.append((float(coordinates.min()),float(coordinates.max())))
    intervals.sort(key=lambda pair:(pair[0]+pair[1])/2)
    ratios=[]
    for a,b in zip(intervals,intervals[1:]):
        overlap=max(0.,min(a[1],b[1])-max(a[0],b[0]))
        ratios.append(min(1.,overlap/max(min(a[1]-a[0],b[1]-b[0]),1e-9)))
    return float(np.mean(ratios)) if ratios else None


def contours_and_alignment(image,tooth,mouth,p,row_center=None,source_mouth_width=None):
    """Marker controlled watershed on visible enamel, no invented FDI/teeth."""
    distance=cv2.distanceTransform(tooth.astype(np.uint8),cv2.DIST_L2,5)
    if distance.max()<2:return [],None,'TOOTH_BOUNDARIES_UNRELIABLE'
    maxima=(distance==cv2.dilate(distance,np.ones((9,9),np.uint8)))&(distance>max(2,distance.max()*.28))
    markers,count=ndimage.label(maxima)
    gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    gradient=np.hypot(cv2.Sobel(gray,cv2.CV_32F,1,0),cv2.Sobel(gray,cv2.CV_32F,0,1))
    labels=watershed(gradient,markers,mask=tooth,compactness=.002)
    contours=[];rows={'upper':[],'lower':[]}
    center=row_center if row_center is not None else (p[13,1]+p[14,1])/2;mouth_width=source_mouth_width if source_mouth_width is not None else float(np.linalg.norm(p[78]-p[308]))
    for label in range(1,count+1):
        cc,_=cv2.findContours((labels==label).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        if not cc:continue
        contour=max(cc,key=cv2.contourArea);area=cv2.contourArea(contour);x,y,w,h=cv2.boundingRect(contour)
        if area<max(20,mouth_width**2*.0015) or len(contour)<5 or not .2<w/max(h,1)<3:continue
        hull_area=cv2.contourArea(cv2.convexHull(contour))
        if area/max(hull_area,1)<.7:continue
        ellipse=cv2.fitEllipse(contour);angle=float(ellipse[2]);cx,cy=ellipse[0]
        # The ellipse axis has 180-degree symmetry; normalize its orientation.
        angle=((angle+90)%180)-90
        which='upper' if cy<center else 'lower'
        item=dict(points=contour[:,0,:].tolist(),angleDegrees=angle,centroid=[cx,cy],areaPixels=float(area),row=which)
        contours.append(item);rows[which].append(item)
    metrics={}
    for which,items in rows.items():
        if len(items)<3:metrics[which]=dict(value=None,unit='degrees',quality='insufficient',limitationCode='FEWER_THAN_THREE_RELIABLE_CONTOURS');continue
        items.sort(key=lambda a:a['centroid'][0]);xs=np.array([i['centroid'][0] for i in items]);ys=np.array([i['centroid'][1] for i in items]);slope,intercept=np.polyfit(xs,ys,1)
        angles=np.array([i['angleDegrees'] for i in items]);axis=float(np.degrees(np.angle(np.mean(np.exp(2j*np.radians(angles)))))/2)
        orientation=float(np.median(np.abs((angles-axis+90)%180-90)))
        residual=float(np.sqrt(np.mean((ys-(slope*xs+intercept))**2))/max(mouth_width,1))
        projection_overlap=projected_contour_overlap(items,[1.,slope])
        metrics[which]=dict(value=orientation,unit='degrees',quality='valid',limitationCode=None,contourCount=len(items),rowPositionResidual=residual,
            projectedContourOverlapRatio=projection_overlap,projectedOverlapMeaning='mean adjacent visible outline interval overlap / smaller interval width in fitted row direction; not physical or 3-D overlap',
            viewTiltDegrees=float(np.degrees(np.arctan(slope))),meaning='visible contour orientation dispersion, not malocclusion')
    return contours,metrics,None if any(v['value'] is not None for v in metrics.values()) else 'TOOTH_BOUNDARIES_UNRELIABLE'


def calculus_candidates(image,tooth,gum):
    hsv=cv2.cvtColor(image,cv2.COLOR_BGR2HSV).astype(np.float32)
    gray=cv2.cvtColor(image,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    border=tooth&cv2.dilate(gum.astype(np.uint8),np.ones((11,11),np.uint8)).astype(bool)
    # Color is necessary, never sufficient: require irregular local texture and
    # tooth/gum border structure. Uniform yellow enamel/stain alone is negative.
    yellow=(hsv[:,:,0]>10)&(hsv[:,:,0]<40)&(hsv[:,:,1]>55)&(hsv[:,:,1]<170)
    texture=np.sqrt(np.maximum(0,cv2.GaussianBlur(gray*gray,(0,0),1.5)-cv2.GaussianBlur(gray,(0,0),1.5)**2))
    gradient=np.hypot(cv2.Sobel(gray,cv2.CV_32F,1,0),cv2.Sobel(gray,cv2.CV_32F,0,1))
    mask=border&yellow&(texture>.025)&(gradient>.12)&(gray>.15)&(gray<.9)
    n,labels,stats,_=cv2.connectedComponentsWithStats(mask.astype(np.uint8));candidates=[]
    for i in range(1,n):
        x,y,w,h,area=stats[i]
        if area<6 or area>tooth.sum()*.15:continue
        cc,_=cv2.findContours((labels==i).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        candidates.append(dict(bounds=dict(x=int(x),y=int(y),width=int(w),height=int(h)),points=max(cc,key=cv2.contourArea)[:,0,:].tolist(),areaPixels=int(area)))
    return candidates,int(border.sum())


def prepare_model_input(image,mouth,size):
    # Only the actual visible mouth is resized. Preview/CSS zoom is irrelevant.
    ys,xs=np.where(mouth)
    if not len(xs):raise ValueError('VISIBLE_MOUTH_MISSING')
    h,w=image.shape[:2];pad=max(4,int((xs.max()-xs.min()+1)*.15))
    x0,y0=max(0,int(xs.min())-pad),max(0,int(ys.min())-pad)
    x1,y1=min(w,int(xs.max())+pad+1),min(h,int(ys.max())+pad+1)
    source=image[y0:y1,x0:x1];ratio=min(size/source.shape[0],size/source.shape[1])
    canvas=np.full((size,size,3),114,np.uint8)
    resized=cv2.resize(source,(max(1,int(source.shape[1]*ratio)),max(1,int(source.shape[0]*ratio))))
    canvas[:resized.shape[0],:resized.shape[1]]=resized
    return canvas.transpose(2,0,1)[None].astype(np.float32),ratio,(x0,y0)


def model_candidates(image,mouth):
    global _session,_manifest,_model_runtime
    path=ROOT/'models/dental-yolox-s.onnx';manifest_path=ROOT/'models/dental-yolox-s.json'
    if not path.exists() or not manifest_path.exists():return [],dict(methodVersion='official-yolox-s-local-v1',quality='insufficient',limitationCode='TRAINED_MODEL_NOT_INSTALLED')
    if _session is None:
        import onnxruntime as ort
        manifest=json.loads(manifest_path.read_text('utf8'))
        with path.open('rb') as model_file:digest=hashlib.file_digest(model_file,'sha256').hexdigest()
        if digest!=manifest['modelHash']:raise DentalModelError('MODEL_HASH_MISMATCH')
        options=ort.SessionOptions();options.intra_op_num_threads=2
        try:_session=ort.InferenceSession(str(path),sess_options=options,providers=['CPUExecutionProvider'])
        except Exception as error:raise DentalModelError('MODEL_LOAD_FAILED') from error
        _manifest=manifest
        _model_runtime=dict(onnxruntime=ort.__version__,opencv=cv2.__version__,numpy=np.__version__)
    size=_manifest['inputSize'];h,w=image.shape[:2]
    tensor,ratio,(origin_x,origin_y)=prepare_model_input(image,mouth,size)
    try:raw=_session.run(None,{'images':tensor})[0]
    except Exception as error:raise DentalModelError('MODEL_INFERENCE_FAILED') from error
    if not isinstance(raw,np.ndarray) or raw.ndim!=3 or raw.shape[0]!=1 or raw.shape[2]!=5+len(_manifest['classes']) or not np.isfinite(raw).all():
        raise DentalModelError('INVALID_MODEL_OUTPUT')
    outputs=raw[0]
    probabilities=outputs[:,4:5]*outputs[:,5:];classes=np.argmax(probabilities,axis=1);scores=np.max(probabilities,axis=1)
    chosen=np.flatnonzero(scores>=_manifest['confidenceThreshold']);boxes=[];class_values=[];confidences=[]
    for i in chosen:
        cx,cy,bw,bh=outputs[i,:4]/ratio;cx+=origin_x;cy+=origin_y;x0,y0=max(0,cx-bw/2),max(0,cy-bh/2);x1,y1=min(w,cx+bw/2),min(h,cy+bh/2)
        if x1<=x0 or y1<=y0:continue
        # Do not display detections outside the currently visible inner mouth.
        if not mouth[min(h-1,max(0,int(cy))),min(w-1,max(0,int(cx)))]:continue
        visible=mouth[int(y0):int(np.ceil(y1)),int(x0):int(np.ceil(x1))]
        if visible.size==0 or float(visible.mean())<.65:continue
        boxes.append([float(x0),float(y0),float(x1-x0),float(y1-y0)]);class_values.append(int(classes[i]));confidences.append(float(scores[i]))
    keep=[]
    for category in set(class_values):
        indices=[i for i,c in enumerate(class_values) if c==category]
        selected=cv2.dnn.NMSBoxes([boxes[i] for i in indices],[confidences[i] for i in indices],_manifest['confidenceThreshold'],.45)
        keep.extend(indices[int(i)] for i in np.asarray(selected).ravel())
    candidates=[dict(bounds=dict(zip(('x','y','width','height'),boxes[i])),classCode=_manifest['classes'][class_values[i]],confidence=confidences[i]) for i in keep]
    return candidates,dict(quality='valid',methodVersion='official-yolox-s-local-v1',modelHash=_manifest['modelHash'],modelVersion=_manifest['modelVersion'],datasetLicense='CC-BY-4.0',evaluation=_manifest['evaluation'],runtimeVersions=_model_runtime,limitationCode='VISIBLE_SURFACE_ONLY_NOT_DIAGNOSIS',inputRegion='actual-inner-mouth-with-15-percent-source-margin')


def analyze_dental(payload):
    if len(payload.get('captures',[])) not in (1,2,3,4):raise ValueError('CAPTURE_LIMIT')
    captures=payload['captures']
    # Repeated frames or repeated view names are not independent views.
    if len({c.get('photoId') for c in captures})!=len(captures):raise ValueError('DUPLICATE_CAPTURE')
    if len({c.get('pose') for c in captures})!=len(captures):raise ValueError('DUPLICATE_VIEW')
    views=[]
    for capture in payload['captures']:
        image,source_hash=decode_photo(capture['photo'])
        if source_hash!=capture['photoId']:raise ValueError('SOURCE_HASH_MISMATCH')
        quality=dental_quality(image,capture['landmarks'],capture.get('pose')=='BITE')
        if not quality['valid']:
            unavailable=dict(value=None,quality='insufficient',limitationCode='CAPTURE_QUALITY',
                region='visible-inner-mouth',evaluatedArea=None,captureConditions={**capture.get('conditions',{}),**quality},
                uncertainty=['capture-quality-failed'],referenceId=None,localMap=None,modelVersion=None,modelHash=None)
            views.append(dict(photoId=source_hash,pose=capture['pose'],sourceWidth=image.shape[1],sourceHeight=image.shape[0],quality=quality,
                caries=dict(type='trained_prediction',unit='candidate-count',methodVersion='official-yolox-s-local-v1',candidates=[],**unavailable),
                accumulation=dict(type='appearance_proxy',unit='percent-visible-border-area',methodVersion='dental-border-cv-v1',candidates=[],**unavailable),
                alignment=dict(type='appearance_proxy',unit='degrees-of-visible-axis-dispersion',methodVersion='marker-watershed-v1',rows=None,contours=[],**unavailable)));continue
        mouth,_,_,points=mouth_geometry(capture['landmarks'],image.shape);tooth,_,gum,_,_=dental_pixels(image,mouth)
        deposits,area=calculus_candidates(image,tooth,gum)
        mouth_width=max(float(np.linalg.norm(points[308]-points[78])),1);horizontal=(points[308]-points[78])/mouth_width;vertical=np.array([-horizontal[1],horizontal[0]]);center=(points[13]+points[14])/2
        for candidate in deposits:
            box=candidate['bounds'];position=np.array([box['x']+box['width']/2,box['y']+box['height']/2])-center
            candidate['mouthPosition']=[float(position@horizontal/mouth_width),float(position@vertical/mouth_width)]
            candidate['normalizedArea']=candidate['areaPixels']/mouth_width**2
        caries,model=model_candidates(image,mouth)
        contours,alignment,reason=contours_and_alignment(image,tooth,mouth,points) if capture['pose']=='BITE' else ([],None,'NATURAL_BITE_CAPTURE_REQUIRED')
        meta=dict(region='visible-inner-mouth',captureConditions={**capture.get('conditions',{}),**quality},
                  modelVersion=None,modelHash=None,referenceId=None,localMap=None)
        model_meta={**meta,**model}
        views.append(dict(photoId=source_hash,pose=capture['pose'],sourceWidth=image.shape[1],sourceHeight=image.shape[0],quality=quality,
            caries=dict(type='trained_prediction',value=len(caries) if model['quality']=='valid' else None,unit='candidate-count',candidates=caries,evaluatedArea=int(mouth.sum()),uncertainty=['dataset-domain-shift','visible-surface-only','confidence-is-not-severity'],**model_meta),
            accumulation=dict(type='appearance_proxy',value=None,unit='percent-visible-border-area',candidateArea=sum(c['areaPixels'] for c in deposits),evaluatedArea=area,candidates=deposits,methodVersion='dental-border-cv-v1',quality='insufficient',limitationCode='MULTIVIEW_CONFIRMATION_REQUIRED',uncertainty=['stain-food-filling-confounders','visible-border-only'],**meta),
            alignment=dict(type='appearance_proxy',value={key:item['value'] for key,item in alignment.items()} if reason is None else None,unit='degrees-of-visible-axis-dispersion',rows=alignment,contours=contours,evaluatedArea=int(tooth.sum()),uncertainty=['view-perspective','visible-contour-separation','not-malocclusion'],quality='valid' if reason is None else 'insufficient',limitationCode=reason,methodVersion='marker-watershed-v1',**meta)))
    supported=[v for v in views if (v.get('accumulation',{}).get('evaluatedArea') or 0)>100]
    # Conservative session-level consistency across actually accepted views;
    # don't call one-view yellow candidates calculus or fill all enamel.
    if len(supported)>=2:
        fractions=[v['accumulation']['candidateArea']/v['accumulation']['evaluatedArea'] for v in supported]
        consistent=max(fractions)-min(fractions)<.08
        original_candidates={id(v):list(v['accumulation']['candidates']) for v in supported}
        no_candidates=all(not candidates for candidates in original_candidates.values())
        for view in supported:
            item=view['accumulation'];confirmed=[]
            for candidate in item['candidates']:
                support=[]
                for other in supported:
                    if other is view or other['pose']==view['pose']:continue
                    for alternative in original_candidates[id(other)]:
                        a=np.array(candidate['mouthPosition']);b=np.array(alternative['mouthPosition']);ratio=candidate['normalizedArea']/max(alternative['normalizedArea'],1e-8)
                        if (a[1]>=0)==(b[1]>=0) and np.linalg.norm(a-b)<.18 and .25<=ratio<=4:support.append(other['pose']);break
                if support:candidate['viewSupport']=sorted(set(support+[view['pose']]));confirmed.append(candidate)
            usable=consistent and (bool(confirmed) or no_candidates)
            item.update(quality='valid' if usable else 'insufficient',value=sum(c['areaPixels'] for c in confirmed)/item['evaluatedArea']*100 if usable else None,limitationCode=None if usable else 'VIEW_DISAGREEMENT',viewSupport=len(supported),unconfirmedCandidateCount=len(item['candidates'])-len(confirmed),candidates=confirmed if usable else [])
    return dict(methodVersion='dental-visible-v1',sourceType='camera',views=views,storage='volatile-memory-only',clinicalValidation=False)
