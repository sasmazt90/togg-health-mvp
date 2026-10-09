"""Local, deterministic appearance proxies. No diagnosis, storage or network.

All maps have fixed physical digital scales (never per-image min/max). Coordinates
refer to the original opaque PNG. Display pixels are never changed. Pixel filters
are applied to a separate face-scale-normalized copy, not the displayed photo.
"""
import base64
import hashlib
import math
import cv2
import numpy as np
from skimage.feature import local_binary_pattern
from skimage.filters import gabor
from skin_scan_baseline.oiliness import oiliness_map
from skin_scan_baseline.blemishes import blemish_map

VERSION = 'appearance-cv-1'
LIMITS = {'minFacePixels': 180, 'analysisFacePixels': 320, 'maxClippedFraction': .03}


def decode_photo(data):
    if not isinstance(data, str) or not data.startswith('data:image/png;base64,') or len(data) > 34_000_000:
        raise ValueError('INVALID_PHOTO')
    raw = base64.b64decode(data.split(',', 1)[1], validate=True)
    # PNG dimensions checked before decoder allocation.
    if raw[:8] != b'\x89PNG\r\n\x1a\n' or len(raw) < 24:
        raise ValueError('INVALID_PNG')
    width, height = int.from_bytes(raw[16:20], 'big'), int.from_bytes(raw[20:24], 'big')
    if not 16 <= width <= 4096 or not 16 <= height <= 4096 or width * height > 8_400_000:
        raise ValueError('PHOTO_LIMIT')
    bgr = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None or bgr.shape[:2] != (height, width):
        raise ValueError('INVALID_PNG')
    rgba = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGBA)
    return bgr, hashlib.sha256(rgba.tobytes()).hexdigest()


def polygon_mask(shape, mesh, scale, origin=(0,0)):
    mask = np.zeros(shape, np.uint8)
    p = (np.asarray([[v['x'], v['y']] for v in mesh['points']], np.float32)-origin) * scale
    if not np.isfinite(p).all() or not 3 <= len(p) <= 200 or len(mesh['edges']) > 1000:
        raise ValueError('INVALID_GEOMETRY')
    edges = {tuple(sorted(e)) for e in mesh['edges']}
    if any(len(e) != 2 or min(e) < 0 or max(e) >= len(p) for e in edges):
        raise ValueError('INVALID_GEOMETRY')
    neighbors=[set() for _ in p]
    for a,b in edges:neighbors[a].add(b);neighbors[b].add(a)
    for a,b in edges:
        for c in neighbors[a].intersection(neighbors[b]):
            if c>b:cv2.fillConvexPoly(mask,p[[a,b,c]].astype(np.int32),255)
    return mask > 0


def png(array):
    ok, data = cv2.imencode('.png', array)
    if not ok:
        raise ValueError('ENCODING_ERROR')
    return 'data:image/png;base64,' + base64.b64encode(data).decode('ascii')


def map_result(values, mask, region, criterion, photo, pose, source_shape, scale, unit, ceiling, origin=(0,0)):
    ys, xs = np.where(mask)
    if not len(xs):
        return None
    x, y, w, h = int(xs.min()), int(ys.min()), int(xs.max()-xs.min()+1), int(ys.max()-ys.min()+1)
    v, m = values[y:y+h, x:x+w], mask[y:y+h, x:x+w]
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[:, :, :3] = (241, 228, 54)  # BGRA -> existing cyan palette.
    rgba[:, :, 3] = np.round(np.clip(v / ceiling, 0, 1) * m * 100).astype(np.uint8)
    return dict(criterion=criterion, region=region, pose=pose, photoId=photo,
                sourceWidth=source_shape[1], sourceHeight=source_shape[0], x=x/scale+origin[0], y=y/scale+origin[1],
                step=1/scale, width=w, height=h, unit=unit, method=VERSION,
                validation='appearance-proxy', colorMapping='cyan-fixed-100-v1',
                dataUrl=png(rgba), validMaskUrl=png((m * 255).astype(np.uint8)), sampleCount=int(m.sum()))


