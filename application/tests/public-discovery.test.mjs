import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
const key = '__publicDiscoveryTest';
const hook = registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/public-recruitment/queries.ts')) {
    let source;
    if (specifier === '../env') source = 'export const requireEnvironment=()=>({SUPABASE_URL:"https://example.invalid",SUPABASE_PUBLISHABLE_KEY:"public-key"});';
    if (specifier === '@supabase/supabase-js') source = `export const createClient=(...args)=>{globalThis.${key}.config=args;return {rpc:async(name,input)=>{globalThis.${key}.call={name,input};return globalThis.${key}.response;}}};`;
    if (source) return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
  }
  if (specifier.startsWith('.') && context.parentURL?.includes('/lib/')) {
    try { return next(specifier,context); } catch { return next(specifier+'.ts',context); }
  }
  return next(specifier,context);
}});
const { getOrganisationCareers, getPublicJob } = await import('../lib/public-recruitment/queries.ts');
hook.deregister();
const publicId = '20000000-0000-4000-8000-000000000001';
const organisation = { name: 'Example', careers_slug: 'example' };
const job = { public_id: publicId, title: 'Engineer', description_rich: null, description: 'Build things', teaser: null, closes_at: null, published_at: null };
test('Public discovery validates inputs and uses only stateless public read RPCs', async () => {
  const f = globalThis[key] = { response: { data: { organisation, jobs: [{ public_id: publicId, title: job.title, teaser: null, closes_at: null, published_at: null }] }, error: null } };
  assert.deepEqual(await getOrganisationCareers({ careersSlug: 'example' }), f.response.data);
  assert.deepEqual(f.call, { name: 'read_public_careers', input: { target_slug: 'example', page_offset: 0, page_size: 50 } });
  assert.equal(f.config[1], 'public-key');
  assert.equal(f.config[2].auth.persistSession, false);
  for (const input of [{ careersSlug: '../bad' }, { careersSlug: 'example', limit: 101 }, { careersSlug: 'example', organisationId: publicId }]) await assert.rejects(getOrganisationCareers(input));
  f.response.data = { organisation, job };
  assert.deepEqual(await getPublicJob({ careersSlug: 'example', publicId }), f.response.data);
});
test('Public discovery rejects overbroad or unsafe projections and returns null for unavailable Jobs', async () => {
  const f = globalThis[key] = { response: { data: null, error: null } };
  assert.equal(await getPublicJob({ careersSlug: 'example', publicId }), null);
  f.response.data = { organisation, job: { ...job, organisation_id: publicId } };
  await assert.rejects(getPublicJob({ careersSlug: 'example', publicId }));
  f.response.data = { organisation, job: { ...job, description_rich: { type: 'image' } } };
  await assert.rejects(getPublicJob({ careersSlug: 'example', publicId }));
  f.response = { data: null, error: { message: 'private database detail' } };
  await assert.rejects(getPublicJob({ careersSlug: 'example', publicId }), { message: 'Job information is unavailable.' });
});

test('Careers cards reject detail payloads while Job details retain bounded descriptions', async () => {
 const f = globalThis[key] = { response: { data: { organisation, jobs: [job] }, error: null } };
 await assert.rejects(getOrganisationCareers({ careersSlug: 'example' }));
 f.response.data = { organisation, job };
 assert.equal((await getPublicJob({ careersSlug: 'example', publicId })).job.description, 'Build things');
});
