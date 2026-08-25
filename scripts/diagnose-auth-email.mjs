#!/usr/bin/env node
/**
 * diagnose-auth-email.mjs
 *
 * Isolates WHICH layer of the Supabase -> Resend auth email pipeline is broken.
 * Dependency-free (node:tls only).
 *
 * Runs against production -- there is exactly one Supabase project for this
 * app, tagged PRODUCTION, no dev/staging environment exists (see
 * docs/ARCHITECTURE.md section 10). Requires ALLOW_PRODUCTION_AUTH_WRITE=1
 * as an explicit opt-in, checked before anything else runs.
 *
 * Run: ALLOW_PRODUCTION_AUTH_WRITE=1 node --env-file=.env.diagnose scripts/diagnose-auth-email.mjs
 *
 * Required env vars:
 *   SUPABASE_URL                 https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY            anon/publishable key
 *   SUPABASE_SERVICE_ROLE_KEY    service role key (server-side only, never ship)
 *   TEST_EMAIL                   the address you've been testing password reset with
 *   RESEND_API_KEY               re_...
 *   SMTP_SENDER                  exactly the "Sender email" configured in Supabase
 *
 * Optional (enables the "did the SMTP password actually save?" check):
 *   SUPABASE_ACCESS_TOKEN        personal access token
 *   SUPABASE_PROJECT_REF         the xxxx in xxxx.supabase.co
 *
 * Optional overrides:
 *   SMTP_HOST (default smtp.resend.com)
 *   SMTP_PORT (default 465)
 *   SMTP_USER (default "resend" -- literal string, NOT your email)
 */

import tls from 'node:tls';

const env = (k, fallback) => process.env[k] ?? fallback;

const SUPABASE_URL = env('SUPABASE_URL');
const ANON_KEY = env('SUPABASE_ANON_KEY');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const TEST_EMAIL = env('TEST_EMAIL');
const RESEND_API_KEY = env('RESEND_API_KEY');
const SMTP_SENDER = env('SMTP_SENDER');
const SMTP_HOST = env('SMTP_HOST', 'smtp.resend.com');
const SMTP_PORT = Number(env('SMTP_PORT', '465'));
const SMTP_USER = env('SMTP_USER', 'resend');
const ACCESS_TOKEN = env('SUPABASE_ACCESS_TOKEN');
const PROJECT_REF = env('SUPABASE_PROJECT_REF');

