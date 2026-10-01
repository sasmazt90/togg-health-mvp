"""Behavior-level backlog regressions against the built app and actual local API."""
import argparse
import json
import os
from pathlib import Path
import re
import traceback
import unicodedata

from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ATTUNE_AUDIT_BASE', 'http://localhost:3000')
API = os.environ.get('ATTUNE_API_BASE', 'http://localhost:8000')
OUT = Path(os.environ.get('ATTUNE_BACKLOG_OUT', 'audit-results/backlog'))
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('--phase', required=True)
phase = parser.parse_args().phase
results = []


def record(name, fn):
    try:
        detail = fn()
        row = {'name': name, 'status': 'PASS', 'detail': detail}
    except Exception as error:
        row = {'name': name, 'status': 'FAIL', 'error': str(error), 'traceback': traceback.format_exc()}
    results.append(row)
    print(json.dumps(row, ensure_ascii=False), flush=True)


def enter_text(page, text):
    if page.locator('input').count() == 0:
        page.get_by_role('button', name='İsterseniz yazabilirsiniz', exact=True).click()
    old_reply = page.locator('[data-chat-author="AI"] p').last.inner_text()
    page.locator('input').fill(text)
    page.locator('input').press('Enter')
    expect(page.locator('[data-chat-author="AI"] p').last).not_to_have_text(old_reply)
    return page.locator('[data-chat-author="AI"] p').last.inner_text()


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    if phase == 'crisis':
        phrases = ['intihar', 'İNTİHAR', 'İntihar', 'iNtIhAr', 'INTIHAR', 'i\u0307ntihar',
                   'CANIMA KIYMAK', 'ÖLMEK İSTİYORUM', 'KeNdİmE ZaRaR',
                   unicodedata.normalize('NFD', 'YAŞAMAK İSTEMİYORUM')]
        for text in phrases + ['Bugün yeni bir kitap okudum.', 'İyi hissediyorum, ailemle görüştüm.']:
            def check(text=text):
                context = browser.new_context()
                try:
                    page = context.new_page()
                    page.goto(BASE + '/mental')
                    reply = enter_text(page, text)
                    if text in phrases:
                        assert '112' in reply and '182' not in reply, reply
                    else:
                        assert '112' not in reply, reply
                    return {'input': text, 'actualReply': reply}
                finally:
                    context.close()
            record('Actual frontend crisis reply: ' + text, check)
    elif phase == 'privacy':
        for local_available, backend_available in [(True, True), (True, False), (False, True), (False, False)]:
            def deletion(local_available=local_available, backend_available=backend_available):
                # Actual browser capability and an aborted network request: no fabricated responses.
                test_browser = pw.chromium.launch(headless=True,
                    args=[] if local_available else ['--disable-local-storage'])
                context = test_browser.new_context()
                try:
                    created = context.request.post(API + '/api/mental/sessions', data={
                        'summaryText': 'Synthetic deletion capability check',
                        'recurringThemes': [], 'saveMentalSummaries': True})
                    assert created.ok and created.json()['persisted'] is True
                    page = context.new_page()
                    page.goto(BASE + '/privacy')
                    if not local_available:
                        assert page.evaluate('window.localStorage') is None
                    if not backend_available:
                        page.route('**/api/privacy/wipe', lambda route: route.abort())
                    page.get_by_role('button', name='TÜM YEREL VERİLERİ SİL', exact=True).click()
                    page.get_by_role('button', name='Evet, Tüm Verileri Sil', exact=True).click()
                    status = page.locator('[role="status"]').filter(has_text='Tarayıcıdaki sağlık kayıt')
                    expect(status).to_be_visible()
                    text = status.inner_text()
                    assert ('Tarayıcıdaki sağlık kayıtları silindi.' in text) is local_available
                    assert ('Yerel sunucudaki seans özetlerinin silindiği doğrulandı.' in text) is backend_available
                    body = page.locator('body').inner_text()
                    assert ('Tüm yerel veriler başarıyla temizlendi.' in body) is (local_available and backend_available)
                    if not local_available and not backend_available:
                        assert 'Silme işlemi tamamlanamadı.' in text
                    elif local_available != backend_available:
                        assert 'Silme işlemi kısmen tamamlandı.' in text
                    remaining = context.request.get(API + '/api/mental/sessions').json()
                    assert bool(remaining) is (not backend_available)
                    page.screenshot(path=str(OUT / f'privacy-{local_available}-{backend_available}.png'))
                    return {'localAvailable': local_available, 'backendAvailable': backend_available,
                            'actualStatus': text, 'remainingServerRecords': len(remaining)}
                finally:
                    context.request.post(API + '/api/privacy/wipe')
                    context.close()
                    test_browser.close()
            record(f'Deletion truthfulness local={local_available} backend={backend_available}', deletion)
    else:
        raise ValueError('Unknown regression phase: ' + phase)
    browser.close()

(OUT / (phase + '.json')).write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
raise SystemExit(1 if any(row['status'] != 'PASS' for row in results) else 0)
