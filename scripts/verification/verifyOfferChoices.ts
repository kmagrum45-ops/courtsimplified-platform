/**
 * AN OFFER'S "NO" AND "I'M NOT SURE" ARE RECORDED ONCE, THROUGH THE ONE HANDLER (site owner, 14 Nov 2026, decision 2 on
 * the batch report: the 12 offers set aside on the page only, and "I'm not sure" on the kind of case; "No, that's not
 * right" must record "ask once" and "I'm not sure" must record settled, so neither is asked again anywhere).
 *
 * What it asserts, with no browser, model or database:
 *   1. the record: a choice is kept under its offer key in the case record's own section (caseFile.offerChoices) and
 *      survives the saved checkpoint; the newest choice on a key wins; a malformed key or choice is refused;
 *   2. for each of the 13 offers, "I'm not sure" settles what that offer was for, read back the way every screen reads it:
 *      the fact settled in caseFileOf (and its question no longer shown, factStatus.ts mayShowQuestion), the date question
 *      folded (unsureDateQuestions), or, for an offer that fills no case-file fact, the offer's own key settled;
 *   3. for each of them, "No" keeps the offer declined under its key and changes no fact: the question is still asked,
 *      once, plainly;
 *   4. "I'm not sure" on a fact is sent to the server like every edit (pendingWrites), and the server's save keeps the
 *      offer choices beside the facts, also when a request holds offer choices only (a "No");
 *   6. "I'm not sure" never takes an answer away, in every court: an answer held from the fact record or the form's box
 *      stays through the intake's save, the case page's save and the server's save (only "removed" takes one away);
 *   5. the 13 offers each pass their target to the one control (UseSuggestion offer=...), and the control records every
 *      No and Not sure through the one handler (offerChoiceSave.ts) unless the offer says its screen keeps it.
 *
 * WHAT FAILURE THIS CATCHES: an offer whose No or Not sure is set aside on the page only, so the same offer or question
 * comes back after a reload or on another screen.
 *
 * Run: npm run test:offer-choices
 */
import { readFileSync } from "node:fs";
import { caseFileOf, CASE_FILE_SECTION, unsureDateQuestions, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { mayShowQuestion } from "../../src/lib/case-system/caseFile/factStatus";
import { offerChoiceOf, offerChoiceParts, offerChoiceWrites, offerChoicesOf, offerForQuestion, readOfferChoices, sectionWithOfferChoices, withOfferChoice, type OfferChoice, type OfferTarget } from "../../src/lib/case-system/caseFile/offerChoice";
import { pendingWrites } from "../../src/lib/case-system/caseFile/pendingFacts";
import { saveFactWrites } from "../../src/lib/case-system/caseFile/factSave";
import { readCheckpoint, type Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed += 1;
};
const ID = "00000000-0000-4000-8000-000000000731";
type Court = Checkpoint["courtPath"];
const cp = (court: Court, sections: Record<string, unknown>): Checkpoint => ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: "Synthetic story.", location: { province: "Ontario", city: "Ottawa" } }, ...sections } } as unknown as Checkpoint);
/** One choice through the intake's save (caseWrite.ts writeOfferChoice), then the saved checkpoint read back. */
function choose(court: Court, target: OfferTarget, choice: OfferChoice, sections: Record<string, unknown> = {}): Checkpoint {
  const caseFile = (sections[CASE_FILE_SECTION] ?? {}) as Record<string, unknown>;
  const parts = offerChoiceParts(caseFile, target, choice, new Date("2026-11-14T12:00:00Z"), undefined, caseFileOf(cp(court, sections)));
  const next = cp(court, { ...sections, [CASE_FILE_SECTION]: { ...caseFile, ...parts } });
  const read = readCheckpoint(JSON.parse(JSON.stringify(next)), court, ID);
  if (!read) throw new Error("the checkpoint was refused");
  return read;
}

// 1. The record.
{
  const a = withOfferChoice(undefined, "tidy:k1", "no");
  const b = withOfferChoice(a, "tidy:k1", "unsure");
  check("1. the newest choice on a key wins", b["tidy:k1"] === "unsure" && Object.keys(b).length === 1, JSON.stringify(b));
  const saved = choose("small-claims", { key: "tidy:k1", fact: null }, "no");
  check("1. a choice survives the saved checkpoint", offerChoiceOf(saved.sections as Record<string, unknown>, "tidy:k1") === "no", JSON.stringify(saved.sections[CASE_FILE_SECTION as never]));
  check("1. a case saved before has no choices and reads as none", Object.keys(offerChoicesOf(cp("small-claims", {}).sections as Record<string, unknown>)).length === 0);
  let threw = false;
  try { withOfferChoice(undefined, "bad key <script>", "no"); } catch { threw = true; }
  check("1. a malformed key is refused", threw);
  check("1. a request's offer choices are checked", !readOfferChoices({ offers: [{ key: "x", choice: "yes" }] }).ok && !readOfferChoices({ offers: "x" }).ok && readOfferChoices({ offers: [{ key: "step:a", choice: "no" }] }).ok && readOfferChoices({}).ok);
}

