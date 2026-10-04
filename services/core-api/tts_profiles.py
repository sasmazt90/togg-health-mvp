"""Exact consumer Edge profiles; no alternate provider or voice fallback.

Giuseppe -10 Hz is the smallest tested downward offset, not a mapping of
Clipchamp Low. See the bounded comparison and pending auditory acceptance.
"""
from dataclasses import dataclass

@dataclass(frozen=True)
class SpeechProfile:
    voice: str
    rate: str
    pitch: str

VISION_TTS_PROFILE = SpeechProfile('it-IT-GiuseppeMultilingualNeural', '+20%', '-10Hz')
MENTAL_WELLBEING_TTS_PROFILE = SpeechProfile('en-US-AvaMultilingualNeural', '+10%', '+0Hz')
