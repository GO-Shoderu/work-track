import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
const key='__publicService';
const hook=registerHooks({resolve(s,c,next){let source;
 if(c.parentURL?.endsWith('/public-recruitment/service.ts')) {
  if(s==='../env')source='export const requireAdminEnvironment=()=>({SUPABASE_URL:"https://example.invalid",SUPABASE_SECRET_KEY:"offline-secret"});';
  if(s==='@supabase/supabase-js')source=`export const createClient=(...config)=>{const f=globalThis.${key};f.config=config;return {rpc:async(name,args)=>{f.calls.push({name,args});return f.response;},storage:{from:bucket=>({upload:async(path,bytes,options)=>{f.upload={bucket,path,bytes,options};return f.response;}})}};};`;
 }
 if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
 if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return {url:u.href,shortCircuit:true};}return next(s,c);
}});
const {publicApplicationService}=await import('../lib/public-recruitment/service.ts');
const {publicApplicationInput}=await import('../lib/public-recruitment/contracts.ts');
hook.deregister();after(()=>delete globalThis[key]);
const id='a0000000-0000-4000-8000-000000000001',object='b0000000-0000-4000-8000-000000000001';
const ticket={id,organisation_id:id,object_id:object};
const applicant=publicApplicationInput.parse({careersSlug:'example',publicId:id,fullName:' Submitted Person ',email:'person@example.com',phone:' +27 123 ',linkedinUrl:'https://www.linkedin.com/in/submitted-person'});
test('Service wrapper exposes only submission-specific operations with private generated paths',async()=>{
 const f=globalThis[key]={calls:[],response:{data:ticket,error:null}};const service=publicApplicationService();
 assert.deepEqual(Object.keys(service).sort(),['complete','finishAssessment','prepare','upload']);
 assert.deepEqual(await service.prepare(applicant,100),ticket);assert.equal(f.calls[0].name,'prepare_public_application');
 await service.upload(ticket,new TextEncoder().encode('%PDF-1.4 content'));
 assert.equal(f.upload.bucket,'candidate-cvs');assert.equal(f.upload.path,`${id}/applications/${id}/${object}.pdf`);assert.equal(f.upload.options.upsert,false);
 assert.equal(f.config[2].auth.persistSession,false);
 f.response.data={application_id:id,cv_object_id:object,job_content_version:1,title:'Engineer',description:'Build'};
 const submission=await service.complete(ticket,applicant);assert.equal(f.calls.at(-1).name,'complete_public_application');
 assert.deepEqual(f.calls.at(-1).args,{upload_id:id,full_name:applicant.fullName,applicant_email:applicant.email,phone:applicant.phone,linkedin_url:applicant.linkedinUrl});
 f.response.data=id;await service.finishAssessment(submission,null);assert.equal(f.calls.at(-1).name,'finish_public_assessment');assert.equal(f.calls.at(-1).args.validated_result,null);
});
test('Service rejects unconfirmed commits, mismatched IDs and unexpected response projections',async()=>{
 const f=globalThis[key]={calls:[],response:{data:{...ticket,extra:'private'},error:null}};const service=publicApplicationService();
 await assert.rejects(service.prepare(applicant,100));
 f.response.data={application_id:object,cv_object_id:object,job_content_version:1,title:'Job',description:null};await assert.rejects(service.complete(ticket,applicant));
 f.response={data:null,error:{message:'database detail'}};await assert.rejects(service.complete(ticket,applicant),{message:'Submission not confirmed'});
 await assert.rejects(service.upload(ticket,new Uint8Array([1,2,3])));
});
