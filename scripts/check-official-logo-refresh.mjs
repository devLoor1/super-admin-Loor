import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
const path = new URL('../src/features/official-logo-refresh/officialLogoRefresh.ts', import.meta.url);
const source = stripTypeScriptTypes(await readFile(path, 'utf8'), { mode: 'strip' });
const { createOfficialLogoRegistry, OFFICIAL_LOGO_MAX_BYTES, OFFICIAL_LOGO_REFRESH_MS, OFFICIAL_LOGO_TIMEOUT_MS } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const url = 'https://official-brand.invalid/header.png';
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let count = 0;
async function check(name, run) {
  try { await run(); count++; }
  catch (error) { throw new Error(`${name}: ${String(error.stack ?? error).replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g, '<official-logo-module>')}`); }
}
function harness() {
  let now = 0, sequence = 0, timerSequence = 0, body = 'image-A', decodeFails = false, reply = null;
  const timers = new Map(), requests = [], created = [], revoked = [], decoded = [];
  const registry = createOfficialLogoRegistry({
    now: () => now,
    setTimer: (callback, delay) => { const id = ++timerSequence; timers.set(id, { at: now + delay, callback }); return id; },
    clearTimer: id => timers.delete(id),
    fetch: async (input, options) => { requests.push({ input, options }); return reply ? reply(input, options) : new Response(body, { headers: { 'content-type': 'image/png' } }); },
    digest: async blob => createHash('sha256').update(new Uint8Array(await blob.arrayBuffer())).digest('hex'),
    createObjectURL: blob => { const value = `blob:controlled-${++sequence}`; created.push({ value, blob }); return value; },
    revokeObjectURL: value => revoked.push(value),
    decode: async (value, signal) => { decoded.push(value); if (decodeFails || signal.aborted) throw new Error('controlled decode failure'); },
  });
  const activate = (sourceUrl = url) => { const handle = registry.retain(sourceUrl); handle.setActive(true); return handle; };
  const advance = async milliseconds => { now += milliseconds; const due = [...timers].filter(([, t]) => t.at <= now); for (const [id, timer] of due) { if (!timers.delete(id)) continue; timer.callback(); } await flush(); };
  return { registry, requests, created, revoked, decoded, timers, activate, advance, setTime: value => { now = value; }, setBody: value => { body = value; }, setDecodeFailure: value => { decodeFails = value; }, setReply: value => { reply = value; } };
}

