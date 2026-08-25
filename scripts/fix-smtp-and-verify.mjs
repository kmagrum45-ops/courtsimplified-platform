#!/usr/bin/env node
/**
 * fix-smtp-and-verify.mjs
 *
 * Sets Supabase custom SMTP (Resend) via the Management API instead of the
 * dashboard, reads the config back to confirm it actually persisted, fires a
 * real /auth/v1/recover call against production, and separately checks the
 * site-wide password gate against production for a fresh (cookie-less)
 * visitor.
 *
 * WRITES production Auth/SMTP config -- there is exactly one Supabase
 * project for this app, tagged PRODUCTION, no dev/staging environment
 * exists (see docs/ARCHITECTURE.md section 10). Requires
 * ALLOW_PRODUCTION_AUTH_WRITE=1 as an explicit opt-in, checked before
 * anything else runs. This is the more invasive of the two auth-debug
 * scripts here -- see diagnose-auth-email.mjs for a read-only alternative.
 *
 * Run: ALLOW_PRODUCTION_AUTH_WRITE=1 node --env-file=.env.diagnose scripts/fix-smtp-and-verify.mjs
 *
 * Required env vars (from .env.diagnose):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ACCESS_TOKEN,
 *   RESEND_API_KEY, SMTP_SENDER, TEST_EMAIL
 *
 * Optional:
 *   PRODUCTION_URL (default https://courtsimplified.com)
 */

const env = (k, fallback) => process.env[k] ?? fallback;

const SUPABASE_URL = env('SUPABASE_URL');
const ANON_KEY = env('SUPABASE_ANON_KEY');
const ACCESS_TOKEN = env('SUPABASE_ACCESS_TOKEN');
const RESEND_API_KEY = env('RESEND_API_KEY');
const SMTP_SENDER = env('SMTP_SENDER');
const TEST_EMAIL = env('TEST_EMAIL');
const PRODUCTION_URL = env('PRODUCTION_URL', 'https://courtsimplified.com');

// ---------------------------------------------------------------------------
// SECRET SCRUBBER -- same approach as diagnose-auth-email.mjs: a global
// filter on every console write plus crash handlers, not per-call-site
// redaction. Exact-value + base64/URI-encoded forms + known key shapes.
// ---------------------------------------------------------------------------
const SECRETS = Object.entries({
  SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN,
  RESEND_API_KEY,
  SUPABASE_ANON_KEY: ANON_KEY,
})
  .filter(([, v]) => typeof v === 'string' && v.length >= 8)
  .flatMap(([name, v]) => [
    { name, value: v },
    { name, value: Buffer.from(v).toString('base64') },
    { name, value: encodeURIComponent(v) },
  ]);

