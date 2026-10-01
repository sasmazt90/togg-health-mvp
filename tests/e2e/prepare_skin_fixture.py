"""Pinned official MediaPipe test portrait; crop/scale only, no texture enhancement.

The public image is downloaded at test time rather than redistributed in the app.
Its use as a face-landmarker fixture is documented in Google's upstream test:
https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/python/test/vision/face_landmarker_test.py
Admission still requires actual production alignment and quality checks in the UI.
"""
import hashlib
import json
import pathlib
import shutil
import subprocess
import urllib.request

URL = 'https://storage.googleapis.com/mediapipe-assets/portrait.jpg'
SHA256 = 'a6f11efaa834706db23f275b6115058fa87fc7f14362681e6abe14e82749de3e'
directory = pathlib.Path('audit-fixtures')
directory.mkdir(exist_ok=True)
photo = directory / 'portrait.jpg'
urllib.request.urlretrieve(URL, photo)
assert hashlib.sha256(photo.read_bytes()).hexdigest() == SHA256, 'Upstream fixture changed'
ffmpeg = shutil.which('ffmpeg')
if ffmpeg is None:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
framing = 'crop=600:450:110:0,scale=640:480,setsar=1'
subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1',
                '-i', str(photo), '-vf', framing, '-t', '3', '-r', '15',
                '-pix_fmt', 'yuv420p', str(directory / 'valid-face.y4m')], check=True)
out = pathlib.Path('audit-results')
out.mkdir(exist_ok=True)
(out / 'skin-fixture-provenance.json').write_text(json.dumps({
    'source': URL, 'sha256': SHA256, 'framing': framing,
    'enhancements': [], 'qualityThresholdChanged': False,
    'protectedNegativeFixtureChanged': False}, indent=2))
