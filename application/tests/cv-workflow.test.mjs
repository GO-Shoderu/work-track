import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
const key='__cvWorkflow';
const org='11111111-1111-4111-8111-111111111111',candidate='22222222-2222-4222-8222-222222222222',version='33333333-3333-4333-8333-333333333333',app='44444444-4444-4444-8444-444444444444';
const hooks=registerHooks({resolve(s,c,next){let source;
 if(c.parentURL?.endsWith('/lib/cv/storage.ts')&&s==='../recruitment/context')source=`export async function recruitmentContext(){const f=globalThis.${key};if(f.denied)throw Error('denied');return f.context;}`;
 if(c.parentURL?.endsWith('/lib/cv/actions.ts')||c.parentURL?.endsWith('/lib/assessment/actions.ts')){
  if(s==='next/headers')source=`export async function headers(){return new Headers({origin:globalThis.${key}.origin});}`;
  if(s==='../env')source='export function getEnvironment(){return {APP_URL:"http://localhost:3000"};}';
  if(s==='./pdf'||s==='../cv/pdf')source=`export async function extractPdfText(){const f=globalThis.${key};f.calls.push('extract');if(f.badPdf)throw Error('bad PDF');return 'Professional evidence in CV';}`;
  if(s==='./context')source=`export async function assessmentContext(){const f=globalThis.${key};if(f.denied)throw Error('denied');return {...f.context,application:{id:'${app}',candidate_id:'${candidate}'},job:{title:'Engineer',description:null}};}`;
  if(s==='./provider')source=`export function requireAssessmentProvider(){if(globalThis.${key}.noConfig)throw Error('missing');} export async function assessWithProvider(){const f=globalThis.${key};f.calls.push('provider');return f.result;}`;
 }
 if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
 if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return {url:u.href,shortCircuit:true};}return next(s,c);
}});
const storage=await import('../lib/cv/storage.ts');const {uploadCandidateCv}=await import('../lib/cv/actions.ts');const {requestJobCvAssessment}=await import('../lib/assessment/actions.ts');const {ADVISORY_DISCLAIMER}=await import('../lib/assessment/schema.ts');hooks.deregister();after(()=>delete globalThis[key]);
function setup(){const bytes=Buffer.from('%PDF-1.7 example');const f={origin:'http://localhost:3000',calls:[],denied:false,missingCandidate:false,badPdf:false,noConfig:false,saveError:false,uploadError:false,removeError:false,cv:null,result:{score:50,summary:'Some evidence.',strengths:[],gaps:['Missing evidence'],recommendation:'potential_match',disclaimer:ADVISORY_DISCLAIMER}};
 f.context={organisation:{id:org},client:{from(table){const filters={};let fields,write=false;const q={select(){return q;},eq(k,v){filters[k]=v;return q;},insert(v){write=true;fields=v;f.calls.push(['insert',table,v]);return q;},update(v){write=true;fields=v;f.calls.push(['update',table,v]);return q;},async maybeSingle(){f.calls.push(['query',table,filters]);if(write)return {data:f.saveError?null:{object_id:fields.object_id},error:f.saveError?{code:'offline'}:null};return {data:table==='candidates'?(f.missingCandidate?null:{id:candidate}):f.cv,error:null};}};return q;},storage:{from(bucket){assert.equal(bucket,'candidate-cvs');return {async upload(path,data,options){f.calls.push(['upload',path,options]);return {error:f.uploadError?{}:null};},async remove(paths){f.calls.push(['remove',paths]);if(f.removeError)throw Error('unavailable');return {error:null};},async download(path){f.calls.push(['download',path]);return {data:new Blob([bytes]),error:null};}};}},async rpc(name,args){f.calls.push(['rpc',name,args]);return {data:f.saveError?null:app,error:f.saveError?{}:null};}}};
 f.previous=()=>({candidate_id:candidate,organisation_id:org,object_id:version,storage_path:`${org}/${candidate}/${version}.pdf`,byte_size:bytes.length,updated_at:'now'});globalThis[key]=f;return f;}
