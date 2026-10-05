/** Presentation graph only. Numerical ROIs are deliberately independent. */
export type MeshPoint={x:number;y:number};
export type SkinMesh={points:MeshPoint[];edges:[number,number][];major:number[];boundary:number[][];excluded:string[]};
type Graph={indices:number[];edges:[number,number][];major:number[];boundary:number[][];excluded:string[]};
// Every edge is explicit and anatomical; indices refer to actual MediaPipe
// landmarks in the accepted unmirrored frame, never screen-side mirroring.
export const SKIN_GRAPHS:Record<string,Graph>={
 forehead:{indices:[10,109,67,103,54,21,71,63,105,66,107,9,336,296,334,293,301,251,284,332,297,338,151,108,337],boundary:[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,0]],edges:[[0,22],[22,11],[1,23],[23,22],[23,10],[2,7],[7,23],[3,8],[8,23],[4,7],[21,24],[24,22],[24,12],[20,15],[15,24],[19,14],[14,24],[18,15],[10,22],[12,22],[23,11],[24,11]],major:[0,22,11],excluded:['eyes','nose']},
 rightCheek:{indices:[116,123,147,172,150,212,216,203,101,50,205,214,187],boundary:[[0,8,7,6,5,4,3,2,1,0]],edges:[[0,9],[9,8],[1,9],[9,10],[10,7],[1,12],[12,10],[2,12],[2,11],[3,11],[4,11],[5,11],[6,10],[10,11],[12,11]],major:[9,10,11,4],excluded:['right-eye','nose','lips','ear','occluded-cheek']},
 leftCheek:{indices:[345,352,376,397,379,432,436,423,330,280,425,434,411],boundary:[[0,8,7,6,5,4,3,2,1,0]],edges:[[0,9],[9,8],[1,9],[9,10],[10,7],[1,12],[12,10],[2,12],[2,11],[3,11],[4,11],[5,11],[6,10],[10,11],[12,11]],major:[9,10,11,4],excluded:['left-eye','nose','lips','ear','occluded-cheek']},
 nose:{indices:[168,193,122,196,3,51,45,48,49,98,97,2,326,327,279,278,275,281,248,419,351,417,6,197,195,5,4,1],boundary:[[0,1,2,3,4,5,6,7,8,9],[0,21,20,19,18,17,16,15,14,13]],edges:[[0,22],[22,23],[23,24],[24,25],[25,26],[26,27],[1,22],[21,22],[2,23],[20,23],[3,24],[19,24],[4,25],[18,25],[5,26],[17,26],[6,26],[16,26],[7,27],[15,27],[8,27],[14,27],[9,10],[13,12]],major:[0,26],excluded:['eyes','nostril-interior','upper-lip','wide-cheek']},
 periorbital:{indices:[130,247,30,29,27,28,56,190,243,112,26,22,23,24,110,25,33,133,359,467,260,259,257,258,286,414,463,341,256,252,253,254,339,255,263,362],boundary:[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0],[18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,18]],edges:[[0,16],[1,16],[2,16],[15,16],[14,16],[8,17],[7,17],[6,17],[9,17],[10,17],[3,4],[11,12],[18,34],[19,34],[20,34],[33,34],[32,34],[26,35],[25,35],[24,35],[27,35],[28,35],[21,22],[29,30]],major:[16,17,34,35],excluded:['iris','eye-opening','nose-bridge']},
 chin:{indices:[202,210,214,177,149,148,152,377,378,401,434,430,422,201,200,421,194,204,418,424],boundary:[[0,1,2,3,4,5,6,7,8,9,10,11,12,15,14,13,0]],edges:[[0,16],[16,13],[13,14],[14,15],[15,18],[18,12],[16,17],[17,3],[3,14],[17,14],[14,6],[18,19],[19,9],[9,14],[19,14],[3,5],[9,7],[5,14],[7,14]],major:[14,6],excluded:['lips','mouth','neck']}
};
export function buildSkinMesh(id:string,landmarks:MeshPoint[],width:number,height:number):SkinMesh {
 const graph=SKIN_GRAPHS[id];
 if(!graph||landmarks.length<468)throw Error('MISSING_ANATOMICAL_LANDMARKS');
 const points=graph.indices.map(i=>({x:landmarks[i].x*width,y:landmarks[i].y*height}));
 const edges:[number,number][]=[...graph.edges];
 for(const path of graph.boundary)for(let i=1;i<path.length;i++)edges.push([path[i-1],path[i]]);
 return {points,edges,major:graph.major,boundary:graph.boundary,excluded:graph.excluded};
}

export const MESH_HOLES={rightEye:[33,160,158,133,153,145,163],leftEye:[263,387,385,362,380,374,390],lips:[61,40,37,0,267,270,291,321,314,17,84,91],rightNostril:[98,97,99],leftNostril:[327,326,328]};
function inside(p:MeshPoint,polygon:MeshPoint[]) {
 let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {const a=polygon[i],b=polygon[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;
}
/** Omit whole unsafe edges, never chop a regional graph into sampling boxes.
 * Current semantic head support also prevents floating lines on occluded skin.
 */
export function supportedSkinMesh(mesh:SkinMesh,landmarks:MeshPoint[],width:number,height:number,alpha:Uint8Array):SkinMesh {
 const holes=Object.values(MESH_HOLES).map(indices=>indices.map(i=>({x:landmarks[i].x*width,y:landmarks[i].y*height})));
 const supported=(p:MeshPoint)=>p.x>=0&&p.x<width&&p.y>=0&&p.y<height&&alpha[Math.floor(p.y)*width+Math.floor(p.x)]>0;
 const edges=mesh.edges.filter(([a,b])=>{for(let step=1;step<40;step++){const t=step/40,p={x:mesh.points[a].x*(1-t)+mesh.points[b].x*t,y:mesh.points[a].y*(1-t)+mesh.points[b].y*t};if(!supported(p)||holes.some(h=>inside(p,h)))return false;}return supported(mesh.points[a])&&supported(mesh.points[b]);});
 const used=[...new Set(edges.flat())],mapping=new Map(used.map((v,i)=>[v,i]));
 return {...mesh,points:used.map(i=>mesh.points[i]),edges:edges.map(([a,b])=>[mapping.get(a)!,mapping.get(b)!]),major:mesh.major.filter(i=>mapping.has(i)).map(i=>mapping.get(i)!),boundary:[]};
}
