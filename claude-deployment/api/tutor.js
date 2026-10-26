// Vercel serverless function: forwards tutor requests to Anthropic.
// The API key lives in the ANTHROPIC_API_KEY environment variable and never reaches the browser.

const ALLOWED_MODELS = new Set([
  'claude-opus-5',
  'claude-sonnet-5',
  'claude-fable-5-1',
  'claude-sonnet-4-6',
]);
const DEFAULT_MODEL = process.env.TUTOR_MODEL || 'claude-opus-5';
const MAX_TOKENS_CAP = 1200;
const MAX_BODY_BYTES = 6 * 1024 * 1024; // whiteboard screenshots are ~1-3 MB as base64

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // Health check: the page calls this on load to decide between server mode and paste-a-key mode.
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, configured: Boolean(process.env.ANTHROPIC_API_KEY), model: DEFAULT_MODEL });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(503).json({ error: { message: 'Server has no ANTHROPIC_API_KEY set. Add it in Vercel project settings.' } });
  }

  // Same-origin guard: only the deployed site may use this endpoint.
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  if (origin && !origin.endsWith(host) && !/localhost|127\.0\.0\.1/.test(origin)) {
    return res.status(403).json({ error: { message: 'Forbidden origin' } });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: { message: 'Invalid JSON' } }); }
  }
  if (!body || !Array.isArray(body.messages) || !body.messages.length) {
    return res.status(400).json({ error: { message: 'messages[] is required' } });
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return res.status(413).json({ error: { message: 'Request too large' } });
  }

  const payload = {
    model: ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL,
    max_tokens: Math.min(Number(body.max_tokens) || 600, MAX_TOKENS_CAP),
    messages: body.messages,
  };
  if (typeof body.system === 'string' && body.system.length < 20000) payload.system = body.system;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: { message: 'Could not reach Anthropic: ' + (err && err.message) } });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: '8mb' } } };
