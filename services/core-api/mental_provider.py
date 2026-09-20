"""
Mental Wellbeing Conversation Provider & Safety Engine
Lisans: UNLICENSED

Sağlayıcı Soyutlaması:
- MentalConversationProvider (ABC)
- OpenAICompatibleMentalProvider (Canlı LLM - API key varsa)
- LocalFallbackMentalProvider (API key yoksa açıkça Demo/Yerel çalışan kural motoru)

Kriz Güvenliği:
- Yalnızca 112 Acil Çağrı Merkezi.
- 182 kriz hattı olarak KESİNLİKLE kullanılmaz.
- Araç sürüş halindeyken ekrana baktırmama ve güvenle durma protokolü.
"""

import os
import re
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
        is_driving: boolean if "boolean" in dir() else bool,
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

        # 2. Park modu kural tabanlı yanıtlar
        detected_themes = []
        if any(w in msg_lower for w in ["uyku", "uyuyamıyorum", "gece", "uyan"]):
            detected_themes.append("uyku düzensizliği")
        if any(w in msg_lower for w in ["stres", "iş", "baskı", "proje", "yetiş", "toplantı"]):
            detected_themes.append("iş stresi")
        if any(w in msg_lower for w in ["yorgun", "tüken", "halsiz", "enerji"]):
            detected_themes.append("süregelen yorgunluk")

        if "uyku düzensizliği" in detected_themes or "iş stresi" in detected_themes:
            reply = (
                f"Paylaştığınız için teşekkür ederim {driver_name}. Son görüşmelerimizde de uyku düzeni ve iş temposu "
                "konularının öne çıktığını görüyorum. Bu döngü sürekli tekrar ediyorsa, süreci bir uzman klinik psikologla "
                "değerlendirmek iyi gelebilir. Randevu seçeneklerine göz atmak ister misiniz?"
            )
            escalation = True
        elif detected_themes:
            reply = (
                f"Gününüzün temposunu paylaştığınız için teşekkürler. Kendinize biraz mola ve dinlenme alanı açmak "
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
            "suggestedAction": "Bir klinik psikologla görüşmeniz faydalı olabilir." if escalation else None
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
                "1. ASLA teşhis koyma. Psikolog, psikiyatrist veya doktor olduğunu iddia etme. İlaç yazma/önerme.\n"
                "2. Yalnızca dinleyici ve iyi oluş destekçisisin.\n"
                f"3. SÜRÜŞ DURUMU: {'ARAÇ HAREKET HALİNDE' if is_driving else 'ARAÇ PARK HALİNDE'}.\n"
                + (
                    "4. Araç hareket halinde olduğundan yanıtın MAKSİMUM 2 KISA CÜMLE olmalı. "
                    "Sürücüyü ekrana baktırma, soru sorma, dikkati yola odakla.\n"
                    if is_driving
                    else "4. Araç park halinde olduğundan kullanıcıyla derinlemesine, sakin bir diyalog kurabilirsin. "
                    "Tekrar eden stres/uyku durumunda klinik psikolog desteğini nazikçe önerebilirsin.\n"
                )
                + "5. Kullanıcı kendine zarar verme veya intihar gibi akut risk içeren bir şey söylerse sohbeti kes ve 112 Acil Çağrı Merkezini ara/aramasını öner. 182'yi asla kriz için kullanma."
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
            # Canlı sağlayıcıda ağ/anahtar hatası olursa zarifçe yerel sağlayıcıya düş
            fallback = LocalFallbackMentalProvider()
            result = fallback.generate_reply(user_message, is_driving, history, driver_name)
            result["fallbackReason"] = str(e)
            result["providerType"] = "LOCAL_DEMO_FALLBACK"
            return result


def check_mental_crisis(text: str, is_driving: bool) -> Dict[str, Any]:
    """
    Ruhsal kriz ve güvenlik denetimi.
    Deterministic keyword check + driving constraint.
    """
    lower = text.lower()
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
                "reply": reply,
                "drivingModeResponse": is_driving
            }
    return {"isCrisis": False}


def get_active_mental_provider() -> MentalConversationProvider:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and api_key.strip():
        base_url = os.getenv("OPENAI_BASE_URL")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        return OpenAICompatibleMentalProvider(api_key=api_key.strip(), base_url=base_url, model=model)
    return LocalFallbackMentalProvider()
