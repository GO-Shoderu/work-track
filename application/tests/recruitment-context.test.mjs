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
// Separate module instance keeps this real-context loader test independent of the
// action/query SDK-boundary mocks in recruitment.test.mjs.
const {getJobForEdit}=await import('../lib/recruitment/queries.ts?edit-loader');
hooks.deregister();after(()=>delete globalThis[key]);
function setup(role,assigned=false){
 const f={assigned,calls:[],anonymous:false,jobSelections:[],organisationSelections:[],jobError:null,jobs:[{id:'44444444-4444-4444-8444-444444444444',organisation_id:org,title:'Engineer',description_rich:{type:'doc',content:[{type:'paragraph'}]},closes_at:null,status:'draft',content_version:2},{id:'55555555-5555-4555-8555-555555555555',organisation_id:other,title:'Other role',description_rich:null,closes_at:null,status:'closed',content_version:1}]};
 f.identity={profile:{id:'33333333-3333-4333-8333-333333333333',role,organisation_id:role==='customer'?org:null},client:{from(table){const filters={};let columns;const q={select(value){columns=value;if(table==='jobs')f.jobSelections.push(value);if(table==='organisations')f.organisationSelections.push(value);return q;},eq(k,v){filters[k]=v;return q;},async maybeSingle(){f.calls.push({table,filters});if(table==='jobs'){const row=f.jobs.find(j=>j.id===filters.id&&j.organisation_id===filters.organisation_id);return {data:row?Object.fromEntries(columns.split(',').map(k=>[k,row[k]])):null,error:f.jobError};}if(table==='organisations'){const row={id:filters.id,name:'Fixture',careers_slug:filters.id===org?'own-careers':'other-careers',created_at:'not exposed',updated_at:'not exposed'};return {data:Object.fromEntries(columns.split(',').map(k=>k.trim()).map(k=>[k,row[k]])),error:null};}return {data:table==='admin_organisation_assignments'?(f.assigned?{organisation_id:filters.organisation_id}:null):{id:filters.id,name:'Fixture'},error:null};}};return q;}}};
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

const ownJob='44444444-4444-4444-8444-444444444444';
const foreignJob='55555555-5555-4555-8555-555555555555';
test('Job edit loader derives Customer tenant and returns exactly the six edit fields',async()=>{
 const f=setup('customer');const result=await getJobForEdit({jobId:ownJob});
 assert.deepEqual(result,{id:ownJob,title:'Engineer',description_rich:{type:'doc',content:[{type:'paragraph'}]},closes_at:null,status:'draft',content_version:2});
 assert.deepEqual(f.jobSelections,['id,title,description_rich,closes_at,status,content_version']);
 assert.deepEqual(f.calls.find(c=>c.table==='jobs').filters,{organisation_id:org,id:ownJob});
});
test('Job edit loader denies Customer cross-tenant context and cannot retrieve a foreign Job by ID',async()=>{
 const f=setup('customer');await assert.rejects(getJobForEdit({organisationId:other,jobId:foreignJob}),/not-found/);
 assert.equal(f.calls.length,0);
 assert.equal(await getJobForEdit({jobId:foreignJob}),null);
 assert.deepEqual(f.calls.find(c=>c.table==='jobs').filters,{organisation_id:org,id:foreignJob});
});
test('Job edit loader allows assigned Admin then denies revoked and unassigned Organisation access',async()=>{
 const f=setup('admin',true);assert.equal((await getJobForEdit({organisationId:org,jobId:ownJob})).id,ownJob);
 assert.deepEqual(f.calls[0],{table:'admin_organisation_assignments',filters:{admin_id:f.identity.profile.id,organisation_id:org}});
 f.assigned=false;f.calls=[];
 await assert.rejects(getJobForEdit({organisationId:org,jobId:ownJob}),/not-found/);
 await assert.rejects(getJobForEdit({organisationId:other,jobId:foreignJob}),/not-found/);
 assert.equal(f.calls.some(c=>c.table==='jobs'),false);
});
test('Job edit loader requires explicit Owner context and allows both authorised Organisation contexts',async()=>{
 const f=setup('platform_owner');await assert.rejects(getJobForEdit({jobId:ownJob}),/not-found/);assert.equal(f.calls.length,0);
 assert.equal((await getJobForEdit({organisationId:org,jobId:ownJob})).id,ownJob);
 assert.equal((await getJobForEdit({organisationId:other,jobId:foreignJob})).id,foreignJob);
 assert.equal(await getJobForEdit({organisationId:org,jobId:foreignJob}),null);
});
test('Job edit loader rejects anonymous/invalid input and hides database error details',async()=>{
 let f=setup('customer');f.anonymous=true;await assert.rejects(getJobForEdit({jobId:ownJob}),/login/);assert.equal(f.calls.length,0);
 for(const input of [{jobId:'invalid'},{jobId:ownJob,organisationId:'bad'},{jobId:ownJob,role:'platform_owner'},{}]){
  f=setup('customer');await assert.rejects(getJobForEdit(input),/Invalid Job details/);assert.equal(f.calls.length,0);
 }
 f=setup('customer');f.jobError={message:'private database details'};
 await assert.rejects(getJobForEdit({jobId:ownJob}),{message:'Job is temporarily unavailable.'});
});

test('Customer Organisation projection includes only its own id, name and careers slug',async()=>{
 const f=setup('customer');
 assert.deepEqual((await recruitmentContext()).organisation,{id:org,name:'Fixture',careers_slug:'own-careers'});
 assert.deepEqual(f.organisationSelections,['id, name, careers_slug']);
 f.calls=[];f.organisationSelections=[];
 await assert.rejects(recruitmentContext(other),/not-found/);
 assert.deepEqual(f.organisationSelections,[]);
});
test('Assigned Admin receives managed careers slug; revoked and unassigned access cannot read it',async()=>{
 const f=setup('admin',true);
 assert.deepEqual((await recruitmentContext(org)).organisation,{id:org,name:'Fixture',careers_slug:'own-careers'});
 f.assigned=false;f.organisationSelections=[];
 await assert.rejects(recruitmentContext(org),/not-found/);
 await assert.rejects(recruitmentContext(other),/not-found/);
 assert.deepEqual(f.organisationSelections,[]);
});
test('Owner careers slug projection still requires explicit Organisation context',async()=>{
 const f=setup('platform_owner');await assert.rejects(recruitmentContext(),/not-found/);
 assert.deepEqual(f.organisationSelections,[]);
 assert.deepEqual((await recruitmentContext(other)).organisation,{id:other,name:'Fixture',careers_slug:'other-careers'});
});
