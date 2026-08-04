// _worker.js — Cloudflare Pages edge worker
// Handles all requests: proxies Dropbox OAuth, redeem codes, passes everything else through.
//
// Drop this file at the repo ROOT alongside index.html.
// No build config needed — Cloudflare picks it up automatically.

const DROPBOX_APP_KEY  = 'kgy1xf57bh26gsi';
const DROPBOX_REDIRECT = 'https://romplayerbycoops.pages.dev/';
const SUPABASE_URL     = 'https://lsgtujvneyouihoivgyy.supabase.co';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// ── Dropbox OAuth proxy ───────────────────────────────────────
async function handleDropboxAuth(request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await request.json(); }
  catch (_) { return json({ error: 'Invalid JSON' }, 400); }

  const { action } = body;

  if (action === 'exchange') {
    const { code, verifier } = body;
    if (!code || !verifier) return json({ error: 'Missing code or verifier' }, 400);
    const params = new URLSearchParams({
      code, grant_type: 'authorization_code',
      client_id: DROPBOX_APP_KEY, redirect_uri: DROPBOX_REDIRECT, code_verifier: verifier,
    });
    const r = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const data = await r.json();
    if (!r.ok || !data.access_token) return json({ error: data.error_description || 'Token exchange failed' }, 400);
    return json({ access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in });
  }

  if (action === 'refresh') {
    const { refresh_token } = body;
    if (!refresh_token) return json({ error: 'Missing refresh_token' }, 400);
    const params = new URLSearchParams({
      grant_type: 'refresh_token', refresh_token, client_id: DROPBOX_APP_KEY,
    });
    const r = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const data = await r.json();
    if (!r.ok || !data.access_token) return json({ error: data.error_description || 'Token refresh failed' }, 401);
    return json({ access_token: data.access_token, expires_in: data.expires_in });
  }

  return json({ error: 'Unknown action' }, 400);
}

// ── Redeem code ───────────────────────────────────────────────
async function handleRedeemCode(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'Server misconfiguration' }, 500);

  let codeHash, userId;
  try { ({ codeHash, userId } = await request.json()); }
  catch (_) { return json({ error: 'Invalid JSON' }, 400); }

  if (!codeHash || !userId) return json({ error: 'Missing codeHash or userId' }, 400);

  const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=representation',
  };

  // 1. Look up the code
  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/redeem_codes?code_hash=eq.${encodeURIComponent(codeHash)}&select=id,used_by&limit=1`,
    { headers: sbHeaders }
  );
  const rows = await lookup.json();

  if (!Array.isArray(rows) || rows.length === 0) return json({ error: 'Code not found' }, 404);

  const row = rows[0];
  if (row.used_by && row.used_by !== userId) return json({ error: 'Code already used' }, 409);

  // 2. Mark as used
  await fetch(
    `${SUPABASE_URL}/rest/v1/redeem_codes?id=eq.${encodeURIComponent(row.id)}`,
    { method: 'PATCH', headers: sbHeaders, body: JSON.stringify({ used_by: userId, used_at: new Date().toISOString() }) }
  );

  // 3. Grant premium
  await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    { method: 'PATCH', headers: sbHeaders, body: JSON.stringify({ is_premium: true, premium_source: 'redeem' }) }
  );

  return json({ ok: true });
}

// ── Router ────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/functions/dropbox-auth' || url.pathname === '/dropbox-auth') {
      return handleDropboxAuth(request);
    }

    if (url.pathname === '/functions/redeem-code' || url.pathname === '/redeem-code') {
      return handleRedeemCode(request, env);
    }

    // Everything else — serve static assets
    return env.ASSETS.fetch(request);
  }
};
