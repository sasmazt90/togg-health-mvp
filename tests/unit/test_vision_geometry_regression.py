import json
from pathlib import Path
import subprocess


def test_production_engine_preserves_physical_sizes_without_display_floors(tmp_path):
    root=Path(__file__).resolve().parents[2]
    script=r"""
const fs=require('fs'),ts=require('typescript'),assert=require('assert');
const output=JSON.parse(fs.readFileSync(0,'utf8')).output;
fs.writeFileSync(output,ts.transpileModule(fs.readFileSync('apps/vehicle-app/src/utils/visionEngine.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText);
const Engine=require(output).VisionStaircaseController;
for(const distance of [50,55,60]) for(const logMAR of [-0.1,0,0.2,0.3,0.8]) {
 const size=Engine.calculateOptotypeSizeMm(distance,logMAR);
 const expected=5*distance*10*Math.tan(10**logMAR/60*Math.PI/180);
 assert(Math.abs(size-expected)<1e-9);
 assert(Math.abs(Engine.mmToPixels(size,324/85.6)-expected*324/85.6)<1e-9);
}
"""
    subprocess.run(['node','-e',script],cwd=root,check=True,
                   input=json.dumps({'output':str(tmp_path/'engine.cjs')}),text=True,encoding='utf-8')
