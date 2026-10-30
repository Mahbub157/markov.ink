// Reads ANTHROPIC_API_KEY and forgives common paste mistakes (quotes, spaces, line breaks).
// keyCheck() describes the key's shape without revealing any of it, so a wrong paste can be
// spotted from the status endpoint. Vercel does not serve files starting with "_".

function rawKey() { return String(process.env.ANTHROPIC_API_KEY || ''); }

function apiKey() {
  return rawKey().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
}

function keyCheck() {
  const raw = rawKey(), key = apiKey();
  if (!raw) return 'missing';
  if (/^sk-ant-admin/.test(key)) return 'admin_key';      // admin keys cannot call the Messages API
  if (!/^sk-ant-/.test(key)) return 'not_an_api_key';
  if (/\s/.test(key)) return 'has_spaces_inside';
  if (key.length < 60) return 'too_short';
  return raw === key ? 'ok' : 'ok_after_cleanup';
}

module.exports = { apiKey, keyCheck };
