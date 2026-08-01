// functions/dropbox-auth.js
// Cloudflare Pages Function — Dropbox OAuth proxy
// Handles token exchange and refresh server-side to avoid CORS issues
//
// POST /functions/dropbox-auth
// Body: { action: 'exchange', code, verifier } — exchange PKCE code for tokens
// Body: { action: 'refresh', refresh_token }   — refresh an expired access token

const DROPBOX_APP_KEY    = 'kgy1xf57bh26gsi';
const DROPBOX_REDIRECT   = 'https://romplayerbycoops.pages.dev/';

const CORS = {
  'Access-Control-Allow-Origin':  'https://romplayerbycoops.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS });
  }

  const { action } = body;

  // ── Exchange PKCE code for access + refresh token ──────────
  if (action === 'exchange') {
    const { code, verifier } = body;
    if (!code || !verifier) {
      return new Response(JSON.stringify({ error: 'Missing code or verifier' }), { status: 400, headers: CORS });
    }

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
      return new Response(JSON.stringify({ error: data.error_description || 'Token exchange failed' }), { status: 400, headers: CORS });
    }

    return new Response(JSON.stringify({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_in:    data.expires_in,
    }), { status: 200, headers: CORS });
  }

  // ── Refresh an expired access token ───────────────────────
  if (action === 'refresh') {
    const { refresh_token } = body;
    if (!refresh_token) {
      return new Response(JSON.stringify({ error: 'Missing refresh_token' }), { status: 400, headers: CORS });
    }

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
      return new Response(JSON.stringify({ error: data.error_description || 'Token refresh failed' }), { status: 401, headers: CORS });
    }

    return new Response(JSON.stringify({
      access_token: data.access_token,
      expires_in:   data.expires_in,
    }), { status: 200, headers: CORS });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: CORS });
}
