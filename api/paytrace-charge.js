// api/paytrace-charge.js
// Receives hpf_token + enc_key from browser, runs the actual charge.
// Card data never passes through here — only the one-time tokens.

const PAYTRACE_BASE = process.env.PAYTRACE_ENV === 'production'
  ? 'https://api.paytrace.com'
  : 'https://api.sandbox.paytrace.com';

const MERCHANT_ID = parseInt(process.env.PAYTRACE_MERCHANT_ID, 10);
const INTEGRATOR_ID = process.env.PAYTRACE_INTEGRATOR_ID;

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

  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { hpf_token, enc_key, amount, billing_name, billing_email, description } = req.body;

  if (!hpf_token || !enc_key || !amount) {
    return res.status(400).json({ error: 'Missing required payment fields.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }

  try {
    const bearerToken = await getBearerToken();

    const payload = {
      hpf_token,
      enc_key,
      amount: parsedAmount,
      merchant_id: MERCHANT_ID,
      ...(billing_name && { billing_name }),
      ...(billing_email && { billing_email }),
      ...(description && { description }),
    };

    const chargeRes = await fetch(`${PAYTRACE_BASE}/v3/card/sale/pt-protect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'X-Integrator-Id': INTEGRATOR_ID,
      },
      body: JSON.stringify(payload),
    });

    const chargeData = await chargeRes.json();

    if (!chargeRes.ok) {
      console.error('PayTrace charge error:', chargeData);
      return res.status(400).json({
        error: chargeData?.message || 'Payment was declined. Please check your card details.',
        details: chargeData,
      });
    }

    return res.status(200).json({
      success: true,
      transaction_id: chargeData.transaction_id,
      approval_code: chargeData.approval_code,
      message: chargeData.status_message || 'Payment approved.',
    });

  } catch (err) {
    console.error('paytrace-charge error:', err.message);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}
