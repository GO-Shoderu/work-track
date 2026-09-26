import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

// Isolate the real context/authorization/CV modules from other tests' SDK mocks.
const key='__recruiterVisibility';
const hooks=registerHooks({resolve(s,c,next){
 if(c.parentURL?.includes('?recruiter-visibility')){
  if(s==='next/navigation')return {url:'data:text/javascript,export function notFound(){throw Error("not-found");}',shortCircuit:true};
  if(s.startsWith('.')){
   const u=new URL(s.endsWith('.ts')?s:s+'.ts',c.parentURL);
   if(u.pathname.endsWith('/lib/auth/identity.ts'))return {url:'data:text/javascript,'+encodeURIComponent(`export async function requireIdentity(){const f=globalThis.${key};if(f.anonymous)throw Error('login');return f.identity;}`),shortCircuit:true};
   if(existsSync(u)){u.search='?recruiter-visibility';return {url:u.href,shortCircuit:true};}
  }
 }
 return next(s,c);
}});
const {listJobApplications}=await import('../lib/recruitment/job-applications.ts?recruiter-visibility');
const {hasApplicationCv}=await import('../lib/assessment/context.ts?recruiter-visibility');
const {listPipeline}=await import('../lib/recruitment/queries.ts?recruiter-visibility');
const {GET}=await import('../app/api/recruitment/applications/[applicationId]/cv/route.ts?recruiter-visibility');
const {GET: candidateGET}=await import('../app/api/recruitment/candidates/[candidateId]/cv/route.ts?recruiter-visibility');
hooks.deregister();after(()=>delete globalThis[key]);
const uuid=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const org=uuid(1),other=uuid(2),job=uuid(3),jobB=uuid(4),foreignJob=uuid(5),candidate=uuid(6),missingCandidate=uuid(7),foreignCandidate=uuid(8);
const publicApp=uuid(10),manualApp=uuid(11),manualMissing=uuid(12),publicMissing=uuid(13),jobBApp=uuid(14),foreignApp=uuid(15),removedApp=uuid(16);
const appVersion=uuid(20),sharedVersion=uuid(21);
const appPath=`${org}/applications/${publicApp}/${appVersion}.pdf`,sharedPath=`${org}/${candidate}/${sharedVersion}.pdf`;
const appBytes=new TextEncoder().encode('%PDF-1.4 exact application CV'),sharedBytes=new TextEncoder().encode('%PDF-1.4 current candidate CV');
function setup(role='customer'){
 const row=(id,organisation_id,job_id,candidate_id,source='manual')=>({id,organisation_id,job_id,candidate_id,source,stage:'applied',assessment_status:'pending',created_at:'2026-09-26T00:00:00Z',removed_at:null});
 const f={calls:[],downloads:[],assigned:new Set([org]),errors:new Set(),anonymous:false,storageError:false,rows:{
  organisations:[{id:org,name:'Own organisation'},{id:other,name:'Other organisation'}],
  jobs:[{id:job,organisation_id:org,title:'Job A',description:'Details',content_version:2},{id:jobB,organisation_id:org,title:'Job B',content_version:1},{id:foreignJob,organisation_id:other,title:'Foreign Job',content_version:1}],
  candidates:[{id:candidate,organisation_id:org,full_name:'Canonical Name',email:'canonical@example.com',phone:'DO NOT EXPOSE',linkedin_url:'DO NOT EXPOSE'},{id:missingCandidate,organisation_id:org,full_name:'No CV',email:null},{id:foreignCandidate,organisation_id:other,full_name:'Other tenant',email:'foreign@example.com'}],
  applications:[row(publicApp,org,job,candidate,'public'),row(manualApp,org,job,candidate),row(manualMissing,org,job,missingCandidate),row(publicMissing,org,job,candidate,'public'),row(jobBApp,org,jobB,candidate),row(foreignApp,other,foreignJob,foreignCandidate),{...row(removedApp,org,job,candidate),removed_at:'2026-09-27T00:00:00Z'}],
  application_cvs:[{application_id:publicApp,organisation_id:org,job_id:job,object_id:appVersion,storage_path:appPath,byte_size:appBytes.length,submitted_full_name:'Submitted Name',normalized_email:'submitted@example.com',submitted_phone:'456',submitted_linkedin_url:'https://linkedin.com/in/submitted'}],
  candidate_cvs:[{candidate_id:candidate,organisation_id:org,object_id:sharedVersion,storage_path:sharedPath,byte_size:sharedBytes.length}],
 }};
 const client={from(table){const call={table,filters:[],orders:[],columns:null,range:null};f.calls.push(call);
  function execute(single){
   if(f.errors.has(table))return {data:null,error:{message:'private database error'}};
   let rows=table==='admin_organisation_assignments'?[...f.assigned].map(organisation_id=>({organisation_id,admin_id:uuid(30)})):f.rows[table]??[];
   rows=rows.filter(row=>call.filters.every(([op,k,v])=>op==='in'?v.includes(row[k]):row[k]===v));
   for(const [k,{ascending=true}={}] of [...call.orders].reverse())rows=[...rows].sort((a,b)=>String(a[k]).localeCompare(String(b[k]))*(ascending?1:-1));
   if(call.range)rows=rows.slice(call.range[0],call.range[1]+1);
   if(table==='applications'&&call.columns?.includes('candidate:candidates'))rows=rows.map(row=>({...row,candidate:f.rows.candidates.find(c=>c.id===row.candidate_id&&c.organisation_id===row.organisation_id)})).filter(r=>r.candidate);
   return {data:single?(rows[0]??null):rows,error:null};
  }
  const q={select(columns){call.columns=columns;return q;},eq(k,v){call.filters.push(['eq',k,v]);return q;},is(k,v){call.filters.push(['is',k,v]);return q;},in(k,v){call.filters.push(['in',k,v]);return q;},order(...args){call.orders.push(args);return q;},range(...args){call.range=args;return q;},maybeSingle(){return Promise.resolve(execute(true));},then(resolve,reject){return Promise.resolve(execute(false)).then(resolve,reject);}};return q;
 },storage:{from(bucket){assert.equal(bucket,'candidate-cvs');return {async download(path){f.downloads.push(path);const bytes=f.downloadBytes??(path===appPath?appBytes:path===sharedPath?sharedBytes:null);return {data:bytes?new Blob([bytes]):null,error:f.storageError?{message:'private storage error'}:null};}};}}};
 f.identity={profile:{id:uuid(30),role,organisation_id:role==='customer'?org:null},client};globalThis[key]=f;return f;
}
const request=(id,query='')=>GET(new Request('https://work.example/api/recruitment/applications/'+id+'/cv'+query),{params:Promise.resolve({applicationId:id})});