const SECRET_SHAPES = [
  [/re_[A-Za-z0-9_-]{12,}/g, '[REDACTED:resend-key-shape]'],
  [/sbp_[A-Za-z0-9]{20,}/g, '[REDACTED:supabase-pat-shape]'],
  [/sb_(secret|publishable)_[A-Za-z0-9_-]{12,}/g, '[REDACTED:supabase-key-shape]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED:jwt-shape]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, 'Bearer [REDACTED]'],
];

function scrub(input) {
  let s =
    typeof input === 'string'
      ? input
      : input instanceof Error
        ? `${input.name}: ${input.message}\n${input.stack ?? ''}`
        : (() => {
            try { return typeof input === 'object' && input !== null ? JSON.stringify(input) : String(input); }
            catch { return String(input); }
          })();
  for (const { name, value } of SECRETS) {
    if (value) s = s.split(value).join(`[REDACTED:${name}]`);
  }
  for (const [re, replacement] of SECRET_SHAPES) s = s.replace(re, replacement);
  return s;
}

for (const stream of ['log', 'error', 'warn', 'info', 'debug']) {
  const original = console[stream].bind(console);
  console[stream] = (...args) => original(...args.map(scrub));
}
process.on('uncaughtException', (err) => { console.error(`\nUNCAUGHT: ${scrub(err)}`); process.exit(1); });
process.on('unhandledRejection', (err) => { console.error(`\nUNHANDLED REJECTION: ${scrub(err)}`); process.exit(1); });

function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}
// ---------------------------------------------------------------------------
// PRODUCTION GUARD -- there is exactly one Supabase project for this app
// ("courtsimplified"), tagged PRODUCTION, no dev/staging environment exists
// (see docs/ARCHITECTURE.md section 10). This is the loudest guard in the
// repo on purpose: unlike diagnose-auth-email.mjs (read-only against Supabase
// itself), this script WRITES live Auth/SMTP configuration via the
// Management API. A wrong PROJECT_REF or a re-run against a project with
// real users changes what every real password-reset/confirmation email
// looks like, immediately, with no dev environment to have made the mistake
// in instead. Checked before requireEnv() deliberately, so this warning is
// the first thing shown even when nothing else is configured yet.
// ---------------------------------------------------------------------------
if (process.env.ALLOW_PRODUCTION_AUTH_WRITE !== '1') {
  console.error(
    '\n' + '='.repeat(72) + '\n' +
    ' ⚠ DANGER: THIS WILL MODIFY PRODUCTION AUTH CONFIGURATION ⚠\n' +
    ' ALLOW_PRODUCTION_AUTH_WRITE=1 REQUIRED TO PROCEED\n' +
    '='.repeat(72) + '\n\n' +
    'This runs against the LIVE "courtsimplified" Supabase project (tagged\n' +
    'PRODUCTION -- no dev/staging environment exists). Running it WILL:\n\n' +
    '  - PATCH production\'s live SMTP configuration via the Management API\n' +
    '    (smtp_host, smtp_port, smtp_user, smtp_pass, smtp_admin_email,\n' +
    '    smtp_sender_name) -- this OVERWRITES whatever is currently\n' +
    '    configured, for every real user\'s password-reset and confirmation\n' +
    '    emails, immediately\n' +
    '  - Read that configuration back to confirm the write persisted\n' +
    `  - Fire a REAL POST /auth/v1/recover against production, which can\n` +
    `    trigger a real password-reset email to TEST_EMAIL (currently: ${TEST_EMAIL || '(not set)'})\n` +
    `  - Fetch ${PRODUCTION_URL} live to check the site-access gate\n\n` +
    'This is the most invasive of the two auth-debug scripts in this repo --\n' +
    'see diagnose-auth-email.mjs for a read-only-against-Supabase alternative.\n' +
    'Full production-exposure audit: docs/ARCHITECTURE.md section 10.\n\n' +
    'To proceed, re-run with ALLOW_PRODUCTION_AUTH_WRITE=1 set.\n' +
    '='.repeat(72) + '\n'
  );
  process.exit(1);
}

