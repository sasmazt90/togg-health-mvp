/** User-facing names and referral mapping. Stable storage IDs and routes stay unchanged. */
import definitions from '../../../../shared/healthModules.json';
export const HEALTH_MODULES=definitions;
export type HealthModule = keyof typeof HEALTH_MODULES;
export const HEALTH_MODULE_IDS = Object.keys(HEALTH_MODULES) as HealthModule[];
export function careHref(module:HealthModule,specialty?:string,recordId?:string){
 const allowed:readonly string[]=HEALTH_MODULES[module].specialties;
 const query=new URLSearchParams({from:module,specialty:specialty&&allowed.includes(specialty)?specialty:allowed[0]});
 if(recordId)query.set('recordId',recordId);
 return '/care?'+query.toString();
}
