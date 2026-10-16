# Page walkthrough — critic report

Generated 2026-10-16T03:34:41.824Z by `scripts/walkthrough/critique.ts` from `tests/browser/walkthrough.spec.ts`. Every persona is fabricated. Full page text is in PAGES.md; screenshots are alongside.

| Persona | Got through | High | Medium | Low |
|---|---|---|---|---|
| family-motion-to-change-support | yes | 3 | 18 | 1 |

## family-motion-to-change-support

*A father paying child support under a 2022 order who lost his job and wants it lowered.*

The journey correctly recognizes a payor seeking to change an existing support order and identifies Form 15 without predicting whether support will be reduced. It also supplies useful filing, fee and service information and preserves the chosen stage after reloading. However, generic and repeated material obscures the practical preparation task, and the pages omit an important warning that the existing payment obligation does not change merely because he lost his job or brings a motion. The priorities are a tailored disclosure and attachment checklist, consistent consent-route guidance, removal of inapplicable deadlines, and reliable reuse of facts already provided.

- **high** · missing · step `stage-confirmed` — The results do not warn this payor that losing his job or bringing a motion does not itself lower or suspend the existing $900 obligation.
  - Page says: "Unless the parties and any assignee all agree to the change, you must serve and file a motion to change (Form 15)."
  - Fix: Explain, with a source, that the existing order remains operative unless changed and that unpaid amounts can accumulate while he seeks a change.
- **high** · missing · step `stage-confirmed` — The page never turns the generic attachment instruction into a usable checklist for this payor's income-loss motion, including how his termination letter, EI statements and existing order fit.
  - Page says: "Add all required attachments."
  - Fix: Give a sourced, case-specific preparation checklist identifying the required income disclosure, order copy, supporting evidence and accompanying forms.
- **high** · contradiction · step `case-overview` — This labels filing consent papers as a final order being made and selects Form 15C despite the page's earlier direction to use Form 15D for an agreed child-support-only change.
  - Page says: "Final order made. The court or the clerk: If the parties and any assignee agree to the change, they file a consent motion to change (Form 15C)."
  - Fix: Separate filing consent materials from the court making an order and identify Form 15D for the child-support-only consent route.
- **medium** · repetition · step `guided-chat-done` — The intake asks whether court documents exist even though his story already identifies a 2022 court order.
  - Page says: "Has anything been filed with the court or given to you yet?"
  - Fix: Record the existing order from his story and ask only for missing details needed to change it.
- **medium** · jargon · step `guided-chat-done` — The first explanation of the consent routes uses an unfamiliar term that is not explained until much later.
  - Page says: "any assignee"
  - Fix: Explain here that an assignee is a person or agency to which support rights have been assigned, and ask whether that applies.
- **medium** · missing · step `intake-form` — The stage choices do not explicitly offer changing an existing final order, despite that being the situation already described.
  - Page says: "Case stage"
  - Fix: Show a prefilled motion-to-change stage with an option to correct it.
- **medium** · repetition · step `intake-form` — The lengthy table tutorial repeats the preceding page and continues to recur throughout intake and results without advancing his procedural task.
  - Page says: "How a table amount is worked out: find the income row, then add the percentage"
  - Fix: Put the tutorial behind an optional link and prioritize the steps for changing his existing order.
- **medium** · repetition · step `after-analysis` — The site asks him to confirm a goal it already recorded as getting child support lowered and already answered with Form 15.
  - Page says: "From what you told us, it sounds like you want to ask the court to change the order. Is that right?"
  - Fix: Carry the recorded goal into the results and offer a correction control rather than another required confirmation.
- **medium** · not-their-case · step `stage-confirmed` — The next-step card displays an attendance instruction and deadline for a program it expressly says does not apply to his support-only change, and this persists on later overview pages.
  - Page says: "Attend the mandatory information program. 45 days after the day the case was started."
  - Fix: Remove that instruction from his active next-step card and show it only if he adds a non-support claim.
