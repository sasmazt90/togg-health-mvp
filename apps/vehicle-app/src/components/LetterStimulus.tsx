import type { RefObject } from 'react';
import type { Orientation } from '../utils/spokenVision';
/** Vector stimulus has no font dependency. Padding retains acute miter tips
 * after every rotation; size/geometry still comes from the painted DOM. */
export function LetterStimulus({path,orientation,sizePx,svgRef}:{path:string;orientation:Orientation;sizePx:number;svgRef?:RefObject<SVGSVGElement|null>}){
 const rotation={upright:0,right:90,down:180,left:270,mirror:0}[orientation];
 return <svg ref={svgRef} data-letter-optotype role="img" aria-label="Yanıtlanacak harf" viewBox="-8 -8 116 116" style={{width:sizePx,height:sizePx,maxWidth:'100%',flexShrink:0,opacity:1,visibility:'visible'}}><g transform={`translate(50 50) rotate(${rotation}) scale(${orientation==='mirror'?-1:1} 1) translate(-50 -50)`}><path d={path} stroke="#ffffff" strokeWidth="10" strokeLinecap="square" strokeLinejoin="miter" fill="none"/></g></svg>;
}
