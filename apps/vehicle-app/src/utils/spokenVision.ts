/** Target-independent Turkish parsing and a nonclinical letter task. */
export const LETTER_PROTOCOL='spoken-letter-v1';
export type Orientation='upright'|'right'|'down'|'left'|'mirror';
export type Letter='A'|'B'|'E'|'F'|'P'|'R';
export type Eye='RIGHT'|'LEFT';
export const LETTER_PATHS:Record<Letter,string>={
 A:'M15 90L50 10L85 90M29 60H71', B:'M20 90V10H55C85 10 85 50 55 50H20M55 50C90 50 90 90 55 90H20',
 E:'M80 10H20V90H80M20 50H70', F:'M80 10H20V90M20 50H70',
 P:'M20 90V10H55C90 10 90 50 55 50H20', R:'M20 90V10H55C90 10 90 50 55 50H20M55 50L85 90'
};
export type ParsedAnswer={command?:'not-visible'|'repeat'|'pause'|'resume'|'finish';letter?:Letter;orientation?:Orientation;clarify?:'letter'|'orientation'|'reverse'};
/** Native recognition may finalize a letter and its direction separately.
 * Join only explicit fragments from the same live presentation; never infer
 * either field from its target. Reverse ambiguity still needs clarification. */
export function mergeLetterAnswer(partial:ParsedAnswer,answer:ParsedAnswer):ParsedAnswer{
 const merged={...answer,letter:answer.letter||partial.letter,orientation:answer.orientation||partial.orientation};
 if(merged.letter&&merged.orientation&&answer.clarify!=='reverse')delete merged.clarify;
 return merged;
}
/** Fixed guidance never names the displayed target. Ignore its imperative
 * phrases if the microphone hears the speaker, while retaining short user
 * answers and commands, including either letter/direction order. */