// 2 and 3. Each of the 13: what "I'm not sure" settles, and that "No" settles nothing but the offer.
type Case = { offer: string; court: Court; target: OfferTarget; settled: (file: ReturnType<typeof caseFileOf>, sections: Record<string, unknown>) => boolean; stillAsked: (file: ReturnType<typeof caseFileOf>, sections: Record<string, unknown>) => boolean };
const factSettled = (fact: SlotFact, question?: string) => (file: ReturnType<typeof caseFileOf>) => file[fact].state === "unsure" && (!question || !mayShowQuestion(file, question));
const factOpen = (fact: SlotFact, question?: string) => (file: ReturnType<typeof caseFileOf>) => file[fact].state === "not-asked" && (!question || mayShowQuestion(file, question));
const keySettled = (key: string) => (_file: unknown, sections: Record<string, unknown>) => offerChoiceOf(sections, key) === "unsure";
const keyDeclined = (key: string) => (_file: unknown, sections: Record<string, unknown>) => offerChoiceOf(sections, key) === "no";
const CASES: Case[] = [
  { offer: "claim-type-use-suggestion (the kind of case card: Not sure)", court: "small-claims", target: { key: "claim-kind:sc-claim-unpaid-invoice", fact: "claimKind" }, settled: factSettled("claimKind"), stillAsked: factOpen("claimKind") },
  { offer: "claim-kind-use-suggestion (the overview's kind of claim)", court: "small-claims", target: { key: "claim-kind:sc-claim-unpaid-invoice", fact: "claimKind" }, settled: factSettled("claimKind"), stillAsked: factOpen("claimKind") },
  { offer: "stage-answer-use-suggestion (the step suggested)", court: "small-claims", target: { key: "step:defendant:served-defence-period-running", fact: "stage" }, settled: factSettled("stage"), stillAsked: factOpen("stage") },
  { offer: "stage-answer-date-suggestion- (a date from the story, offered)", court: "small-claims", target: { key: "date:case-date-act-or-omission", fact: null }, settled: (file) => unsureDateQuestions(file).includes("case-date-act-or-omission"), stillAsked: (file) => !unsureDateQuestions(file).includes("case-date-act-or-omission") },
  { offer: "stage-answer-date-suggestion- (a date from the story, shown as held)", court: "civil", target: { key: "date:sc-date-claim-served", fact: null }, settled: (file) => unsureDateQuestions(file).includes("sc-date-claim-served"), stillAsked: (file) => !unsureDateQuestions(file).includes("sc-date-claim-served") },
  { offer: "triage-story-suggestion-yes (the Family triage: children)", court: "family", target: offerForQuestion("triage:child-together", "child-together"), settled: factSettled("children", "child-together"), stillAsked: factOpen("children", "child-together") },
  { offer: "guided-form-partial-use (the civil/Family chat's part answer)", court: "civil", target: offerForQuestion("chat-partial:goal", "goal"), settled: factSettled("wants", "goal"), stillAsked: factOpen("wants", "goal") },
  { offer: "sc-form-use-suggestion (the Small Claims form's facts from the story)", court: "small-claims", target: offerForQuestion("sc-form:amountClaimed", "amountClaimed"), settled: factSettled("amount", "amountClaimed"), stillAsked: factOpen("amount", "amountClaimed") },
  { offer: "event-candidate-use-suggestion (the Timeline's kind of step; no case-file fact)", court: "small-claims", target: { key: "event-kind:fp-1", fact: null }, settled: keySettled("event-kind:fp-1"), stillAsked: keyDeclined("event-kind:fp-1") },
  { offer: "stage-accept (the stage suggested; the card confirms \"I am not sure\" itself)", court: "small-claims", target: { key: "stage:responding", fact: null }, settled: keySettled("stage:responding"), stillAsked: keyDeclined("stage:responding") },
  { offer: "tidy-wording-use (a wording fix; no case-file fact)", court: "small-claims", target: { key: "tidy:facts-1", fact: null }, settled: keySettled("tidy:facts-1"), stillAsked: keyDeclined("tidy:facts-1") },
  { offer: "forms-suggested-save (the forms page's answer; no case-file fact)", court: "small-claims", target: { key: "forms:applicability.children.any", fact: null }, settled: keySettled("forms:applicability.children.any"), stillAsked: keyDeclined("forms:applicability.children.any") },
  { offer: "case-understanding-continue-suggested (the court suggested; no fact settled, a court is still chosen)", court: "small-claims", target: { key: "court:small-claims", fact: null }, settled: keySettled("court:small-claims"), stillAsked: keyDeclined("court:small-claims") },
];
for (const item of CASES) {
  const unsure = choose(item.court, item.target, "unsure");
  const unsureFile = caseFileOf(unsure);
  check(`2. ${item.offer}: I'm not sure settles it, never asked again`, item.settled(unsureFile, unsure.sections as Record<string, unknown>), JSON.stringify(item.target.fact ? unsureFile[item.target.fact] : offerChoicesOf(unsure.sections as Record<string, unknown>)));
  const no = choose(item.court, item.target, "no");
  const noFile = caseFileOf(no);
  check(`3. ${item.offer}: No keeps the offer declined and the question still asked once`, offerChoiceOf(no.sections as Record<string, unknown>, item.target.key) === "no" && item.stillAsked(noFile, no.sections as Record<string, unknown>), JSON.stringify(item.target.fact ? noFile[item.target.fact] : offerChoicesOf(no.sections as Record<string, unknown>)));
}
check("2. the 13 offers are all covered", CASES.length === 13, String(CASES.length));

