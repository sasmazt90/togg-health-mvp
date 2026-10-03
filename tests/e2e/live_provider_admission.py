"""Test-only admission at the HTTP egress boundary; never replaces provider output."""
from threading import RLock

TEXTS = ('Bugün yeni bir kitap okudum.', 'Kitabın konusu arkadaşlık üzerineydi.', 'Arkadaşlarımla bu konuyu konuşmak iyi geldi.')

class AdmissionRejected(RuntimeError):
    pass

class LiveAdmission:
    def __init__(self, source_verified=False):
        self.source_verified = source_verified
        self.counts = {'conversation': 0, 'tts': 0, 'summary': 0}
        self.messages = []
        self.pending = None
        self.blocked = []
        self.failed = False
        self.lock = RLock()

    def reject(self, reason):
        self.failed = True
        self.blocked.append(reason)  # Never include rejected content or headers.
        raise AdmissionRejected(reason)

    def admit(self, endpoint, data):
        with self.lock:
            if self.failed or not self.source_verified:
                self.reject('SOURCE_NOT_VERIFIED_OR_CLOSED')
            if self.pending:
                self.reject('CONCURRENT_OR_RETRY_REQUEST')
            if endpoint == '/v1/audio/speech':
                kind = 'tts'
                if self.counts[kind] >= 3 or self.counts['conversation'] != self.counts[kind] + 1:
                    self.reject('TTS_BUDGET_OR_ORDER')
                if not self.messages or data.get('input') != self.messages[-1]['content']:
                    self.reject('TTS_NOT_CURRENT_VERIFIED_REPLY')
                if data.get('voice') != 'coral' or data.get('response_format') != 'mp3':
                    self.reject('TTS_CONFIGURATION_CHANGED')
            elif endpoint == '/v1/chat/completions':
                if data.get('response_format') == {'type': 'json_object'}:
                    kind = 'summary'
                    if self.counts[kind] or self.counts['conversation'] != 3 or self.counts['tts'] != 3:
                        self.reject('SUMMARY_BUDGET_OR_ORDER')
                    expected = '\n'.join(f"{m['role']}: {m['content']}" for m in self.messages)
                    messages = data.get('messages', [])
                    if len(messages) != 1 or messages[0].get('role') != 'user':
                        self.reject('SUMMARY_SHAPE')
                    prefix, separator, history = messages[0].get('content', '').partition('Konuşma Geçmişi:\n')
                    if not separator or not prefix.startswith('Aşağıdaki kullanıcı-asistan araç içi konuşmasını analiz et') or history != expected:
                        self.reject('SUMMARY_HISTORY_NOT_CONTROLLED')
                else:
                    kind = 'conversation'
                    i = self.counts[kind]
                    if i >= 3 or self.counts['tts'] != i:
                        self.reject('CONVERSATION_BUDGET_OR_ORDER')
                    messages = data.get('messages', [])
                    expected = self.messages + [{'role': 'user', 'content': TEXTS[i]}]
                    if not messages or messages[0].get('role') != 'system' or messages[1:] != expected:
                        self.reject('USER_OR_HISTORY_NOT_CONTROLLED')
                    if not messages[0].get('content', '').startswith('Sen Togg araç içi Ruhsal İyi Oluş Asistanısın.'):
                        self.reject('SYSTEM_PROMPT_CHANGED')
            else:
                self.reject('UNEXPECTED_PROVIDER_ENDPOINT')
            if data.get('stream') or data.get('store') is True:
                self.reject('UNAPPROVED_STREAM_OR_STORAGE')
            self.counts[kind] += 1  # Consume before dispatch: failures never permit retry.
            self.pending = kind
            return kind

    def complete(self, kind, reply=None, success=True):
        with self.lock:
            if self.pending != kind:
                self.reject('UNMATCHED_RESPONSE')
            self.pending = None
            if not success:
                self.reject('PROVIDER_FAILED_NO_RETRY')
            if kind == 'conversation':
                if not isinstance(reply, str) or not reply.strip():
                    self.reject('EMPTY_PROVIDER_REPLY')
                self.messages += [{'role': 'user', 'content': TEXTS[len(self.messages)//2]}, {'role': 'assistant', 'content': reply.strip()}]

    def proof(self):
        return {'sourceVerified': self.source_verified, 'counts': self.counts.copy(), 'blockedReasons': self.blocked.copy(), 'closed': self.failed, 'completedPairs': len(self.messages)//2}
