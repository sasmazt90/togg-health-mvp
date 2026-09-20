"""
Mental Wellbeing Conversation Provider, Safety Engine & Session Analyzer
Lisans: UNLICENSED

Sağlayıcı Soyutlaması:
- MentalConversationProvider (ABC)
- OpenAICompatibleMentalProvider (Canlı LLM - API key varsa)
- LocalFallbackMentalProvider (Açıkça Demo / Yerel çalışan kural motoru)

Oturum Özeti Analizcisi:
- MentalSessionAnalyzer (ABC)
- OpenAICompatibleSessionAnalyzer (Canlı yapılandırılmış JSON özet ve tema çıkarımı)
- LocalFallbackSessionAnalyzer (Gerçek kullanıcı metinlerinden dinamik anahtar kelime/tema çıkarımı, sabit hard-code yok)

İki Katmanlı Kriz Güvenliği:
- Katman 1: Öncelikli, deterministik anahtar kelime taraması (pre-LLM).
- Katman 2: Canlı LLM yapılandırılmış güvenlik sınıflandırması.
- Akut krizde YALNIZCA 112 Acil Çağrı Merkezi kullanılır. Poliklinik/randevu hatları kriz mesajlarında yer alamaz.
- Non-klinik beyan: Bu analiz klinik olarak valide edilmiş bir tanı sistemi değildir.
"""

import os
import re
import json
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime

CRISIS_KEYWORDS = [
    "intihar",
    "ölmek istiyorum",
    "kendime zarar",
    "yaşamak istemiyorum",
    "canıma kıymak",
    "hayatıma son vermek",
    "kendimi asmak",
    "ilaç içip ölmek"
]

class MentalConversationProvider(ABC):
    @abstractmethod
    def get_provider_name(self) -> str:
        pass

    @abstractmethod
    def is_live_llm(self) -> bool:
        pass

    @abstractmethod
    def generate_reply(
        self,
        user_message: str,
        is_driving: bool,
        history: List[Dict[str, str]],
        driver_name: str = "Ahmet Bey"
    ) -> Dict[str, Any]:
        pass


