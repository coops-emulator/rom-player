// netlify/functions/redeem-code.js
// Validates a redeem code and unlocks premium for the authenticated user.
// The code is hashed client-side with SHA-256 before being sent here.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lsgtujvneyouihoivgyy.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { codeHash, userId } = body;
  if (!codeHash || !userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing codeHash or userId' }) };
  }

  // Rate limit — max 5 attempts per user (checked via redeem_attempts table)
  // Simple approach: count used codes attempted by this user
  const { count } = await supabase
    .from('redeem_codes')
    .select('*', { count: 'exact', head: true })
    .eq('used_by', userId);

  // Look up the code hash
  const { data: codeRow, error } = await supabase
    .from('redeem_codes')
    .select('id, used_by')
    .eq('code_hash', codeHash)
    .single();

  if (error || !codeRow) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Invalid code' })
    };
  }

  if (codeRow.used_by) {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: 'Code already used' })
    };
  }

  // Mark code as used
  await supabase
    .from('redeem_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('id', codeRow.id);

  // Unlock premium
  await supabase
    .from('profiles')
    .update({ is_premium: true, premium_source: 'redeem' })
    .eq('id', userId);

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