await check('invalid schemes and embedded credentials never reach fetch', () => {
  const h = harness();
  for (const source of ['data:image/png,x', 'javascript:alert(1)', 'https://user:pass@brand.invalid/x', 'not a URL']) assert.throws(() => h.registry.retain(source));
  assert.equal(h.requests.length, 0); h.registry.dispose();
});
await check('inactive logos perform no request and keep the original rendering URL', async () => {
  const h = harness(), handle = h.registry.retain(url);
  await h.registry.refreshDue(); assert.equal(h.requests.length, 0); assert.equal(handle.getSnapshot().renderUrl, url);
  handle.release(); h.registry.dispose();
});
await check('visible same-source consumers coalesce and use credential-free HTTP revalidation', async () => {
  const h = harness(), first = h.activate(), second = h.activate();
  await h.registry.refreshDue();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].input, url);
  assert.deepEqual({ method: h.requests[0].options.method, cache: h.requests[0].options.cache, credentials: h.requests[0].options.credentials, referrerPolicy: h.requests[0].options.referrerPolicy }, { method: 'GET', cache: 'no-cache', credentials: 'omit', referrerPolicy: 'no-referrer' });
  assert.equal(first.getSnapshot().status, 'ready'); assert.equal(first.getSnapshot(), second.getSnapshot());
  first.release(); assert.deepEqual(h.revoked, []);
  await h.advance(OFFICIAL_LOGO_REFRESH_MS); await h.registry.refreshDue(); assert.equal(h.requests.length, 2);
  second.release(); assert.equal(h.revoked.length, 1); assert.equal(h.timers.size, 0); h.registry.dispose();
});
await check('changed bytes at exactly the same source URL replace decoded image without editorial state', async () => {
  const h = harness(), handle = h.activate(); await h.registry.refreshDue();
  const first = handle.getSnapshot(); h.setBody('image-B'); h.setTime(OFFICIAL_LOGO_REFRESH_MS);
  await h.registry.refreshDue(); const second = handle.getSnapshot();
  assert.equal(second.sourceUrl, first.sourceUrl); assert.notEqual(second.digest, first.digest);
  assert.notEqual(second.renderUrl, first.renderUrl); assert.equal(second.status, 'ready');
  assert.deepEqual(h.requests.map(request => request.input), [url, url]);
  assert.deepEqual(h.revoked, [first.renderUrl]); assert.equal(h.decoded.length, 2);
  handle.release(); h.registry.dispose();
});
await check('unchanged bytes reuse decoded objectURL and preserve snapshot identity until the next result', async () => {
  const h = harness(), handle = h.activate(); await h.registry.refreshDue();
  const first = handle.getSnapshot(); assert.equal(first, handle.getSnapshot());
  h.setTime(OFFICIAL_LOGO_REFRESH_MS); await h.registry.refreshDue();
  assert.equal(handle.getSnapshot().renderUrl, first.renderUrl); assert.equal(handle.getSnapshot().digest, first.digest);
  assert.equal(h.created.length, 1); assert.equal(h.decoded.length, 1); assert.equal(handle.getSnapshot().checkedAt, OFFICIAL_LOGO_REFRESH_MS);
  handle.release(); h.registry.dispose();
});
await check('source fragment stays on the decoded rendering URL; cleanup revokes the underlying objectURL', async () => {
  const h = harness(), handle = h.activate('https://official-brand.invalid/header.svg?edition=1#header'); await h.registry.refreshDue();
  assert.equal(h.requests[0].input, 'https://official-brand.invalid/header.svg?edition=1#header');
  assert.equal(handle.getSnapshot().renderUrl, 'blob:controlled-1#header'); assert.deepEqual(h.decoded, ['blob:controlled-1#header']);
  handle.release(); assert.deepEqual(h.revoked, ['blob:controlled-1']); h.registry.dispose();
});
await check('focus/online equivalents cannot bypass cooldown and hidden logos do not poll', async () => {
  const h = harness(), handle = h.activate(); await h.registry.refreshDue();
  for (let i = 0; i < 5; i++) await h.registry.refreshDue(); assert.equal(h.requests.length, 1);
  handle.setActive(false); await h.advance(180_000); await h.registry.refreshDue(); assert.equal(h.requests.length, 1);
  handle.setActive(true); await h.registry.refreshDue(); assert.equal(h.requests.length, 2);
  handle.release(); h.registry.dispose();
});
await check('one invisible owner does not pause another visible owner', async () => {
  const h = harness(), first = h.activate(), second = h.activate(); await h.registry.refreshDue();
  first.setActive(false); h.setTime(OFFICIAL_LOGO_REFRESH_MS); await h.registry.refreshDue(); assert.equal(h.requests.length, 2);
  first.release(); second.release(); h.registry.dispose();
});
await check('CORS/network failure is unverified, not false content success or another-brand fallback', async () => {
  const h = harness(); h.setReply(async () => { throw new TypeError('controlled CORS failure'); });
  const handle = h.activate(); await h.registry.refreshDue();
  assert.equal(handle.getSnapshot().status, 'unverified'); assert.equal(handle.getSnapshot().renderUrl, url);
  assert.equal(handle.getSnapshot().digest, null); assert.equal(h.created.length, 0);
  h.setReply(null); h.setTime(OFFICIAL_LOGO_REFRESH_MS); await h.registry.refreshDue(); assert.equal(handle.getSnapshot().status, 'ready');
  handle.release(); h.registry.dispose();
});
await check('decode failure preserves previous decoded image and releases failed candidate', async () => {
  const h = harness(), handle = h.activate(); await h.registry.refreshDue(); const first = handle.getSnapshot();
  h.setBody('corrupt-image'); h.setDecodeFailure(true); h.setTime(OFFICIAL_LOGO_REFRESH_MS); await h.registry.refreshDue();
  assert.equal(handle.getSnapshot().renderUrl, first.renderUrl); assert.equal(handle.getSnapshot().digest, first.digest);
  assert.equal(handle.getSnapshot().status, 'unverified'); assert.deepEqual(h.revoked, ['blob:controlled-2']);
  handle.release(); h.registry.dispose();
});
await check('declared over-budget or non-image response is rejected before decoding', async () => {
  for (const headers of [{ 'content-type': 'image/png', 'content-length': String(OFFICIAL_LOGO_MAX_BYTES + 1) }, { 'content-type': 'text/html' }]) {
    const h = harness(); h.setReply(async () => new Response('invalid', { headers }));
    const handle = h.activate(); await h.registry.refreshDue();
    assert.equal(handle.getSnapshot().status, 'unverified'); assert.equal(h.created.length, 0);
    handle.release(); h.registry.dispose();
  }
});
await check('streaming budget also covers responses without content-length', async () => {
  const h = harness(); h.setReply(async () => new Response(new Uint8Array(OFFICIAL_LOGO_MAX_BYTES + 1), { headers: { 'content-type': 'image/png' } }));
  const handle = h.activate(); await h.registry.refreshDue(); assert.equal(handle.getSnapshot().status, 'unverified'); assert.equal(h.created.length, 0);
  handle.release(); h.registry.dispose();
});
await check('late completion after source release cannot publish or leak an objectURL', async () => {
  const h = harness(), pending = deferred(); h.setReply(() => pending.promise);
  const old = h.activate(); await flush(); const signal = h.requests[0].options.signal;
  old.release(); assert.equal(signal.aborted, true);
  pending.resolve(new Response('late-A', { headers: { 'content-type': 'image/png' } })); await flush();
  assert.equal(h.created.length, 0); assert.equal(h.timers.size, 0);
  h.setReply(null); const current = h.activate('https://other-brand.invalid/logo.png'); await h.registry.refreshDue();
  assert.equal(current.getSnapshot().sourceUrl, 'https://other-brand.invalid/logo.png'); assert.equal(current.getSnapshot().status, 'ready');
  current.release(); h.registry.dispose();
});
await check('timeout aborts request, settles unverified and does not retry before cooldown', async () => {
  const h = harness(); h.setReply((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true })));
  const handle = h.activate(); await flush(); await h.advance(OFFICIAL_LOGO_TIMEOUT_MS); await h.registry.refreshDue();
  assert.equal(h.requests[0].options.signal.aborted, true); assert.equal(handle.getSnapshot().status, 'unverified'); assert.equal(h.requests.length, 1);
  handle.release(); h.registry.dispose();
});
await check('dispose aborts current work, releases decoded image and removes all timers', async () => {
  const h = harness(), handle = h.activate(); await h.registry.refreshDue();
  h.registry.dispose(); assert.equal(h.revoked.length, 1); assert.equal(h.timers.size, 0);
  assert.throws(() => h.registry.retain(url)); handle.release(); assert.equal(h.revoked.length, 1, 'dispose then React cleanup is idempotent');
});

console.log(`Official logo refresh: ${count} controlled checks passed; no live HTTP or editorial mutations.`);
