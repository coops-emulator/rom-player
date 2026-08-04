// _worker.js — Cloudflare Pages edge worker
// Handles: Dropbox OAuth proxy, redeem codes, static assets.
// This file must be at the repo ROOT. When present, Cloudflare ignores
// the functions/ folder entirely — all routing lives here.

const DROPBOX_APP_KEY  = 'kgy1xf57bh26gsi';
const DROPBOX_REDIRECT = 'https://romplayerbycoops.pages.dev/';
const SUPABASE_URL     = 'https://lsgtujvneyouihoivgyy.supabase.co';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });

const cors204 = () =>
  new Response(null, { status: 204, headers: CORS });

// ══════════════════════════════════════════════════════
// Dropbox OAuth proxy
// ══════════════════════════════════════════════════════
async function handleDropboxAuth(request) {
  if (request.method === 'OPTIONS') return cors204();
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await request.json(); }
  catch (_) { return json({ error: 'Invalid JSON' }, 400); }

  if (body.action === 'exchange') {
    const { code, verifier } = body;
    if (!code || !verifier) return json({ error: 'Missing code or verifier' }, 400);
    const r = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, grant_type: 'authorization_code',
        client_id: DROPBOX_APP_KEY, redirect_uri: DROPBOX_REDIRECT, code_verifier: verifier,
      }),
    });
    const data = await r.json();
    if (!r.ok || !data.access_token)
      return json({ error: data.error_description || 'Token exchange failed' }, 400);
    return json({ access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in });
  }

  if (body.action === 'refresh') {
    const { refresh_token } = body;
    if (!refresh_token) return json({ error: 'Missing refresh_token' }, 400);
    const r = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token', refresh_token, client_id: DROPBOX_APP_KEY,
      }),
    });
    const data = await r.json();
    if (!r.ok || !data.access_token)
      return json({ error: data.error_description || 'Token refresh failed' }, 401);
    return json({ access_token: data.access_token, expires_in: data.expires_in });
  }

  return json({ error: 'Unknown action' }, 400);
}

// ══════════════════════════════════════════════════════
// Redeem code — single use, grants permanent premium
// ══════════════════════════════════════════════════════
async function handleRedeemCode(request, env) {
  if (request.method === 'OPTIONS') return cors204();
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!env.SUPABASE_SERVICE_KEY)
    return json({ error: 'Server misconfiguration — SUPABASE_SERVICE_KEY not set' }, 500);

  let codeHash, userId;
  try { ({ codeHash, userId } = await request.json()); }
  catch (_) { return json({ error: 'Invalid JSON' }, 400); }

  if (!codeHash || !userId)
    return json({ error: 'Missing codeHash or userId' }, 400);

  const sb = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=representation',
  };

  // 1. Find the code
  const lookupRes = await fetch(
    `${SUPABASE_URL}/rest/v1/redeem_codes?code_hash=eq.${encodeURIComponent(codeHash)}&select=id,used_by&limit=1`,
    { headers: sb }
  );
  const rows = await lookupRes.json();

  if (!Array.isArray(rows) || rows.length === 0)
    return json({ error: 'Code not found' }, 404);

  const row = rows[0];

  // Already used by someone else
  if (row.used_by && row.used_by !== userId)
    return json({ error: 'Code already used' }, 409);

  // If already used by this same user — still grant premium (idempotent)
  if (!row.used_by) {
    // 2. Mark as used atomically
    const markRes = await fetch(
      `${SUPABASE_URL}/rest/v1/redeem_codes?id=eq.${encodeURIComponent(row.id)}&used_by=is.null`,
      {
        method: 'PATCH',
        headers: sb,
        body: JSON.stringify({ used_by: userId, used_at: new Date().toISOString() }),
      }
    );
    const marked = await markRes.json();
    // If nothing was updated, someone else just used it simultaneously
    if (!Array.isArray(marked) || marked.length === 0)
      return json({ error: 'Code already used' }, 409);
  }

  // 3. Grant premium — upsert so it works even if profile row doesn't exist yet
  const grantRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: sb,
      body: JSON.stringify({ is_premium: true, premium_source: 'redeem', updated_at: new Date().toISOString() }),
    }
  );

  if (!grantRes.ok) {
    const err = await grantRes.text();
    console.error('[redeem] grantPremium failed:', err);
    return json({ error: 'Failed to grant premium — try again' }, 500);
  }

  return json({ ok: true });
}

// ══════════════════════════════════════════════════════
// Check premium — service key bypasses RLS entirely
// ══════════════════════════════════════════════════════
async function handleCheckPremium(request, env) {
  if (request.method === 'OPTIONS') return cors204();
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'Misconfigured' }, 500);

  let userId;
  try { ({ userId } = await request.json()); }
  catch (_) { return json({ error: 'Invalid JSON' }, 400); }
  if (!userId) return json({ error: 'Missing userId' }, 400);

  const sb = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=is_premium&limit=1`,
    { headers: sb }
  );
  const rows = await r.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    // Profile doesn't exist yet — create it
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: { ...sb, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ id: userId, is_premium: false }),
    });
    return json({ is_premium: false });
  }

  return json({ is_premium: rows[0].is_premium || false });
}

// ══════════════════════════════════════════════════════
// Router
// ══════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === '/dropbox-auth' || pathname === '/functions/dropbox-auth')
      return handleDropboxAuth(request);

    if (pathname === '/redeem-code' || pathname === '/functions/redeem-code')
      return handleRedeemCode(request, env);

    if (pathname === '/check-premium')
      return handleCheckPremium(request, env);

    return env.ASSETS.fetch(request);
  }
};