export function isLetterInstructionEcho(text:string){
 const value=text.toLocaleLowerCase('tr-TR').normalize('NFKC').replace(/[^a-zçğıöşü ]/g,' ').replace(/\s+/g,' ').trim();
 if(/harf alanına bakın|harfi ve yönünü söyleyin|harfi şehir adıyla|yönünü ekleyebilirsiniz|yönünü belirtin|ters ifadesi belirsiz|sırası önemli değil|diyebilirsiniz|söyler misiniz|demek istediniz/.test(value))return true;
 const instructions=['harf alanına bakın harfi ve yönünü söyleyin sırası önemli değil düz baş aşağı sağa veya sola yatmış diyebilirsiniz','harfi şehir adıyla kodlayarak söyleyin yönünü ekleyebilirsiniz','hangi yöne dönük olduğunu da söyler misiniz','ters derken baş aşağı mı aynalı mı demek istediniz'];
 return value.split(' ').length>=3&&instructions.some(line=>line.includes(value));
}
export function parseLetterAnswer(text:string):ParsedAnswer {
 const value=text.toLocaleLowerCase('tr-TR').normalize('NFKC').replace(/[^a-zçğıöşü ]/g,' ').replace(/\s+/g,' ').trim();
 if(/göremiyorum|ayırt edemiyorum/.test(value))return {command:'not-visible'};
 if(/bitir|sonlandır/.test(value))return {command:'finish'};
 if(/devam et|sürdür/.test(value))return {command:'resume'};
 if(/duraklat|bekle/.test(value))return {command:'pause'};
 if(/tekrar|yeniden söyle/.test(value))return {command:'repeat'};
 const aliases:Record<Letter,string[]>={A:['a','adana','ahmet'],B:['b','be','bursa','bolu'],E:['e','edirne'],F:['f','fe','efe','fatsa'],P:['p','pe','polatlı','pınar'],R:['r','re','rize','recep']};
 const tokens=value.split(' ');const letters=(Object.keys(aliases) as Letter[]).filter(l=>aliases[l].some(alias=>tokens.includes(alias)));
 const directions:Orientation[]=[];
 if(/düz|normal|dik/.test(value))directions.push('upright');
 if(/sağa|sağ yat|sağ yön/.test(value))directions.push('right');
 if(/sola|sol yat|sol yön/.test(value))directions.push('left');
 if(/baş aşağı|başaşağı|tepetaklak/.test(value))directions.push('down');
 if(/aynalı|ayna|yansıma/.test(value))directions.push('mirror');
 const letter=letters.length===1?letters[0]:undefined;
 if(/ters/.test(value)&&!directions.length)return {letter,clarify:letter?'reverse':'letter'};
 const orientation=directions.length===1?directions[0]:undefined;
 return {letter,orientation,...(!letter?{clarify:'letter' as const}:!orientation?{clarify:'orientation' as const}:{})};
}
export function equivalentOrientation(letter:Letter,a:Orientation,b:Orientation) {
 return a===b || (letter==='E' && [a,b].every(o=>o==='down'||o==='mirror')) || (letter==='A' && [a,b].every(o=>o==='upright'||o==='mirror'));
}
export type EyePixelEvidence={state:'open'|'closed'|'covered'|'uncertain';ear:number|null;darkFraction:number|null;contrast:number|null;method:string;baselineEar?:number;blinkCoefficient?:number|null;heldMs?:number;appearanceChange?:number;templateCorrelation?:number;palmCoverage?:number;wideTemplateCorrelation?:number;candidateState?:'open'|'closed'|'covered'|'uncertain'};
export type LetterConditions={observedAt:number;cameraLive:boolean;modelActive:boolean;faceCount:number;qualityValid:boolean;positionValid:boolean;relativeScaleChange:number|null;motionStable?:boolean;right:EyePixelEvidence;left:EyePixelEvidence;distancePolicy?:'head-anchors-hysteresis-v1';distanceState?:'learning'|'stable'|'near'|'far'|'unknown';blocker?:string|null;trackingMethod?:string};
export function letterConditionFailure(c:LetterConditions|null,eye:Eye|null,now:number):'camera'|'position'|'eye'|'uncertain'|null {
 if(!c||now-c.observedAt>750||now<c.observedAt||!c.cameraLive||!c.modelActive||c.faceCount!==1||!c.qualityValid)return 'camera';
 if(!c.positionValid||c.relativeScaleChange===null||(c.distancePolicy!=='head-anchors-hysteresis-v1'&&(c.motionStable===false||Math.abs(c.relativeScaleChange)>.08)))return 'position';
 if(!eye)return null;
 const opened=eye==='RIGHT'?c.right:c.left,closed=eye==='RIGHT'?c.left:c.right;
 if(opened.state==='uncertain'||closed.state==='uncertain')return 'uncertain';
 return opened.state==='open'&&(closed.state==='closed'||closed.state==='covered')?null:'eye';
}