test('Job applicants use own-tenant/Job filters, bounded pagination and exact snapshot projection',async()=>{
 const f=setup();const before=structuredClone(f.rows.candidates);const rows=await listJobApplications({jobId:job,offset:0,limit:2});
 assert.deepEqual(rows.map(r=>r.id),[publicApp,manualApp]);
 assert.deepEqual(rows[0],{id:publicApp,candidate_id:candidate,job_id:job,stage:'applied',source:'public',assessment_status:'pending',created_at:'2026-09-26T00:00:00Z',candidate:{full_name:'Canonical Name',email:'canonical@example.com'},submitted_full_name:'Submitted Name',submitted_email:'submitted@example.com',submitted_phone:'456',submitted_linkedin_url:'https://linkedin.com/in/submitted',cv_available:true});
 assert.equal(rows[1].submitted_full_name,null);assert.equal(rows[1].cv_available,true);assert.deepEqual(f.rows.candidates,before);
 const call=f.calls.find(c=>c.table==='applications');assert.deepEqual(call.filters,[['eq','organisation_id',org],['eq','job_id',job],['is','removed_at',null]]);assert.deepEqual(call.range,[0,1]);assert.deepEqual(call.orders,[['created_at',{ascending:false}],['id']]);
 assert.doesNotMatch(JSON.stringify(rows),/storage_path|\.pdf|DO NOT EXPOSE|organisation_id/);
 for(const c of f.calls.filter(c=>['application_cvs','candidate_cvs'].includes(c.table))){assert.ok(c.filters.some(v=>v[1]==='organisation_id'&&v[2]===org));assert.doesNotMatch(c.columns,/storage_path|object_id/);}
 assert.equal(f.downloads.length,0);
});
test('Job applicants cannot mix Jobs/tenants or bypass context; removed Applications stay excluded',async()=>{
 const f=setup();const rows=await listJobApplications({jobId:job});assert.deepEqual(rows.map(r=>r.id),[publicApp,manualApp,manualMissing,publicMissing]);
 assert.deepEqual(await listJobApplications({jobId:foreignJob}),[]);assert.deepEqual(await listJobApplications({jobId:uuid(99)}),[]);
 await assert.rejects(listJobApplications({organisationId:other,jobId:foreignJob}),/not-found/);
 assert.deepEqual((await listJobApplications({jobId:jobB})).map(r=>r.id),[jobBApp]);
 assert.equal(f.rows.applications.every(a=>a.stage==='applied'),true);
});
test('Applicant reassessment availability follows source with no shared-CV fallback for public Applications',async()=>{
 setup();const rows=await listJobApplications({jobId:job});
 assert.equal(rows.find(r=>r.id===publicMissing).cv_available,false);assert.equal(rows.find(r=>r.id===manualMissing).cv_available,false);
 assert.equal(rows.find(r=>r.id===publicApp).cv_available,true);assert.equal(rows.find(r=>r.id===manualApp).cv_available,true);
});
test('Applicant loader allows assigned Admin and denies revoked Admin; Owner needs explicit Organisation',async()=>{
 let f=setup('admin');assert.equal((await listJobApplications({organisationId:org,jobId:job})).length,4);
 f.assigned.clear();f.calls=[];await assert.rejects(listJobApplications({organisationId:org,jobId:job}),/not-found/);assert.equal(f.calls.some(c=>c.table==='applications'),false);
 f=setup('platform_owner');await assert.rejects(listJobApplications({jobId:job}),/not-found/);
 assert.equal((await listJobApplications({organisationId:org,jobId:job})).length,4);
 assert.deepEqual((await listJobApplications({organisationId:other,jobId:foreignJob})).map(r=>r.id),[foreignApp]);
});
test('Applicant loader rejects anonymous/malformed requests and fails closed on metadata errors',async()=>{
 let f=setup();f.anonymous=true;await assert.rejects(listJobApplications({jobId:job}),/login/);assert.equal(f.calls.length,0);
 for(const input of [{},{jobId:'bad'},{jobId:job,limit:101},{jobId:job,offset:-1},{jobId:job,role:'platform_owner'}]){f=setup();await assert.rejects(listJobApplications(input),/Invalid Job applicant/);assert.equal(f.calls.length,0);}
 for(const table of ['applications','application_cvs','candidate_cvs']){f=setup();f.errors.add(table);await assert.rejects(listJobApplications({jobId:job}),{message:'Job applicants are temporarily unavailable.'});}
});
test('Public CV route uses immutable Application CV, with private PDF headers and safe filename',async()=>{
 const f=setup();const response=await request(publicApp);assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),appBytes);assert.deepEqual(f.downloads,[appPath]);
 assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(response.headers.get('Content-Disposition'),`inline; filename="application-${publicApp}-cv.pdf"`);
 assert.doesNotMatch(JSON.stringify([...response.headers]),/storage_path|candidate-cvs|sb_secret|https?:/);
 assert.equal(f.rows.applications.find(a=>a.id===publicApp).stage,'applied');
});
test('Manual CV route uses the current Candidate CV',async()=>{
 const f=setup();const response=await request(manualApp);assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),sharedBytes);assert.deepEqual(f.downloads,[sharedPath]);
});
test('Missing CV, missing Application and unavailable Storage return safe private 404 without public fallback',async()=>{
 for(const id of [publicMissing,manualMissing,uuid(99)]){const f=setup();const response=await request(id);assert.equal(response.status,404);assert.equal(await response.text(),'CV not found.');assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(f.downloads.length,0);}
 const f=setup();f.storageError=true;assert.equal((await request(publicApp)).status,404);
});
test('CV route denies cross-tenant/anonymous/revoked access and requires Owner context',async()=>{
 let f=setup();assert.equal((await request(foreignApp)).status,404);assert.equal((await request(foreignApp,'?organisationId='+other)).status,404);assert.equal(f.downloads.length,0);
 f=setup();f.anonymous=true;assert.equal((await request(publicApp)).status,404);assert.equal(f.downloads.length,0);
 f=setup('admin');assert.equal((await request(publicApp,'?organisationId='+org)).status,200);f.assigned.clear();f.downloads=[];assert.equal((await request(publicApp,'?organisationId='+org)).status,404);assert.equal(f.downloads.length,0);
 f=setup('platform_owner');assert.equal((await request(publicApp)).status,404);assert.equal((await request(publicApp,'?organisationId='+org)).status,200);
});
test('CV route rejects malformed context, unsafe paths, invalid PDF bytes and size mismatches',async()=>{
 for(const [id,query] of [['bad',''],[publicApp,'?organisationId=bad'],[publicApp,'?organisationId='+org+'&organisationId='+other],[publicApp,'?storagePath=evil']]){const f=setup();assert.equal((await request(id,query)).status,404);assert.equal(f.downloads.length,0);}
 for(const bytes of [new TextEncoder().encode('not a PDF'),new TextEncoder().encode('%PDF-wrong-length'),new Uint8Array(5242881)]){const f=setup();f.downloadBytes=bytes;assert.equal((await request(publicApp)).status,404);}
 const f=setup();f.rows.application_cvs[0].storage_path='foreign/path';assert.equal((await request(publicApp)).status,404);assert.equal(f.downloads.length,0);
});
test('Pipeline exposes source and assessment status while preserving tenant/Job/stage/pagination filters',async()=>{
 const f=setup();const rows=await listPipeline({jobId:job,stage:'applied',offset:0,limit:2});assert.deepEqual(rows.map(r=>[r.source,r.assessment_status]),[['public','pending'],['manual','pending']]);
 const call=f.calls.find(c=>c.table==='applications');assert.match(call.columns,/stage,source,assessment_status,/);assert.ok(call.filters.some(v=>v[1]==='job_id'&&v[2]===job));assert.ok(call.filters.some(v=>v[1]==='organisation_id'&&v[2]===org));assert.deepEqual(call.range,[0,1]);
});
test('Recruiter reads never construct a privileged client or mutate recruitment state',()=>{
 for(const path of ['lib/recruitment/job-applications.ts','lib/assessment/context.ts','app/api/recruitment/applications/[applicationId]/cv/route.ts']){
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');assert.doesNotMatch(source,/SUPABASE_SECRET_KEY|\.insert\(|\.update\(|\.delete\(|\.rpc\(|createSignedUrl|getPublicUrl/);
 }
});

