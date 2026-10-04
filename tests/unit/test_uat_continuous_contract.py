"""New descriptive protocol, fail-closed camera conditions, actual TS math.

These are contract tests, not evidence of clinical validation or live capture.
Legacy four-way geometry/staircase tests remain unchanged.
"""
import json,subprocess
from pathlib import Path
import pytest

ROOT=Path(__file__).resolve().parents[2]

def run_module(script):
    bootstrap=r"""
const fs=require('fs'),ts=require('typescript'),path=require('path');
const out=path.resolve('audit-results/uat-contracts');fs.mkdirSync(out,{recursive:true});
for(const name of ['continuousVision','spokenText'])fs.writeFileSync(out+'/'+name+'.mjs',ts.transpileModule(fs.readFileSync('apps/vehicle-app/src/utils/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
(async()=>{const assert=require('assert/strict'),V=await import('file:///'+out.replaceAll('\\','/')+'/continuousVision.mjs'),S=await import('file:///'+out.replaceAll('\\','/')+'/spokenText.mjs');
"""+script+"\n})().catch(e=>{console.error(e);process.exit(1)});"
    subprocess.run(['node','-e',bootstrap],cwd=ROOT,check=True,capture_output=True,text=True,encoding='utf-8')

@pytest.mark.parametrize('target,response,error',[(359,1,2),(1,359,2),(0,0,0),(0,180,180),(45.25,46.1,.85),(720,-360,0),(182.8,2.8,180)])
def test_continuous_circular_error(target,response,error):
    run_module(f"assert(Math.abs(V.circularError({target},{response})-{error})<1e-9);")

def test_no_hidden_snapping_and_visibility_is_not_an_angle():
    run_module("""
for(let i=0;i<1000;i++){const angle=V.randomAngle();assert(angle>=0&&angle<360);if(i===999)assert(angle%45!==0);}
const conditions={observedAt:1000,cameraLive:true,modelActive:true,faceCount:1,qualityValid:true,positionValid:true,relativeScaleChange:0,eye:'RIGHT',eyeEvidence:'unsupported'};
const summary=V.summarizeContinuousTrials([{visibility:'visible',minimumCircularError:12},{visibility:'not-visible',minimumCircularError:null},{visibility:'not-visible',minimumCircularError:null}]);
assert.equal(summary.validTrials,3);assert.equal(summary.notVisible,2);assert.equal(summary.meanAngularError,12);assert(!('logMAR' in summary));assert(!('referral' in summary));
assert.equal(V.summarizeContinuousTrials([{visibility:'not-visible',minimumCircularError:null}]).meanAngularError,null);
const session=new V.ContinuousVisionSession();assert(!session.respond(null,false,conditions,1000));assert(!session.respond(45,true,conditions,1000));assert.equal(session.trials.length,0);
""")

@pytest.mark.parametrize('change',[{'observedAt':0},{'cameraLive':False},{'modelActive':False},{'faceCount':0},{'faceCount':2},{'qualityValid':False},{'positionValid':False},{'relativeScaleChange':.081},{'relativeScaleChange':None},{'eyeEvidence':'both-open'},{'eyeEvidence':'wrong-eye'},{'eyeEvidence':'uncertain'},{'eyeEvidence':'unsupported'}])
def test_invalid_camera_and_occlusion_conditions_never_advance(change):
    run_module("const base={observedAt:1000,cameraLive:true,modelActive:true,faceCount:1,qualityValid:true,positionValid:true,relativeScaleChange:0,eye:'RIGHT',eyeEvidence:'unsupported'};const conditions={...base,..."+json.dumps(change)+"};assert(V.conditionFailure(conditions,1100));const session=new V.ContinuousVisionSession();const target=session.targetAngle;assert(!session.respond(null,false,conditions,1100));assert(!session.respond(29.3,true,conditions,1100));assert.equal(session.trials.length,0);assert.equal(session.targetAngle,target);")

def test_manual_calibration_context_and_no_scale_floor():
    run_module("""
const context={width:1920,height:1080,dpr:1,viewportScale:1};const c={version:1,method:'manual-card',pixelsPerMm:80/85.6,context};assert(V.calibrationMatches(c,context));assert(c.pixelsPerMm<2);
for(const change of [{dpr:2},{viewportScale:2},{width:1600},{height:900}])assert(!V.calibrationMatches(c,{...context,...change}));assert(!V.calibrationMatches({...c,pixelsPerMm:NaN},context));
""")

@pytest.mark.parametrize('source,expected',[
    ('**Sakin** bir _adım_.','Sakin bir adım.'),
    ('1. 112’yi arayın.\n2. Saat 13.45.','1. 112’yi arayın.\n2. Saat 13.45.'),
    ('[Güvenli metin](javascript:alert(1))','Güvenli metin'),
    ('<script>alert(1)</script>\n\nİyi misiniz?','İyi misiniz?'),
    ('### Türkçe\n\n**İyi** &amp; açık.','Türkçe\nİyi & açık.'),
    ('`a*b` ve %30, 1.25.','a*b ve %30, 1.25.'),
])
def test_markdown_ast_preserves_meaning_without_html(source,expected):
    run_module('assert.equal(S.spokenText('+json.dumps(source)+'),'+json.dumps(expected)+');')
