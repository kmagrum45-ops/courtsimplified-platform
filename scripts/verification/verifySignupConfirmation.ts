/**
 * SIGN-UP AND SIGN-IN SAY WHAT HAPPENS NEXT, FROM WHAT SUPABASE AUTH RETURNED (site owner, 21 Nov 2026).
 *
 * Production requires email confirmation, but the login page assumed it did not: after a sign-up with no session it said
 * "Account created. You can sign in with those details now.", and the sign-in that followed failed. A guest was also never
 * told, before their story, that an account is needed to save the case and see the next steps.
 *
 * What it checks:
 *   1. the rules (src/lib/auth/signUpConfirmation.ts): a sign-up with a session is signed in, one without must confirm;
 *      the "check your email" words name the address; a sign-in refused as email_not_confirmed is recognised, any other
 *      refusal is not; the confirmation link lands on the site's own address, on the login page;
 *   2. the login page is the only page that creates an account or signs in (signUp, signInWithPassword, signInWithOtp,
 *      resend), so every "Sign in" prompt gets the same behaviour; it reads the sign-up's answer (signUpNext), sends the
 *      link to confirmationRedirect, recognises an unconfirmed sign-in, offers to send the link again, and no longer says
 *      "You can sign in with those details now";
 *   3. the guest notice is shown in the intake's own frame (IntakeRecovery.tsx), where every page that starts a case is,
 *      only while the case has no account, and its words are the one copy.
 * The pages themselves, both states, every way in and every area: tests/browser/signup-confirmation.spec.ts.
 *
 * WHAT FAILURE THIS CATCHES: a sign-up page that assumes the Supabase setting, a second place that signs people in
 * without these rules, a confirmation link sent elsewhere, and a guest not told about the account before their story.
 *
 * Run: npm run test:signup-confirmation
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { checkEmailMessage, confirmationRedirect, GUEST_ACCOUNT_NOTICE, isUnconfirmedSignIn, signUpNext } from "../../src/lib/auth/signUpConfirmation";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

// 1. The rules.
check("a sign-up that returns a session is signed in", signUpNext({ session: { access_token: "x" } }) === "signed-in");
check("a sign-up that returns no session must confirm the email", signUpNext({ session: null }) === "confirm-email");
check("the check-your-email words name the address", checkEmailMessage("a@example.invalid") === "Check your email: we sent a confirmation link to a@example.invalid. Click it, then sign in.");
check("a sign-in refused as email_not_confirmed is recognised", isUnconfirmedSignIn({ code: "email_not_confirmed" }));
check("any other refusal is not", !isUnconfirmedSignIn({ code: "invalid_credentials" }) && !isUnconfirmedSignIn(null));
check("the confirmation link lands on the site's own login page", confirmationRedirect("https://www.courtsimplified.com") === "https://www.courtsimplified.com/login?confirmed=1");

// 2. One page signs people in, with these rules.
const files: string[] = [];
const walk = (dir: string) => { for (const name of readdirSync(dir)) { const full = path.join(dir, name); if (statSync(full).isDirectory()) { if (name !== "node_modules") walk(full); } else if (/\.(ts|tsx)$/.test(name)) files.push(full); } };
walk("app"); walk("src");
const signsIn = files.filter((file) => /\bauth\.(signUp|signInWithPassword|signInWithOtp|resend)\(/.test(readFileSync(file, "utf8"))).map((file) => file.replace(/\\/g, "/"));
check("only the login page creates an account or signs in", signsIn.length === 1 && signsIn[0] === "app/login/page.tsx", signsIn.join(", "));
const login = readFileSync("app/login/page.tsx", "utf8");
check("it reads the sign-up's answer, never an assumption", /signUpNext\(data\)/.test(login));
check("the sign-up sends its link to this site's address", /signUp\(\{[\s\S]{0,200}emailRedirectTo: confirmationRedirect\(window\.location\.origin\)/.test(login));
check("an unconfirmed sign-in is recognised and the link can be sent again, to this site", /isUnconfirmedSignIn\(error\)/.test(login) && /auth\.resend\(\{ type: "signup"[\s\S]{0,120}emailRedirectTo: confirmationRedirect\(window\.location\.origin\)/.test(login));
check("it no longer says \"You can sign in with those details now\"", !login.includes("You can sign in with those details now"));

// 3. The guest notice, once, in the intake's own frame.
const frame = readFileSync("app/_components/IntakeRecovery.tsx", "utf8");
check("the intake's frame shows the guest notice while the case has no account", /recovery && !recovery\.ownerId && !signedIn \? <p[^>]*data-testid="guest-account-notice">\{GUEST_ACCOUNT_NOTICE\}<\/p>/.test(frame));
const copies = files.filter((file) => readFileSync(file, "utf8").includes(GUEST_ACCOUNT_NOTICE.slice(0, 40)));
check("its words are written once", copies.length === 1 && copies[0].replace(/\\/g, "/") === "src/lib/auth/signUpConfirmation.ts", copies.join(", "));
check("the notice says an account saves the case and shows the next steps, and that sign-up sends a confirmation email", /save your case and see your next steps/.test(GUEST_ACCOUNT_NOTICE) && /email you a link to confirm/.test(GUEST_ACCOUNT_NOTICE));

if (failures) { console.log(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nSign-up and sign-in say what happens next: every check passed.");
