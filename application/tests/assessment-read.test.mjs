import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
const key='__assessmentRead';
const org='11111111-1111-4111-8111-111111111111',app='22222222-2222-4222-8222-222222222222',version='33333333-3333-4333-8333-333333333333';
const hook=registerHooks({resolve(s,c,next){let source;if(c.parentURL?.endsWith('/lib/assessment/context.ts')){
 if(s==='../recruitment/context')source=`export async function recruitmentContext(id){const f=globalThis.${key};f.requested=id;if(f.denied)throw Error('denied');return f.context;}`;
 if(s==='../cv/storage')source=`export async function currentCv(){return globalThis.${key}.cv;}`;
 }if(source)return {url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true};
 if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return {url:u.href,shortCircuit:true};}return next(s,c);
}});
const {readAssessmentResult}=await import('../lib/assessment/context.ts');const {ADVISORY_DISCLAIMER}=await import('../lib/assessment/schema.ts');hook.deregister();after(()=>delete globalThis[key]);
function setup(){const f={cv:{object_id:version},calls:[],denied:false,missingApplication:false,result:{score:80,summary:'Evidence.',strengths:[],gaps:[],recommendation:'strong_match',disclaimer:ADVISORY_DISCLAIMER}};f.context={organisation:{id:org},client:{from(table){const filters={};const q={select(){return q;},eq(k,v){filters[k]=v;return q;},async maybeSingle(){f.calls.push([table,filters]);const data=table==='applications'?(f.missingApplication?null:{id:app,candidate_id:app,job_id:app}):table==='jobs'?{id:app,title:'Engineer',description:null}:table==='candidates'?{id:app}:{cv_object_id:version,assessed_at:'now',result:f.result};return {data,error:null};}};return q;}}};globalThis[key]=f;return f;}
test('Latest assessment reload uses authorised Application and current CV filters, with validated output',async()=>{
 const f=setup();const loaded=await readAssessmentResult({organisationId:org,applicationId:app});assert.deepEqual(loaded.result,f.result);assert.equal(f.requested,org);
 for(const [table,filters] of f.calls)assert.equal(filters.organisation_id,org,table);
 assert.deepEqual(f.calls.find(c=>c[0]==='candidate_assessments')[1],{organisation_id:org,application_id:app,cv_object_id:version});
 f.result={score:999};await assert.rejects(readAssessmentResult({applicationId:app}),/unavailable/);
});
test('Denied or missing Application cannot reload assessment; missing current CV returns no result',async()=>{
 let f=setup();f.denied=true;await assert.rejects(readAssessmentResult({applicationId:app}));assert.equal(f.calls.length,0);
 f=setup();f.missingApplication=true;await assert.rejects(readAssessmentResult({applicationId:app}));assert.equal(f.calls.length,1);
 f=setup();f.cv=null;assert.equal(await readAssessmentResult({applicationId:app}),null);assert.equal(f.calls.some(c=>c[0]==='candidate_assessments'),false);
});
test('AI secrets and native execution stay server-only; no privileged assessment client or sensitive logging',()=>{
 const root=new URL('../',import.meta.url);const read=p=>readFileSync(new URL(p,root),'utf8');
 for(const file of ['lib/assessment/provider.ts','lib/assessment/prompt.ts','lib/assessment/context.ts','lib/cv/pdf.ts','lib/cv/storage.ts'])assert.match(read(file),/import "server-only"/);
 const sources=['lib/assessment/provider.ts','lib/assessment/prompt.ts','lib/assessment/context.ts','lib/assessment/actions.ts','lib/cv/pdf.ts','lib/cv/actions.ts','lib/cv/storage.ts'].map(read).join('\n');
 assert.doesNotMatch(sources,/SUPABASE_SECRET_KEY|console\.|localStorage|sessionStorage|createSignedUrl|getPublicUrl|shell:\s*true/);
 for(const dir of ['lib/assessment','lib/cv'])for(const f of readdirSync(new URL(dir+'/',root)))assert.doesNotMatch(read(dir+'/'+f),/NEXT_PUBLIC_/);
 assert.match(read('lib/cv/pdf.ts'),/--as=268435456/);assert.match(read('lib/cv/pdf.ts'),/timeout: 8000/);assert.doesNotMatch(read('lib/cv/pdf.ts'),/\.\.\.process.env/);
});
