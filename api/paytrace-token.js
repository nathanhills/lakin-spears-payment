// api/paytrace-token.js
// Returns a short-lived Protect.js clientKey to the browser.
// Credentials never leave this server.

const PAYTRACE_BASE = process.env.PAYTRACE_ENV === 'production'
  ? 'https://api.paytrace.com'
  : 'https://api.sandbox.paytrace.com';

async function getBearerToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.PAYTRACE_CLIENT_ID,
    client_secret: process.env.PAYTRACE_CLIENT_SECRET,
  });

  const res = await fetch(`${PAYTRACE_BASE}/v3/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  // Handle CORS preflight
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
      },
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Token fetch failed: ${tokenRes.status} ${text}`);
    }

    const tokenData = await tokenRes.json();
    // clientKey is valid for 20 minutes — safe to send to the browser
    return res.status(200).json({ clientKey: tokenData.clientKey });

  } catch (err) {
    console.error('paytrace-token error:', err.message);
    return res.status(500).json({ error: 'Failed to initialize payment form. Please try again.' });
  }
}