test('Existing recruiter reassessment controls use per-Application eligibility for both sources',async()=>{
 const f=setup();
 assert.equal(await hasApplicationCv({applicationId:publicApp}),true);
 assert.equal(await hasApplicationCv({applicationId:manualApp}),true);
 assert.equal(await hasApplicationCv({applicationId:publicMissing}),false);
 assert.equal(await hasApplicationCv({applicationId:manualMissing}),false);
 f.rows.candidate_cvs=[];
 assert.equal(await hasApplicationCv({applicationId:publicApp}),true);
 assert.equal(await hasApplicationCv({applicationId:manualApp}),false);
 const ui=readFileSync(new URL('../components/recruitment/candidate-cv-assessment.tsx',import.meta.url),'utf8');
 assert.match(ui,/disabled=\{!application.cvAvailable \|\| assessing\}/);assert.doesNotMatch(ui,/disabled=\{!cv \|\| assessing\}/);
 const loader=readFileSync(new URL('../components/recruitment/recruitment-workspace.tsx',import.meta.url),'utf8');
 assert.match(loader,/await hasApplicationCv/);assert.match(loader,/cvAvailable: applicationCvs.get\(application.id\)/);
});

const candidateRequest=(id,query='')=>candidateGET(new Request('https://work.example/api/recruitment/candidates/'+id+'/cv'+query),{params:Promise.resolve({candidateId:id})});
test('Candidate profile CV endpoint returns own current CV with private PDF headers and no Storage disclosure',async()=>{
 const f=setup();const response=await candidateRequest(candidate);
 assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),sharedBytes);
 assert.deepEqual(f.downloads,[sharedPath]);
 assert.equal(response.headers.get('Content-Type'),'application/pdf');
 assert.equal(response.headers.get('Content-Disposition'),`inline; filename="candidate-${candidate}-cv.pdf"`);
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 assert.doesNotMatch(JSON.stringify([...response.headers]),/storage_path|candidate-cvs|sb_secret|https?:/);
 assert.equal(f.calls.some(c=>c.table==='application_cvs'),false);
 for(const table of ['candidates','candidate_cvs'])assert.ok(f.calls.find(c=>c.table===table).filters.some(v=>v[1]==='organisation_id'&&v[2]===org));
});
test('Candidate profile CV endpoint permits assigned Admin and explicit Owner but denies revoked/foreign/anonymous access',async()=>{
 let f=setup('admin');assert.equal((await candidateRequest(candidate,'?organisationId='+org)).status,200);
 f.assigned.clear();f.downloads=[];assert.equal((await candidateRequest(candidate,'?organisationId='+org)).status,404);assert.deepEqual(f.downloads,[]);
 f=setup('customer');assert.equal((await candidateRequest(foreignCandidate)).status,404);assert.equal((await candidateRequest(foreignCandidate,'?organisationId='+other)).status,404);assert.deepEqual(f.downloads,[]);
 f=setup('admin');assert.equal((await candidateRequest(foreignCandidate,'?organisationId='+other)).status,404);assert.deepEqual(f.downloads,[]);
 f=setup('platform_owner');assert.equal((await candidateRequest(candidate)).status,404);assert.equal((await candidateRequest(candidate,'?organisationId='+org)).status,200);
 f=setup();f.anonymous=true;assert.equal((await candidateRequest(candidate)).status,404);assert.deepEqual(f.downloads,[]);
});
test('Missing Candidate or current CV returns safe private 404 and never falls back to Application CV',async()=>{
 for(const id of [missingCandidate,uuid(99),candidate]){
  const f=setup();if(id===candidate)f.rows.candidate_cvs=[];
  const response=await candidateRequest(id);assert.equal(response.status,404);assert.equal(await response.text(),'CV not found.');
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.deepEqual(f.downloads,[]);
 }
});
test('Candidate profile CV endpoint rejects invalid inputs, unsafe metadata paths and invalid downloaded PDF bytes',async()=>{
 for(const [id,query] of [['bad',''],[candidate,'?organisationId=bad'],[candidate,'?organisationId='+org+'&organisationId='+other],[candidate,'?storagePath=evil']]){
  const f=setup();assert.equal((await candidateRequest(id,query)).status,404);assert.deepEqual(f.downloads,[]);
 }
 for(const bytes of [new TextEncoder().encode('not-pdf'),new TextEncoder().encode('%PDF-wrong-size'),new Uint8Array(5242881)]){
  const f=setup();f.downloadBytes=bytes;assert.equal((await candidateRequest(candidate)).status,404);
 }
 let f=setup();f.rows.candidate_cvs[0].storage_path='foreign/path';assert.equal((await candidateRequest(candidate)).status,404);assert.deepEqual(f.downloads,[]);
 f=setup();f.storageError=true;const response=await candidateRequest(candidate);assert.equal(response.status,404);assert.equal(await response.text(),'CV not found.');
});
