"""Bounded Edge streaming with exact profiles and disconnect cleanup.
The vision route accepts fixed instructions only; mental text requires consent.
"""
import asyncio
import unicodedata
from time import monotonic
import edge_tts
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from tts_profiles import VISION_TTS_PROFILE, MENTAL_WELLBEING_TTS_PROFILE
VOICE=VISION_TTS_PROFILE.voice
PROMPTS={
 'prepare':'Kamera hazırlanıyor. İki gözünüz açık, yüzünüz görüntüde olsun. Bulunduğunuz mesafeyi koruyun.',
 'right':'Sağ gözünüzü test ediyoruz. Sağ gözünüz açık kalsın. Sol gözünüzü kapatın veya örtün. Açık gözünüzle harf alanına bakın.',
 'left':'Sol gözünüzü test ediyoruz. Sol gözünüz açık kalsın. Sağ gözünüzü kapatın veya örtün. Açık gözünüzle harf alanına bakın.',
 'letter':'Harfi söyler misiniz? O harfle başlayan bir kelime de kullanabilirsiniz.',
 'orientation':'Harfin hangi yöne dönük olduğunu söyler misiniz?',
 'reverse':'Baş aşağı mı, aynalı mı?',
 'repeat':'Ekrandaki harfi ve yönünü söyleyin.',
 'first':'Harf alanına bakın. Harfi ve yönünü istediğiniz sırada söyleyin. Yön ile birlikte, gördüğünüz harfle başlayan bir kelime söyleyebilirsiniz. Harf görünüyorsa yönergenin bitmesini beklemeniz gerekmez.',
 'next1':'Şimdi bu harfi ve yönünü söyleyin.',
 'next2':'Lütfen sıradaki harfi aynı şekilde okuyun.',
 'next3':'Sıradaki harfi ve yönünü okuyun.',
 'position':'Başlangıç mesafenizi koruyun. Harf alanına bakabilirsiniz.',
 'approach':'Biraz yaklaşın.',
 'recede':'Biraz geriye gidin.',
 'pose':'Başlangıç mesafenizi koruyun. Harf alanına bakabilirsiniz.',
 'framing':'Alın ve çeneniz kadrajda kalacak şekilde yüzünüzü ortalayın.',
 'light':'Yüzünüzü daha iyi aydınlatın.',
 'bright':'Yüzünüzdeki parlamayı azaltın.',
 'blur':'Kamera netliğini ve yüz aydınlatmasını kontrol edin.',
 'motion':'Kısa süre başınızı sabit tutun.',
 'face':'Yüzünüzü kameraya gösterin.',
 'preparing':'Konumunuz doğrulanıyor. Kısa süre sabit durun.',
 'ready':'Konum hazır.',
 'camera':'Kameranın önünde, iyi ışıkta durun.',
 'eye':'Test edilen göz açık, diğer göz kapalı veya örtülü kalmalı.',
 'uncertain':'Göz örtüsünü veya göz açıklığını kontrol edemiyorum.',
 'paused':'Görev duraklatıldı. Devam et diyerek sürdürebilirsiniz.',
 'complete':'Harf tanıma görevi tamamlandı.'
}
class OwnedSpeechResponse(StreamingResponse):
 async def __call__(self,scope,receive,send):
  try:await super().__call__(scope,receive,send)
  finally:await self.provider_iterator.aclose()

_catalogue=(0.,frozenset())
async def response(code,moving):
 if code not in PROMPTS:raise HTTPException(status_code=422,detail='FIXED_INSTRUCTION_REQUIRED')
 return await speech_response(PROMPTS[code],VISION_TTS_PROFILE,moving)

async def mental_response(text,moving):
 return await speech_response(text,MENTAL_WELLBEING_TTS_PROFILE,moving)

async def speech_response(text,profile,moving):
 global _catalogue
 iterator=None
 # Normalize once for the whole utterance; transport frames never trigger a
 # second voice request. No hidden language hints, extra text or MP3 joins.
 text=unicodedata.normalize('NFC',text).strip()
 try:
  if monotonic()-_catalogue[0]>300 or not _catalogue[1]:
   voices=await asyncio.wait_for(edge_tts.list_voices(),12)
   _catalogue=(monotonic(),frozenset(v['ShortName'] for v in voices))
  if profile.voice not in _catalogue[1]:raise HTTPException(status_code=503,detail='EXACT_MICROSOFT_VOICE_UNAVAILABLE:'+profile.voice)
  if moving():raise HTTPException(status_code=409,detail='PARK_REQUIRED')
  started=monotonic();iterator=edge_tts.Communicate(text,profile.voice,rate=profile.rate,pitch=profile.pitch).stream()
  while True:
   item=await asyncio.wait_for(anext(iterator),18)
   if item['type']=='audio':first=item['data'];break
  if moving():raise HTTPException(status_code=409,detail='PARK_REQUIRED')
 except Exception as error:
  if iterator:await iterator.aclose()
  if isinstance(error,HTTPException):raise
  raise HTTPException(status_code=503,detail='MICROSOFT_SPEECH_UNAVAILABLE') from None
 async def body():
  try:
   if not moving():yield first
   while True:
    try:part=await asyncio.wait_for(anext(iterator),18)
    except StopAsyncIteration:return
    if moving():return
    if part['type']=='audio':yield part['data']
  finally:await iterator.aclose()
 result=OwnedSpeechResponse(body(),media_type='audio/mpeg',headers={'Cache-Control':'no-store','X-TTS-Voice':profile.voice,'X-TTS-Rate':profile.rate,'X-TTS-Pitch':profile.pitch,'X-Content-Type-Options':'nosniff','Server-Timing':f'tts_first;dur={(monotonic()-started)*1000:.1f}'})
 result.provider_iterator=iterator
 return result
