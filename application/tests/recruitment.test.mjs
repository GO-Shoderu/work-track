import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { jobSchema,candidateSchema,applicationSchema,stageSchema,pipelineSchema,namePattern } from '../lib/validation/recruitment.ts';
const key='__recruitmentTest';
const org='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const id='33333333-3333-4333-8333-333333333333';
const mocks={
 'next/headers':`export async function headers(){return new Headers({origin:globalThis.${key}.origin});}`,
 '../env':'export function getEnvironment(){return {APP_URL:"http://localhost:3000"};}',
 './context':`export async function recruitmentContext(id){let f=globalThis.${key}; f.calls.push(['context',id]); if(f.denied)throw Error('denied');return {client:f.client,organisation:{id:f.org}};}`,
};
const hooks=registerHooks({resolve(s,c,next){
 if (/\/lib\/recruitment\/(actions|queries)\.ts$/.test(c.parentURL??'') && mocks[s])return {url:'data:text/javascript,'+encodeURIComponent(mocks[s]),shortCircuit:true};
 if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return {url:u.href,shortCircuit:true};}
 return next(s,c);
}});
const actions=await import('../lib/recruitment/actions.ts');
const queries=await import('../lib/recruitment/queries.ts');
hooks.deregister();after(()=>delete globalThis[key]);
function setup(){const f={origin:'http://localhost:3000',org,calls:[],denied:false,error:null,data:{id}};
 f.client={from(t){f.calls.push(['from',t]);const q={then(resolve,reject){return Promise.resolve({data:f.data,error:f.error}).then(resolve,reject);},single(){return Promise.resolve({data:f.data,error:f.error});}};for(const op of ['insert','update','select','eq','is','ilike','order','range'])q[op]=(...args)=>{f.calls.push([op,...args]);return q;};return q;}};globalThis[key]=f;return f;}
