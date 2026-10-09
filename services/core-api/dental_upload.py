"""Bounded photo decoder; original oriented pixels stay separate from analysis copies."""
import base64,hashlib,io,json,warnings
from pathlib import Path
import cv2,numpy as np
from PIL import Image,ImageOps,UnidentifiedImageError
LIMITS=json.loads((Path(__file__).resolve().parents[2]/'shared/dentalUploadLimits.json').read_text('utf-8-sig'))
class UploadError(ValueError):pass

def decode_upload(data):
    if not isinstance(data,str) or ',' not in data or len(data)>LIMITS['maxFileBytes']*4/3+256:raise UploadError('FILE_LIMIT')
    try:raw=base64.b64decode(data.split(',',1)[1],validate=True)
    except Exception:raise UploadError('INVALID_FILE') from None
    if not 1<=len(raw)<=LIMITS['maxFileBytes']:raise UploadError('FILE_LIMIT')
    fmt='JPEG' if raw[:3]==b'\xff\xd8\xff' else 'PNG' if raw[:8]==b'\x89PNG\r\n\x1a\n' else 'WEBP' if raw[:4]==b'RIFF' and raw[8:12]==b'WEBP' else None
    if not fmt:raise UploadError('UNSUPPORTED_FORMAT')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error',Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as im:
                w,h=im.size
                if im.format!=fmt or getattr(im,'is_animated',False) or min(w,h)<LIMITS['minSide'] or max(w,h)>LIMITS['maxSide'] or w*h>LIMITS['maxPixels']:raise UploadError('PIXEL_LIMIT')
                im.verify()
            with Image.open(io.BytesIO(raw)) as im:
                im.load()
                if ('A' in im.getbands() or 'transparency' in im.info) and im.convert('RGBA').getchannel('A').getextrema()!=(255,255):raise UploadError('TRANSPARENT_PHOTO')
                normalized=ImageOps.exif_transpose(im).convert('RGB')
                rgb=np.asarray(normalized).copy()
        image=cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR)
        rgba=cv2.cvtColor(image,cv2.COLOR_BGR2RGBA)
        digest=hashlib.sha256(rgba.tobytes()).hexdigest()
        ok,encoded=cv2.imencode('.png',image)
        if not ok:raise UploadError('ENCODING_FAILED')
        return image,digest,'data:image/png;base64,'+base64.b64encode(encoded).decode(),dict(originalFormat=fmt,exifNormalized=True,sourceType='upload',sourceBytes=len(raw),sourceWidth=image.shape[1],sourceHeight=image.shape[0])
    except UploadError:raise
    except (OSError,ValueError,UnidentifiedImageError,Image.DecompressionBombError,Image.DecompressionBombWarning):raise UploadError('DECODE_FAILED') from None

def upload_roi(image):
    """Visible enamel + adjacent colored gingiva; no full-face landmarks or camera liveness."""
    h,w=image.shape[:2];factor=min(1,LIMITS['analysisMaxSide']/max(h,w))
    small=cv2.resize(image,None,fx=factor,fy=factor,interpolation=cv2.INTER_AREA) if factor<1 else image.copy()
    hsv=cv2.cvtColor(small,cv2.COLOR_BGR2HSV);gray=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY)
    enamel=(hsv[:,:,1]<110)&(hsv[:,:,2]>100)&(gray>90)
    gingiva=(small[:,:,2].astype(float)>small[:,:,1]*1.12)&(hsv[:,:,1]>55)&(gray>35)
    near=cv2.dilate(gingiva.astype('uint8'),np.ones((31,31),'uint8'))>0
    candidate=cv2.morphologyEx((enamel&near).astype('uint8'),cv2.MORPH_CLOSE,np.ones((13,13),'uint8'))
    count,labels,stats,_=cv2.connectedComponentsWithStats(candidate)
    if count<2:raise UploadError('TEETH_NOT_VISIBLE_OR_NON_COLOR_IMAGE')
    largest=1+int(np.argmax(stats[1:,4]));x,y,bw,bh,area=stats[largest]
    if area<150 or bw/factor<100:raise UploadError('INSUFFICIENT_TOOTH_DETAIL')
    # Include enamel adjacent to the selected cluster and colored gums, while avoiding remote white backgrounds.
    support=cv2.dilate((labels==largest).astype('uint8'),np.ones((51,51),'uint8'))>0
    ys,xs=np.where(support & (enamel|gingiva));margin=max(10,int(bw*.08))
    x0=max(0,int((xs.min()-margin)/factor));y0=max(0,int((ys.min()-margin)/factor));x1=min(w,int((xs.max()+margin)/factor));y1=min(h,int((ys.max()+margin)/factor))
    mouth=np.zeros((h,w),bool);mouth[y0:y1,x0:x1]=True
    from dental_analysis import dental_pixels
    tooth,glare,gum,tongue,source_gray=dental_pixels(image,mouth)
    total=max(int(mouth.sum()),1);tooth_count=int(tooth.sum());fraction=tooth_count/total
    interior=cv2.erode(tooth.astype('uint8'),np.ones((3,3),'uint8'))>0
    lap=cv2.Laplacian(source_gray,cv2.CV_32F)
    sharp=float(np.mean(lap[interior]**2)) if interior.any() else 0
    light=float(source_gray[mouth].mean());reasons=[]
    if tooth_count<150 or fraction<.15:reasons.append('TEETH_NOT_VISIBLE')
    if light<45 or light>230:reasons.append('LIGHT_INVALID')
    if sharp<12:reasons.append('BLURRY')
    if glare.sum()/max(tooth_count+glare.sum(),1)>.12:reasons.append('SALIVA_OR_GLARE')
    if tongue.sum()/total>.7:reasons.append('TONGUE_OCCLUSION')
    if not gum.any() or np.mean(hsv[:,:,1]>35)<.04:reasons.append('NON_COLOR_INTRAORAL_PHOTO')
    if reasons:raise UploadError(reasons[0])
    return mouth,tooth,gum,dict(valid=True,reasons=[],geometrySource='local-colored-enamel-gingiva',sourceType='upload',motionGateApplied=False,fullFaceRequired=False,visibleToothPixels=tooth_count,toothFraction=fraction,sharpness=sharp,light=light,clippedPixels=int(glare.sum()),roi=dict(x=x0,y=y0,width=x1-x0,height=y1-y0),analysisScale=factor)

