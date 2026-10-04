"""Bounded Edge streaming with exact profiles and disconnect cleanup.
The vision route accepts fixed instructions only; mental text requires consent.
"""
import asyncio
from time import monotonic
import edge_tts
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from tts_profiles import VISION_TTS_PROFILE, MENTAL_WELLBEING_TTS_PROFILE
VOICE=VISION_TTS_PROFILE.voice
PROMPTS={
 'prepare':'Kamera hazırlanıyor. Kameraya bakın ve bulunduğunuz konumu koruyun.',
 'right':'Sağ gözünüz açık kalsın. Sol gözünüzü kapatın. Harfi ve yönünü söyleyin.',
 'left':'Sol gözünüz açık kalsın. Sağ gözünüzü kapatın. Harfi ve yönünü söyleyin.',
 'letter':'Harfi tekrar söyler misiniz?',
 'orientation':'Hangi yöne dönük olduğunu da söyler misiniz?',
 'reverse':'Ters derken baş aşağı mı, aynalı mı demek istediniz?',
 'repeat':'Harfi ve yönünü söyleyin. Düz, baş aşağı, sağa veya sola yatmış diyebilirsiniz.',
 'position':'Başlangıç konumunuza dönün ve kameraya bakın.',
 'camera':'Kameranın önünde, iyi ışıkta durun.',
 'eye':'Yönergede istenen göz açık, diğer göz kapalı kalmalı.',
 'uncertain':'Gözlerinizi kameranın görebileceği şekilde tutun.',
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
 result=OwnedSpeechResponse(body(),media_type='audio/mpeg',headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Server-Timing':f'tts_first;dur={(monotonic()-started)*1000:.1f}'})
 result.provider_iterator=iterator
 return result
