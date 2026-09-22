import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
const key='__recruitmentContextTest';
const org='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const identity=`export async function requireIdentity(){const f=globalThis.${key};if(f.anonymous)throw Error('login');return f.identity;}`;
const hooks=registerHooks({resolve(s,c,next){
 if(c.parentURL?.endsWith('/lib/recruitment/context.ts')||c.parentURL?.endsWith('/lib/auth/authorization.ts')){
  if(s==='../auth/identity'||s==='./identity')return {url:'data:text/javascript,'+encodeURIComponent(identity),shortCircuit:true};
  if(s==='next/navigation')return {url:'data:text/javascript,export function notFound(){throw Error("not-found");}',shortCircuit:true};
 }
 if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return {url:u.href,shortCircuit:true};}
 return next(s,c);
}});
const {recruitmentContext}=await import('../lib/recruitment/context.ts');
hooks.deregister();after(()=>delete globalThis[key]);
function setup(role,assigned=false){
 const f={assigned,calls:[],anonymous:false};
 f.identity={profile:{id:'33333333-3333-4333-8333-333333333333',role,organisation_id:role==='customer'?org:null},client:{from(table){const filters={};const q={select(){return q;},eq(k,v){filters[k]=v;return q;},async maybeSingle(){f.calls.push({table,filters});return {data:table==='admin_organisation_assignments'?(f.assigned?{organisation_id:filters.organisation_id}:null):{id:filters.id,name:'Fixture'},error:null};}};return q;}}};
 globalThis[key]=f;return f;
}
test('Actual recruitment context derives Customer tenant and rejects A/B spoofing',async()=>{
 for(const tenant of [org,other]){const f=setup('customer');f.identity.profile.organisation_id=tenant;
 assert.equal((await recruitmentContext()).organisation.id,tenant);
 await assert.rejects(recruitmentContext(tenant===org?other:org),/not-found/);}
});
test('Actual requireOrganisationAccess rechecks delegated Admin assignment for requested tenant',async()=>{
 const f=setup('admin',true);assert.equal((await recruitmentContext(org)).organisation.id,org);
 assert.deepEqual(f.calls[0],{table:'admin_organisation_assignments',filters:{admin_id:f.identity.profile.id,organisation_id:org}});
 f.assigned=false;await assert.rejects(recruitmentContext(org),/not-found/);await assert.rejects(recruitmentContext(other),/not-found/);
});
test('Owner must supply valid explicit context; anonymous and invalid context denied',async()=>{
 const f=setup('platform_owner');for(const id of [org,other])assert.equal((await recruitmentContext(id)).organisation.id,id);
 await assert.rejects(recruitmentContext(),/not-found/);await assert.rejects(recruitmentContext('invalid'),/not-found/);
 f.anonymous=true;await assert.rejects(recruitmentContext(org),/login/);
});
