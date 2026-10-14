# Page walkthrough — critic report

Generated 2026-10-14T01:42:19.122Z by `scripts/walkthrough/critique.ts` from `tests/browser/walkthrough.spec.ts`. Every persona is fabricated. Full page text is in PAGES.md; screenshots are alongside.

| Persona | Got through | High | Medium | Low |
|---|---|---|---|---|
| probe-lien-interlock-civil | no — [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m fail | 4 | 5 | 0 |
| probe-lien-interlock-guided | yes | 25 | 8 | 0 |

## probe-lien-interlock-civil

*The same homeowner and lien, entering through the civil (Superior Court) form.*

The pages collect the homeowner's account and offer a clearly labelled, optional spelling review without grading the dispute. They do not deliver usable next steps: the journey stalls on a vague intake requirement, and the tailored question repeats known timing while explaining an irrelevant historical rule. The priority is to fix continuation, reuse supplied facts, and provide sourced homeowner-specific lien triage with conditional deadline calculations and removal options. Once the next-step page is accessible, it should separately present the homeowner's repair-and-completion claim as an option with the appropriate court and form, not as a recommendation.

- **high** · missing · step `intake-filled` — The tailored section recognizes the Construction Act but gives no urgent explanation of the registered lien, its Superior Court enforcement, preservation and perfection time limits, or the owner's options to remove it from title.
  - Page says: "A few questions the law raises for your situation"
  - Fix: Provide a sourced homeowner-specific lien overview, calculate dates where the established triggering facts permit, explain any missing triggering facts, and identify payment or security into court and discharge or expiry procedures without judging lien validity.
- **high** · contradiction · step `failed-here` — This requirement conflicts with the earlier assurances 'That's everything we need for now' and 'skip any you do not know' without explaining what additional information became mandatory.
  - Page says: "A complete Civil intake is required."
  - Fix: Make skip behavior and completion requirements consistent, and explain any genuinely essential unanswered question before offering continuation.
- **high** · broken · step `failed-here` — The attempted continuation leaves the user on intake with a generic error that does not identify which fields prevent progress.
  - Page says: "A complete Civil intake is required."
  - Fix: Preserve all answers, identify and link to each missing required field, and allow progress where unknown information is not essential.
- **high** · missing · step `failed-here` — When continuation fails, the homeowner receives neither a usable fallback nor a help referral for the potentially time-sensitive lien.
  - Page says: "Continue to your next steps"
  - Fix: Explain the limitation and provide accessible lien information plus an appropriate Ontario legal-help referral while the intake problem is resolved.
- **medium** · repetition · step `guided-chat-done` — The story already gives the $300,000 contract price and $60,000 lien, but the conversation asks for an amount again without distinguishing those amounts from the homeowner's repair claim.
  - Page says: "How much money is involved, if any?"
  - Fix: Carry forward the contract price and lien amount, and ask only for the repair-and-completion amount if it is needed and not yet known.
- **medium** · not-their-case · step `intake-form` — The full intake presents discrimination, government-conduct and other unrelated fields despite already having a contractor-and-lien story.
  - Page says: "Human Rights ground, if any"
  - Fix: Show fields relevant to the construction dispute and reveal unrelated issue sections only if the user identifies those issues.
- **medium** · jargon · step `intake-form` — The homeowner must choose among unexplained procedural roles even though no court proceeding is known to have started.
  - Page says: "Plaintiff Defendant Applicant Respondent Moving party Responding party"
  - Fix: Identify them as the homeowner for now and explain any procedural role when they choose a court step.
- **medium** · repetition · step `intake-filled` — The supplied timeline already says the contractor was hired in June 2026, but the follow-up asks for the contract timing without acknowledging that answer.
  - Page says: "When did you enter into the contract for the interlock work?"
  - Fix: Use June 2026 for the applicable-law screening and ask for a more precise contract date only if necessary, explaining why.
- **medium** · not-their-case · step `intake-filled` — The page foregrounds an older-law transition that does not fit the supplied June 2026 hiring timeline.
  - Page says: "its version as of June 29, 2018 continues to apply if the contract was entered into before July 1, 2018"
  - Fix: Use the supplied timeline to select the applicable Construction Act provisions and explain the current lien procedures instead.

## probe-lien-interlock-guided

*A homeowner whose interlock contractor did bad, unfinished work, charged for extras, and registered a lien on the house after being told not to come back.*

These pages preserve the homeowner's story and avoid grading the merits, but they guide him into the wrong court and an unsupported defence stage. The most important correction is to treat the registered construction lien separately from both any served court action and the homeowner's compensation claim. The site should establish the missing amounts and deadline-trigger facts, explain lien-removal options and provide the appropriate Superior Court forms and procedures. Those corrections must persist across results, saved-case tabs, printing and reloads, with a clear construction-lien help referral where the site cannot provide full guidance.

- **high** · not-their-case · step `after-analysis` — The page treats discovering a registered lien as being served with a court claim, although service has not been established.
  - Page says: "From what you told us: I was served and need to respond."
  - Fix: Distinguish lien registration from commencement and service of a court action, and record service as unconfirmed.
- **high** · not-their-case · step `after-analysis` — The offered draft is a Small Claims defence rather than a form appropriate to this Superior Court construction-lien matter.
  - Page says: "Create Defence (Form 9A) draft"
  - Fix: Stop offering Form 9A and identify the appropriate Superior Court document only after establishing what proceeding, if any, has been commenced and served.
- **high** · not-their-case · step `stage-confirmed` — Neither service nor a still-running defence period is supported by the homeowner's information.
  - Page says: "Where you are: Served with a claim, time to defend still running"
  - Fix: Show that a lien is registered and court service is unconfirmed, without asserting that a defence deadline has begun or remains open.
- **high** · not-their-case · step `stage-confirmed` — The snapshot assigns a construction lien and an over-limit dispute to Small Claims Court.
  - Page says: "Court Small Claims Court"
  - Fix: Identify Superior Court of Justice as the court for lien enforcement and explain that the $60,000 dispute exceeds the $50,000 Small Claims limit.
- **high** · contradiction · step `stage-confirmed` — The saved role contradicts the intake's confirmed 'Bringing the claim (plaintiff)' without explaining the separate lien and homeowner-claim roles.
  - Page says: "Your role Defendant / responding party"
  - Fix: Keep separate roles for the contractor's lien proceeding and the homeowner's own money claim rather than silently replacing the confirmed role.
- **high** · missing · step `stage-confirmed` — The visible page raises lien deadlines but supplies no usable preservation or perfection periods, trigger explanation or calculated dates.
  - Page says: "what deadlines govern responding and preserving or perfecting the lien?"
  - Fix: Explain the contractor's preservation and perfection requirements under the Construction Act, obtain the necessary trigger dates and calculate deadlines where supported without deciding validity.
- **high** · missing · step `stage-confirmed` — A statutory extract does not give the homeowner practical options for removing the lien from title, including posting money or security and seeking an appropriate discharge order.
  - Page says: "order that the registration of the claim for lien be vacated"
  - Fix: Explain the available lien-removal routes in plain language, with the Superior Court procedure, applicable forms, sources and conditions for each.
- **high** · missing · step `stage-confirmed` — The page substitutes a Small Claims defendant's claim for an explanation of the homeowner's separate claim for fixing and finishing the work.
  - Page says: "You can also file a Defendant's Claim [Form 10A]"
  - Fix: Present the homeowner's money claim as a separate Superior Court option, naming the Statement of Claim, Form 14A, and explaining how an existing lien action could affect the pleading choice.
- **high** · not-their-case · step `back-to-intake` — The conversation continues down the Small Claims defence route after the homeowner says they have only a land-registry letter and are unsure whether any claim exists.
  - Page says: "Have you filed a Defence (Form 9A) with the court yet?"
  - Fix: Acknowledge that a registry letter is not proof of court service and switch to checking the registered lien and any Superior Court action.
- **high** · not-their-case · step `back-to-intake` — The site asks the homeowner to analyse a pleading they have just said they have not seen.
  - Page says: "which facts in the Plaintiff's Claim do you agree with"
  - Fix: Skip pleading-specific questions until a court claim has been identified and obtained.
- **high** · missing · step `back-to-intake` — Intake declares completion without establishing the disputed amount, repair claim amount or work-stoppage date needed to route and explain this matter.
  - Page says: "That's everything needed for now."
  - Fix: Ask for the missing amounts and deadline-trigger facts before declaring intake complete.
- **high** · missing · step `back-to-intake` — The generic jurisdiction explanation is not applied to this homeowner's over-limit dispute and request to remove a construction lien.
  - Page says: "A claim worth more than that goes to the Superior Court of Justice"
  - Fix: Explain directly that this matter cannot continue on the current Small Claims path and separate the lien proceeding from the homeowner's compensation claim.
- **high** · not-their-case · step `forward-to-results` — Returning from intake preserves the unsupported served-claim stage despite the homeowner's explicit uncertainty about receiving any court claim.
  - Page says: "Where you are: Served with a claim, time to defend still running"
  - Fix: Reconcile the results with the saved answer and remove the Small Claims defence instruction.
- **high** · not-their-case · step `case-overview` — The saved case prominently commits the homeowner's lien matter to the wrong court and repeats the inappropriate Form 9A next step.
  - Page says: "ONTARIO SMALL CLAIMS COURT"
  - Fix: Save and display a Superior Court lien matter with a separate homeowner money-claim option and a next step based on confirmed documents.
- **high** · not-their-case · step `case-timeline` — The timeline repeats a court-service stage that the homeowner's account does not establish.
  - Page says: "Served with a claim, time to defend still running"
  - Fix: Show lien registration as the known event and keep commencement and service of a court action explicitly unconfirmed.
- **high** · missing · step `case-timeline` — The timeline omits the already supplied September 9, 2026 lien-registration date while proposing ordinary story sentences as possible court steps.
  - Page says: "Nothing dated yet."
  - Fix: Offer the known lien-registration event and date for confirmation before unrelated narrative statements.
- **high** · not-their-case · step `case-documents` — The documents page retains the incorrect court identity and tells the homeowner to narrow legal research to the court their incorrectly saved case is in.
  - Page says: "ONTARIO SMALL CLAIMS COURT"
  - Fix: Correct the case court before using it to guide document organisation or CanLII searches.
- **high** · not-their-case · step `case-forms` — The forms page presents a Small Claims defence, fee and service procedure as the homeowner's next step.
  - Page says: "Form 9A — DefencePDFWord"
  - Fix: Replace the Small Claims next-step package with the applicable Superior Court lien or money-claim procedure after confirming the proceeding and requested relief.
- **high** · missing · step `case-forms` — The page gives no warning that Small Claims forms cannot address the registered lien and that the dispute exceeds the court's limit.
  - Page says: "Nothing about these forms is flagged for you to check yet."
  - Fix: Flag the court and remedy mismatch prominently and stop treating Small Claims forms as suitable for this case.
- **high** · not-their-case · step `case-drafts` — The drafts page offers the wrong court's defence despite the absence of an identified served claim.
  - Page says: "Defence (Form 9A)"
  - Fix: Suppress Form 9A and offer only drafts appropriate to the confirmed Superior Court proceeding and homeowner's chosen relief.
- **high** · contradiction · step `case-case-file` — The printable file says the homeowner is starting a case while its exact step says they have been sued and the header says they are responding.
  - Page says: "Starting a new case"
  - Fix: Use consistent, separately labelled stages for the registered lien, any contractor action and the homeowner's own claim.
- **high** · missing · step `case-case-file` — The printable file provides no lien-deadline explanation or known lien-registration event, instead directing the homeowner back to an inappropriate defence calculator.
  - Page says: "Deadlines worked out from your dates None yet."
  - Fix: Include the known lien date, explain which trigger facts are still needed and display supported preservation and perfection calculations.
- **high** · not-their-case · step `reload-reopens-case` — Reloading preserves the wrong court and unsupported service stage rather than correcting them from the saved intake.
  - Page says: "Where you are: Served with a claim, time to defend still running"
  - Fix: Persist the accurate lien status and separate claim options consistently across reloads.
- **high** · missing · step `reload-reopens-case` — The site gives an all-clear despite unresolved court eligibility, unknown court service and missing lien-deadline facts.
  - Page says: "Nothing in your records needs sorting out right now."
  - Fix: List those unresolved procedural facts as items to verify without assessing the merits.
- **high** · missing · step `reload-reopens-case` — Generic referral links do not disclose that the current Small Claims workflow cannot properly handle this lien and over-limit dispute.
  - Page says: "Want a person to check this step with you?"
  - Fix: State that limitation prominently and direct the homeowner to an Ontario lawyer experienced in construction liens and Superior Court litigation.
- **medium** · missing · step `claim-type-suggestion` — A broad timing question does not distinguish the dates needed for construction-lien deadlines from the dates relevant to the homeowner's money claim.
  - Page says: "Roughly when did the situation that led to this claim happen?"
  - Fix: Ask one targeted date question at a time, explaining why the last-work, termination and lien-registration dates matter.
- **medium** · repetition · step `claim-type-suggestion` — Two separate confirmation blocks repeat the same heading and instructions before the current question.
  - Page says: "Confirmed from my story:"
  - Fix: Combine confirmed information into one compact summary and show only the outstanding question prominently.
- **medium** · jargon · step `stage-confirmed` — The lien information consists of technical statutory language without explaining the documents or what the homeowner should obtain.
  - Page says: "a certificate of search under the Land Titles Act"
  - Fix: Explain in plain words how to obtain and use the parcel register, registered lien and any certificate of action, alongside the statutory source.
- **medium** · repetition · step `stage-confirmed` — The same defence instruction and period recur in the next-step card, possible next events and full answer.
  - Page says: "Serve a defence on every other party and file it with the clerk, with proof of service."
  - Fix: State the actionable instruction once and reserve expandable detail for genuinely additional explanations and sources.
- **medium** · repetition · step `back-to-intake` — The evidence list duplicates the contract and payment categories under different headings.
  - Page says: "The agreement — for example: Contract, Texts or emails accepting the quote."
  - Fix: Merge overlapping categories into one checklist tailored to defective work, disputed extras and the registered lien.
- **medium** · repetition · step `forward-to-results` — The results ask again about service after intake recorded that the homeowner does not know of any served claim and only received a registry letter.
  - Page says: "How were the papers served?"
  - Fix: Carry forward the unconfirmed-service answer and offer a targeted way to verify it rather than repeating the generic service intake.
- **medium** · repetition · step `case-timeline` — The hiring-event card asks for timing already supplied as June 2026.
  - Page says: "When, in your words"
  - Fix: Prefill the known approximate date and ask only for confirmation or any genuinely missing precision.
- **medium** · contradiction · step `case-forms` — The eligibility questionnaire asks about starting a claim while the same page identifies the homeowner as responding and recommends a defence.
  - Page says: "What ordinary claim are you starting?"
  - Fix: Separate questions for the homeowner's own claim from questions about responding to any contractor action.