def row(region, criterion, value, unit, area, conditions, limitation=None, components=None, kind='appearance_proxy', uncertainty=None):
    return dict(id=criterion, type=kind, value=value, unit=unit, methodVersion=VERSION,
                modelVersion=None, modelHash=None, quality='valid' if value is not None else 'insufficient',
                uncertainty=uncertainty or ['illumination', 'visible-surface-only', 'unvalidated-cosmetic-proxy'],
                region=region, evaluatedArea=area, captureConditions=conditions,
                limitationCode=limitation, referenceId=None, localMap=None, components=components or {})


def eligible_flake_components(signal,eligible):
    """Recheck actual bright-island support after anatomical/hair exclusions."""
    count,labels,stats,_=cv2.connectedComponentsWithStats(((signal>.04)&eligible).astype(np.uint8))
    islands=np.zeros(signal.shape,bool)
    for label in range(1,count):
        x,y,w,h,pixels=stats[label]
        if 3<=pixels<=80 and .3<=w/max(h,1)<=3.3 and pixels/max(w*h,1)>.25:
            islands|=labels==label
    return signal*eligible*islands


def contour_geometry(points, region, conditions, temporal):
    """Roll-corrected dimensionless *within-person* geometry, not sag severity."""
    aspect=float(conditions.get('sourceHeight',1))/max(float(conditions.get('sourceWidth',1)),1)
    def normalise(frame):
        raw=np.asarray([[v['x'],v['y']*aspect,v.get('z',0)] for v in frame],np.float64)
        if len(raw)<468 or not np.isfinite(raw).all():return None
        horizontal=raw[263]-raw[33];distance=np.linalg.norm(horizontal)
        if distance<=1e-5:return None
        horizontal/=distance
        vertical=raw[152]-raw[10];vertical-=horizontal*np.dot(vertical,horizontal)
        if np.linalg.norm(vertical)<=1e-5:return None
        vertical/=np.linalg.norm(vertical)
        centered=(raw-(raw[33]+raw[263])/2)/distance
        return np.column_stack([centered@horizontal,centered@vertical])
    q=normalise(points)
    if q is None:return None,'LANDMARKS_INVALID'
    mouth = np.linalg.norm(q[13] - q[14]) / max(np.linalg.norm(q[61]-q[291]), .001)
    if abs(conditions.get('yaw', 99)) > .65 or abs(conditions.get('pitch', 99)) > .22 or mouth > .10:
        return None, 'POSE_OR_EXPRESSION_INCOMPATIBLE'
    if len(temporal) < 3:
        return None, 'TEMPORAL_SUPPORT_MISSING'
    supports=[normalise(frame.get('points',frame) if isinstance(frame,dict) else frame) for frame in temporal]
    if any(frame is None for frame in supports):return None,'TEMPORAL_SUPPORT_INVALID'
    stable=np.std(np.asarray(supports)[:,[33,263,152,145,373],:],axis=0).max()
    if stable>.035:return None,'CONTOUR_NOT_STABLE'
    if region == 'chin':
        indices = [172, 136, 150, 152, 379, 365, 397]
    elif region == 'rightCheek':
        indices = [50, 187, 147, 172, 136]
    elif region == 'leftCheek':
        indices = [280, 411, 376, 397, 365]
    elif region == 'forehead':
        indices = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300]
    elif region == 'periorbital':
        indices = [145, 153, 154, 373, 380, 381]
    else:
        return None, 'ANATOMY_NOT_APPLICABLE'
    # Translation/roll/face-width invariant real contour ordinates.
    features = q[indices, 1]
    return dict(features=features.tolist(), indices=indices, points=[points[i] for i in indices],
                ratio=float(np.mean(features)), neutralMouthRatio=float(mouth), samples=len(temporal)), None