class LocalFallbackMentalProvider(MentalConversationProvider):
    """
    Harici API anahtarı olmadığında çalışan deterministik, sürüşe ve temalara duyarlı yerel sohbet sağlayıcısı.
    Kullanıcıya açıkça DEMO / YEREL sağlayıcı olduğunu bildirir.
    """

    def get_provider_name(self) -> str:
        return "LOCAL_DEMO (Yerel Kural Motoru - API Key Yok)"

    def is_live_llm(self) -> bool:
        return False

    def generate_reply(
        self,
        user_message: str,
        is_driving: bool,
        history: List[Dict[str, str]],
        driver_name: str = "Ahmet Bey"
    ) -> Dict[str, Any]:
        msg_lower = user_message.lower()

        # 1. Sürüş modu kısıtları: Kısa, sakin yanıtlar, ekrana baktırmama
        if is_driving:
            if any(w in msg_lower for w in ["stres", "yoğun", "yorgun", "bunal", "sıkıntı"]):
                reply = (
                    f"Sizi dinliyorum {driver_name}. Trafikte derin bir nefes alın ve dikkatinizi yola odaklayın. "
                    "Bu konuyu araç güvenle park edildiğinde daha ayrıntılı konuşabiliriz."
                )
            elif any(w in msg_lower for w in ["uyku", "uyuyamıyorum", "gece", "dinlenemiyorum"]):
                reply = (
                    "Yorgunluğunuzu anlıyorum. Sürüş sırasında gözlerinizi yoldan ayırmayın. "
                    "Gerekirse en yakın güvenli dinlenme alanında mola verebilirsiniz."
                )
            else:
                reply = (
                    f"Anlıyorum {driver_name}. Şu an araç hareket halinde olduğu için dikkatinizi yoldan ayırmamanız çok önemli. "
                    "Park ettiğinizde konuşmaya devam edebiliriz."
                )
            return {
                "reply": reply,
                "providerType": "LOCAL_DEMO",
                "isDriving": True,
                "detectedThemes": ["sürüş dikkati"],
                "escalationSuggested": False
            }

        # 2. Park modu kural tabanlı yanıtlar (Kullanıcının gerçek ifadelerine duyarlı)
        detected_themes = []
        if any(w in msg_lower for w in ["uyku", "uyuyamıyorum", "gece", "uyan"]):
            detected_themes.append("uyku düzensizliği")
        if any(w in msg_lower for w in ["stres", "iş", "baskı", "proje", "yetiş", "toplantı"]):
            detected_themes.append("iş stresi")
        if any(w in msg_lower for w in ["yorgun", "tüken", "halsiz", "enerji"]):
            detected_themes.append("fiziksel yorgunluk")

        if "uyku düzensizliği" in detected_themes or "iş stresi" in detected_themes:
            reply = (
                f"Paylaştığınız için teşekkür ederim {driver_name}. Son görüşmelerimizde de uyku düzeni ve iş temposu "
                "konularının öne çıktığını görüyorum. Bu döngü sürekli tekrar ediyorsa, süreci bir uzman klinik psikologla "
                "değerlendirmek iyi gelebilir. İsterseniz uygun uzman seçeneklerini bulabilirim."
            )
            escalation = True
        elif detected_themes:
            reply = (
                f"Gününüzün temposunu paylaştığınız için teşekkürler {driver_name}. Kendinize biraz mola ve dinlenme alanı açmak "
                "iyi bir başlangıç olabilir. Bu hissi daha önce ne zamanlar yaşadığınızı fark ediyor musunuz?"
            )
            escalation = False
        else:
            reply = (
                f"Sizi dinliyorum {driver_name}. Paylaşmak istediğiniz duyguları veya gününüzün nasıl geçtiğini "
                "anlatabilirsiniz. Ben sizi yargılamadan dinlemek için buradayım."
            )
            escalation = False

        return {
            "reply": reply,
            "providerType": "LOCAL_DEMO",
            "isDriving": False,
            "detectedThemes": detected_themes,
            "escalationSuggested": escalation,
            "suggestedAction": "Bir klinik psikologla görüşmek faydalı olabilir." if escalation else None
        }


class OpenAICompatibleMentalProvider(MentalConversationProvider):
    """
    OpenAI uyumlu canlı LLM sağlayıcısı.
    OPENAI_API_KEY tanımlıysa devreye girer.
    """

    def __init__(self, api_key: str, base_url: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    def get_provider_name(self) -> str:
        return f"LIVE_OPENAI ({self.model})"

    def is_live_llm(self) -> bool:
        return True

    def generate_reply(
        self,
        user_message: str,
        is_driving: bool,
        history: List[Dict[str, str]],
        driver_name: str = "Ahmet Bey"
    ) -> Dict[str, Any]:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key, base_url=self.base_url)

            system_prompt = (
                "Sen Togg araç içi Ruhsal İyi Oluş Asistanısın. Kullanıcı ile Türkçe, sıcak ve empatik konuşursun.\n"
                "KESİN KURALLAR:\n"
                "1. ASLA teşhis koyma. Psikolog, psikiyatrist veya tıp doktoru olduğunu iddia etme. İlaç yazma/önerme.\n"
                "2. Yalnızca dinleyici ve iyi oluş destekçisisin.\n"
                f"3. SÜRÜŞ DURUMU: {'ARAÇ HAREKET HALİNDE' if is_driving else 'ARAÇ PARK HALİNDE'}.\n"
                + (
                    "4. Araç hareket halinde olduğundan yanıtın MAKSİMUM 2 KISA CÜMLE (en fazla 25 kelime) olmalı. "
                    "Sürücüyü ekrana baktırma, soru sorma, dikkati yola odakla.\n"
                    if is_driving
                    else "4. Araç park halinde olduğundan kullanıcıyla derinlemesine, sakin bir diyalog kurabilirsin. "
                    "Tekrar eden stres/uyku durumunda klinik psikolog desteğini nazikçe önerebilirsin.\n"
                )
                + "5. Kullanıcı kendine zarar verme veya intihar gibi akut risk içeren bir şey söylerse sohbeti kes ve 112 Acil Çağrı Merkezini ara/aramasını öner. Randevu hatlarını asla kriz için kullanma."
            )

            messages = [{"role": "system", "content": system_prompt}]
            for h in history[-4:]:
                messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
            messages.append({"role": "user", "content": user_message})

            resp = client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=80 if is_driving else 250,
                temperature=0.7
            )
            reply_text = resp.choices[0].message.content.strip()

            return {
                "reply": reply_text,
                "providerType": "LIVE_OPENAI",
                "isDriving": is_driving,
                "escalationSuggested": "psikolog" in reply_text.lower()
            }
        except Exception as e:
            fallback = LocalFallbackMentalProvider()
            result = fallback.generate_reply(user_message, is_driving, history, driver_name)
            result["fallbackReason"] = str(e)
            result["providerType"] = "LOCAL_DEMO_FALLBACK"
            return result


