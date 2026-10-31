/**
 * Sign-up and sign-in tell the person the truth about email confirmation, and
 * never reveal whether an account exists through a failed sign-in (site owner, 30 Oct).
 *
 *   npm run test:signup-confirm-message
 *
 * Production requires email confirmation (`mailer_autoconfirm` false), so a new
 * sign-up there returns no session. The login page said "Account created. You
 * can sign in with those details now." in that case; the person signed in and
 * got Supabase's "Email not confirmed", shown as the generic "We could not sign
 * you in with those details". Staging keeps autoconfirm on, so nothing there
 * showed it. A repeat sign-up for an already-confirmed address was also told an
 * account had been created, though Supabase sends nothing in that case, and the
 * confirmation link went to the project's Site URL instead of the site the
 * person signed up on.
 *
 * What it asserts (properties, so the owner can reword the texts in
 * src/lib/case-system/copy/authMessages.ts without touching this file):
 *   1. The no-session sign-up message asks the person to confirm by email and
 *      never says they can sign in now; it names the address when given one and
 *      prints no "undefined"/"null" when not. No message speaks of the person
 *      in the third person ("their email").
 *   2. The "confirm your email first" sign-in message appears ONLY for
 *      Supabase's `email_not_confirmed` code: not for `invalid_credentials`
 *      (which Supabase returns for a wrong password and an unknown address
 *      alike), not for a bare message without the code, not for no error.
 *   3. A repeat sign-up for a confirmed address (no session, a user with no
 *      identities) is recognised and told the account exists; a real new user
 *      (one identity), a session, or a user without the field is not.
 *   4. EVERY file in app/, src/ and components/ that calls supabase
 *      `auth.signUp(` takes its texts from the copy module (confirmation,
 *      existing account), passes `emailRedirectTo` built from
 *      window.location.origin, and carries no "you can sign in now" text of its
 *      own. Found by search, so a new sign-up page or modal is covered.
 *   5. Every file that calls `auth.signInWithPassword(` shows the shared
 *      unconfirmed-email text only through isEmailNotConfirmedError, falls back
 *      to the one generic message, and carries no text that says an account
 *      does or does not exist.
 *   6. No other file carries a copy of the wording.
 *
 * Source scan plus a call into the copy module; offline, no model calls.
 * The browser test tests/browser/signup-confirm-message.spec.ts checks the
 * rendered login page with stubbed Supabase answers, in CI.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const COPY = "src/lib/case-system/copy/authMessages.ts";
const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

/** Words that tell a person they may sign in straight away. */
const SIGN_IN_NOW = /\byou (can|may) (now )?(sign|log) ?in\b|sign in with those details now|\b(sign|log) ?in now\b/i;
/** Words that say whether an account exists, which a failed sign-in must never say. */
const ACCOUNT_STATUS = /no account|not registered|user not found|(account|email) (does not|doesn't) exist|already exists/i;

let failures = 0;
function check(name: string, problems: string[]) {
  if (problems.length === 0) {
    console.log(`  ok   ${name}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL ${name}`);
  for (const problem of problems) {
    console.log(`       ${problem}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=test:signup-confirm-message::${name}: ${problem.replace(/\n/g, " ")}`);
  }
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

/** Source with comments removed. */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** String literals (quotes and templates) in a source file, comments removed. */
function literals(source: string): string[] {
  return [...code(source).matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map(m => m[1] ?? m[2] ?? m[3] ?? "");
}

/** The argument text of the first `auth.<method>(` call, by bracket matching. */
function callArgs(source: string, method: string): string {
  const src = code(source);
  const start = src.search(new RegExp(`\\bauth\\s*\\.\\s*${method}\\s*\\(`));
  if (start < 0) return "";
  let i = src.indexOf("(", start);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "(") depth++;
    else if (src[j] === ")" && --depth === 0) return src.slice(i + 1, j);
  }
  return "";
}

type Copy = {
  signUpConfirmEmailMessage?: (email?: string | null) => string;
  EMAIL_NOT_CONFIRMED_MESSAGE?: string;
  ACCOUNT_EXISTS_MESSAGE?: string;
  SIGN_IN_FAILED_MESSAGE?: string;
  isEmailNotConfirmedError?: (error: { code?: string | null; message?: string | null } | null | undefined) => boolean;
  isExistingAccountSignUp?: (data: unknown) => boolean;
  signUpEmailRedirectTo?: (origin: string) => string;
};

async function main() {
  console.log("Sign-up and sign-in tell the truth about email confirmation\n");

  const copy: Copy = existsSync(path.join(ROOT, COPY)) ? ((await import(pathToFileURL(path.join(ROOT, COPY)).href)) as Copy) : {};
  const missing = (...names: (keyof Copy)[]) => names.filter(name => copy[name] === undefined).map(name => `${COPY} does not export ${name}`);

  // 1. The no-session sign-up message.
  {
    const problems = missing("signUpConfirmEmailMessage");
    if (copy.signUpConfirmEmailMessage) {
      const withAddress = copy.signUpConfirmEmailMessage("person@example.test");
      for (const text of [withAddress, copy.signUpConfirmEmailMessage(undefined), copy.signUpConfirmEmailMessage("")]) {
        if (!/confirm/i.test(text)) problems.push(`does not ask the person to confirm: "${text}"`);
        if (!/e-?mail|link|inbox/i.test(text)) problems.push(`does not say the confirmation comes by email: "${text}"`);
        if (SIGN_IN_NOW.test(text)) problems.push(`tells the person they can sign in now: "${text}"`);
        if (/undefined|null/.test(text)) problems.push(`prints a missing address: "${text}"`);
      }
      if (!withAddress.includes("person@example.test")) problems.push(`does not name the address it was given: "${withAddress}"`);
    }
    const texts = [copy.signUpConfirmEmailMessage?.(""), copy.signUpConfirmEmailMessage?.("a@b.test"), copy.EMAIL_NOT_CONFIRMED_MESSAGE, copy.ACCOUNT_EXISTS_MESSAGE, copy.SIGN_IN_FAILED_MESSAGE];
    for (const text of texts) if (text && /\btheir\b/i.test(text)) problems.push(`speaks of the person as "their": "${text}"`);
    check("the no-session sign-up message asks for email confirmation, never 'sign in now'", problems);
  }

  // 2. "Confirm your email first" only for email_not_confirmed.
  {
    const problems = missing("EMAIL_NOT_CONFIRMED_MESSAGE", "isEmailNotConfirmedError");
    if (copy.EMAIL_NOT_CONFIRMED_MESSAGE && copy.isEmailNotConfirmedError) {
      const text = copy.EMAIL_NOT_CONFIRMED_MESSAGE;
      const is = copy.isEmailNotConfirmedError;
      if (!/confirm/i.test(text) || !/e-?mail|inbox|link/i.test(text)) problems.push(`does not ask the person to confirm their email: "${text}"`);
      if (!is({ code: "email_not_confirmed", message: "Email not confirmed" })) problems.push("unconfirmed email: misses Supabase's code email_not_confirmed");
      if (is({ code: "invalid_credentials", message: "Invalid login credentials" })) problems.push("wrong password / unknown email (invalid_credentials): treated as an unconfirmed email");
      if (is({ message: "Email not confirmed" })) problems.push("matches the message text without the code; auth-js 2.105.4 always carries the code, so only the code may decide");
      if (is(null)) problems.push("treats no error as an unconfirmed email");
    }
    check("'confirm your email first' shows only for Supabase's email_not_confirmed code", problems);
  }

  // 3. Repeat sign-up for a confirmed address.
  {
    const problems = missing("ACCOUNT_EXISTS_MESSAGE", "isExistingAccountSignUp");
    if (copy.ACCOUNT_EXISTS_MESSAGE && copy.isExistingAccountSignUp) {
      const is = copy.isExistingAccountSignUp;
      if (!/already exists/i.test(copy.ACCOUNT_EXISTS_MESSAGE) || !/sign in/i.test(copy.ACCOUNT_EXISTS_MESSAGE) || !/reset/i.test(copy.ACCOUNT_EXISTS_MESSAGE)) {
        problems.push(`does not say the account exists and offer sign-in or a reset: "${copy.ACCOUNT_EXISTS_MESSAGE}"`);
      }
      if (!is({ session: null, user: { id: "x", identities: [] } })) problems.push("misses a repeat sign-up (no session, user with no identities)");
      if (is({ session: null, user: { id: "x", identities: [{ id: "i" }] } })) problems.push("treats a real new user (one identity) as an existing account");
      if (is({ session: { access_token: "t" }, user: { id: "x", identities: [] } })) problems.push("treats a signed-in answer as an existing account");
      if (is({ session: null, user: { id: "x" } })) problems.push("treats a user without an identities field as an existing account");
    }
    check("a repeat sign-up for a confirmed address is told the account exists", problems);
  }

  const files = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "src")), ...walk(path.join(ROOT, "components"))].map(rel);

  // 4. Every sign-up place.
  const signUpFiles = files.filter(file => /\bauth\s*\.\s*signUp\s*\(/.test(read(file)));
  {
    const problems = missing("signUpEmailRedirectTo");
    if (copy.signUpEmailRedirectTo) {
      const url = copy.signUpEmailRedirectTo("https://preview-1.example.test");
      if (!/^https:\/\/preview-1\.example\.test\/[^/]/.test(url) && url !== "https://preview-1.example.test/") problems.push(`the confirmation link does not come back to the same site: "${url}"`);
    }
    if (signUpFiles.length === 0) problems.push("no file calls supabase auth.signUp( -- the search is broken or sign-up moved somewhere it cannot see");
    for (const file of signUpFiles) {
      const source = read(file);
      const body = code(source);
      if (!/\bsignUpConfirmEmailMessage\s*\(/.test(body)) problems.push(`${file}: calls auth.signUp but does not show signUpConfirmEmailMessage when no session comes back`);
      if (!/\bisExistingAccountSignUp\s*\(/.test(body) || !/\bACCOUNT_EXISTS_MESSAGE\b/.test(body)) problems.push(`${file}: calls auth.signUp but does not tell a repeat sign-up the account exists`);
      const args = callArgs(source, "signUp");
      if (!/emailRedirectTo\s*:\s*signUpEmailRedirectTo\s*\(\s*window\.location\.origin\s*\)/.test(args)) problems.push(`${file}: auth.signUp does not pass emailRedirectTo: signUpEmailRedirectTo(window.location.origin)`);
      for (const text of literals(source)) {
        if (SIGN_IN_NOW.test(text)) problems.push(`${file}: carries its own "sign in now" text: "${text}"`);
      }
    }
    check(`every sign-up place (${signUpFiles.join(", ") || "none found"}) uses the shared texts and returns to the same site`, problems);
  }

  // 5. Every password sign-in place.
  {
    const problems = missing("SIGN_IN_FAILED_MESSAGE");
    const signInFiles = files.filter(file => /\bauth\s*\.\s*signInWithPassword\s*\(/.test(read(file)));
    for (const file of signInFiles) {
      const source = read(file);
      const body = code(source);
      if (!/isEmailNotConfirmedError\s*\(\s*\w+\s*\)\s*\?\s*EMAIL_NOT_CONFIRMED_MESSAGE\s*:\s*SIGN_IN_FAILED_MESSAGE/.test(body)) {
        problems.push(`${file}: a failed password sign-in does not show EMAIL_NOT_CONFIRMED_MESSAGE only for isEmailNotConfirmedError, else SIGN_IN_FAILED_MESSAGE`);
      }
      const ownSignInText = literals(source).filter(text => /sign (you )?in/i.test(text) && ACCOUNT_STATUS.test(text));
      for (const text of ownSignInText) problems.push(`${file}: sign-in text that reveals whether an account exists: "${text}"`);
    }
    if (copy.SIGN_IN_FAILED_MESSAGE && ACCOUNT_STATUS.test(copy.SIGN_IN_FAILED_MESSAGE)) problems.push(`the generic sign-in message reveals account status: "${copy.SIGN_IN_FAILED_MESSAGE}"`);
    check("a failed sign-in says 'confirm first' only when unconfirmed, and never reveals an account", problems);
  }

  // 6. One copy of the wording.
  {
    const problems: string[] = [];
    for (const file of files) {
      if (file === COPY) continue;
      for (const text of literals(read(file))) {
        if (/sent (you )?a confirmation link/i.test(text) || /confirm your email first/i.test(text) || /account with (this|that) email already exists/i.test(text) || text === copy.SIGN_IN_FAILED_MESSAGE) {
          problems.push(`${file}: carries its own copy: "${text}"`);
        }
      }
    }
    check("the wording lives only in the copy module", problems);
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