requireEnv(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_ACCESS_TOKEN', 'RESEND_API_KEY', 'SMTP_SENDER', 'TEST_EMAIL']);

const results = {};
function report(name, ok, detail) {
  results[name] = ok;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` -- ${detail}` : ''}`);
}

// ---------------------------------------------------------------------------
// Derive project ref from SUPABASE_URL
// ---------------------------------------------------------------------------
const match = SUPABASE_URL.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co\/?$/i);
if (!match) {
  console.error(`Could not derive project ref from SUPABASE_URL="${SUPABASE_URL}"`);
  process.exit(1);
}
const PROJECT_REF = match[1];

const MGMT_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
const mgmtHeaders = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

// ---------------------------------------------------------------------------
// STEP 1 -- PATCH the SMTP config via Management API
// ---------------------------------------------------------------------------
async function setSmtpConfig() {
  const payload = {
    smtp_host: 'smtp.resend.com',
    smtp_port: '587',
    smtp_user: 'resend',
    smtp_pass: RESEND_API_KEY,
    smtp_admin_email: SMTP_SENDER,
    smtp_sender_name: 'CourtSimplified',
  };

  const res = await fetch(MGMT_BASE, {
    method: 'PATCH',
    headers: mgmtHeaders,
    body: JSON.stringify(payload),
  });
  const bodyText = await res.text();

  if (!res.ok) {
    report('1. Set SMTP config via Management API', false,
      `status=${res.status} body=${bodyText.slice(0, 300)}`);
    return false;
  }
  report('1. Set SMTP config via Management API', true, `status=${res.status}`);
  return true;
}

// ---------------------------------------------------------------------------
// STEP 2 -- Read the config back and confirm smtp_host / smtp_pass are
// genuinely non-empty. Don't trust the PATCH response alone.
// ---------------------------------------------------------------------------
async function verifySmtpConfigPersisted() {
  const res = await fetch(MGMT_BASE, { headers: mgmtHeaders });
  if (!res.ok) {
    report('2. Verify config persisted (read-back)', false, `GET status=${res.status}`);
    return false;
  }
  const cfg = await res.json();
  const hostOk = typeof cfg.smtp_host === 'string' && cfg.smtp_host.trim().length > 0;
  const passOk = typeof cfg.smtp_pass === 'string' && cfg.smtp_pass.trim().length > 0;
  // smtp_pass is masked by the API but its presence/absence is what we need.
  const userOk = cfg.smtp_user === 'resend';
  const senderOk = cfg.smtp_admin_email === SMTP_SENDER;

  if (!hostOk || !passOk) {
    report('2. Verify config persisted (read-back)', false,
      `smtp_host=${hostOk ? 'set' : 'EMPTY'} smtp_pass=${passOk ? 'set' : 'EMPTY'}`);
    return false;
  }
  report('2. Verify config persisted (read-back)', true,
    `smtp_host=set smtp_pass=set smtp_user=${userOk ? 'ok' : cfg.smtp_user} sender=${senderOk ? 'ok' : 'MISMATCH'}`);
  return true;
}

// ---------------------------------------------------------------------------
// STEP 3 -- Real /auth/v1/recover call against production Supabase auth
// ---------------------------------------------------------------------------
async function testRecover() {
  // Give the config change a moment to propagate before testing it.
  await new Promise((r) => setTimeout(r, 5000));

  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });
  const raw = await res.text();
  const text = raw.length > 300 ? `${raw.slice(0, 300)}...[truncated]` : raw;
  const ok = res.status === 200;
  report('3. POST /auth/v1/recover', ok, `status=${res.status} body=${text || '<empty>'}`);
  return ok;
}

// ---------------------------------------------------------------------------
// STEP 4 -- Site-wide password gate check against production, fresh visitor
// (no cookies sent), confirmed directly rather than assumed from the code.
// ---------------------------------------------------------------------------
async function followRedirects(url, hops = 0) {
  if (hops > 5) return { finalUrl: url, status: -1, body: '' };
  const res = await fetch(url, { redirect: 'manual' });
  const loc = res.headers.get('location');
  if (res.status >= 300 && res.status < 400 && loc) {
    return followRedirects(new URL(loc, url).toString(), hops + 1);
  }
  const body = await res.text().catch(() => '');
  return { finalUrl: url, status: res.status, body };
}

async function testSiteGate() {
  let out;
  try {
    // Domain-level redirects (e.g. apex -> www) happen before the gate does,
    // so the check has to follow the full chain, not just the first hop.
    out = await followRedirects(PRODUCTION_URL);
  } catch (err) {
    report('4. Site-access gate blocks fresh visitor', false, `fetch error: ${scrub(err.message)}`);
    return false;
  }

  const blocked = out.status === 401 || /site-access/.test(out.finalUrl);
  report('4. Site-access gate blocks fresh visitor', blocked,
    `final_url=${out.finalUrl} status=${out.status}`);
  return blocked;
}

(async () => {
  console.log(`Project ref: ${PROJECT_REF}`);
  console.log(`Production URL: ${PRODUCTION_URL}\n`);

  const setOk = await setSmtpConfig();
  const persistOk = setOk ? await verifySmtpConfigPersisted() : (report('2. Verify config persisted (read-back)', false, 'skipped, step 1 failed'), false);
  const recoverOk = persistOk ? await testRecover() : (report('3. POST /auth/v1/recover', false, 'skipped, config not confirmed persisted'), false);
  const gateOk = await testSiteGate();

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`1. SMTP config set via Management API : ${setOk ? 'PASS' : 'FAIL'}`);
  console.log(`2. Config read-back confirms non-empty : ${persistOk ? 'PASS' : 'FAIL'}`);
  console.log(`3. /auth/v1/recover returns 200         : ${recoverOk ? 'PASS' : 'FAIL'}`);
  console.log(`4. Site gate blocks fresh visitor        : ${gateOk ? 'PASS' : 'FAIL'}`);

  process.exit(setOk && persistOk && recoverOk && gateOk ? 0 : 1);
})();
