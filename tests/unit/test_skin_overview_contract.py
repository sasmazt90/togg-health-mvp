"""Overview provenance, legacy compatibility and no duplicated source weighting."""
from pathlib import Path
import json,subprocess,sys
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'services/core-api'))
from skin_general import general_result

def test_union_score_not_average_of_overlapping_region_scores():
    valid=np.ones((20,20),bool);masks={k:valid for k in ['forehead','rightCheek','leftCheek','chin','nose']}
    tone=np.zeros((20,20),np.float32);tone[:10]=20
    result=general_result({},masks,valid,tone,tone,tone/100,tone/100,{'sourcePixels':400,'analysisPixels':400},{},True)
    rows={r['id']:r for r in result['measurements']}
    assert rows['tone']['value']==10 and rows['tone']['components']['uniqueAnalysisPixels']==400
    assert rows['sag']['value'] is None and rows['bags']['value'] is None
    assert result['skinType']['value'] is None
    invalid=general_result({},masks,valid,tone,tone,tone/100,tone/100,{'sourcePixels':400},{},False)
    assert all(r['value'] is None for r in invalid['measurements'])

def test_new_overview_and_old_six_views_stay_distinct():
    script=r'''
require('./tests/unit/ts_loader.js');
const assert=require('assert/strict'),v=require('./apps/vehicle-app/src/utils/skinOverview.ts');
const old={schemaVersion:3,indicators:{}};assert.equal(v.skinViewOrder(old).length,6);assert.equal(old.general,undefined);
const legacy={indicators:{forehead:[{id:'sag',score:.02,appearance:{type:'longitudinal_measurement',unit:'normalized-contour-ratio'}}]}};
assert.strictEqual(v.buildSkinViewModel('forehead',legacy).indicators,legacy.indicators.forehead);
assert.equal(v.buildSkinViewModel('forehead',legacy).indicators[0].score,.02);
assert.equal(v.skinViewOrder(legacy).length,6);assert.equal(legacy.general,undefined);
const general={schemaVersion:1,analysisId:'analysis-a',captureId:'a'.repeat(64),pose:'FRONT',normalizationVersion:'fixed-v1',sourceTransform:{sourceWidth:1280,sourceHeight:720,coordinateSpace:'source-pixels'},skinType:{value:null,quality:'insufficient',confidence:null,methodVersion:'unavailable',modelHash:null},indicators:['tone','oil','redness','acne','sag','dry','lines','dark','bags'].map(id=>({id,score:null,measurement:{scope:'whole-face',region:'overview',methodVersion:'source-v1',rawValue:null,quality:'insufficient',unavailableReason:'NO_SUPPORT'}}))};
const current={...old,id:'analysis-a',general};assert.equal(v.skinViewOrder(current).length,7);assert.equal(v.skinViewOrder(current)[0],'overview');
assert.equal(v.buildSkinViewModel('overview',current).index,1);assert.equal(v.buildSkinViewModel('forehead',current).index,2);assert.equal(v.buildSkinViewModel('forehead',old).index,1);
assert(v.validSkinOverview(general,'analysis-a'));assert(!v.validSkinOverview(general,'analysis-b'));
general.skinType.value='oily';assert(!v.validSkinOverview(general,'analysis-a'));general.skinType.value=null;
general.indicators[0].score=NaN;assert(!v.validSkinOverview(general,'analysis-a'));
'''
    result=subprocess.run(['node','-e',script],cwd=ROOT,text=True,capture_output=True,timeout=30)
    assert result.returncode==0,result.stdout+result.stderr
