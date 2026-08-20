import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const login = readFileSync("app/login/page.tsx", "utf8");
const forgotPassword = readFileSync("app/forgot-password/page.tsx", "utf8");
const resetPassword = readFileSync("app/reset-password/page.tsx", "utf8");

assert.match(login, /Your email is your sign-in ID\./);
assert.match(login, /signInWithPassword/);
assert.match(login, /href="\/forgot-password"/);
assert.match(login, /signInWithOtp\([\s\S]*shouldCreateUser: false[\s\S]*emailRedirectTo: `\$\{window\.location\.origin\}\/dashboard`/);
assert.match(login, /If that email can sign in, we sent a sign-in link\. Check your email\./);

assert.match(forgotPassword, /resetPasswordForEmail\(email\.trim\(\),[\s\S]*redirectTo: `\$\{window\.location\.origin\}\/reset-password`/);
assert.match(forgotPassword, /If that email can sign in, we sent password-reset instructions\. Check your email\./);
assert.doesNotMatch(forgotPassword, /error\.message|console\.(log|error)/);

assert.match(resetPassword, /event === "PASSWORD_RECOVERY" && session/);
assert.match(resetPassword, /if \(!password \|\| password !== confirmPassword\)/);
assert.match(resetPassword, /if \(!recoveryReady\)/);
assert.match(resetPassword, /supabase\.auth\.updateUser\(\{ password \}\)/);
assert.match(resetPassword, /router\.replace\("\/login"\)/);
assert.doesNotMatch(resetPassword, /error\.message|console\.(log|error)/);
assert.doesNotMatch(login, /error\.message|console\.(log|error)/);

console.log("Account recovery UX verification passed: password, recovery, and magic-link flows use neutral messages and the existing Supabase browser session path.");
