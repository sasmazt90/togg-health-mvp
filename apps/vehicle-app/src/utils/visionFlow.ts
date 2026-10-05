import type { Eye } from './spokenVision';
export type VisionStage='idle'|'preparing'|'eye-instruction'|'eye-check'|'rendering'|'prompting'|'listening'|'condition-paused'|'user-paused'|'result'|'error';
/** The controller uses this state for both UI and all async admission gates. */
export class VisionFlow {
 stage:VisionStage='idle';version=0;sessionId='';presentationId='';eye:Eye='RIGHT';instructionEye:Eye|null=null;reason='';
 transition(stage:VisionStage,reason=''){if(this.stage!==stage||this.reason!==reason){this.stage=stage;this.reason=reason;this.version++;}}
 start(sessionId:string){this.sessionId=sessionId;this.presentationId='';this.instructionEye=null;this.eye='RIGHT';this.transition('preparing');}
 token(){return `${this.sessionId}/${this.presentationId}/${this.eye}/${this.version}`;}
 matches(token:string){return token===this.token();}
 gatedEye(currentEye:Eye){return this.instructionEye===currentEye?currentEye:null;}
 get letterVisible(){return !!this.presentationId&&['rendering','prompting','listening'].includes(this.stage);}
 get canAnswer(){return this.stage==='listening'&&this.letterVisible;}
 reset(){this.sessionId='';this.presentationId='';this.instructionEye=null;this.transition('idle');}
}
export function eyeInstruction(eye:Eye){return eye==='RIGHT'?'Sağ gözünüzü test ediyoruz. Sol gözünüzü kapatın veya örtün.':'Sol gözünüzü test ediyoruz. Sağ gözünüzü kapatın veya örtün.';}
