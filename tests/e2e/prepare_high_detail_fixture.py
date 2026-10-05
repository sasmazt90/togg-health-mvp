"""Public-domain NASA portrait, native-pixel crop only; no user photo or enhancement.

This front-pose fixture cannot stand for three different poses. MediaPipe and
the production quality/pose gates must admit it, without injected landmarks.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import urllib.request
from PIL import Image

SOURCE = 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Eileen_Collins%2C_early_NASA_portrait.jpg'
PAGE = 'https://commons.wikimedia.org/wiki/File:Eileen_Collins,_early_NASA_portrait.jpg'
SHA256 = '788e97c3a72c1a3e06a21a24841a6e4b71b38df7b37c0699658b091043b45207'
FIX = Path('audit-fixtures'); FIX.mkdir(exist_ok=True)
OUT = Path('audit-results/user-followup-20261005/high-detail'); OUT.mkdir(parents=True, exist_ok=True)
photo = FIX / 'high-detail-nasa.jpg'
if not photo.exists():
    request = urllib.request.Request(SOURCE, headers={'User-Agent': 'AttuneFixtureVerification/1.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        photo.write_bytes(response.read())
assert hashlib.sha256(photo.read_bytes()).hexdigest() == SHA256
with Image.open(photo) as original:
    assert original.size == (2250, 2848)
    # Native crop excludes branding and preserves every original face pixel.
    original.crop((400, 150, 1680, 1110)).save(FIX / 'high-detail-native-crop.png')
ffmpeg = shutil.which('ffmpeg')
if not ffmpeg:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1',
                '-i', str(FIX / 'high-detail-native-crop.png'), '-t', '3', '-r', '15',
                '-pix_fmt', 'yuv420p', str(FIX / 'high-detail.y4m')], check=True)
(OUT / 'source-provenance.json').write_text(json.dumps({
    'source': SOURCE, 'page': PAGE, 'author': 'NASA',
    'rights': 'Public domain in the United States, solely NASA-created image',
    'policy': 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    'sourceSha256': SHA256, 'originalPixels': [2250, 2848],
    'nativeCrop': [400, 150, 1280, 960], 'resizing': False,
    'conversion': 'JPEG decode to lossless PNG crop, then uncompressed YUV420 video; chroma subsampling only',
    'enhancements': [], 'qualityThresholdChanged': False,
    'controlledFixture': True, 'userPhotoAcceptance': False,
    'oneFrontPoseOnly': True, 'endorsement': False
}, indent=2), encoding='utf-8')
print('Prepared native 1280x960 high-detail front-only controlled fixture')
