import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
const key='__publicSubmission';
const hook=registerHooks({resolve(s,c,next){let source;
 if(c.parentURL?.endsWith('/public-recruitment/submission.ts')) {
  if(s==='next/server')source=`export function after(callback){const f=globalThis.${key};if(f.scheduleFails)throw Error('scheduling unavailable');f.callbacks.push(callback);}`;
  if(s==='./service')source=`export const publicApplicationService=()=>globalThis.${key}.service;`;
  if(s==='../cv/pdf')source=`export async function extractPdfText(bytes){const f=globalThis.${key};f.events.push('extract');if(f.unreadable)throw Error('unreadable');if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('magic');return 'Exact submitted application CV text';}`;
  if(s==='../assessment/provider')source=`export async function assessWithProvider(job,text){const f=globalThis.${key};f.events.push('assess');f.assessed={job,text};if(f.providerPromise)await f.providerPromise;if(f.aiFails)throw Error('provider unavailable');return f.result;}`;
 }
 if(c.parentURL?.endsWith('/public-recruitment/actions.ts')) {
  if(s==='next/headers')source=`export async function headers(){return new Headers({origin:globalThis.${key}.origin});}`;
  if(s==='../env')source='export const getEnvironment=()=>({APP_URL:"https://work.example"});';
 }
 if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
 if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return {url:u.href,shortCircuit:true};}return next(s,c);
}});
const {submitPublicApplication}=await import('../lib/public-recruitment/submission.ts');
const {applyToPublicJob}=await import('../lib/public-recruitment/actions.ts');
const {publicApplicationInput,applicationCvPath}=await import('../lib/public-recruitment/contracts.ts');
const {ADVISORY_DISCLAIMER}=await import('../lib/assessment/schema.ts');
hook.deregister();after(()=>delete globalThis[key]);
const id='a0000000-0000-4000-8000-000000000001',object='b0000000-0000-4000-8000-000000000001';
const input={careersSlug:'example',publicId:id,fullName:' Applicant ',email:' Person@Example.COM '};
const pdf=()=>new File(['%PDF-1.4 readable content'], 'cv.PDF',{type:'application/pdf'});
function setup(){const f={events:[],callbacks:[],origin:'https://work.example',result:{score:80,summary:'Evidence',strengths:[],gaps:[],recommendation:'potential_match',disclaimer:ADVISORY_DISCLAIMER}};
 f.service={async prepare(applicant,size){f.events.push('prepare');f.applicant=applicant;f.size=size;if(f.prepareFails)throw Error('duplicate or unavailable');return {id,organisation_id:id,object_id:object};},async upload(ticket,bytes){f.events.push('upload');f.bytes=bytes;if(f.uploadFails)throw Error('storage failed');},async complete(){f.events.push('complete');if(f.completeFails)throw Error('commit uncertain');return {application_id:id,cv_object_id:object,title:'Job',description:'Current Job',job_content_version:4};},async finishAssessment(submission,result){f.events.push(result===null?'failed':'completed');f.saved={submission,result};if(f.finishFails || (f.completionFails && result!==null))throw Error('database unavailable');}};globalThis[key]=f;return f;}
