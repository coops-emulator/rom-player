// functions/redeem-code.js
// Cloudflare Pages Function — validates redeem code and unlocks premium
// Compatible with Cloudflare Pages Functions format

export async function onRequestPost(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (!env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500, headers: corsHeaders });
  }

  let codeHash, userId;
  try {
    const body = await context.request.json();
    ({ codeHash, userId } = body);
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  if (!codeHash || !userId) {
    return new Response(JSON.stringify({ error: 'Missing codeHash or userId' }), { status: 400, headers: corsHeaders });
  }

  const SUPABASE_URL = 'https://lsgtujvneyouihoivgyy.supabase.co';
  const headers = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=representation',
  };

  // 1. Look up the code
  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/redeem_codes?code_hash=eq.${encodeURIComponent(codeHash)}&select=id,used_by&limit=1`,
    { headers }
  );
  const rows = await lookup.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return new Response(JSON.stringify({ error: 'Code not found' }), { status: 404, headers: corsHeaders });
  }

  const row = rows[0];

  if (row.used_by) {
    if (row.used_by === userId) {
      await grantPremium(SUPABASE_URL, headers, userId);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ error: 'Code already used' }), { status: 409, headers: corsHeaders });
  }

  // 2. Mark as used
  await fetch(
    `${SUPABASE_URL}/rest/v1/redeem_codes?id=eq.${encodeURIComponent(row.id)}`,
    { method: 'PATCH', headers, body: JSON.stringify({ used_by: userId, used_at: new Date().toISOString() }) }
  );

  // 3. Grant premium
  await grantPremium(SUPABASE_URL, headers, userId);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }
  });
}

async function grantPremium(supabaseUrl, headers, userId) {
  await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    { method: 'PATCH', headers, body: JSON.stringify({ is_premium: true, premium_source: 'redeem' }) }
  );
}
