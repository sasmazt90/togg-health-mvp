from pathlib import Path
import sys
import pytest
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


@pytest.mark.parametrize('speed', [-20, -0.001])
def test_negative_speed_rejected_without_mutating_safety_state(speed):
    client=TestClient(app)
    client.post('/api/vehicle/speed',json={'speedKmH':75})
    try:
        response=client.post('/api/vehicle/speed',json={'speedKmH':speed})
        assert response.status_code==422
        state=client.get('/api/vehicle/state').json()
        assert state['currentSpeed']==75 and state['vehicleMoving'] is True
    finally:
        client.post('/api/vehicle/speed',json={'speedKmH':0})


@pytest.mark.parametrize('speed', [0, 50, 75, 250])
def test_valid_speed_boundaries(speed):
    # The project has no maximum speed contract; do not invent a new upper limit.
    client=TestClient(app)
    try:
        response=client.post('/api/vehicle/speed',json={'speedKmH':speed})
        assert response.status_code==200
        assert response.json()['currentSpeed']==speed
        assert response.json()['vehicleMoving'] is (speed>0)
    finally:
        client.post('/api/vehicle/speed',json={'speedKmH':0})


@pytest.mark.parametrize('value', ['NaN', 'Infinity', '-Infinity'])
def test_nonfinite_speed_rejected(value):
    response=TestClient(app).post('/api/vehicle/speed',content='{"speedKmH":'+value+'}',headers={'Content-Type':'application/json'})
    assert response.status_code==422
