/**
 * The follow-up chat's first reply reads from the confirmed intake (L47).
 *
 * What it checks: for a case whose court the route supplies (the guided
 * assistant route only answers for a case with a confirmed intake, and passes
 * that case's court), the first reply in Small Claims, Family and civil never
 * says there is "not enough information yet", asks to confirm the court path, or
 * says the province must be confirmed;
 * and with no court given, that fallback is still available. The other half,
 * the chat page not asking to confirm the province, amount and remedy after the
 * review is confirmed, is tested in tests/browser/chat-follow-up.spec.ts.
 *
 * Failure it exists to catch: the #466 re-test, where Family's first reply was
 * the generic "not enough information yet ... confirm the court path" (its
 * explanation block is still a placeholder), after the person had confirmed it.
 *
 * Run: npm run test:chat-first-line
 */
import { runGuidedAssistantGateway } from "../../src/lib/case-system/guided-assistant/guidedAssistantGateway";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const GENERIC = /not enough information yet|confirm the court path/i;
const firstReply = (courtPath?: string) => runGuidedAssistantGateway({
  message: "What should I do next?",
  conversation: [],
  caseMemory: { caseData: { facts: "Synthetic confirmed story." }, masterResult: {}, path: courtPath },
  courtContext: courtPath ? { courtPath, jurisdiction: "Ontario", stage: "not-sure" } : undefined,
  mode: "builder-chat",
} as never).userFacingAnswer;

for (const court of ["small-claims", "family", "civil"]) {
  const reply = firstReply(court);
  check(`${court}: the first reply on a confirmed case does not say "not enough information yet" or ask to confirm the court`, !GENERIC.test(reply), reply.slice(0, 300));
  check(`${court}: and it is not empty`, reply.trim().length > 0);
  // #468 re-test: "The province or jurisdiction must be confirmed" on a confirmed Ontario case.
  check(`${court}: nor says the province must be confirmed`, !/province or jurisdiction must be confirmed/i.test(reply), reply.slice(0, 300));
}
check("with no court given, the generic fallback is still there", GENERIC.test(firstReply()), firstReply().slice(0, 300));

if (failures) { console.log(`${failures} check(s) failed.`); process.exit(1); }
console.log("PASS chat first line: the first reply reads from the confirmed intake, in all three areas");