def analyze_upload(payload):
    from dental_analysis import model_candidates,calculus_candidates,contours_and_alignment
    image,digest,normalized,source=decode_upload(payload.get('photo'))
    mouth,tooth,gum,quality=upload_roi(image)
    candidates,model=model_candidates(image,mouth)
    deposits,border=calculus_candidates(image,tooth,gum)
    meta=dict(region='visible-inner-mouth',captureConditions=quality,referenceId=None,localMap=None,modelVersion=None,modelHash=None)
    # Single-view appearance is explicitly not a multiview-confirmed candidate.
    accumulation=dict(type='appearance_proxy',value=sum(c['areaPixels'] for c in deposits)/border*100 if border>100 else None,unit='percent-visible-border-area',methodVersion='dental-border-single-photo-v1',quality='valid' if border>100 else 'insufficient',limitationCode=None if border>100 else 'GINGIVAL_BORDER_NOT_VISIBLE',candidates=deposits,evaluatedArea=border,viewSupport=1,evidenceScope='single-photo-appearance-unconfirmed',uncertainty=['stain-food-filling-confounders','not-multiview-confirmed'],**meta)
    contours=[];rows=None;reason='NATURAL_BITE_NOT_CONFIRMED'
    if tooth.any():
        # Infer only visible two-row support from the actual pixels. A checkbox
        # cannot establish a bite or supply a missing lower row.
        profile=tooth.sum(axis=1)/max(quality['roi']['width'],1)
        active=profile>.12;segments=[];start=None
        for i,v in enumerate(active):
            if v and start is None:start=i
            if not v and start is not None:segments.append((start,i));start=None
        if start is not None:segments.append((start,len(active)))
        segments=sorted(segments,key=lambda s:s[1]-s[0],reverse=True)[:2];segments.sort()
        if len(segments)==2 and 0<segments[1][0]-segments[0][1]<quality['roi']['width']*.08:
            split=(segments[1][0]+segments[0][1])/2
            contours,rows,reason=contours_and_alignment(image,tooth,mouth,None,split,quality['roi']['width'])
    alignment=dict(type='appearance_proxy',value={k:v['value'] for k,v in rows.items()} if reason is None else None,unit='degrees-of-visible-axis-dispersion',methodVersion='marker-watershed-upload-v2',quality='valid' if reason is None else 'insufficient',limitationCode=reason,rows=rows,contours=contours,evaluatedArea=int(tooth.sum()),biteConfirmation='visible-two-row-support' if reason is None else None,uncertainty=['view-perspective','visible-contour-separation','not-malocclusion'],**meta)
    view=dict(photoId=digest,pose='FRONT',sourceWidth=image.shape[1],sourceHeight=image.shape[0],sourceType='upload',quality=quality,caries=dict(type='trained_prediction',value=len(candidates) if model['quality']=='valid' else None,unit='candidate-count',candidates=candidates,evaluatedArea=int(mouth.sum()),uncertainty=['dataset-domain-shift','visible-surface-only','confidence-is-not-severity'],**{**meta,**model}),accumulation=accumulation,alignment=alignment)
    return dict(methodVersion='dental-visible-upload-v2',sourceType='upload',views=[view],storage='volatile-memory-only',clinicalValidation=False,source=source,normalizedPhoto=normalized)
