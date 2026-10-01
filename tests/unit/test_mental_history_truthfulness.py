import json
import os
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'services/core-api'))
from mental_provider import LocalFallbackMentalProvider, LocalFallbackSessionAnalyzer


def test_actual_local_reply_and_analysis_do_not_invent_previous_conversations():
    provider=LocalFallbackMentalProvider()
    for message in ['Gece uyuyamıyorum.','İş projeleri beni strese sokuyor.']:
        reply=provider.generate_reply(message,False,[])['reply'].lower()
        assert 'son görüşmelerimizde' not in reply
        assert 'son konuşmalarımızda' not in reply
    analysis=LocalFallbackSessionAnalyzer().analyze_session([{'role':'user','content':'İş beni yoruyor ve stresliyim.'}])
    assert 'süregelen' not in (analysis['professionalSupportReason'] or '')
    assert 'tekrar ettiği gözlemlendi' not in (analysis['professionalSupportReason'] or '')


def test_fresh_backend_storage_starts_empty_and_corruption_is_not_demo_history(tmp_path):
    environment={**os.environ,'ATTUNE_DATA_DIR':str(tmp_path),'OPENAI_API_KEY':''}
    script="from session_memory import SessionMemoryManager; import json; print(json.dumps(SessionMemoryManager.get_all_sessions()))"
    first=subprocess.run([sys.executable,'-c',script],cwd=ROOT/'services/core-api',env=environment,check=True,capture_output=True,text=True)
    assert json.loads(first.stdout)==[]
    (tmp_path/'mental_sessions.json').write_text('{broken',encoding='utf-8')
    broken=subprocess.run([sys.executable,'-c',script],cwd=ROOT/'services/core-api',env=environment,capture_output=True,text=True)
    assert broken.returncode!=0
    assert 'history is unverified' in broken.stderr
    assert not broken.stdout
