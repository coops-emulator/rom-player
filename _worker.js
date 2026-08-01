// _worker.js — Cloudflare Pages edge worker
// Handles all requests: proxies Dropbox OAuth, passes everything else through.
//
// Drop this file at the repo ROOT alongside index.html.
// No build config needed — Cloudflare picks it up automatically.

const DROPBOX_APP_KEY  = 'kgy1xf57bh26gsi';
const DROPBOX_REDIRECT = 'https://romplayerbycoops.pages.dev/';

const CORS = {
  'Access-Control-Allow-Origin':  'https://romplayerbycoops.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

async function handleDropboxAuth(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try { body = await request.json(); }
  catch (_) { return json({ error: 'Invalid JSON' }, 400); }

  const { action } = body;

  // ── Exchange PKCE code for tokens ──────────────────────────
  if (action === 'exchange') {
    const { code, verifier } = body;
    if (!code || !verifier) return json({ error: 'Missing code or verifier' }, 400);

    const params = new URLSearchParams({
      code,
      grant_type:    'authorization_code',
      client_id:     DROPBOX_APP_KEY,
      redirect_uri:  DROPBOX_REDIRECT,
      code_verifier: verifier,
    });

    const r = await fetch('https://api.dropbox.com/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params,
    });
    const data = await r.json();

    if (!r.ok || !data.access_token) {
      console.error('[dropbox-auth] exchange failed:', data);
      return json({ error: data.error_description || 'Token exchange failed' }, 400);
    }
    return json({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_in:    data.expires_in,
    });
  }

  // ── Refresh an expired access token ───────────────────────
  if (action === 'refresh') {
    const { refresh_token } = body;
    if (!refresh_token) return json({ error: 'Missing refresh_token' }, 400);

    const params = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token,
      client_id:     DROPBOX_APP_KEY,
    });

    const r = await fetch('https://api.dropbox.com/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params,
    });
    const data = await r.json();

    if (!r.ok || !data.access_token) {
      console.error('[dropbox-auth] refresh failed:', data);
      return json({ error: data.error_description || 'Token refresh failed' }, 401);
    }
    return json({
      access_token: data.access_token,
      expires_in:   data.expires_in,
    });
  }

  return json({ error: 'Unknown action' }, 400);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route Dropbox auth requests — support both old and new path
    if (url.pathname === '/functions/dropbox-auth' || url.pathname === '/dropbox-auth') {
      return handleDropboxAuth(request);
    }

    // Everything else — serve static assets as normal
    return env.ASSETS.fetch(request);
  }
};