// ---------------------------------------------------------------------------
// SECRET SCRUBBER -- installed before anything else runs.
//
// Per-call-site redaction is fragile: one forgotten console.log, one unhandled
// stack trace, one server reply that echoes input, and a key is on screen and
// in your shell history. So every write to stdout/stderr is filtered instead.
//   1. Exact-value matching for every secret we were handed (plus base64 and
//      URI-encoded forms, since SMTP AUTH and query strings transform them).
//   2. Pattern matching for key SHAPES, catching secrets we were never given --
//      e.g. a key echoed back inside an API response body.
// ---------------------------------------------------------------------------
const SECRETS = Object.entries({
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  SUPABASE_ANON_KEY: ANON_KEY,
  RESEND_API_KEY: RESEND_API_KEY,
  SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN,
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
  // Character class is deliberately narrow: \S would run past the token and eat
  // the rest of a JSON line, since there's no whitespace to stop at.
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

// A crash must not bypass the scrubber -- default Node handlers write straight
// to stderr and would print an un-redacted stack.
process.on('uncaughtException', (err) => {
  console.error(`\nUNCAUGHT: ${scrub(err)}`);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error(`\nUNHANDLED REJECTION: ${scrub(err)}`);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// PRODUCTION GUARD -- there is exactly one Supabase project for this app
// ("courtsimplified"), tagged PRODUCTION, no dev/staging environment exists
// (see docs/ARCHITECTURE.md section 10). This script sends a real email and
// fires a real production Auth endpoint, so it must not run by accident.
// ---------------------------------------------------------------------------
if (process.env.ALLOW_PRODUCTION_AUTH_WRITE !== '1') {
  console.error(
    '\n' + '='.repeat(72) + '\n' +
    ' PRODUCTION AUTH DIAGNOSTIC -- ALLOW_PRODUCTION_AUTH_WRITE=1 REQUIRED\n' +
    '='.repeat(72) + '\n\n' +
    'This runs against the LIVE "courtsimplified" Supabase project (tagged\n' +
    'PRODUCTION -- no dev/staging environment exists). Running it will:\n\n' +
    '  - List real users from production auth.users (read-only, admin API)\n' +
    '  - Read production\'s live SMTP configuration, if SUPABASE_ACCESS_TOKEN\n' +
    '    and SUPABASE_PROJECT_REF are set (read-only)\n' +
    '  - Read Resend\'s live domain configuration (read-only)\n' +
    `  - Send a REAL email directly via SMTP to TEST_EMAIL (currently: ${TEST_EMAIL || '(not set)'}),\n` +
    '    bypassing Supabase entirely\n' +
    `  - Fire a REAL POST /auth/v1/recover against production, which can\n` +
    `    trigger a real password-reset email to TEST_EMAIL\n\n` +
    'No Supabase configuration is modified by this script -- see\n' +
    'fix-smtp-and-verify.mjs for the one that writes config.\n' +
    'Full production-exposure audit: docs/ARCHITECTURE.md section 10.\n\n' +
    'To proceed, re-run with ALLOW_PRODUCTION_AUTH_WRITE=1 set.\n' +
    '='.repeat(72) + '\n'
  );
  process.exit(1);
}

const results = [];
const record = (step, status, detail) => {
  results.push({ step, status, detail });
  const icon = status === 'PASS' ? '  OK  ' : status === 'FAIL' ? ' FAIL ' : ' WARN ';
  console.log(`[${icon}] ${step}\n         ${detail}\n`);
};

function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}
requireEnv([
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TEST_EMAIL',
  'RESEND_API_KEY',
  'SMTP_SENDER',
]);

// ---------------------------------------------------------------------------
// STEP 1 -- Does the test user actually exist in auth.users?
// The #1 false alarm. Supabase returns 200 on /recover for addresses that
// don't exist, on purpose, to prevent user enumeration. No user = no send
// = no Resend log entry, and nothing is actually broken.
// ---------------------------------------------------------------------------
async function step1_userExists() {
  const target = TEST_EMAIL.toLowerCase();
  let page = 1;
  let found = null;
  let scanned = 0;

  while (page <= 20 && !found) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (!res.ok) {
      record('1. User exists in auth.users', 'FAIL',
        `Admin API returned ${res.status}. Check SUPABASE_SERVICE_ROLE_KEY.`);
      return null;
    }
    const body = await res.json();
    const users = body.users ?? [];
    scanned += users.length;
    found = users.find((u) => (u.email ?? '').toLowerCase() === target) ?? null;
    if (users.length < 200) break;
    page += 1;
  }

  if (!found) {
    record('1. User exists in auth.users', 'FAIL',
      `No user with email ${TEST_EMAIL} (scanned ${scanned} users).\n` +
      `         >>> THIS ALONE EXPLAINS THE SYMPTOM. Supabase returns 200 on\n` +
      `         >>> /recover for unknown addresses by design and sends nothing.\n` +
      `         >>> Create/confirm this user, then re-run before touching SMTP.`);
    return null;
  }

  record('1. User exists in auth.users', 'PASS',
    `id=${found.id} confirmed_at=${found.email_confirmed_at ?? 'NULL (unconfirmed)'} ` +
    `created=${found.created_at}`);

  if (!found.email_confirmed_at) {
    record('1b. Email confirmation state', 'WARN',
      `User exists but email is unconfirmed. Recovery behaviour differs for ` +
      `unconfirmed users; confirm the address (or set mailer_autoconfirm in dev) ` +
      `to test the reset path cleanly.`);
  }
  return found;
}

// ---------------------------------------------------------------------------
// STEP 2 -- Does Supabase think custom SMTP is configured, and did the
// password field actually persist? (Management API; optional.)
// ---------------------------------------------------------------------------
async function step2_supabaseSmtpConfig() {
  if (!ACCESS_TOKEN || !PROJECT_REF) {
    record('2. Supabase SMTP config persisted', 'WARN',
      'Skipped: set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF to enable. ' +
      'This is the check that directly tests the "password silently did not save" theory.');
    return;
  }
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
  if (!res.ok) {
    record('2. Supabase SMTP config persisted', 'FAIL',
      `Management API returned ${res.status}. Check the access token and project ref.`);
    return;
  }
  const cfg = await res.json();
  const smtpKeys = Object.keys(cfg).filter((k) => k.toLowerCase().includes('smtp')).sort();
  const summary = smtpKeys
    .map((k) => {
      const v = cfg[k];
      if (v === null || v === undefined || v === '') return `${k}=<EMPTY>`;
      // Never print the value, and never print its length either -- length is a
      // real hint for narrowing down which key format is in use.
      if (/pass|secret|token|key/i.test(k)) return `${k}=<SET>`;
      return `${k}=${v}`;
    })
    .join('\n         ');

  const host = cfg.smtp_host ?? '';
  const pass = cfg.smtp_pass ?? '';
  const user = cfg.smtp_user ?? '';

  if (!host) {
    record('2. Supabase SMTP config persisted', 'FAIL',
      `smtp_host is empty -- custom SMTP is NOT enabled on this project. Supabase is\n` +
      `         falling back to its built-in sender, which never touches Resend.\n         ${summary}`);
    return;
  }
  if (!pass) {
    record('2. Supabase SMTP config persisted', 'FAIL',
      `smtp_host is set but smtp_pass is EMPTY. The password field did not persist.\n` +
      `         (Note: the API may mask this value even when set -- if unsure, re-enter\n` +
      `         the API key in the dashboard and save, then re-run.)\n         ${summary}`);
    return;
  }
  if (user !== 'resend' && /resend/i.test(host)) {
    record('2. Supabase SMTP config persisted', 'WARN',
      `smtp_user is "${user}". For Resend it must be the literal string "resend".\n         ${summary}`);
    return;
  }
  record('2. Supabase SMTP config persisted', 'PASS', summary);
}

// ---------------------------------------------------------------------------
// STEP 3 -- Is the sender domain verified in Resend?
// An unverified / DKIM-pending domain gets rejected at SMTP time.
// ---------------------------------------------------------------------------
async function step3_resendDomain() {
  const domain = SMTP_SENDER.split('@')[1]?.toLowerCase();
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  if (!res.ok) {
    record('3. Resend sender domain verified', 'FAIL',
      `Resend API returned ${res.status}. The API key may be invalid, revoked, or ` +
      `scoped without domain read access.`);
    return;
  }
  const body = await res.json();
  const domains = body.data ?? [];
  if (!domains.length) {
    record('3. Resend sender domain verified', 'FAIL',
      `This Resend account/team has ZERO domains. Either the key belongs to a ` +
      `different team than the one whose logs you're reading, or the domain was ` +
      `never added.`);
    return;
  }
  const match = domains.find((d) => (d.name ?? '').toLowerCase() === domain);
  if (!match) {
    record('3. Resend sender domain verified', 'FAIL',
      `Sender is ${SMTP_SENDER} but "${domain}" is not in this account. ` +
      `Domains present: ${domains.map((d) => `${d.name}(${d.status})`).join(', ')}`);
    return;
  }
  if (match.status !== 'verified') {
    record('3. Resend sender domain verified', 'FAIL',
      `Domain "${domain}" status is "${match.status}", not "verified". ` +
      `Resend will reject sends until SPF/DKIM finish propagating.`);
    return;
  }
  record('3. Resend sender domain verified', 'PASS',
    `${domain} status=verified region=${match.region ?? 'n/a'}`);
}

// ---------------------------------------------------------------------------
// STEP 4 -- Raw SMTP send, bypassing Supabase entirely.
// The bisect: if this lands in Resend's log, credentials and domain are fine
// and the fault is Supabase-side. If it fails, the transcript names the exact
// SMTP error code.
// ---------------------------------------------------------------------------
function smtpSend({ host, port, user, pass, from, to }) {
  return new Promise((resolve) => {
    const transcript = [];
    let buffer = '';
    let stage = 0;

    const steps = [
      { expect: 220, send: `EHLO diagnose.local` },
      { expect: 250, send: `AUTH LOGIN` },
      { expect: 334, send: Buffer.from(user).toString('base64') },
      { expect: 334, send: Buffer.from(pass).toString('base64') },
      { expect: 235, send: `MAIL FROM:<${from}>` },
      { expect: 250, send: `RCPT TO:<${to}>` },
      { expect: 250, send: `DATA` },
      {
        expect: 354,
        send:
          `From: ${from}\r\nTo: ${to}\r\nSubject: CourtSimplified SMTP bisect\r\n` +
          `MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n` +
          `Direct SMTP test bypassing Supabase. If you can read this, ` +
          `the Resend credentials and sender domain are working.\r\n.`,
      },
      { expect: 250, send: `QUIT` },
    ];

    const socket = tls.connect({ host, port, servername: host }, () => {
      transcript.push(`--- TLS connected to ${host}:${port}`);
    });
    socket.setEncoding('utf8');
    socket.setTimeout(20000);

    const finish = (ok, detail) => {
      try { socket.destroy(); } catch {}
      resolve({ ok, detail, transcript });
    };

    socket.on('timeout', () => finish(false, 'SMTP timed out after 20s (port blocked or wrong port?)'));
    socket.on('error', (err) => finish(false, `Socket error: ${err.message}`));

    socket.on('data', (chunk) => {
      buffer += chunk;
      // Wait for a complete final reply line: "NNN " (space, not hyphen)
      const lines = buffer.split('\r\n').filter(Boolean);
      const last = lines[lines.length - 1] ?? '';
      if (!/^\d{3} /.test(last)) return;

      lines.forEach((l) => transcript.push(`S: ${l}`));
      buffer = '';

      const code = Number(last.slice(0, 3));
      const current = steps[stage];

      if (code !== current.expect) {
        const where = [
          'greeting', 'EHLO', 'AUTH LOGIN', 'username', 'password',
          'MAIL FROM', 'RCPT TO', 'DATA', 'message body',
        ][stage] ?? `step ${stage}`;
        return finish(false, `Rejected at ${where}: server said "${last}"`);
      }

      if (stage === steps.length - 1) return finish(true, `Accepted: ${last}`);

      const payload = current.send;
      transcript.push(
        stage === 2 || stage === 3 ? `C: <base64 credential redacted>` : `C: ${payload.split('\r\n')[0]}`
      );
      socket.write(payload + '\r\n');
      stage += 1;
    });
  });
}

async function step4_rawSmtp() {
  const out = await smtpSend({
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER,
    pass: RESEND_API_KEY,
    from: SMTP_SENDER,
    to: TEST_EMAIL,
  });
  record('4. Raw SMTP send (bypassing Supabase)', out.ok ? 'PASS' : 'FAIL', out.detail);
  console.log('         --- SMTP transcript ---');
  out.transcript.forEach((l) => console.log(`         ${l}`));
  console.log('');
  return out.ok;
}

// ---------------------------------------------------------------------------
// STEP 5 -- Fire the real /recover call and report exactly what comes back.
// ---------------------------------------------------------------------------
async function step5_recover() {
  const started = Date.now();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });
  const raw = await res.text();
  // Response bodies are third-party controlled -- cap the length so a large or
  // hostile body can't flood the terminal. The scrubber handles redaction.
  const text = raw.length > 500 ? `${raw.slice(0, 500)}...[truncated]` : raw;
  const ms = Date.now() - started;
  record('5. POST /auth/v1/recover', res.ok ? 'PASS' : 'FAIL',
    `status=${res.status} in ${ms}ms body=${text || '<empty>'}\n` +
    `         NOTE: 200 here does NOT prove a send was attempted. A genuine SMTP\n` +
    `         handoff failure surfaces as 500 "Error sending recovery email".\n` +
    `         A fast 200 with no Resend entry usually means no user matched.`);
  return { status: res.status, ms };
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------
(async () => {
  console.log(`\nDiagnosing auth email pipeline\n  project: ${SUPABASE_URL}\n  test address: ${TEST_EMAIL}\n  sender: ${SMTP_SENDER}\n  smtp: ${SMTP_USER}@${SMTP_HOST}:${SMTP_PORT}\n`);

  const user = await step1_userExists();
  await step2_supabaseSmtpConfig();
  await step3_resendDomain();
  const smtpOk = await step4_rawSmtp();
  const recover = await step5_recover();

  console.log('='.repeat(72));
  console.log('VERDICT');
  console.log('='.repeat(72));

  if (!user) {
    console.log(
      'The test address is not a user. Supabase is behaving correctly and no\n' +
      'email was ever meant to be sent. Fix the test, not the SMTP config.'
    );
  } else if (smtpOk && recover.status === 200) {
    console.log(
      'Credentials and domain are good (step 4 landed), the user exists, and\n' +
      '/recover returned 200. If Resend logged step 4 but NOT the Supabase send,\n' +
      'the fault is Supabase-side: check Logs -> Auth (level=error) around the\n' +
      'timestamp above. If Auth logs are clean too, this matches the known\n' +
      'upstream silent-failure report -- open a Supabase support ticket and\n' +
      'attach this output rather than permuting config further.'
    );
  } else if (smtpOk && recover.status >= 500) {
    console.log(
      'SMTP works directly but Supabase returns 500 -- Supabase is holding\n' +
      'different/stale credentials than the ones in this env. Re-enter the SMTP\n' +
      'password in the dashboard and save, then re-run.'
    );
  } else if (!smtpOk) {
    console.log(
      'The credentials or sender domain are the problem, independent of Supabase.\n' +
      'The SMTP transcript above names the exact rejection. Fix that first --\n' +
      'nothing on the Supabase side can work until a raw send succeeds.'
    );
  } else {
    console.log('Mixed result -- read the per-step output above.');
  }

  console.log('');
  const failed = results.filter((r) => r.status === 'FAIL').length;
  process.exit(failed ? 1 : 0);
})();
