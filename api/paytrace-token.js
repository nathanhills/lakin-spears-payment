// api/paytrace-token.js
// Returns a short-lived Protect.js clientKey to the browser.
// Credentials never leave this server.

const PAYTRACE_BASE = process.env.PAYTRACE_ENV === 'production'
  ? 'https://api.paytrace.com'
  : 'https://api.sandbox.paytrace.com';

const INTEGRATOR_ID = process.env.PAYTRACE_INTEGRATOR_ID;

// PayTrace wraps responses in { status, status_code, data: {...} }
// but may also return flat objects. Handle both shapes.
function unwrap(payload) {
  return payload && typeof payload.data === 'object' && payload.data !== null
    ? payload.data
    : payload;
}

async function getBearerToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.PAYTRACE_CLIENT_ID,
    client_secret: process.env.PAYTRACE_CLIENT_SECRET,
  });

  const res = await fetch(`${PAYTRACE_BASE}/v3/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Integrator-Id': INTEGRATOR_ID,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth failed: ${res.status} ${text}`);
  }

  const payload = await res.json();
  const tokenData = unwrap(payload);

  if (!tokenData.access_token) {
    throw new Error(`No access_token in response: ${JSON.stringify(payload).slice(0, 200)}`);
  }

  return tokenData.access_token;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bearerToken = await getBearerToken();

    const tokenRes = await fetch(`${PAYTRACE_BASE}/v3/payment-fields/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'X-Integrator-Id': INTEGRATOR_ID,
      },
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Token fetch failed: ${tokenRes.status} ${text}`);
    }

    const payload = await tokenRes.json();
    const fieldData = unwrap(payload);

    if (!fieldData.clientKey) {
      throw new Error(`No clientKey in response: ${JSON.stringify(payload).slice(0, 200)}`);
    }

    return res.status(200).json({ clientKey: fieldData.clientKey });

  } catch (err) {
    console.error('paytrace-token error:', err.message);
    return res.status(500).json({ error: 'Failed to initialize payment form. Please try again.' });
  }
}