test('Recruitment validation: required names, bounded fields, optional contact data and exact stages',()=>{
 assert.equal(jobSchema.parse({title:' Engineer '}).title,'Engineer');
 assert.equal(candidateSchema.parse({fullName:' Jane ',email:' ',phone:null}).email,null);
 for(const input of [{title:''},{title:'x'.repeat(201)},{title:'ok',stage:'hired'}])assert.equal(jobSchema.safeParse(input).success,false);
 for(const url of ['https://www.linkedin.com/in/jane-doe/','https://linkedin.com/in/jane'])assert.equal(candidateSchema.safeParse({fullName:'Jane',linkedinUrl:url}).success,true);
 for(const url of ['javascript:alert(1)','https://linkedin.com.evil.test/in/jane','https://evil.test/in/jane','http://linkedin.com/in/jane','https://user@linkedin.com/in/jane','https://linkedin.com/company/acme'])assert.equal(candidateSchema.safeParse({fullName:'Jane',linkedinUrl:url}).success,false);
 assert.equal(candidateSchema.safeParse({fullName:'Jane',email:'broken'}).success,false);
 assert.equal(applicationSchema.safeParse({candidateId:id,jobId:other,stage:'hired'}).success,false);
 for(const stage of ['applied','screening','interview','offer','hired','rejected'])assert.equal(stageSchema.safeParse({applicationId:id,stage}).success,true);
 assert.equal(stageSchema.safeParse({applicationId:id,stage:'archived'}).success,false);
 assert.equal(pipelineSchema.safeParse({limit:101}).success,false);
 assert.equal(namePattern('A%_\\B'),'%A\\%\\_\\\\B%');
});
test('Server Actions reject invalid input and foreign origins before database access',async()=>{
 for(const fn of Object.values(actions)){const f=setup();f.origin='https://evil.invalid';assert.equal((await fn({})).ok,false);assert.deepEqual(f.calls,[]);}
 const f=setup();assert.equal((await actions.createJob({title:' '})).ok,false);assert.deepEqual(f.calls,[]);
});
test('Job and Candidate creation use verified Organisation and normal client with no Auth identity',async()=>{
 let f=setup();assert.equal((await actions.createJob({organisationId:other,title:' Engineer '})).ok,true);
 assert.deepEqual(f.calls.find(c=>c[0]==='insert')[1],{organisation_id:org,title:'Engineer',description:null});
 f=setup();await actions.createCandidate({fullName:'Jane',linkedinUrl:'https://linkedin.com/in/jane'});
 assert.deepEqual(f.calls.find(c=>c[0]==='insert')[1],{organisation_id:org,full_name:'Jane',email:null,phone:null,linkedin_url:'https://linkedin.com/in/jane'});
});
test('Application creation relies on atomic composite FK insert; duplicate/cross-tenant errors are safe',async()=>{
 let f=setup();await actions.createApplication({candidateId:id,jobId:other});assert.deepEqual(f.calls.find(c=>c[0]==='insert')[1],{organisation_id:org,candidate_id:id,job_id:other});
 f=setup();f.error={code:'23505',message:'private SQL'};assert.match((await actions.createApplication({candidateId:id,jobId:other})).error,/already/);
 f=setup();f.error={code:'23503',message:'private SQL'};const result=await actions.createApplication({candidateId:id,jobId:other});assert.equal(result.ok,false);assert.doesNotMatch(result.error,/private SQL/);
});
test('Stage updates change only stage and filter by trusted Organisation and Application ID',async()=>{
 const f=setup();assert.equal((await actions.updateApplicationStage({applicationId:id,stage:'interview'})).ok,true);
 assert.deepEqual(f.calls.find(c=>c[0]==='update'),['update',{stage:'interview'}]);
 assert.ok(f.calls.some(c=>c[0]==='eq'&&c[1]==='organisation_id'&&c[2]===org));
 assert.ok(f.calls.some(c=>c[0]==='eq'&&c[1]==='id'&&c[2]===id));
 f.data=null;assert.equal((await actions.updateApplicationStage({applicationId:id,stage:'hired'})).ok,false);
});
test('Pipeline combines literal name, Job, stage and tenant filters before deterministic pagination',async()=>{
 const f=setup();await queries.listPipeline({jobId:id,candidateName:'Jane%',stage:'offer',offset:50,limit:25});
 for(const call of [['is','removed_at',null],['eq','organisation_id',org],['eq','job_id',id],['eq','stage','offer'],['ilike','candidate.full_name','%Jane\\%%'],['range',50,74]])assert.ok(f.calls.some(c=>JSON.stringify(c)===JSON.stringify(call)));
 assert.match(f.calls.find(c=>c[0]==='select')[1],/candidates!applications_candidate_fkey!inner/);
});
test('All loaders scope reads and authorization denial happens before reads/writes',async()=>{
 for(const fn of Object.values(queries)){const f=setup();await fn();assert.ok(f.calls.some(c=>c[0]==='eq'&&c[1]==='organisation_id'&&c[2]===org));}
 const f=setup();f.denied=true;await assert.rejects(actions.createJob({title:'Job'}),/denied/);assert.equal(f.calls.some(c=>c[0]==='from'),false);
});
test('Migration security contract: RLS, composite FKs, duplicate constraint and least column privileges',()=>{
 const sql=readFileSync(new URL('../../supabase/migrations/20260922000100_recruitment_core.sql',import.meta.url),'utf8');
 assert.equal((sql.match(/enable row level security/g)||[]).length,3);
 assert.equal((sql.match(/create policy/g)||[]).length,7);
 assert.match(sql,/foreign key \(organisation_id,candidate_id\)/);assert.match(sql,/foreign key \(organisation_id,job_id\)/);
 assert.match(sql,/unique \(candidate_id,job_id\)/);assert.match(sql,/grant update \(stage\)/);
 assert.doesNotMatch(sql,/grant (all|delete|truncate)|disable row level security|security definer/i);
});
