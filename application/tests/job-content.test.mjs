import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {jobDocumentSchema,jobDescriptionText,createJobDraftSchema} from '../lib/validation/job-content.ts';
const text=(value,marks)=>({type:'text',text:value,...(marks?{marks}: {})});
const p=(...content)=>({type:'paragraph',content});
const doc=(...content)=>({type:'doc',content});
test('Bounded Tiptap document validates nested lists/headings/marks and derives text only',()=>{
 const value=doc({type:'heading',attrs:{level:2},content:[text('Responsibilities')]},p(text('Build ',[{type:'bold'}]),text('systems'),{type:'hardBreak'},text('with care.')),{type:'orderedList',attrs:{start:2},content:[{type:'listItem',content:[p(text('Review code')),{type:'bulletList',content:[{type:'listItem',content:[p(text('Test changes'))]}]}]}]});
 assert.deepEqual(jobDocumentSchema.parse(value),value);
 assert.equal(jobDescriptionText(value),'Responsibilities\nBuild systems\nwith care.\nReview code\nTest changes');
 assert.equal(jobDescriptionText(jobDocumentSchema.parse(doc(p()))),'');
 assert.equal(jobDescriptionText(jobDocumentSchema.parse(doc(p(text('<script>untrusted text</script>'))))),'<script>untrusted text</script>');
});
test('Rich schema rejects HTML, URLs, embedded content, arbitrary attrs and invalid grammar',()=>{
 for(const value of [null,[],{},doc(),doc({type:'image',attrs:{src:'https://evil.invalid'}}),doc({...p(),attrs:{onclick:'evil'}}),doc({type:'heading',attrs:{level:1}}),doc(text('outside paragraph')),doc(p(text('x',[{type:'link',attrs:{href:'javascript:evil'}}]))),doc(p(text('x',[{type:'bold'},{type:'bold'}]))),doc({type:'bulletList',content:[p(text('wrong child'))]}),doc({type:'listItem',content:[p()]}),doc(p({...text('x'),html:'raw'})),doc(p(text('\0')))])assert.equal(jobDocumentSchema.safeParse(value).success,false,JSON.stringify(value));
});
test('Rich schema rejects oversized text, node count, child count, depth, byte size and cycles without throwing',()=>{
 let deep=p(text('x'));for(let i=0;i<5;i++)deep={type:'bulletList',content:[{type:'listItem',content:[p(),deep]}]};
 const cycle=doc(p());cycle.content.push(cycle);
 for(const value of [doc(p(text('x'.repeat(20001)))),doc(...Array(101).fill(p())),doc(...Array.from({length:100},()=>p(...Array.from({length:11},()=>text('x'))))),doc(deep),doc(p(text('😀'.repeat(18000)))),cycle])assert.equal(jobDocumentSchema.safeParse(value).success,false);
});
test('Closing dates require a real future timestamp with timezone, and absent closing date clears it',()=>{
 const input={title:'Engineer',descriptionRich:doc(p())};
 assert.equal(createJobDraftSchema.parse(input).closesAt,null);
 assert.equal(createJobDraftSchema.safeParse({...input,closesAt:new Date(Date.now()+86400000).toISOString()}).success,true);
 for(const closesAt of ['invalid','2026-02-30T00:00:00Z','2999-01-01T12:00:00',new Date().toISOString(),'infinity'])assert.equal(createJobDraftSchema.safeParse({...input,closesAt}).success,false);
});
test('Job write boundary stays actor-authenticated, validates rich documents and denies direct column writes',()=>{
 const sql=readFileSync(new URL('../../supabase/migrations/20260926000200_authenticated_job_management.sql',import.meta.url),'utf8');
 assert.match(sql,/revoke update \(title,description,status,closes_at\) on public.jobs from authenticated/);
 assert.doesNotMatch(sql,/grant (?:update|insert)|service_role.*to authenticated/i);
 assert.match(sql,/plain_text:=private.job_document_text\(job_document\)/);
 assert.match(sql,/target.content_version is distinct from expected_content_version/);
 assert.match(sql,/where j.id=target_job_id and j.organisation_id=tenant for update/);
 assert.match(sql,/where a.admin_id=actor.id and a.organisation_id=tenant for share/);
});