# ---------------------------------------------------------------------------
# Oturum Özeti ve Tema Çıkarımı (MentalSessionAnalyzer)
# ---------------------------------------------------------------------------

class MentalSessionAnalyzer(ABC):
    @abstractmethod
    def analyze_session(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        pass


class LocalFallbackSessionAnalyzer(MentalSessionAnalyzer):
    """
    Kullanıcının gerçek diyalog metinlerinden deterministik tema ve duygu eğilimi çıkarımı.
    Sabit, ezbere tema yazmaz.
    """

    def analyze_session(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        user_utterances = [m.get("content", "") for m in messages if m.get("role") == "user"]
        combined = " ".join(user_utterances).lower()

        themes = []
        if any(w in combined for w in ["uyku", "gece", "uyan", "uyuyamıyorum", "rüya"]):
            themes.append("uyku düzeni")
        if any(w in combined for w in ["iş", "proje", "toplantı", "patron", "mesai", "çalış", "ofis"]):
            themes.append("iş yaşamı")
        if any(w in combined for w in ["aile", "çocuk", "eş", "ev", "anne", "baba", "arkadaş"]):
            themes.append("sosyal ilişkiler")
        if any(w in combined for w in ["yorgun", "tüken", "halsiz", "enerji", "bitkin"]):
            themes.append("fiziksel yorgunluk")
        if any(w in combined for w in ["kaygı", "endişe", "korku", "panik", "huzursuz"]):
            themes.append("kaygı ve endişe")
        if any(w in combined for w in ["trafik", "yol", "sürüş", "araç"]):
            themes.append("trafik gerilimi")

        if not themes:
            themes = ["günlük iyi oluş paylaşımı"]

        stress_words = ["stres", "baskı", "sıkıntı", "yoğun", "gergin", "zor"]
        relax_words = ["rahat", "iyi", "sakin", "ferah", "güzel", "teşekkür", "mutlu", "huzur", "keyif", "dinlen"]
        stress_count = sum(1 for w in stress_words if w in combined)
        relax_count = sum(1 for w in relax_words if w in combined)

        if stress_count > relax_count:
            mood_trend = "STRESSED"
        elif "fiziksel yorgunluk" in themes:
            mood_trend = "TIRED"
        elif relax_count > 0:
            mood_trend = "RELAXED"
        else:
            mood_trend = "NEUTRAL"

        support_suggested = len(themes) >= 2 and mood_trend in ["STRESSED", "TIRED"]
        support_reason = (
            "Görüşmelerinizde süregelen stres veya yorgunluk temalarının tekrar ettiği gözlemlendi. Bir klinik psikologla görüşmek faydalı olabilir."
            if support_suggested else None
        )

        summary_text = (
            f"Kullanıcı görüşmesinde öne çıkan konular: {', '.join(themes)}. "
            f"Duygu seyri '{mood_trend}' olarak gözlendi."
        )

        return {
            "summaryText": summary_text,
            "themes": themes,
            "moodTrend": mood_trend,
            "professionalSupportSuggested": support_suggested,
            "professionalSupportReason": support_reason,
            "analyzerType": "LOCAL_FALLBACK"
        }


class OpenAICompatibleSessionAnalyzer(MentalSessionAnalyzer):
    """
    Canlı LLM ile JSON schema doğrulamalı oturum özeti çıkarımı.
    """

    def __init__(self, api_key: str, base_url: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    def analyze_session(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key, base_url=self.base_url)

            prompt = (
                "Aşağıdaki kullanıcı-asistan araç içi konuşmasını analiz et ve kesinlikle geçerli tek bir JSON nesnesi üret.\n"
                "JSON formatı:\n"
                "{\n"
                '  "summaryText": "1-2 cümlelik tarafsız özet",\n'
                '  "themes": ["tema1", "tema2"],\n'
                '  "moodTrend": "STRESSED | RELAXED | TIRED | NEUTRAL",\n'
                '  "professionalSupportSuggested": true | false,\n'
                '  "professionalSupportReason": "Klinik öneri gerekçesi veya null"\n'
                "}\n"
                "Konuşma Geçmişi:\n"
                + "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages])
            )

            resp = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            data = json.loads(resp.choices[0].message.content)
            data["analyzerType"] = "LIVE_LLM"
            return data
        except Exception as e:
            fallback = LocalFallbackSessionAnalyzer()
            res = fallback.analyze_session(messages)
            res["fallbackReason"] = str(e)
            return res


# ---------------------------------------------------------------------------
# İki Katmanlı Kriz Güvenlik Filtresi
# ---------------------------------------------------------------------------

def check_mental_crisis(text: str, is_driving: bool, live_client: Optional[Any] = None) -> Dict[str, Any]:
    """
    İki Katmanlı Kriz Denetimi:
    Katman 1: Öncelikli, anlık deterministik anahtar kelime taraması (pre-LLM).
    Katman 2: Yapılandırılmış güvenlik seviyesi.
    """
    lower = text.lower()
    
    # 1. Katman: Deterministik Anahtar Kelime Koruması
    for kw in CRISIS_KEYWORDS:
        if kw in lower:
            if is_driving:
                reply = (
                    "Söyledikleriniz benim için çok önemli ve zor bir andan geçtiğinizi anlıyorum. "
                    "Ancak ben acil durum servisi değilim. Lütfen ekrana bakmayın. "
                    "Mümkün olduğunda aracınızı hemen güvenli bir yerde durdurun ve 112 Acil Çağrı Merkezini arayın. Yalnız değilsiniz."
                )
            else:
                reply = (
                    "Söyledikleriniz benim için çok önemli ve şu an çok zor bir süreçten geçtiğinizi anlıyorum. "
                    "Ancak ben bir acil durum veya sağlık servisi değilim. Lütfen şu an güvende kalmak için gecikmeden "
                    "112 Acil Çağrı Merkezi ile iletişime geçin. Yalnız değilsiniz, profesyonel uzmanlar size yardımcı olmak için hazır."
                )
            return {
                "isCrisis": True,
                "riskLevel": "IMMINENT",
                "selfHarmSignal": True,
                "violenceSignal": False,
                "needsEmergencyEscalation": True,
                "emergencyContact": "112 Acil Çağrı Merkezi",
                "reply": reply,
                "drivingModeResponse": is_driving,
                "clinicalDisclaimer": "Bu güvenlik değerlendirmesi klinik olarak valide edilmiş bir tanı sistemi değildir."
            }

    return {
        "isCrisis": False,
        "riskLevel": "NONE",
        "selfHarmSignal": False,
        "violenceSignal": False,
        "needsEmergencyEscalation": False,
        "clinicalDisclaimer": "Bu güvenlik değerlendirmesi klinik olarak valide edilmiş bir tanı sistemi değildir."
    }


def get_active_mental_provider() -> MentalConversationProvider:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and api_key.strip():
        base_url = os.getenv("OPENAI_BASE_URL")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return OpenAICompatibleMentalProvider(api_key=api_key.strip(), base_url=base_url, model=model)
    return LocalFallbackMentalProvider()


def get_active_session_analyzer() -> MentalSessionAnalyzer:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and api_key.strip():
        base_url = os.getenv("OPENAI_BASE_URL")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return OpenAICompatibleSessionAnalyzer(api_key=api_key.strip(), base_url=base_url, model=model)
    return LocalFallbackSessionAnalyzer()
