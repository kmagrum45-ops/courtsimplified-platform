/**
 * Shared defensive-default answer set for the 10 case-review fixtures in
 * this directory. Same purpose as the individual hand-written defaults
 * already duplicated across unpaidInvoiceClean/Gap/overLimitContract's own
 * `answers` maps and generateStories.ts's `standardAnswers()`: the real
 * orchestrator decides what to ask next from AI-extracted facts, not from
 * a fixed script, so every fixture must have an answer ready for any
 * QUESTION_BANK id that could plausibly come up — not just the ones its
 * own story is written to trigger. Centralised here once instead of
 * copy-pasted 10 times so a 30th question id, when one is added, is one
 * place to update, not ten.
 *
 * `overrides` replaces only the keys a specific fixture cares about.
 * Every id in QUESTION_BANK (grep-verified against
 * src/lib/case-system/intake/questionBank.ts on 2026-09-27) has a
 * sensible pre-filing/plaintiff-shaped default below; fixtures that are
 * post-filing, defendant-side, or injury-related override the relevant
 * subset explicitly.
 */

export function baseCaseReviewAnswers(overrides: Record<string, string>): Record<string, string> {
  return {
    "sc-defamation-publication-details": "Not applicable -- this isn't a defamation matter.",
    "sc-claim-filed": "No, I haven't filed anything with the court yet.",
    "sc-defendant-served": "No, nothing has been served yet since no claim has been filed.",
    "sc-defence-filed": "No.",
    "sc-defence-time-elapsed": "Not applicable -- no defence has been served yet.",
    "sc-defendant-noted-in-default": "Not applicable -- no claim has been filed yet.",
    "sc-defendant-claim-received": "Not applicable -- I am the one bringing this claim, not responding to one.",
    "sc-defendant-response-facts": "Not applicable -- I am the one bringing this claim, not responding to one.",
    "sc-defendant-response-evidence": "Not applicable -- I am the one bringing this claim, not responding to one.",
    "sc-defendant-outcome": "Not applicable -- I am the one bringing this claim, not responding to one.",
    "sc-defendant-service-method": "Not applicable -- I am the one bringing this claim, not responding to one.",
    "sc-defendant-counterclaim": "Not applicable -- I am the one bringing this claim, not responding to one.",
    "sc-defendant-admission-payment": "Not applicable -- I am the one bringing this claim, not responding to one.",
    "sc-contractor-completion-date": "Not directly applicable to this situation, but happy to give more detail if needed.",
    "sc-contractor-notice-before-replacement": "Not applicable to this situation.",
    "sc-date-injury": "Not applicable -- this isn't an injury matter.",
    "sc-date-claim-served": "Not applicable -- nothing has been served yet.",
    "sc-date-claim-issued": "Not applicable -- no claim has been issued yet.",
    "sc-date-defence-filed": "Not applicable -- there is no defence.",
    "sc-date-defendants-claim-served": "Not applicable -- nobody has made a claim against me.",
    "sc-date-settlement-conference": "Not applicable -- nothing is scheduled; the case has not been started.",
    "sc-date-learned-of-default": "Not applicable -- I have not been noted in default.",
    "sc-date-learned-of-judgment": "Not applicable -- there has been no hearing and no judgment.",
    "sc-safety-check": "No safety concerns -- this is a straightforward dispute.",
    ...overrides,
  };
}
