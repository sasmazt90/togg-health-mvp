"""State/scoring contracts supplement, and never replace, pixel acceptance."""
from test_spoken_letter_product import run

def test_trial_token_changes_on_pause_eye_and_restart(tmp_path):
 run(tmp_path,"""
const F=load('visionFlow');const f=new F.VisionFlow();f.start('first');const prep=f.token();
assert(!f.letterVisible&&!f.canAnswer);f.instructionEye='RIGHT';f.transition('eye-check');assert(!f.matches(prep));
f.presentationId='a';f.transition('rendering');assert(f.letterVisible&&!f.canAnswer);const rendering=f.token();
f.transition('prompting');assert(!f.matches(rendering)&&!f.canAnswer);f.transition('listening');assert(f.canAnswer);const listening=f.token();
f.transition('condition-paused');assert(!f.canAnswer&&!f.letterVisible&&!f.matches(listening));f.eye='LEFT';assert(!f.matches(listening));
f.start('second');assert(!f.matches(listening));f.instructionEye='RIGHT';assert.equal(f.gatedEye('LEFT'),null);assert.equal(f.gatedEye('RIGHT'),'RIGHT');assert(F.eyeInstruction('RIGHT').includes('Sol gözünüzü kapatın veya örtün'));
assert(F.eyeInstruction('LEFT').includes('Sağ gözünüzü kapatın veya örtün'));
""")

def test_head_anchor_policy_not_legacy_scale_or_motion_override(tmp_path):
 run(tmp_path,"""
const policy={...c,distancePolicy:'head-anchors-hysteresis-v1',distanceState:'stable',relativeScaleChange:.12,motionStable:false};
assert.equal(V.letterConditionFailure(policy,'RIGHT',1100),null);
assert(V.letterConditionFailure({...policy,positionValid:false,distanceState:'near'},'RIGHT',1100));
assert(V.letterConditionFailure({...policy,relativeScaleChange:null},'RIGHT',1100));
assert.equal(V.letterConditionFailure({...policy,left:{...closed,state:'covered'}},'RIGHT',1100),null);
assert(V.letterConditionFailure({...policy,right:{...open,state:'covered'}},'RIGHT',1100));
assert(V.letterConditionFailure({...policy,left:{...closed,state:'uncertain'}},'RIGHT',1100));
""")

def test_paused_tts_and_user_wait_excluded_from_response(tmp_path):
 run(tmp_path,"""
const s=new V.SpokenLetterSession();s.present(100);s.beginResponse(1000);s.suspendResponse(1100);
s.beginResponse(10000);s.suspendResponse(10150);s.beginResponse(20000);
const cc={...c,observedAt:20000};assert(s.respond({letter:s.letter,orientation:s.orientation},cc,20050,s.presentationId));
assert.equal(s.trials[0].responseTimeMs,300);assert(!s.respond({letter:s.letter,orientation:s.orientation},cc,20050,s.presentationId));
""")

def test_eye_instruction_cannot_request_missing_stimulus():
 import vision_speech
 for eye in ['right','left']:
  assert 'Harfi' not in vision_speech.PROMPTS[eye]
  assert 'veya örtün' in vision_speech.PROMPTS[eye]
 assert 'Harfi ve yönünü söyleyin' in vision_speech.PROMPTS['repeat']

def test_blink_hold_and_distance_hysteresis_contract(tmp_path):
 run(tmp_path,"""
load('skinAnalyzer');load('visionFrameQuality');const T=load('visionTracking');
const e=new T.SustainedEyeState();assert.equal(e.update('closed',0).state,'uncertain');assert.equal(e.update('closed',200).state,'uncertain');e.update('open',220);
assert.equal(e.update('closed',300).state,'uncertain');e.update('closed',500);e.update('closed',700);assert.equal(e.update('closed',899).state,'uncertain');assert.equal(e.update('closed',900).state,'closed');
assert.equal(e.update('covered',1000).state,'uncertain');e.update('covered',1200);e.update('covered',1400);assert.equal(e.update('covered',1600).state,'covered');assert.equal(e.update('uncertain',1700).state,'uncertain');e.update('closed',1800);assert.equal(e.update('closed',2500).state,'uncertain');
const d=new T.HeadDistanceHysteresis();assert.equal(d.update(.06,0),'stable');assert.equal(d.update(.16,100),'stable');d.update(.16,300);d.update(.16,500);assert.equal(d.update(.16,699),'stable');assert.equal(d.update(.16,700),'near');
assert.equal(d.update(.12,800),'near');assert.equal(d.update(null,900),'unknown');assert.equal(d.update(.12,1000),'near');assert.equal(d.update(.09,1100),'near');d.update(.09,1300);assert.equal(d.update(.09,1450),'stable');
assert.equal(d.update(-.16,1500),'stable');d.update(-.16,1700);d.update(-.16,1900);assert.equal(d.update(-.16,2100),'far');
""")
