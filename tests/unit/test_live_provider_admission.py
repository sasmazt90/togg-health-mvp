"""No key/network: admission rejects before dispatch and never retains rejected input."""
import importlib.util
from pathlib import Path
import pytest

spec = importlib.util.spec_from_file_location('admission', Path(__file__).parents[1]/'e2e/live_provider_admission.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

def conversation(gate, text=None, history=None):
    return {'messages': [{'role': 'system', 'content': 'Sen Togg araç içi Ruhsal İyi Oluş Asistanısın.'}] + (gate.messages if history is None else history) + [{'role': 'user', 'content': text or module.TEXTS[gate.counts['conversation']]}]}

def test_unverified_source_never_dispatches():
    gate = module.LiveAdmission()
    with pytest.raises(module.AdmissionRejected): gate.admit('/v1/chat/completions', conversation(gate))
    assert gate.counts == {'conversation': 0, 'tts': 0, 'summary': 0}

@pytest.mark.parametrize('payload', ['wrong-user', 'wrong-history'])
def test_unexpected_input_or_history_blocks_all_following_requests(payload):
    gate = module.LiveAdmission(True)
    data = conversation(gate, text='REJECTED_TEST_TOKEN') if payload == 'wrong-user' else conversation(gate, history=[{'role':'user','content':'REJECTED_TEST_TOKEN'}])
    with pytest.raises(module.AdmissionRejected): gate.admit('/v1/chat/completions', data)
    with pytest.raises(module.AdmissionRejected): gate.admit('/v1/chat/completions', conversation(gate))
    assert sum(gate.counts.values()) == 0 and 'REJECTED_TEST_TOKEN' not in str(gate.proof())

def test_failed_request_consumes_budget_without_retry():
    gate = module.LiveAdmission(True)
    kind = gate.admit('/v1/chat/completions', conversation(gate))
    with pytest.raises(module.AdmissionRejected): gate.complete(kind, success=False)
    with pytest.raises(module.AdmissionRejected): gate.admit('/v1/chat/completions', conversation(gate))
    assert gate.counts['conversation'] == 1

def test_three_pairs_exact_tts_and_one_summary_then_closed():
    gate = module.LiveAdmission(True)
    for i in range(3):
        gate.complete(gate.admit('/v1/chat/completions', conversation(gate)), f'Sentetik yanıt {i}')
        gate.complete(gate.admit('/v1/audio/speech', {'input': f'Sentetik yanıt {i}', 'voice':'coral','response_format':'mp3'}))
    summary = {'response_format': {'type':'json_object'}, 'messages':[{'role':'user','content':'Aşağıdaki kullanıcı-asistan araç içi konuşmasını analiz et\nKonuşma Geçmişi:\n'+'\n'.join(f"{m['role']}: {m['content']}" for m in gate.messages)}]}
    gate.complete(gate.admit('/v1/chat/completions', summary))
    with pytest.raises(module.AdmissionRejected): gate.admit('/v1/chat/completions', summary)
    assert gate.counts == {'conversation':3,'tts':3,'summary':1}

def test_tts_cannot_send_unverified_content():
    gate = module.LiveAdmission(True)
    gate.complete(gate.admit('/v1/chat/completions', conversation(gate)), 'Sentetik yanıt')
    with pytest.raises(module.AdmissionRejected): gate.admit('/v1/audio/speech', {'input':'REJECTED_TEST_TOKEN','voice':'coral','response_format':'mp3'})
    assert gate.counts['tts'] == 0

@pytest.mark.parametrize('violation', ['stream', 'store', 'unknown-endpoint', 'concurrent'])
def test_other_egress_paths_fail_closed(violation):
    gate = module.LiveAdmission(True)
    data = conversation(gate)
    if violation in ['stream', 'store']: data[violation] = True
    if violation == 'concurrent': gate.admit('/v1/chat/completions', data)
    endpoint = '/v1/responses' if violation == 'unknown-endpoint' else '/v1/chat/completions'
    with pytest.raises(module.AdmissionRejected): gate.admit(endpoint, data)
    assert gate.failed and gate.counts['conversation'] == (1 if violation == 'concurrent' else 0)

def test_response_completes_before_browser_can_request_tts():
    gate = module.LiveAdmission(True)
    kind = gate.admit('/v1/chat/completions', conversation(gate))
    events = []
    class Response:
        ok = True
        def json(self): return {'providerType':'LIVE_OPENAI','reply':'Sentetik yanıt'}
    class Route:
        def fetch(self, **options):
            assert options['max_retries']==0
            return Response()
        def fulfill(self, **options):
            assert gate.pending is None and events==['recorded']
            gate.admit('/v1/audio/speech', {'input':'Sentetik yanıt','voice':'coral','response_format':'mp3'})
    assert module.forward_admitted_response(Route(),gate,kind,lambda *a:events.append('recorded'))
    assert gate.counts=={'conversation':1,'tts':1,'summary':0} and not gate.failed

def test_honest_fallback_delivered_but_no_following_request_admitted():
    gate = module.LiveAdmission(True)
    kind = gate.admit('/v1/chat/completions',conversation(gate));delivered=[]
    class Response:
        ok = True
        def json(self): return {'providerType':'LOCAL_DEMO_FALLBACK','reply':'Yerel demo'}
    class Route:
        def fetch(self, **options): return Response()
        def fulfill(self, **options): delivered.append(options['response'].json()['providerType'])
    assert not module.forward_admitted_response(Route(),gate,kind,lambda *a:None)
    assert delivered==['LOCAL_DEMO_FALLBACK'] and gate.failed
    with pytest.raises(module.AdmissionRejected):gate.admit('/v1/audio/speech',{'input':'Yerel demo','voice':'coral','response_format':'mp3'})
