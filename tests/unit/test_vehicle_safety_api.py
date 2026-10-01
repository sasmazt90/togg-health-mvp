from pathlib import Path
import sys
from fastapi.testclient import TestClient

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'services/core-api'))
from main import app


def test_actual_backend_safety_follows_speed_transitions():
    client=TestClient(app)
    try:
        for speed in [0,75,0]:
            response=client.post('/api/vehicle/speed',json={'speedKmH':speed})
            assert response.status_code==200
            state=client.get('/api/vehicle/state').json()
            assert state['currentSpeed']==speed
            assert state['vehicleMoving'] is (speed>0)
            assert state['vehicleParked'] is (speed==0)
            reply=client.post('/api/mental/converse',json={'userMessage':'Bugün kitap okudum.'}).json()
            assert reply['isDriving'] is (speed>0)
    finally:
        client.post('/api/vehicle/speed',json={'speedKmH':0})
