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
    else:
        raise ValueError('Unknown regression phase: ' + phase)
    browser.close()

(OUT / (phase + '.json')).write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
raise SystemExit(1 if any(row['status'] != 'PASS' for row in results) else 0)
