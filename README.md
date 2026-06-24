# Lakin Spears — PayTrace Payment Integration
## Step-by-Step Setup Guide

---

## What's in this folder

```
lakin-spears-payment/
├── api/
│   ├── paytrace-token.js      ← Vercel function: gets Protect.js clientKey
│   └── paytrace-charge.js     ← Vercel function: runs the actual card charge
├── vercel.json                ← Vercel configuration
├── package.json
├── .env.example               ← Environment variables template
└── squarespace-code-block.html ← Paste this into Squarespace
```

---

## Step 1: Create a GitHub repo

1. Go to https://github.com and sign in (or create a free account)
2. Click **New repository** → name it `lakin-spears-payment` → **Create**
3. Upload all files in this folder to that repo

---

## Step 2: Deploy to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New → Project**
3. Select your `lakin-spears-payment` repo → click **Import**
4. Leave all settings as-is → click **Deploy**
5. After deploy, copy your URL — it looks like:
   `https://lakin-spears-payment.vercel.app`

---

## Step 3: Add environment variables in Vercel

1. In Vercel, go to your project → **Settings → Environment Variables**
2. Add these four variables:

| Name | Value |
|------|-------|
| `PAYTRACE_CLIENT_ID` | Your PayTrace sandbox username |
| `PAYTRACE_CLIENT_SECRET` | Your PayTrace sandbox password |
| `PAYTRACE_MERCHANT_ID` | `888000002887` |
| `PAYTRACE_ENV` | `sandbox` |

3. Click **Save** → go to **Deployments** → click **Redeploy** (so it picks up the new vars)

---

## Step 4: Add the payment form to Squarespace

1. Open `squarespace-code-block.html` in any text editor
2. Find this line near the top:
   ```
   const VERCEL_URL = 'YOUR_VERCEL_URL';
   ```
   Replace `YOUR_VERCEL_URL` with your actual Vercel URL, e.g.:
   ```
   const VERCEL_URL = 'https://lakin-spears-payment.vercel.app';
   ```
3. Copy the entire file contents
4. In Squarespace, edit your payment page → add a **Code Block**
5. Paste the code → save → publish

---

## Step 5: Test it

Use these PayTrace sandbox test cards:

| Card Number | Result |
|-------------|--------|
| `4012000098765439` | Approved |
| `4012000098765421` | Declined |

- Expiry: any future date (e.g. 12/26)
- CVV: any 3 digits (e.g. 999)
- Amount: any positive number

Check the PayTrace sandbox dashboard → **Reports** to confirm transactions appear.

---

## Going live

When ready to accept real payments:

1. In Vercel environment variables, update:
   - `PAYTRACE_CLIENT_ID` → your production username
   - `PAYTRACE_CLIENT_SECRET` → your production password  
   - `PAYTRACE_MERCHANT_ID` → your production merchant ID
   - `PAYTRACE_ENV` → `production`

2. In the Squarespace Code Block, change the Protect.js script tag from:
   ```
   https://protect.sandbox.paytrace.com/js/protect.min.js
   ```
   to:
   ```
   https://protect.paytrace.com/js/protect.min.js
   ```

3. Redeploy in Vercel.

---

## How it works (the short version)

```
Browser                    Vercel (your backend)         PayTrace
  |                              |                           |
  |-- POST /api/paytrace-token -->|                           |
  |                              |-- auth with credentials -->|
  |                              |<-- bearer token -----------|
  |                              |-- get clientKey ---------->|
  |<-- clientKey ----------------|<-- clientKey --------------|
  |                              |                           |
  | [user fills card in iFrame]  |                           |
  |                              |                           |
  |-- POST /api/paytrace-charge ->|                           |
  |   (hpf_token, enc_key, amt)  |-- charge card ----------->|
  |                              |<-- approval/decline -------|
  |<-- result ------------------|                           |
```

Card data NEVER touches your servers or Squarespace. ✓