function form(){const f=new FormData();f.set('file',new File(['%PDF-1.7 example'],'cv.pdf',{type:'application/pdf'}));return f;}
test('CV access rejects missing/cross-tenant Candidate and denied/revoked context before Storage',async()=>{
 for(const property of ['denied','missingCandidate']){const f=setup();f[property]=true;await assert.rejects(storage.inspectCurrentCv({candidateId:candidate}));assert.equal(f.calls.some(c=>Array.isArray(c)&&['upload','download'].includes(c[0])),false);}
});
test('Upload rejects foreign origin, path input and unreadable PDF without Storage mutation',async()=>{
 let f=setup();f.origin='https://evil.invalid';assert.equal((await uploadCandidateCv({candidateId:candidate},form())).ok,false);assert.equal(f.calls.length,0);
 f=setup();await assert.rejects(uploadCandidateCv({candidateId:candidate,path:'other'},form()));assert.equal(f.calls.length,0);
 f=setup();f.badPdf=true;assert.equal((await uploadCandidateCv({candidateId:candidate},form())).ok,false);assert.equal(f.calls.some(c=>Array.isArray(c)&&c[0]==='upload'),false);
});
test('Successful replacement uses immutable generated path, compare-and-swap pointer and old-object cleanup',async()=>{
 const f=setup();f.cv=f.previous();const result=await uploadCandidateCv({candidateId:candidate},form());assert.equal(result.ok,true);
 const upload=f.calls.find(c=>Array.isArray(c)&&c[0]==='upload');assert.ok(upload[1].startsWith(`${org}/${candidate}/`));assert.notEqual(upload[1],f.cv.storage_path);assert.equal(upload[2].upsert,false);
 assert.ok(f.calls.some(c=>Array.isArray(c)&&c[0]==='query'&&c[1]==='candidate_cvs'&&c[2].object_id===version));assert.deepEqual(f.calls.find(c=>Array.isArray(c)&&c[0]==='remove')[1],[f.cv.storage_path]);
});
test('Uncertain pointer writes retain uploaded object; cleanup failure does not undo confirmed upload',async()=>{
 let f=setup();f.cv=f.previous();f.saveError=true;assert.equal((await uploadCandidateCv({candidateId:candidate},form())).ok,false);assert.equal(f.calls.some(c=>Array.isArray(c)&&c[0]==='remove'),false);
 f=setup();f.cv=f.previous();f.removeError=true;assert.equal((await uploadCandidateCv({candidateId:candidate},form())).ok,true);
});
test('Tampered stored path is rejected before download',async()=>{
 const f=setup();f.cv={...f.previous(),storage_path:'other/tenant/file.pdf'};await assert.rejects(storage.readCandidateCv({candidateId:candidate}));assert.equal(f.calls.some(c=>Array.isArray(c)&&c[0]==='download'),false);
});
test('Assessment fails closed on missing configuration, invalid output and revoked RPC, using only actor RPC',async()=>{
 let f=setup();f.noConfig=true;assert.equal((await requestJobCvAssessment({applicationId:app})).ok,false);assert.equal(f.calls.length,0);
 f=setup();f.cv=f.previous();f.result={score:999};assert.equal((await requestJobCvAssessment({applicationId:app})).ok,false);assert.equal(f.calls.some(c=>Array.isArray(c)&&c[0]==='rpc'),false);
 f=setup();f.cv=f.previous();f.saveError=true;assert.equal((await requestJobCvAssessment({applicationId:app})).ok,false);
 f=setup();f.cv=f.previous();assert.equal((await requestJobCvAssessment({applicationId:app})).ok,true);const rpc=f.calls.find(c=>Array.isArray(c)&&c[0]==='rpc');assert.equal(rpc[1],'save_candidate_assessment');assert.deepEqual(Object.keys(rpc[2]).sort(),['target_application_id','target_cv_object_id','validated_result']);
});
