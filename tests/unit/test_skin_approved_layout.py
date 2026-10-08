"""Compare approved d572675 and current default result markup, not a new design."""
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def test_existing_layout_styles_and_visible_content_are_preserved():
 script=r'''
const fs=require('fs'),cp=require('child_process'),ts=require('typescript'),Module=require('module'),assert=require('assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function load(path,source,stubs={}){const m=new Module(path,module);m.paths=module.paths;m.require=id=>id in stubs?stubs[id]:require(id);m._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,path);return m.exports;}
const prefix='apps/vehicle-app/src/',surface=load('surface',fs.readFileSync(prefix+'utils/skinSurfaceAnalysis.ts','utf8'));
const region={id:'forehead',nameTr:'Alin',metrics:{},indicators:[{id:'redness',label:'Redness',score:25.4,reason:'Pixel index'},{id:'oil',label:'Oil',score:null,reason:'No independently accepted measurement'}]};
const snapshot={width:640,height:480,angle:'FRONT',crop:{x:200,y:100,width:200,height:300},dataUrl:'data:image/png;base64,unchanged',meshes:{forehead:{points:[{x:250,y:150},{x:300,y:150},{x:280,y:200}],edges:[[0,1],[1,2],[0,2]],major:[0],boundary:[],excluded:[]}},exclusions:[],photoId:'photo',localAnalysis:{loadMs:1,analysisMs:2,allocatedBytes:3}};
for(const component of ['SkinRegionSummary','SkinFacePanel']){
 const path=prefix+'components/skin/'+component+'.tsx',stubs={'../InformationButton':{InformationButton:()=>null},'next/image':{default:()=>null},'./SkinRegionNavigator':{SkinRegionNavigator:()=>React.createElement('nav',null,'Existing navigation')},'../CameraPreparation':{cameraCrop:()=>({})},'../../utils/cameraStability':{StablePreviewCrop:class{}},'../../utils/skinSurfaceAnalysis':surface};
 const props={currentRegion:region,snapshot,onPrev:()=>{},onNext:()=>{},onOpenModal:()=>{},onNavigateToCare:()=>{},onSelectCriterion:()=>{},selectedCriterion:null};
 const old=load(path,cp.execFileSync('git',['show','d572675:'+path],{encoding:'utf8'}),stubs)[component],now=load(path,fs.readFileSync(path,'utf8'),stubs)[component];
 const html=x=>renderToStaticMarkup(React.createElement(x,props)).replace(/ (?:data-snapshot-photoid|data-local-analysis|tabindex|aria-pressed)="[^"]*"/g,'').replace(/ role="button"/g,'');
 assert.equal(html(now),html(old),component+' approved default markup must be identical apart from selection semantics and hidden provenance attributes');
}
'''
 r=subprocess.run(['node','-e',script],cwd=ROOT,text=True,capture_output=True,encoding='utf8');assert r.returncode==0,r.stdout+r.stderr
