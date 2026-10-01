"""Actual API consent and browser-origin policy, using an isolated test store."""
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'services/core-api'))
from main import app, trusted_origins
from session_memory import SessionMemoryManager

client = TestClient(app)


@pytest.fixture(autouse=True)
def empty_store():
    SessionMemoryManager.clear_all()
    yield
    SessionMemoryManager.clear_all()


@pytest.mark.parametrize('consent', ['omitted', False, True])
def test_explicit_persistence_consent(consent):
    payload = {'summaryText': 'Synthetic regression summary', 'recurringThemes': []}
    if consent != 'omitted':
        payload['saveMentalSummaries'] = consent
    response = client.post('/api/mental/sessions', json=payload)
    assert response.status_code == 200
    allowed = consent is True
    assert response.json()['persisted'] is allowed
    assert len(client.get('/api/mental/sessions').json()) == int(allowed)


@pytest.mark.parametrize('invalid', [None, 'true', 1])
def test_invalid_consent_does_not_persist(invalid):
    response = client.post('/api/mental/sessions', json={
        'summaryText': 'Synthetic invalid consent', 'recurringThemes': [], 'saveMentalSummaries': invalid})
    assert response.status_code == 422
    assert client.get('/api/mental/sessions').json() == []


@pytest.mark.parametrize('origin', ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://untrusted.example'])
def test_cors_preflight_and_actual_request(origin):
    preflight = client.options('/api/privacy/wipe', headers={
        'Origin': origin, 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'})
    actual = client.get('/api/mental/sessions', headers={'Origin': origin})
    if origin in trusted_origins:
        assert preflight.status_code == 200
        assert preflight.headers['access-control-allow-origin'] == origin
        assert actual.headers['access-control-allow-origin'] == origin
    else:
        assert preflight.status_code == 400
        assert 'access-control-allow-origin' not in preflight.headers
        assert 'access-control-allow-origin' not in actual.headers
    assert 'access-control-allow-credentials' not in preflight.headers


def test_backend_wipe_removes_actual_persisted_summaries():
    client.post('/api/mental/sessions', json={
        'summaryText': 'Synthetic deletion record', 'recurringThemes': [], 'saveMentalSummaries': True})
    assert len(client.get('/api/mental/sessions').json()) == 1
    assert client.post('/api/privacy/wipe').status_code == 200
    assert client.get('/api/mental/sessions').json() == []


def test_untrusted_simple_post_cannot_delete_actual_summaries():
    client.post('/api/mental/sessions', json={
        'summaryText': 'Synthetic origin-enforcement record', 'recurringThemes': [], 'saveMentalSummaries': True})
    before = client.get('/api/mental/sessions').json()
    assert len(before) == 1
    # A simple cross-origin POST does not need a preflight. Header omission alone
    # must not allow this destructive side effect to run.
    response = client.post('/api/privacy/wipe', headers={'Origin': 'https://untrusted.example'})
    assert response.status_code == 403
    assert 'access-control-allow-origin' not in response.headers
    assert client.get('/api/mental/sessions').json() == before
