/**
 * A sign-up that comes back with no session tells the person to confirm their
 * email, never that they can sign in now (site owner, 30 Oct).
 *
 *   npm run test:signup-confirm-message
 *
 * Production requires email confirmation (`mailer_autoconfirm` false), so a new
 * sign-up there returns no session. The login page said "Account created. You
 * can sign in with those details now." in that case; the person signed in and
 * got Supabase's "Email not confirmed", shown as the generic "We could not sign
 * you in with those details". Staging keeps autoconfirm on, so nothing there
 * showed it.
 *
 * What it asserts (properties, so the owner can reword the texts in
 * src/lib/case-system/copy/authMessages.ts without touching this file):
 *   1. The no-session sign-up message asks the person to confirm by email and
 *      never says they can sign in now; it names the address when given one and
 *      prints no "undefined"/"null" when not.
 *   2. The "Email not confirmed" sign-in message asks them to confirm first, and
 *      the detector recognises Supabase's error by code and by message, and not
 *      a wrong-password error.
 *   3. EVERY file in app/, src/ and components/ that calls supabase
 *      `auth.signUp(` takes its no-session message from signUpConfirmEmailMessage,
 *      and carries no "you can sign in now"-style text of its own. Found by
 *      search, so a new sign-up page or modal is covered without a list.
 *   4. Every file that calls `auth.signInWithPassword(` recognises the
 *      unconfirmed-email error (isEmailNotConfirmedError) and shows the shared text.
 *   5. No other file carries a copy of the sign-up confirmation wording.
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

/** String literals (quotes and templates) in a source file, comments removed. */
function literals(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  return [...code.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map(m => m[1] ?? m[2] ?? m[3] ?? "");
}

async function main() {
  console.log("Sign-up with no session asks the person to confirm their email\n");

  type Copy = {
    signUpConfirmEmailMessage: (email?: string | null) => string;
    EMAIL_NOT_CONFIRMED_MESSAGE: string;
    isEmailNotConfirmedError: (error: { code?: string | null; message?: string | null } | null | undefined) => boolean;
  };
  let copy: Copy | null = null;
  if (existsSync(path.join(ROOT, COPY))) {
    copy = (await import(pathToFileURL(path.join(ROOT, COPY)).href)) as Copy;
  }

  // 1. The no-session sign-up message.
  {
    const problems: string[] = [];
    if (!copy || typeof copy.signUpConfirmEmailMessage !== "function") {
      problems.push(`${COPY} does not export signUpConfirmEmailMessage(email)`);
    } else {
      const withAddress = copy.signUpConfirmEmailMessage("person@example.test");
      for (const text of [withAddress, copy.signUpConfirmEmailMessage(undefined), copy.signUpConfirmEmailMessage("")]) {
        if (!/confirm/i.test(text)) problems.push(`does not ask the person to confirm: "${text}"`);
        if (!/e-?mail|link|inbox/i.test(text)) problems.push(`does not say the confirmation comes by email: "${text}"`);
        if (SIGN_IN_NOW.test(text)) problems.push(`tells the person they can sign in now: "${text}"`);
        if (/undefined|null/.test(text)) problems.push(`prints a missing address: "${text}"`);
      }
      if (!withAddress.includes("person@example.test")) problems.push(`does not name the address it was given: "${withAddress}"`);
    }
    check("the no-session sign-up message asks for email confirmation, never 'sign in now'", problems);
  }

  // 2. The "Email not confirmed" sign-in message and its detector.
  {
    const problems: string[] = [];
    if (!copy || typeof copy.EMAIL_NOT_CONFIRMED_MESSAGE !== "string" || typeof copy.isEmailNotConfirmedError !== "function") {
      problems.push(`${COPY} does not export EMAIL_NOT_CONFIRMED_MESSAGE and isEmailNotConfirmedError`);
    } else {
      const text = copy.EMAIL_NOT_CONFIRMED_MESSAGE;
      if (!/confirm/i.test(text) || !/e-?mail|inbox|link/i.test(text)) problems.push(`does not ask the person to confirm their email: "${text}"`);
      if (!copy.isEmailNotConfirmedError({ code: "email_not_confirmed", message: "Email not confirmed" })) problems.push("misses Supabase's error code email_not_confirmed");
      if (!copy.isEmailNotConfirmedError({ message: "Email not confirmed" })) problems.push("misses the older message-only 'Email not confirmed'");
      if (copy.isEmailNotConfirmedError({ code: "invalid_credentials", message: "Invalid login credentials" })) problems.push("treats a wrong password as an unconfirmed email");
      if (copy.isEmailNotConfirmedError(null)) problems.push("treats no error as an unconfirmed email");
    }
    check("signing in before confirming gets a plain 'confirm your email first' message", problems);
  }

  const files = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "src")), ...walk(path.join(ROOT, "components"))].map(rel);

  // 3. Every sign-up place.
  const signUpFiles = files.filter(file => /\bauth\s*\.\s*signUp\s*\(/.test(read(file)));
  {
    const problems: string[] = [];
    if (signUpFiles.length === 0) problems.push("no file calls supabase auth.signUp( -- the search is broken or sign-up moved somewhere it cannot see");
    for (const file of signUpFiles) {
      const source = read(file);
      if (!/\bsignUpConfirmEmailMessage\s*\(/.test(source)) problems.push(`${file}: calls auth.signUp but does not show signUpConfirmEmailMessage when no session comes back`);
      for (const text of literals(source)) {
        if (SIGN_IN_NOW.test(text)) problems.push(`${file}: carries its own "sign in now" text: "${text}"`);
      }
    }
    check(`every sign-up place (${signUpFiles.join(", ") || "none found"}) uses the shared confirmation message`, problems);
  }

  // 4. Every password sign-in place.
  {
    const problems: string[] = [];
    const signInFiles = files.filter(file => /\bauth\s*\.\s*signInWithPassword\s*\(/.test(read(file)));
    for (const file of signInFiles) {
      const source = read(file);
      if (!/\bisEmailNotConfirmedError\s*\(/.test(source) || !/\bEMAIL_NOT_CONFIRMED_MESSAGE\b/.test(source)) {
        problems.push(`${file}: signs in with a password but does not show the shared message for an unconfirmed email`);
      }
    }
    check("every password sign-in recognises an unconfirmed email", problems);
  }

  // 5. One copy of the wording.
  {
    const problems: string[] = [];
    for (const file of files) {
      if (file === COPY) continue;
      for (const text of literals(read(file))) {
        if (/sent (you )?a confirmation link/i.test(text) || /confirm your email first/i.test(text)) problems.push(`${file}: carries its own copy: "${text}"`);
      }
    }
    check("the confirmation wording lives only in the copy module", problems);
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