- **medium** · missing · step `stage-confirmed` — The results name the procedure but do not explain the legal change-in-circumstances requirement relevant to asking for reduced support after job loss.
  - Page says: "Things have changed since the final order"
  - Fix: Explain the applicable variation requirement with its source and identify the facts and records he should provide without saying whether he meets it.
- **medium** · missing · step `stage-confirmed` — The conditional financial-statement explanation leaves him to determine his own disclosure obligations even though Form 13 is simultaneously listed among his next-step forms.
  - Page says: "You do not need one if your only support claim is for child support in the table amount."
  - Fix: Ask the minimum missing question needed to identify the applicable financial-statement requirement and distinguish that requirement from income disclosure he must still provide.
- **medium** · missing · step `stage-confirmed` — The short next-step forms list omits Form 15B and Form 6B despite the same page saying he needs a blank response for service and an affidavit to prove service.
  - Page says: "Form 15 — Motion to ChangePDFWord"
  - Fix: Include direct links to the required service-package and proof-of-service forms, clearly distinguishing blank forms for the other party from forms he completes.
- **medium** · missing · step `stage-confirmed` — The main deadline card gives an unconditional 30-day period without establishing where the mother lives, while the later explanation acknowledges a 60-day period outside Canada and the United States.
  - Page says: "30 days after the day the other party receives the motion to change and its supporting documents."
  - Fix: State the residence condition beside the deadline and ask where the responding party lives before selecting or calculating the period.
- **medium** · contradiction · step `stage-confirmed` — This statement conflicts with the later filing section that expressly displays the new-case location rules as applicable to a motion to change.
  - Page says: "the rules about where to start a new family case are not shown here"
  - Fix: Say that he is not starting a new application but that Rule 15 uses the new-case location rules to determine where to bring the motion.
- **medium** · not-their-case · step `case-overview` — The help list offers a civil-advice service without explaining that its advice line is not a family-law route for this support motion.
  - Page says: "Pro Bono Ontario — Free legal advice by phone for certain civil matters."
  - Fix: Prioritize family-law help and remove or explicitly qualify services that do not assist with his family matter.
- **medium** · missing · step `case-timeline` — The timeline does not surface the 2022 order or July job loss already supplied, even as undated or partially dated events awaiting confirmation.
  - Page says: "Nothing recorded yet."
  - Fix: Create provisional entries from those known events and ask only for missing date details or confirmation without inventing exact dates.
- **medium** · missing · step `case-documents` — The upload page gives generic examples instead of helping him add the termination letter, EI statements and 2022 order he already identified.
  - Page says: "Receipts, photos, messages, invoices, contracts: anything that shows what happened."
  - Fix: Show his recorded evidence list as an upload checklist and explain the purpose of each document in preparing the motion.
- **medium** · repetition · step `case-forms` — The forms page asks him to save a procedural answer already confirmed and retained on the results and overview pages.
  - Page says: "From your case: The step shown for your case is asking to change a final order. Not saved yet."
  - Fix: Reuse the confirmed motion-to-change answer automatically and provide a change option.
- **medium** · contradiction · step `case-forms` — This disclaims matching for his stage immediately after asking him a motion-specific matching question and alongside forms labelled 'For your step'.
  - Page says: "We can match forms to your answers here only when you are starting a case or responding to one."
  - Fix: State precisely which motion-to-change forms are identified, which companion-form requirements remain unresolved and what the site cannot determine.
- **medium** · broken · step `case-forms` — The catalogue marks Forms 1.4 and 1.4A as available while reporting that no file is connected and suggesting a Word version only if available.
  - Page says: "No file connected"
  - Fix: Provide a working official download or catalogue link and accurately label any unavailable format.
- **medium** · missing · step `case-case-file` — The printable case file omits the supplied children's ages and living arrangements and the list of evidence he has, making the record less complete than his intake.
  - Page says: "Your case on one page."
  - Fix: Include concise sections for the recorded children and evidence details while keeping listed evidence distinct from uploaded documents.
- **low** · jargon · step `after-analysis` — This internal-sounding label does not explain what the temporary-motion information means for him.
  - Page says: "Verified workflow guidance only"
  - Fix: Use a plain heading explaining that temporary relief is a separate, optional issue while a motion to change is pending.
