import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
const hook=registerHooks({resolve(s,c,next){if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return {url:u.href,shortCircuit:true};}return next(s,c);}});
const {assessWithProvider,requireAssessmentProvider}=await import('../lib/assessment/provider.ts');
const {ADVISORY_DISCLAIMER}=await import('../lib/assessment/schema.ts');
const {extractPdfText}=await import('../lib/cv/pdf.ts');
hook.deregister();
const result={score:65,summary:'Evidence of JavaScript.',strengths:['JavaScript'],gaps:['SQL not evidenced'],recommendation:'potential_match',disclaimer:ADVISORY_DISCLAIMER};
const job={title:'Engineer',description:'JavaScript and SQL'};
const cv='Professional experience developing JavaScript applications.';
async function configured(fn){const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY,oldModel=process.env.OPENAI_ASSESSMENT_MODEL;process.env.OPENAI_API_KEY='offline-provider-sentinel';process.env.OPENAI_ASSESSMENT_MODEL='offline-model';try{await fn();}finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;if(oldModel===undefined)delete process.env.OPENAI_ASSESSMENT_MODEL;else process.env.OPENAI_ASSESSMENT_MODEL=oldModel;}}
function response(text=JSON.stringify(result)){return {status:'completed',output:[{type:'message',content:[{type:'output_text',text}]}]};}
test('Provider fails closed when configuration is missing, before fetch',async()=>{
 await configured(async()=>{delete process.env.OPENAI_API_KEY;globalThis.fetch=()=>{throw Error('must not call');};assert.throws(requireAssessmentProvider,/not configured/);await assert.rejects(assessWithProvider(job,cv),/not configured/);});
});
test('Provider uses fixed backend endpoint, strict structured output, no tools, no stored response and validates result',async()=>{
 await configured(async()=>{globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');const body=JSON.parse(init.body);assert.equal(body.store,false);assert.deepEqual(body.tools,[]);assert.equal(body.tool_choice,'none');assert.equal(body.text.format.strict,true);assert.equal(body.input[0].role,'system');assert.equal(JSON.parse(body.input[1].content).cvText,cv);assert.equal(init.body.includes('offline-provider-sentinel'),false);return Response.json(response());};assert.deepEqual(await assessWithProvider(job,cv),result);});
});
test('Malformed output, refusal, tools, incomplete responses, oversize responses and provider errors are safe failures',async()=>{
 await configured(async()=>{for(const payload of [response('broken JSON'),response(JSON.stringify({...result,score:999})),{status:'incomplete',output:[]},{status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]},{status:'completed',output:[{type:'function_call'}]},response('x'.repeat(70000))]){globalThis.fetch=async()=>Response.json(payload);await assert.rejects(assessWithProvider(job,cv),e=>e.message.includes('invalid result')&&!e.message.includes('broken JSON'));}
 globalThis.fetch=async()=>new Response('private provider details',{status:500});await assert.rejects(assessWithProvider(job,cv),e=>!e.message.includes('private provider'));
 globalThis.fetch=async()=>{throw Error('secret network detail');};await assert.rejects(assessWithProvider(job,cv),e=>!e.message.includes('secret network'));});
});
function pdf(text){const stream=`BT /F1 12 Tf 20 100 Td (${text}) Tj ET`;const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];let out='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${obj}\nendobj\n`;});const xref=Buffer.byteLength(out);out+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('');out+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(out);}
test('Real bounded PDF subprocess extracts text and cleanly rejects unreadable/empty PDFs',async()=>{
 assert.match(await extractPdfText(pdf('Professional JavaScript engineer with SQL experience.')),/JavaScript engineer/);
 await assert.rejects(extractPdfText(Buffer.from('%PDF-1.7\nnot a document')),/cannot be read/);
 await assert.rejects(extractPdfText(pdf('')),/readable text/);
});