// 4. To the server.
{
  const unsure = choose("small-claims", { key: "claim-kind:sc-claim-unpaid-invoice", fact: "claimKind" }, "unsure");
  const writes = pendingWrites((unsure.sections[CASE_FILE_SECTION as never] as Record<string, unknown>).changes);
  check("4. I'm not sure on a fact is sent like every edit (pendingWrites)", writes.length === 1 && writes[0].fact === "claimKind" && writes[0].state === "unsure", JSON.stringify(writes));
  check("4. the case page's save sends the same fact", JSON.stringify(offerChoiceWrites({ key: "claim-kind:x", fact: "claimKind" }, "unsure", 0, caseFileOf(null)).map((write) => [write.fact, write.state])) === JSON.stringify([["claimKind", "unsure"]]) && offerChoiceWrites({ key: "tidy:x", fact: null }, "unsure", 0, caseFileOf(null)).length === 0);
  check("4. the server's section keeps the offer choices beside what it held", JSON.stringify(sectionWithOfferChoices({ facts: { a: 1 } }, [{ key: "step:x", choice: "no" }])) === JSON.stringify({ facts: { a: 1 }, offerChoices: { "step:x": "no" } }));

  const master = { intakeCheckpoint: cp("small-claims", { situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } } }) };
  const db = { row: { master_result: master as Record<string, unknown>, updated_at: "t1" } };
  const chain = (kind: "select" | "update", values?: Record<string, unknown>) => {
    const filters: Record<string, string> = {};
    const self = {
      eq(column: string, value: string) { filters[column] = value; return self; },
      async maybeSingle() { return { data: { master_result: db.row.master_result, updated_at: db.row.updated_at }, error: null }; },
      async select() {
        if (kind !== "update" || filters.updated_at !== db.row.updated_at) return { data: [], error: null };
        db.row = { master_result: values!.master_result as Record<string, unknown>, updated_at: String(values!.updated_at) };
        return { data: [{ id: ID }], error: null };
      },
    };
    return self;
  };
  const client = { from: () => ({ select: () => chain("select"), update: (values: Record<string, unknown>) => chain("update", values) }) };
  void (async () => {
    const onlyNo = await saveFactWrites(client as never, { caseId: ID, userId: "u1", court: "small-claims" }, [], () => new Date("2026-11-14T12:00:00Z"), [{ key: "step:x", choice: "no" }]);
    const savedSections = ((db.row.master_result.intakeCheckpoint as Checkpoint).sections ?? {}) as Record<string, unknown>;
    check("4. a request with offer choices only (a No) is saved", onlyNo.ok && offerChoiceOf(savedSections, "step:x") === "no", JSON.stringify(onlyNo));
    const withFact = await saveFactWrites(client as never, { caseId: ID, userId: "u1", court: "small-claims" }, offerChoiceWrites({ key: "claim-kind:y", fact: "claimKind" }, "unsure", 0, caseFileOf(null)), () => new Date("2026-11-14T12:01:00Z"), [{ key: "claim-kind:y", choice: "unsure" }]);
    const after = readCheckpoint(db.row.master_result.intakeCheckpoint, "small-claims", ID)!;
    check("4. I'm not sure on a case page: the fact settled and the choice kept, in one save", withFact.ok && caseFileOf(after).claimKind.state === "unsure" && offerChoiceOf(after.sections as Record<string, unknown>, "claim-kind:y") === "unsure" && offerChoiceOf(after.sections as Record<string, unknown>, "step:x") === "no", JSON.stringify(caseFileOf(after).claimKind));

    // 5. The 13 pass their targets; the one control records through the one handler.
    const read = (file: string) => readFileSync(file, "utf8");
    const control = read("app/_components/UseSuggestion.tsx");
    check("5. the one control: offer is required, its No and Not sure go through the one handler, a decided offer is not shown", /\n\s+offer: OfferTarget;/.test(control) && /if \(shared\) void choices\.record\(offer, choice\)/.test(control) && /shared && choices\.choiceOf\(offer\.key\)\)+ return null/.test(control));
    const TARGETS: [string, string, RegExp][] = [
      ["claim-type-use-suggestion", "app/builder/_components/GuidedSmallClaimsIntake.tsx", /offer=\{\{ key: `claim-kind:\$\{pendingSuggestion\.claimTypeId\}`, fact: "claimKind" \}\}\s+testId="claim-type-use-suggestion"/],
      ["claim-kind-use-suggestion", "app/builder/_components/IntelligenceOverviewPanel.tsx", /offer=\{\{ key: `claim-kind:\$\{claimTypeId\}`, fact: "claimKind" \}\} testId="claim-kind-use-suggestion"[\s\S]{0,200}onUnsure=\{onUnsure\}/],
      ["stage-answer-use-suggestion", "app/builder/_components/StageAnswerPanel.tsx", /offer=\{\{ key: `step:\$\{stageId\}`, fact: "stage" \}\}\s+testId="stage-answer-use-suggestion"[\s\S]{0,300}onNo=\{\(\) => setChoosingStep\(true\)\}[\s\S]{0,40}onUnsure=/],
      ["stage-answer-date-suggestion- (offered)", "app/builder/_components/StageAnswerPanel.tsx", /offer=\{\{ key: `date:\$\{question\.id\}`, fact: null \}\}\s+testId=\{`stage-answer-date-suggestion-\$\{question\.id\}`\}\s+what=\{formatIso\(suggestion\.value\)\}/],
      ["stage-answer-date-suggestion- (held from the story)", "app/builder/_components/StageAnswerPanel.tsx", /offer=\{\{ key: `date:\$\{question\.id\}`, fact: null \}\}\s+testId=\{`stage-answer-date-suggestion-\$\{question\.id\}`\}\s+what=\{formatIso\(fromStory\.value\)\}[\s\S]{0,700}onNo=[\s\S]{0,400}onUnsure=/],
      ["triage-story-suggestion-yes", "app/builder/_components/FamilyStatusTriage.tsx", /offer=\{offerForQuestion\(`triage:\$\{current\.id\}`, current\.id\)\}\s+testId="triage-story-suggestion-yes"/],
      ["guided-form-partial-use", "app/builder/_components/GuidedFormChat.tsx", /offer=\{offerForQuestion\(`chat-partial:\$\{current\.key\}`, current\.key\)\} testId="guided-form-partial-use"/],
      ["sc-form-use-suggestion", "app/builder/_components/SmallClaimsIntake.tsx", /offer=\{offerForQuestion\(`sc-form:\$\{fact\.field\}`, fact\.field\)\}\s+testId="sc-form-use-suggestion"/],
      ["event-candidate-use-suggestion", "app/builder/_components/EventCandidateSurface.tsx", /offer=\{\{ key: `event-kind:\$\{candidate\.fingerprint\}`, fact: null \}\}\s+testId="event-candidate-use-suggestion"/],
      ["stage-accept", "app/builder/_components/StageConfirmation.tsx", /offer=\{\{ key: `stage:\$\{suggestedStage\}`, fact: null \}\}\s+testId="stage-accept"[\s\S]{0,200}onNo=\{\(\) => setChanging\(true\)\}\s+onUnsure=\{\(\) => onConfirm\("not-sure"\)\}/],
      ["tidy-wording-use", "app/builder/_components/TidyWordingReview.tsx", /offer=\{\{ key: `tidy:\$\{suggestion\.key\}`, fact: null \}\}\s+testId="tidy-wording-use"/],
      ["forms-suggested-save", "app/forms/FormsWorkspace.tsx", /offer=\{\{ key: `forms:\$\{question\.field_path\}`, fact: null \}\}\s+testId="forms-suggested-save"/],
      ["case-understanding-continue-suggested", "app/_components/CaseUnderstandingCard.tsx", /offer=\{\{ key: `court:\$\{suggested\}`, fact: null \}\}\s+disabled=\{updating \|\| openingPath !== null\}[\s\S]{0,200}testId="case-understanding-continue-suggested"/],
    ];
    for (const [offer, file, pattern] of TARGETS) check(`5. ${offer}: its target is passed to the one control, recorded by the one handler`, pattern.test(read(file)), file);
    check("5. the 13 are all checked", TARGETS.length === 13, String(TARGETS.length));

    // 6. "I'm not sure" never takes an answer away (site owner, 14 Nov 2026, decision B: a typed answer beats "not sure"
    // for the same fact; only "removed" takes an answer away). In every court, an answer held from the fact record or from
    // the form's own box, then "I'm not sure" on an offer for that fact: through the intake's save, the case page's save
    // and the server's save, the answer stays.
    const FORM_BOX: Record<string, Record<string, unknown>> = {
      "small-claims": { "small-claims": { input: { otherParty: "Jordan Testwood" } } },
      civil: { civil: { input: { otherParty: "Jordan Testwood" } } },
      family: { family: { otherParty: "Jordan Testwood" } },
    };
    for (const court of ["small-claims", "civil", "family"] as const) {
      for (const [how, sections] of [
        ["the fact record", { [CASE_FILE_SECTION]: { facts: { otherParty: { state: "answered", value: "Jordan Testwood", source: "person", at: "2026-11-14T11:00:00.000Z", seq: 1 } } } }],
        ["the form's own box", FORM_BOX[court]],
      ] as const) {
        const target: OfferTarget = { key: "sc-form:otherParty", fact: "otherParty" };
        const before = caseFileOf(cp(court, sections as Record<string, unknown>));
        if (before.otherParty.state !== "answered") { check(`6. ${court}, ${how}: the setup holds the answer`, false, JSON.stringify(before.otherParty)); continue; }
        const intake = choose(court, target, "unsure", sections as Record<string, unknown>);
        check(`6. ${court}, answered in ${how}: I'm not sure through the intake's save leaves the answer`, caseFileOf(intake).otherParty.value === "Jordan Testwood" && offerChoiceOf(intake.sections as Record<string, unknown>, target.key) === "unsure", JSON.stringify(caseFileOf(intake).otherParty));
        check(`6. ${court}, answered in ${how}: the case page's save sends no "not sure" for it`, offerChoiceWrites(target, "unsure", 0, before).length === 0, JSON.stringify(offerChoiceWrites(target, "unsure", 0, before)));
        const db2 = { row: { master_result: { intakeCheckpoint: cp(court, sections as Record<string, unknown>) } as Record<string, unknown>, updated_at: "t1" } };
        const chain2 = (kind: "select" | "update", values?: Record<string, unknown>) => {
          const filters: Record<string, string> = {};
          const self = {
            eq(column: string, value: string) { filters[column] = value; return self; },
            async maybeSingle() { return { data: { master_result: db2.row.master_result, updated_at: db2.row.updated_at }, error: null }; },
            async select() {
              if (kind !== "update" || filters.updated_at !== db2.row.updated_at) return { data: [], error: null };
              db2.row = { master_result: values!.master_result as Record<string, unknown>, updated_at: String(values!.updated_at) };
              return { data: [{ id: ID }], error: null };
            },
          };
          return self;
        };
        const client2 = { from: () => ({ select: () => chain2("select"), update: (values: Record<string, unknown>) => chain2("update", values) }) };
        // A "not sure" write from an offer reaching the server anyway (an older tab, a hand-made request).
        await saveFactWrites(client2 as never, { caseId: ID, userId: "u1", court }, [{ fact: "otherParty", state: "unsure", source: "person", question: "offer:sc-form:otherParty", seenSeq: 1 }], () => new Date("2026-11-14T12:02:00Z"), [{ key: target.key, choice: "unsure" }]);
        const serverAfter = readCheckpoint(db2.row.master_result.intakeCheckpoint, court, ID);
        check(`6. ${court}, answered in ${how}: the server refuses an offer's "not sure" over the answer`, Boolean(serverAfter) && caseFileOf(serverAfter!).otherParty.value === "Jordan Testwood", JSON.stringify(serverAfter ? caseFileOf(serverAfter).otherParty : null));
      }
    }


    if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
    console.log("\nAll checks passed");
  })();
}
