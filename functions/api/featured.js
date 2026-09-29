const KEY = 'featured';
const MAX_FAILURES = 10;
const FAILURE_TTL = 15 * 60;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extraHeaders}});
}
async function hash(value = '') {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2,'0')).join('');
}
async function secureEqual(a = '', b = '') {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const aa = new Uint8Array(ha), bb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}
async function failureKey(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  return `authfail:${await hash(ip)}`;
}
async function blocked(request, env) {
  const key = await failureKey(request);
  const count = Number(await env.CADLIN_CONFIG.get(key) || 0);
  return {key, blocked: count >= MAX_FAILURES, count};
}
async function recordFailure(key, env, current) {
  await env.CADLIN_CONFIG.put(key, String(current + 1), {expirationTtl: FAILURE_TTL});
}
async function authorized(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return false;
  return secureEqual(token, env.ADMIN_PASSWORD);
}
function validatePayload(body) {
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const expiresAt = body.expiresAt ? String(body.expiresAt) : null;
  if (!text || text.length > 240) return {error:'Texto inválido (máximo 240 caracteres).'};
  let parsed;
  try { parsed = new URL(url); } catch { return {error:'URL inválida.'}; }
  if (parsed.protocol !== 'https:') return {error:'Use um link https://'};
  if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return {error:'Data de expiração inválida.'};
  return {featured:{text, url:parsed.toString(), expiresAt, updatedAt:new Date().toISOString()}};
}
async function requireWriteAuth(request, env) {
  const state = await blocked(request, env);
  if (state.blocked) return {response: json({error:'too_many_attempts'}, 429, {'retry-after':String(FAILURE_TTL)}), state};
  if (!(await authorized(request, env))) {
    await recordFailure(state.key, env, state.count);
    return {response: json({error:'unauthorized'}, 401), state};
  }
  await env.CADLIN_CONFIG.delete(state.key);
  return {response:null, state};
}
export async function onRequestGet({env}) {
  if (!env.CADLIN_CONFIG) return json({error:'kv_not_configured'}, 503);
  const featured = await env.CADLIN_CONFIG.get(KEY, {type:'json'});
  return json({featured: featured || null});
}
export async function onRequestPost({request, env}) {
  if (!env.CADLIN_CONFIG) return json({error:'kv_not_configured'}, 503);
  const gate = await requireWriteAuth(request, env);
  if (gate.response) return gate.response;
  let body;
  try { body = await request.json(); } catch { return json({error:'JSON inválido.'}, 400); }
  const result = validatePayload(body || {});
  if (result.error) return json({error:result.error}, 400);
  await env.CADLIN_CONFIG.put(KEY, JSON.stringify(result.featured));
  return json({featured:result.featured});
}
export async function onRequestDelete({request, env}) {
  if (!env.CADLIN_CONFIG) return json({error:'kv_not_configured'}, 503);
  const gate = await requireWriteAuth(request, env);
  if (gate.response) return gate.response;
  await env.CADLIN_CONFIG.delete(KEY);
  return json({ok:true, featured:null});
}
