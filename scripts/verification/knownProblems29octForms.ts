/**
 * Known problems from the site owner's Chrome re-test of 29 Oct 2026, items A
 * (draft forms) and B (details not reaching forms), each reproduced by
 * `npm run test:forms-from-case-file` (verifyFormsFromCaseFile.ts) through the
 * real code that builds and fills the drafts.
 *
 * HOW THE LIST WORKS. A check named here may fail without failing the suite:
 * it is a problem we know of and have not fixed yet. A check that fails and is
 * NOT here fails the suite (a new case). A check named here that now PASSES
 * also fails the suite, with "fixed: delete its entry": the fix is the work we
 * want, and deleting one line is the whole update (CLAUDE.md s. 5: a list that
 * must be maintained is fine; a check that punishes the maintenance is not).
 */
export type KnownProblem = { id: string; test: string; reason: string };

export const KNOWN_PROBLEMS_29OCT_FORMS: KnownProblem[] = [
  { id: "A1a", test: "A1a small-claims chat: the Plaintiff's Claim facts hold none of the site's questions", reason: "The chat's follow-up questions and answers are added to the saved story (guidedIntakeToSmallClaimsInput.ts facts), and the claim draft numbers every sentence of it as a fact (claimDraftEngine.ts buildNumberedFacts)." },
  { id: "A1b", test: "A1b responding and family drafts do not paste the whole story in", reason: "respondingDocumentDraft.ts and startingDocumentDraft.ts (civil, family) put userStory() into the facts section whole." },
  { id: "A1c", test: "A1c generate-form facts hold none of the site's questions or record labels", reason: "getCaseValues (app/api/generate-form/route.ts) deep-searches the whole saved case for a key named facts and finds intakeData.facts: the story plus Q/A lines (Small Claims) or the labelled record (Family)." },
  { id: "A2a", test: "A2a small-claims Plaintiff's Claim holds no analysis notes", reason: "claimDraftEngine.ts writes analysis.detectedIssues ('This claim appears to involve: contract, debt.') and analysis.damagesIssues ('Amount was captured...') into the draft." },
  { id: "A2b", test: "A2b family and civil starting drafts hold no 'No amount entered.' note", reason: "startingDocumentDraft.ts writes 'No amount entered.' into the Amount and timeline section, family included." },
  { id: "A3a", test: "A3a a family draft names no Plaintiff", reason: "startingDocumentDraft.ts labels the party 'Applicant/Plaintiff:' for civil and family alike." },
  { id: "A3b", test: "A3b the plaintiff's address names the city once", reason: "claimDraftEngine.ts getPlaintiffAddress joins yourAddress, yourCity and yourProvince, removing only exact repeats ('Ottawa ON, Ottawa, Ontario')." },
  { id: "B1a", test: "B1a every area's questions ask the person's own name", reason: "No question in the family or civil chat (guidedFields.ts) or the Small Claims question bank asks it; the Small Claims mapper saves yourName as '' ('not collected')." },
  { id: "B1b", test: "B1b small-claims chat defence names the plaintiff the story names", reason: "The Small Claims chat mapper saves otherParty as '' ('not collected') though the story names the other side." },
  { id: "B2", test: "B2 family drafts carry the dates the story gives", reason: "The family chat asks no timeline; marriage and separation dates are not case-file facts; the drafts read only intake.timeline." },
  { id: "B3", test: "B3 small-claims form starting values carry what the case file holds", reason: "The form's starting values come from storedIntakeValues (intakeData only), never caseFileOf, so the chat's and home reading's answers do not pre-fill it." },
  { id: "B4", test: "B4 small-claims chat defence evidence carries 'I have pictures'", reason: "The case file has no evidence fact; the Defence draft reads only intake.evidence, set only by the chat's evidence question." },
  { id: "B5", test: "B5 family issues offered from the story cover each issue it names", reason: "familyIssuesFromStory (storyAnswers.ts) knows a few exact phrases; 'time with the kids' and 'split the house' are not among them." },
  { id: "B6", test: "B6 small-claims optional details come back when the case is reopened", reason: "Saved in intakeData.extra, but storedIntakeValues (caseRecord.ts) does not carry agreementDetails, paymentHistory, deadlineDetails or defenceResponse back to the form." },
];
