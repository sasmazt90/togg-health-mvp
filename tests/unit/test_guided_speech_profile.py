"""Real API route contract with a local provider context, no external dispatch."""
import sys
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'services/core-api'))
import main
from fastapi.testclient import TestClient
def test_speech_preserves_transport_chunks_and_closes(monkeypatch):
    calls=[];closed=[];sizes=[]
    class Speech:
        def iter_bytes(self,chunk_size):sizes.append(chunk_size);yield b'first';yield b'second'
    class Context:
        def __enter__(self):return Speech()
        def __exit__(self,*args):closed.append(True)
    def create(**options):calls.append(options);return Context()
    monkeypatch.setenv('OPENAI_API_KEY','unit-noncredential')
    monkeypatch.setattr(main,'get_openai_client',lambda *args:SimpleNamespace(audio=SimpleNamespace(speech=SimpleNamespace(with_streaming_response=SimpleNamespace(create=create)))))
    main.vehicle_state.update(vehicleMoving=False,vehicleParked=True,speedKmH=0)
    response=TestClient(main.app).post('/api/mental/speech',json={'text':'Sentetik Türkçe.','cloudConsent':True})
    assert response.status_code==200 and response.content==b'firstsecond'
    assert sizes==[None] and closed==[True] and len(calls)==1
    assert calls[0]['voice']=='coral' and calls[0]['speed']==.95 and calls[0]['response_format']=='mp3'
    assert 'Metni değiştirme' in calls[0]['instructions']
    assert response.headers['cache-control']=='no-store'