def analyze_skin(payload):
    bgr, source_hash = decode_photo(payload['photo'])
    if source_hash != payload['photoId']:
        raise ValueError('SOURCE_HASH_MISMATCH')
    points = payload.get('landmarks', [])
    if len(points) < 468:
        raise ValueError('LANDMARKS_MISSING')
    width = bgr.shape[1]
    face_pixels = abs(points[454]['x'] - points[234]['x']) * width
    scale = min(1., LIMITS['analysisFacePixels'] / max(face_pixels, 1))
    source_points=np.asarray([[v['x'],v['y']] for m in payload['meshes'].values() for v in m['points']],np.float32)
    if not len(source_points) or not np.isfinite(source_points).all():raise ValueError('INVALID_GEOMETRY')
    pad=max(20,face_pixels*.1);x0=max(0,int(source_points[:,0].min()-pad));y0=max(0,int(source_points[:,1].min()-pad))
    x1=min(bgr.shape[1],int(source_points[:,0].max()+pad+1));y1=min(bgr.shape[0],int(source_points[:,1].max()+pad+1))
    if x1<=x0 or y1<=y0:raise ValueError('INVALID_GEOMETRY')
    origin=(x0,y0)
    image = cv2.resize(bgr[y0:y1,x0:x1], None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    gray8 = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = gray8.astype(np.float32)/255
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
    saturation, v = hsv[:, :, 1]/255, hsv[:, :, 2]/255
    rgb = image[:, :, ::-1].astype(np.float32)/255
    red = np.maximum(0, 2*rgb[:, :, 0]-rgb[:, :, 1]-rgb[:, :, 2])
    local_v = cv2.GaussianBlur(v, (0, 0), 5)
    local_s = cv2.GaussianBlur(saturation, (0, 0), 5)
    # Skin-scan oiliness starts with bright, low-saturation pixels; here require
    # local contrast AND saturation drop. Bright matte skin alone is insufficient.
    shine = np.clip((v/np.maximum(local_v, .05)-1.08)/.24, 0, 1) * np.clip((local_s-saturation)/.18, 0, 1)
    high = gray-cv2.GaussianBlur(gray, (0, 0), 1.2)
    broad = cv2.GaussianBlur(gray, (0, 0), .7)-cv2.GaussianBlur(gray, (0, 0), 2.3)
    # Bright fine islands at both scales; long dark hairs/creases excluded later.
    flakes = np.clip((high-.025)/.10, 0, 1)*np.clip((broad-.018)/.10, 0, 1)
    lbp = local_binary_pattern(gray8, 8, 1, 'uniform')
    flakes*=lbp<8
    local_contrast = np.sqrt(np.maximum(0, cv2.GaussianBlur(gray*gray, (0, 0), 2)-cv2.GaussianBlur(gray, (0, 0), 2)**2))
    flakes*=(local_contrast>.015)&(local_contrast<.14)
    flakes=eligible_flake_components(flakes,np.ones(gray.shape,bool))
    hair = cv2.morphologyEx(gray8, cv2.MORPH_BLACKHAT, np.ones((7, 7), np.uint8)) > 35
    # The filter's three-pixel support also contains bright antialias/JPEG
    # rings around dark hair/creases. Those are not eligible flaking pixels.
    hair = cv2.dilate(hair.astype(np.uint8),np.ones((7,7),np.uint8)) > 0
    clipping = (v > .975)  # Darkness/hair is an exclusion, not specular glare.
    masks = {k: polygon_mask(gray.shape, m, scale, origin) for k, m in payload['meshes'].items()}
    exclusion = np.zeros(gray.shape, np.uint8)
    for box in payload.get('exclusions', []):
        x=int((box['x']-x0)*scale);y=int((box['y']-y0)*scale);w=int(box['w']*scale);h=int(box['h']*scale)
        cv2.rectangle(exclusion, (max(0, x), max(0, y)), (max(0, x+w), max(0, y+h)), 255, -1)
    # Always remove eyes/lips/nostrils/brows using actual landmarks, including
    # periorbital masks. These holes apply independently of ROI rectangle gates.
    holes = [[33,160,158,133,153,144], [263,387,385,362,380,373],
             [61,40,37,0,267,270,291,321,314,17,84,91],
             [98,97,2,326,327,294], [70,63,105,66,107,55,65,52], [300,293,334,296,336,285,295,282]]
    for indices in holes:
        poly = np.asarray([[(points[i]['x']*width-x0)*scale, (points[i]['y']*bgr.shape[0]-y0)*scale] for i in indices], np.int32)
        cv2.fillPoly(exclusion, [poly], 255)
    face_support=np.zeros(gray.shape,np.uint8)
    oval=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]
    face_polygon=np.array([[(points[i]['x']*width-x0)*scale,(points[i]['y']*bgr.shape[0]-y0)*scale] for i in oval],np.int32)
    cv2.fillPoly(face_support,[face_polygon],255)
    baseline_masks={k:(m*255).astype(np.uint8) for k,m in masks.items()}
    baseline_oil=oiliness_map(image,baseline_masks)
    baseline_blemish=blemish_map(image,baseline_masks)
    shine*=baseline_oil>0
    response, maps, contours = {}, {}, {}
    conditions = {**payload['conditions'],'sourceWidth':bgr.shape[1],'sourceHeight':bgr.shape[0]}
    for region, anatomical in masks.items():
        display_anatomical=anatomical
        if region=='nose':anatomical=anatomical|masks.get('forehead',np.zeros_like(anatomical))
        base = anatomical & (exclusion == 0)
        exposure_support=base & ~hair & (gray>.12)
        clipped = float(np.mean(clipping[exposure_support])) if exposure_support.any() else 1.
        valid = base & ~hair & ~clipping & (gray > .12)
        area = dict(sourcePixels=float(valid.sum()/scale**2), analysisPixels=int(valid.sum()),
                    sourceFacePixels=float(face_pixels), excludedPixels=float((base.sum()-valid.sum())/scale**2))
        reason = 'CAPTURE_QUALITY' if not payload.get('qualityValid') else 'GLARE_OR_EXPOSURE' if clipped > .03 else 'INSUFFICIENT_VISIBLE_AREA' if valid.sum() < 100 else None
        if region=='nose':
            area.update(foreheadSourcePixels=float((valid&masks.get('forehead',np.zeros_like(valid))).sum()/scale**2),
                        noseSourcePixels=float((valid&display_anatomical).sum()/scale**2),
                        chinSourcePixels=0.)
        items = []
        def add(criterion, value, unit, signal=None, ceiling=1., limitation=reason, components=None):
            usable = limitation is None
            item = row(region, criterion, float(value) if usable else None, unit, area, conditions, limitation, components)
            items.append(item)
            if usable and signal is not None:
                layer = map_result(signal, valid & display_anatomical, region, criterion, source_hash, payload['pose'], bgr.shape, scale, unit, ceiling, origin)
                if layer:
                    key=f'{region}:{criterion}';maps[key]=layer
                    # Descriptor only: the pixel/mask payload remains ephemeral
                    # in response.maps and never enters numeric history records.
                    item['localMap']=dict(key=key,photoId=source_hash,region=region,
                        criterion=criterion,coordinateSpace='source-pixels')
        if region != 'periorbital':
            total=np.maximum(rgb.sum(axis=2),.001);chroma=(rgb[:,:,0]-rgb[:,:,1])/total
            add('tone',np.std(chroma[valid])*100 if valid.any() else 0,'relative-color-index-0-100')
            redness=np.clip(red*100,0,100)
            add('redness',np.mean(redness[valid]) if valid.any() else 0,'relative-color-index-0-100',redness,100)
            add('oil', np.mean(shine[valid] > .12)*100 if valid.any() else 0, 'percent-visible-area', shine,
                components={'localIntensity': float(np.mean(shine[valid])) if valid.any() else None, 'clippedFraction': clipped})
            # Small red center-surround candidates need circularity, texture and
            # multi-scale agreement. Dark moles/freckles and hair aren't acne evidence.
            red_center = red-cv2.GaussianBlur(red, (0, 0), 4)
            scale2 = red-cv2.GaussianBlur(red, (0, 0), 2)
            candidates = ((red_center > .055) & (scale2 > .028) & (local_contrast > .008) & (baseline_blemish > .02) & valid).astype(np.uint8)
            n, labels, stats, _ = cv2.connectedComponentsWithStats(candidates)
            signal = np.zeros(gray.shape, np.float32); boxes = []
            for label in range(1, n):
                x, y, w, h, count = stats[label]
                if not 5 <= count <= 180 or not .45 <= w/max(h, 1) <= 2.2 or count/max(w*h, 1) < .38:
                    continue
                blob = labels == label
                if np.mean(gray[blob]) < .20 or np.mean(saturation[blob]) < .12 or np.mean(high[blob] > 0) < .08:
                    continue
                signal[blob] = np.clip(red_center[blob]/.15, 0, 1)
                boxes.append(dict(x=float(x/scale+x0), y=float(y/scale+y0), width=float(w/scale), height=float(h/scale)))
            add('acne', len(boxes), 'candidate-count', signal, components={'bounds': boxes, 'evaluatedArea': area})
        detail_reason = reason or ('INSUFFICIENT_SOURCE_DETAIL' if face_pixels < LIMITS['minFacePixels'] else None)
        regional_flakes=eligible_flake_components(flakes,valid)
        add('dry', np.mean(regional_flakes[valid] > .04)*100 if valid.any() else 0, 'percent-visible-area', regional_flakes,
            limitation=detail_reason, components={'roughnessIndex':float(np.clip(np.mean(local_contrast[valid])/.12*100,0,100)) if valid.any() else None,
            'lbpNonUniformFraction':float(np.mean(lbp[valid] == 9)) if valid.any() else None,
            'meaning':'fine-bright-flaking-candidates; roughness alone is not dryness'})
        if region == 'periorbital':
            adjacent = cv2.dilate(base.astype(np.uint8), np.ones((25,25),np.uint8)).astype(bool) & ~base & (exclusion == 0) & ~clipping & ~hair & (face_support>0) & (gray>.12)
            if adjacent.sum() >= 100 and valid.any():
                # Local relative contrast; global exposure cancels approximately.
                dark = np.maximum(0,(np.median(gray[adjacent])-gray)/max(float(np.median(gray[adjacent])), .1))*100
                add('dark', np.mean(dark[valid]), 'relative-color-index-0-100', dark, 100)
            else: add('dark', 0, 'relative-color-index-0-100', limitation='ADJACENT_SKIN_MISSING')
            lines = np.zeros(gray.shape, np.float32)
            for frequency in (.18,.28):
                for theta in (0,np.pi/4,np.pi/2,3*np.pi/4):
                    real, imaginary = gabor(gray, frequency=frequency, theta=theta)
                    lines = np.maximum(lines, np.clip((np.hypot(real,imaginary)-.015)/.06,0,1))
            # Outer canthi only; don't report lower-eye texture as crow's feet.
            outer = np.zeros(gray.shape,np.uint8)
            for index in (33,263):
                point = points[index]
                cv2.circle(outer,(int((point['x']*width-x0)*scale),int((point['y']*bgr.shape[0]-y0)*scale)),int(28*scale/max(scale,.001)),255,-1)
            lines *= outer > 0
            add('lines', np.mean(lines[valid])*100 if valid.any() else 0, 'directional-line-index-0-100', lines, limitation=detail_reason)
        if region != 'nose':
            geom, geom_reason = contour_geometry(points,region,conditions,payload.get('temporal',[]))
            criterion = 'bags' if region == 'periorbital' else 'sag'
            item = row(region,criterion,None,'normalized-contour-ratio',area,conditions,reason or geom_reason,
                       components=geom,kind='longitudinal_measurement')
            if region=='periorbital' and geom is not None:
                evidence=[sample for sample in payload.get('temporal',[]) if isinstance(sample,dict) and sample.get('eyelidEdge') is not None and sample.get('underEyeContrast') is not None]
                if len(evidence)<3:
                    geom=None;item['limitationCode']='TEMPORAL_EDGE_SUPPORT_MISSING'
                else:
                    edges=np.array([sample['eyelidEdge'] for sample in evidence]);shadows=np.array([sample['underEyeContrast'] for sample in evidence])
                    if np.std(edges)>max(.008,np.mean(edges)*.25) or np.std(shadows)>max(.008,np.mean(shadows)*.25):
                        geom=None;item['limitationCode']='EYELID_EDGE_OR_LIGHT_UNSTABLE'
                    else:geom.update(edgeMean=float(edges.mean()),shadowContrast=float(shadows.mean()),edgeSamples=len(evidence))
            if geom is not None and reason is None:
                item.update(value=geom['ratio'],quality='valid',limitationCode='REFERENCE_CREATED')
                contours[region]=geom
            items.append(item)
        response[region]=items
    return dict(methodVersion=VERSION,photoId=source_hash,measurements=response,maps=maps,contours=contours,
                storage='volatile-memory-only',sourceWidth=bgr.shape[1],sourceHeight=bgr.shape[0])
