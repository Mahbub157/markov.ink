// Shared checks for the API functions. Vercel does not serve files starting with "_" as endpoints.

// Sites allowed to call the functions. Browsers always send Origin on a cross-site POST and
// pages cannot fake it, so a missing or unknown Origin is rejected. Scripts outside a browser
// can still send any Origin; the rate limit and size caps bound what they can spend.
const SITE_ORIGINS = [
  /^https:\/\/(www\.)?markov\.ink$/,
  /^https:\/\/markov(-[a-z0-9-]+)?-mahbub157s-projects\.vercel\.app$/
];
const LOCAL_ORIGINS = [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];

function originAllowed(origin) {
  if (typeof origin !== 'string' || !origin) return false;
  if (SITE_ORIGINS.some((re) => re.test(origin))) return true;
  // Local pages may use the key only outside production (vercel dev, previews).
  return process.env.VERCEL_ENV !== 'production' && LOCAL_ORIGINS.some((re) => re.test(origin));
}

function clientId(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Best effort per instance: each warm function keeps its own counts.
function makeLimiter(max, windowMs) {
  const hits = new Map();
  return function limited(key) {
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) { hits.set(key, list); return true; }
    list.push(now); hits.set(key, list);
    if (hits.size > 5000) hits.clear();
    return false;
  };
}

module.exports = { originAllowed, clientId, makeLimiter };
