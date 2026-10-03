"""Real FastAPI/OpenAI, with a test-only fail-closed HTTP transport gate."""
import argparse
import json
import os
from pathlib import Path
import sys
import time
import httpx
import uvicorn
from live_provider_admission import LiveAdmission,live_run_output,claim_live_run

parser = argparse.ArgumentParser()
parser.add_argument('--approved-additional-text-run', action='store_true')
parser.add_argument('--run-id')
args = parser.parse_args()
if not args.approved_additional_text_run:
    raise SystemExit('No authorization: no server or provider request')
ROOT = Path(__file__).resolve().parents[2]
OUT = live_run_output(ROOT,args.run_id)
OUT.mkdir(parents=True, exist_ok=True)
CONSUMED = OUT/'run-consumed.json'
if CONSUMED.exists():
    raise SystemExit('The authorized bounded live run was already consumed; refusing another run')
gate = LiveAdmission(source_verified=True)  # Content itself is checked before every HTTP send.
events = []
original_send = httpx.Client.send

def save():
    (OUT/'egress-proof.json').write_text(json.dumps({**gate.proof(), 'events': events, 'rawRejectedContentRetained': False, 'runId': args.run_id or 'controlled-text'}, indent=2), encoding='utf-8')

def send(self, request, *args, **kwargs):
    try:
        if request.url.host != 'api.openai.com' or request.url.scheme != 'https' or request.method != 'POST':
            gate.reject('UNEXPECTED_PROVIDER_DESTINATION')
        data = json.loads(request.content)
        expected_model = os.getenv('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts') if request.url.path.endswith('/speech') else os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
        if data.get('model') != expected_model:
            gate.reject('MODEL_CHANGED')
        kind = gate.admit(request.url.path, data)
        if sum(gate.counts.values()) == 1:
            claim_live_run(OUT,args.run_id)
        start = time.monotonic()
        response = original_send(self, request, *args, **kwargs)  # Actual network, no mock response.
        response.read()
        event = {'kind': kind, 'httpStatus': response.status_code, 'durationMs': round((time.monotonic()-start)*1000, 1), 'requestId': response.headers.get('x-request-id')}
        events.append(event)
        if kind == 'conversation' and response.is_success:
            reply = response.json()['choices'][0]['message']['content']
        else:
            reply = None
        gate.complete(kind, reply, response.is_success)
        if kind == 'tts' and response.is_success:
            (OUT/f"synthetic-reply-{gate.counts['tts']}.mp3").write_bytes(response.content)
        save()
        return response
    except Exception:
        gate.failed = True
        save()
        raise

httpx.Client.send = send
save()
sys.path.insert(0, str(ROOT/'services/core-api'))
uvicorn.run('main:app', host='127.0.0.1', port=8000, access_log=True)
