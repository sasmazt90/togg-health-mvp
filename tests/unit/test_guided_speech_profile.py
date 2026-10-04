"""Fixed Microsoft vision streaming contract; separate exact mental and vision profiles.
Replaces the superseded Coral profile assertion, preserving chunks and cleanup.
"""
import sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'services/core-api'))
import main,vision_speech
from fastapi.testclient import TestClient

def test_speech_preserves_transport_chunks_and_closes(monkeypatch):
    calls=[];closed=[]
    class Communicate:
        def __init__(self,text,voice,rate,pitch):calls.append((text,voice,rate,pitch))
        async def stream(self):
            try:
                yield {'type':'audio','data':b'first'}
                yield {'type':'audio','data':b'second'}
            finally:closed.append(True)
    monkeypatch.setattr(vision_speech,'_catalogue',(time.monotonic(),frozenset([vision_speech.VOICE])))
    monkeypatch.setattr(vision_speech.edge_tts,'Communicate',Communicate)
    monkeypatch.setitem(main.vehicle_state,'vehicleMoving',False)
    response=TestClient(main.app).post('/api/vision/speech',json={'text':'right','cloudConsent':True})
    assert response.status_code==200 and response.content==b'firstsecond'
    assert closed==[True] and len(calls)==1
    assert calls[0]==(vision_speech.PROMPTS['right'],'it-IT-GiuseppeMultilingualNeural','+20%','-10Hz')
    assert 'harf' in calls[0][0].lower() and 'E' not in calls[0][0]
    assert response.headers['cache-control']=='no-store'


def test_ava_exact_profile_preserves_chunks_and_cleanup(monkeypatch):
    calls=[];closed=[]
    class Communicate:
        def __init__(self,text,voice,rate,pitch):calls.append((text,voice,rate,pitch))
        async def stream(self):
            try:
                yield {'type':'audio','data':b'one'}
                yield {'type':'audio','data':b'two'}
            finally:closed.append(True)
    monkeypatch.setattr(vision_speech,'_catalogue',(time.monotonic(),frozenset(['en-US-AvaMultilingualNeural'])))
    monkeypatch.setattr(vision_speech.edge_tts,'Communicate',Communicate)
    monkeypatch.setitem(main.vehicle_state,'vehicleMoving',False)
    response=TestClient(main.app).post('/api/mental/speech',json={'text':'Kişisel olmayan deneme.','cloudConsent':True})
    assert response.content==b'onetwo' and response.status_code==200
    assert calls==[('Kişisel olmayan deneme.','en-US-AvaMultilingualNeural','+10%','+0Hz')] and closed==[True]

def test_missing_exact_voice_has_no_fallback_dispatch(monkeypatch):
    monkeypatch.setattr(vision_speech,'_catalogue',(time.monotonic(),frozenset(['it-IT-IsabellaNeural'])))
    monkeypatch.setattr(vision_speech.edge_tts,'Communicate',lambda *_a,**_kw:(_ for _ in ()).throw(AssertionError('Fallback dispatch')))
    monkeypatch.setitem(main.vehicle_state,'vehicleMoving',False)
    for route,text,voice in [('vision','right','it-IT-GiuseppeMultilingualNeural'),('mental','Deneme','en-US-AvaMultilingualNeural')]:
        response=TestClient(main.app).post('/api/'+route+'/speech',json={'text':text,'cloudConsent':True})
        assert response.status_code==503 and response.json()['detail']=='EXACT_MICROSOFT_VOICE_UNAVAILABLE:'+voice