test('Applicant contract normalizes email conservatively and rejects malformed/forged fields',()=>{
 assert.equal(publicApplicationInput.parse(input).email,'person@example.com');
 assert.equal(publicApplicationInput.parse(input).fullName,input.fullName);
 assert.equal(publicApplicationInput.parse({...input,phone:' 123 '}).phone,' 123 ');
 assert.equal(publicApplicationInput.parse({...input,email:'person+tag@example.com'}).email,'person+tag@example.com');
 for(const overrides of [{fullName:''},{fullName:'Bad\nName'},{email:'not-email'},{email:'x@example.com\n'+'b'},{phone:'x'.repeat(51)},{linkedinUrl:'https://evil.test/in/a'},{candidateId:id},{organisationId:id},{stage:'hired'},{source:'manual'}])assert.equal(publicApplicationInput.safeParse({...input,...overrides}).success,false);
 assert.equal(applicationCvPath(id,id,object),`${id}/applications/${id}/${object}.pdf`);
 assert.throws(()=>applicationCvPath('../bad',id,object));
});
test('Submission commits the exact uploaded CV before automatic assessment and returns no private identifiers',async()=>{
 const f=setup();assert.deepEqual(await submitPublicApplication(input,pdf()),{ok:true});
 assert.deepEqual(f.events,['prepare','extract','upload','complete']);
 assert.equal(f.callbacks.length,1);await f.callbacks[0]();
 assert.deepEqual(f.events,['prepare','extract','upload','complete','assess','completed']);
 assert.equal(f.applicant.email,'person@example.com');assert.equal(f.assessed.text,'Exact submitted application CV text');
 assert.equal(f.saved.submission.cv_object_id,object);assert.equal(f.saved.submission.job_content_version,4);
});
test('Non-PDF, oversized, empty and bad magic uploads fail before persistence or AI',async()=>{
 for(const file of [new File(['abc'],'cv.txt',{type:'text/plain'}),new File(['%PDF-x'],'cv.exe',{type:'application/pdf'}),new File([],'cv.pdf',{type:'application/pdf'}),new File([new Uint8Array(5242881)],'cv.pdf',{type:'application/pdf'}),new File(['wrongmagic'],'cv.pdf',{type:'application/pdf'})]){
  const f=setup();assert.equal((await submitPublicApplication(input,file)).ok,false);assert.equal(f.events.includes('upload'),false);assert.equal(f.events.includes('assess'),false);
 }
});
test('Unreadable PDF and admission rejection do not upload or create an Application',async()=>{
 for(const flag of ['unreadable','prepareFails']){const f=setup();f[flag]=true;assert.equal((await submitPublicApplication(input,pdf())).ok,false);assert.equal(f.events.includes('upload'),false);assert.equal(f.events.includes('complete'),false);}
});
test('Storage failure never creates an Application or starts AI',async()=>{
 const f=setup();f.uploadFails=true;assert.equal((await submitPublicApplication(input,pdf())).ok,false);assert.deepEqual(f.events,['prepare','extract','upload']);
});
test('Duplicate or ambiguous persistence failure returns generic failure and does not start AI or delete Storage',async()=>{
 const f=setup();f.completeFails=true;const result=await submitPublicApplication(input,pdf());assert.equal(result.ok,false);assert.doesNotMatch(result.error,/duplicate|candidate|email|database|commit/i);assert.deepEqual(f.events,['prepare','extract','upload','complete']);
});
test('AI failure preserves successful submission and records failed after pending persistence',async()=>{
 const f=setup();f.aiFails=true;assert.deepEqual(await submitPublicApplication(input,pdf()),{ok:true});assert.deepEqual(f.events,['prepare','extract','upload','complete']);await f.callbacks[0]();assert.deepEqual(f.events,['prepare','extract','upload','complete','assess','failed']);
});
test('Malformed AI output is failed; assessment persistence outage does not undo confirmed submission',async()=>{
 let f=setup();f.result={score:999};assert.deepEqual(await submitPublicApplication(input,pdf()),{ok:true});await f.callbacks[0]();assert.equal(f.events.at(-1),'failed');
 f=setup();f.finishFails=true;assert.deepEqual(await submitPublicApplication(input,pdf()),{ok:true});await f.callbacks[0]();assert.deepEqual(f.events.slice(-2),['completed','failed']);
});
test('Public action requires same origin and exactly one CV without requiring an authenticated session',async()=>{
 const f=setup();const form=new FormData();form.set('file',pdf());f.origin='https://evil.test';assert.equal((await applyToPublicJob(input,form)).ok,false);assert.deepEqual(f.events,[]);
 f.origin='https://work.example';form.append('file',pdf());assert.equal((await applyToPublicJob(input,form)).ok,false);form.delete('file');form.set('file',pdf());assert.equal((await applyToPublicJob(input,form)).ok,true);
});
test('Privileged submission exposes only RPCs and immutable private uploads, never table writes or public URLs',()=>{
 const source=readFileSync(new URL('../lib/public-recruitment/service.ts',import.meta.url),'utf8');
 assert.match(source,/import "server-only"/);assert.doesNotMatch(source,/client\.from\(|\.remove\(|createSignedUrl|getPublicUrl|console\./);assert.match(source,/upsert: false/);
 const sql=readFileSync(new URL('../../supabase/migrations/20260926000300_public_applications.sql',import.meta.url),'utf8');
 assert.doesNotMatch(sql,/update public\.candidates|(?:insert into|update|delete from) public\.candidate_cvs|set stage\s*=/i);
});

test('Confirmed success does not await a stalled provider; AI runs only in the post-response callback', {timeout:1000}, async()=>{
 const f=setup();let release;f.providerPromise=new Promise(resolve=>{release=resolve;});
 assert.deepEqual(await submitPublicApplication(input,pdf()),{ok:true});
 assert.equal(f.events.includes('assess'),false);assert.equal(f.callbacks.length,1);
 const background=f.callbacks[0]();assert.equal(f.events.at(-1),'assess');assert.equal(f.saved,undefined);
 release();await background;assert.equal(f.events.at(-1),'completed');
});
test('Background completion failure attempts failed persistence; scheduling failure preserves confirmed success',async()=>{
 let f=setup();f.completionFails=true;assert.deepEqual(await submitPublicApplication(input,pdf()),{ok:true});
 await f.callbacks[0]();assert.deepEqual(f.events.slice(-2),['completed','failed']);assert.equal(f.saved.result,null);
 f=setup();f.scheduleFails=true;assert.deepEqual(await submitPublicApplication(input,pdf()),{ok:true});
 assert.equal(f.callbacks.length,0);assert.equal(f.events.includes('assess'),false);
});