// UX bounds, not validated clinical thresholds. A 0.1 log step is 10^0.1.
export const LETTER_RULES={startPx:120,minPx:18,maxPx:180,logStep:.1,factor:10**.1,perEye:12,maxValid:24} as const;
export interface RenderedSymbolGeometry {viewportWidthCssPx:number;viewportHeightCssPx:number;pathWidthCssPx:number;pathHeightCssPx:number;strokeWidthCssPx:number;measuredAt:number;method:'dom-svg-css-pixels'}
export interface LetterTrial {
 id:string;presentationId:string;sequence:number;protocolVersion:typeof LETTER_PROTOCOL;eye:Eye;letter:Letter;orientation:Orientation;sizePx:number;
 renderedGeometry:RenderedSymbolGeometry|null;parsedAnswer:ParsedAnswer;answer:{letter:Letter;orientation:Orientation}|null;
 letterCorrect:boolean|null;orientationCorrect:boolean|null;combinedCorrect:boolean|null;correct:boolean;notVisible:boolean;
 valid:boolean;invalidReason:string|null;conditions:LetterConditions|null;answeredAt:string;responseTimeMs:number;
 distanceEvidence:{method:'relative-face-scale-only'|'relative-head-anchors';relativeScaleChange:number|null;absoluteDistanceCm:null;confidence:'unverified-absolute'};
}
export function scoreLetterTrial(t:Pick<LetterTrial,'valid'|'letter'|'orientation'|'answer'|'notVisible'>){
 if(!t.valid)return {letterCorrect:null,orientationCorrect:null,combinedCorrect:null};
 const letterCorrect=!t.notVisible&&t.answer?.letter===t.letter;
 const orientationCorrect=!t.notVisible&&!!t.answer&&equivalentOrientation(t.letter,t.answer.orientation,t.orientation);
 return {letterCorrect,orientationCorrect,combinedCorrect:letterCorrect&&orientationCorrect};
}
export interface Accuracy {correct:number;total:number;percentage:number|null}
function accuracy(values:(boolean|null)[]):Accuracy {const evaluated=values.filter((v):v is boolean=>v!==null);const correct=evaluated.filter(Boolean).length;return {correct,total:evaluated.length,percentage:evaluated.length?100*correct/evaluated.length:null};}
/** Recompute from the stored targets/answers/validity, never trust cached scores. */
export function performanceBySize(trials:LetterTrial[],eye:Eye){
 const valid=trials.filter(t=>t.eye===eye&&t.valid&&t.renderedGeometry);
 const sizes=new Map<string,LetterTrial[]>();
 for(const t of valid){const g=t.renderedGeometry!;const key=`${g.viewportWidthCssPx.toFixed(3)}×${g.viewportHeightCssPx.toFixed(3)}`;sizes.set(key,[...(sizes.get(key)||[]),t]);}
 return [...sizes.entries()].map(([size,rows])=>{const scores=rows.map(scoreLetterTrial);return {size,widthCssPx:rows[0].renderedGeometry!.viewportWidthCssPx,heightCssPx:rows[0].renderedGeometry!.viewportHeightCssPx,
  letter:accuracy(scores.map(s=>s.letterCorrect)),orientation:accuracy(scores.map(s=>s.orientationCorrect)),combined:accuracy(scores.map(s=>s.combinedCorrect)),notVisible:rows.filter(t=>t.notVisible).length};}).sort((a,b)=>b.widthCssPx-a.widthCssPx);
}
function random(max:number){const a=new Uint32Array(1);crypto.getRandomValues(a);return Math.floor(a[0]/4294967296*max);}
export class SpokenLetterSession {
 trials:LetterTrial[]=[];invalidTrials:LetterTrial[]=[];id=crypto.randomUUID();trialId='';presentationId='';letter:Letter='E';orientation:Orientation='upright';sizePx:number=LETTER_RULES.startPx;
 private streak=0;private presentedAt=0;private elapsed=0;private timing=false;private pending=false;private sequence=0;
 get completed(){return this.trials.length>=LETTER_RULES.maxValid;}
 get eye():Eye{return this.trials.length<LETTER_RULES.perEye?'RIGHT':'LEFT';}
 get ledger(){return [...this.trials,...this.invalidTrials].sort((a,b)=>a.sequence-b.sequence);}
 beginResponse(now=performance.now()){if(this.presentationId&&!this.timing){this.presentedAt=now;this.timing=true;}}
 suspendResponse(now=performance.now()){if(this.timing){this.elapsed+=Math.max(0,now-this.presentedAt);this.timing=false;}}
 present(now=performance.now()){
  if(this.completed||this.presentationId)return;
  if(!this.pending){this.trialId=crypto.randomUUID();const letters=Object.keys(LETTER_PATHS) as Letter[];this.letter=letters[random(letters.length)];
   // One representative per distinct rendered orientation, retaining symmetric
   // answer equivalence. A mirrored A is upright; mirrored E is upside-down E.
   const orientations:Orientation[]=this.letter==='A'||this.letter==='E'?['upright','right','down','left']:['upright','right','down','left','mirror'];this.orientation=orientations[random(orientations.length)];}
  this.pending=false;this.presentationId=crypto.randomUUID();this.presentedAt=now;this.elapsed=0;this.timing=false;
 }
 private record(answer:ParsedAnswer,c:LetterConditions|null,now:number,geometry:RenderedSymbolGeometry|null,reason:string|null):LetterTrial {
  const notVisible=answer.command==='not-visible';const parsed=notVisible||!answer.letter||!answer.orientation?null:{letter:answer.letter,orientation:answer.orientation};
  const base={valid:reason===null,letter:this.letter,orientation:this.orientation,answer:parsed,notVisible};const scores=scoreLetterTrial(base);
  return {id:this.trialId,presentationId:this.presentationId,sequence:++this.sequence,protocolVersion:LETTER_PROTOCOL,eye:this.eye,...base,sizePx:this.sizePx,renderedGeometry:geometry?structuredClone(geometry):null,parsedAnswer:structuredClone(answer),...scores,correct:scores.combinedCorrect===true,invalidReason:reason,conditions:c?structuredClone(c):null,answeredAt:new Date().toISOString(),responseTimeMs:this.elapsed+(this.timing?Math.max(0,now-this.presentedAt):0),distanceEvidence:{method:c?.distancePolicy==='head-anchors-hysteresis-v1'?'relative-head-anchors':'relative-face-scale-only',relativeScaleChange:c?.relativeScaleChange??null,absoluteDistanceCm:null,confidence:'unverified-absolute'}};
 }
 unscored(reason:string,c:LetterConditions|null,now:number,geometry:RenderedSymbolGeometry|null,parsed:ParsedAnswer={}){if(this.presentationId)this.invalidTrials.push(this.record(parsed,c,now,geometry,reason));}
 invalidate(reason:string,c:LetterConditions|null,now:number,geometry:RenderedSymbolGeometry|null){
  if(!this.presentationId)return false;this.unscored(reason,c,now,geometry);this.presentationId='';this.pending=true;return true;
 }
 respond(answer:ParsedAnswer,c:LetterConditions|null,now:number,presentationId:string,geometry:RenderedSymbolGeometry|null){
  if(this.completed||!this.presentationId||presentationId!==this.presentationId||letterConditionFailure(c,this.eye,now)||!c)return false;
  if(answer.clarify||(!answer.command&&(!answer.letter||!answer.orientation))||(answer.command&&answer.command!=='not-visible'))return false;
  if(!geometry||geometry.viewportWidthCssPx<=0||geometry.viewportHeightCssPx<=0||geometry.pathWidthCssPx<=0||geometry.pathHeightCssPx<=0||now<geometry.measuredAt||now-geometry.measuredAt>750)return false;
  const eye=this.eye,t=this.record(answer,c,now,geometry,null);this.trials.push(t);this.presentationId='';this.streak=t.letterCorrect?this.streak+1:0;
  if(!t.letterCorrect)this.sizePx=Math.min(LETTER_RULES.maxPx,this.sizePx*LETTER_RULES.factor);
  else if(this.streak===2){this.sizePx=Math.max(LETTER_RULES.minPx,this.sizePx/LETTER_RULES.factor);this.streak=0;}
  if(!this.completed&&this.eye!==eye){this.sizePx=LETTER_RULES.startPx;this.streak=0;}
  return true;
 }
}
export interface LetterResult {id:string;date:string;protocolVersion:typeof LETTER_PROTOCOL;trials:LetterTrial[];deviceContext:{width:number;height:number;dpr:number};profileVerification:'unverified';distanceMethod:'relative-face-scale-only'|'relative-head-anchors';physicalScale:null;completed:boolean}
/** Read the displayed geometry before sampling the response clock. Passing a
 * clock sampled first makes the real DOM measurement appear to be in the
 * future, which respond correctly rejects. Keep that strict guard intact. */
export function respondToVisibleLetter(session:SpokenLetterSession,answer:ParsedAnswer,conditions:LetterConditions|null,presentationId:string,measure:()=>RenderedSymbolGeometry|null,clock:()=>number=()=>performance.now()){
 const geometry=measure();return session.respond(answer,conditions,clock(),presentationId,geometry);
}
