# Page walkthrough — critic report

Generated 2026-10-09T14:48:18.249Z by `scripts/walkthrough/critique.ts` from `tests/browser/walkthrough.spec.ts`. Every persona is fabricated. Full page text is in PAGES.md; screenshots are alongside.

| Persona | Got through | High | Medium | Low |
|---|---|---|---|---|
| held-back-civil-served-counterclaim | yes | 12 | 14 | 1 |
| held-back-civil-summary-judgment | yes | 12 | 17 | 1 |
| held-back-civil-wrongful-dismissal | yes | 3 | 18 | 0 |
| held-back-family-served-motion-to-change | yes | 6 | 12 | 1 |
| held-back-family-support-not-paid | yes | 4 | 16 | 2 |
| held-back-sc-defendant-trial | yes | 16 | 17 | 0 |
| held-back-sc-guided-dog-bite | yes | 4 | 18 | 2 |
| held-back-sc-guided-out-of-province | yes | 10 | 11 | 2 |
| held-back-sc-served-defendants-claim | yes | 8 | 10 | 1 |
| held-back-sc-used-car | yes | 15 | 18 | 0 |

## held-back-civil-served-counterclaim

*Plaintiff served with a statement of defence and counterclaim.*

The journey correctly recognizes that this plaintiff must answer a counterclaim using Form 27C, avoids a new claim draft and does not grade either claim. Its most serious failure is leaving the known service date unstructured and the October 15, 2026 deadline uncalculated throughout the saved case. The filing and service instructions also stop short of a usable plan for an imminent deadline and a represented opponent. Correcting the conflicting conference-stage label and separating later procedural tasks from the immediate response would make the guidance substantially clearer.

- **high** · missing · step `intake-filled` — The explanation gives only a period although the story already supplies the September 25, 2026 service date.
  - Page says: "within twenty days after service"
  - Fix: Explain that the ordinary deadline is October 15, 2026, citing the response and time-counting rules, while asking whether a defence has already been delivered.
- **high** · missing · step `stage-confirmed` — The next-step card does not calculate the October 15, 2026 deadline from the service date already provided.
  - Page says: "Give the date below and we will count the last day for you."
  - Fix: Populate the service date from the story and show the calculated deadline with the counting rule and an option to correct the date.
- **high** · missing · step `stage-confirmed` — The page prohibits online filing near the deadline but gives no alternative filing route, despite the October 15 deadline being only three business days after October 9 when Thanksgiving is excluded.
  - Page says: "If a deadline is 3 business days away or fewer, you cannot file online for it."
  - Fix: Apply the restriction to the calculated deadline and provide the appropriate court-counter filing instructions for the existing action.
- **high** · missing · step `stage-confirmed` — The service section identifies the recipient but does not explain an actual permitted method for serving the lawyer who represents the former partner.
  - Page says: "Other documents go to the other side's lawyer if they have one"
  - Fix: Explain the applicable Rule 16.05 service methods, their effective-service timing and how to complete Form 16B.
- **high** · missing · step `forward-to-results` — The returned results page still shows no October 15, 2026 response deadline.
  - Page says: "20 days after the day the statement of defence and counterclaim was served on you."
  - Fix: Show the calculated deadline consistently whenever the next-step card is displayed.
- **high** · contradiction · step `case-overview` — The recorded-stage summary conflicts with the same page's correct identification of an unanswered counterclaim.
  - Page says: "What your records say: Conference / settlement step"
  - Fix: Record the current step as responding to the counterclaim and do not infer a conference stage merely from receipt of a defence.
- **high** · missing · step `case-overview` — The saved case overview still does not use the known service date to display the response deadline.
  - Page says: "Give the date below and we will count the last day for you."
  - Fix: Save the service event and show October 15, 2026 as the ordinary Form 27C delivery deadline.
- **high** · contradiction · step `case-timeline` — The timeline labels the case as a conference or settlement step while the recorded story and next-step card establish a counterclaim response.
  - Page says: "Conference / settlement step"
  - Fix: Use the counterclaim-response stage and distinguish receipt of the opponent's defence from completion of the user's response.
- **high** · missing · step `case-forms` — The forms page again gives no practical method for serving the former partner's lawyer.
  - Page says: "Other documents go to the other side's lawyer if they have one"
  - Fix: Provide a sourced lawyer-service method and effective-service timing alongside Form 27C and Form 16B.
- **high** · missing · step `case-forms` — The filing section again supplies no usable alternative for this imminent deadline.
  - Page says: "If a deadline is 3 business days away or fewer, you cannot file online for it."
  - Fix: Show the calculated deadline and the appropriate non-online filing route for the existing court file.
- **high** · missing · step `case-case-file` — The printable case file omits the response deadline and directs the user to supply a date already reproduced in its own story section.
  - Page says: "None yet. Give the dates asked for under “Your next step”"
  - Fix: Include the September 25 service event and October 15, 2026 deadline in the printable file with their sources.
- **high** · missing · step `reload-reopens-case` — Even after reopening the saved case, the next-step card supplies only the response period rather than the known-date deadline.
  - Page says: "Give the date below and we will count the last day for you."
  - Fix: Display October 15, 2026 consistently and update its urgency or overdue status as the current date changes.
- **medium** · not-their-case · step `intake-form` — The intake displays numerous unrelated discrimination, government and institutional-failure fields instead of focusing on this plaintiff's response to a salary counterclaim.
  - Page says: "Human Rights ground, if any"
  - Fix: Use the story to show counterclaim-response questions first and hide unrelated issue fields unless the user selects those issues.
- **medium** · missing · step `after-analysis` — This results page does not answer the user's immediate counterclaim question or identify Form 27C and its deadline.
  - Page says: "Open your case page"
  - Fix: Show the counterclaim-response next step and calculated deadline immediately, even if the user has not confirmed the broader stage.
- **medium** · repetition · step `stage-confirmed` — The calculator asks again for the September 25, 2026 service date already given in the story.
  - Page says: "If you were served with a defendant's claim, what date was it served?"
  - Fix: Carry the existing date into the calculator and ask only for correction or genuinely missing information.
- **medium** · jargon · step `stage-confirmed` — The calculator uses a different document label from the Superior Court statement of defence and counterclaim this person received.
  - Page says: "a defendant's claim"
  - Fix: Label the field as the service date of the statement of defence and counterclaim.
- **medium** · not-their-case · step `stage-confirmed` — The immediate next-step card mixes the urgent counterclaim response with numerous later discovery, mediation and trial-stage tasks.
  - Page says: "Set the action down for trial, or the registrar will dismiss it for delay."
  - Fix: Keep Form 27C and its delivery deadline in the immediate card and place applicable later tasks in a separate future-steps section.
- **medium** · missing · step `stage-confirmed` — The page repeatedly makes instructions conditional on simplified procedure without explaining how this user can identify whether their $110,000 action uses it.
  - Page says: "If your action is under the simplified procedure"
  - Fix: Explain the relevant Rule 76 criteria and show how to check the existing claim's heading before assigning simplified-procedure tasks.
- **medium** · repetition · step `stage-confirmed` — The same lengthy response-and-reply explanation appears both before the form information and again under the full answer.
  - Page says: "Deliver means serve and file with proof of service."
  - Fix: Keep a short actionable summary above the form and put the detailed explanation in one clearly labelled expandable section.
- **medium** · repetition · step `forward-to-results` — Returning to results still asks for the service date already supplied rather than carrying it through the journey.
  - Page says: "If you were served with a defendant's claim, what date was it served?"
  - Fix: Persist the extracted September 25, 2026 service date across navigation and use it automatically.
- **medium** · not-their-case · step `case-overview` — The saved overview reintroduces Toronto filing instructions although the intake recorded Kingston and the earlier results filtered them out.
  - Page says: "In the Toronto region, file online through the Ontario Courts Public Portal."
  - Fix: Preserve location-based filtering and identify the filing route for the court handling the existing action.
- **medium** · missing · step `case-timeline` — The timeline omits the explicitly dated September 25, 2026 service event.
  - Page says: "Nothing dated yet."
  - Fix: Add the service event with its source identified as the user's story and allow the user to correct or confirm it without re-entering it.
- **medium** · repetition · step `case-forms` — The page asks the user to select the pleading after already identifying their next form as Defence to Counterclaim.
  - Page says: "Which Civil Rules pleading are you preparing?"
  - Fix: Preselect Form 27C from the recorded next step and offer a change option rather than asking the user to identify it again.
- **medium** · contradiction · step `case-forms` — The page offers matching questions but suggests matching is unavailable even though this plaintiff is responding to a counterclaim.
  - Page says: "We can match forms to your answers here only when you are starting a case or responding to one."
  - Fix: Treat responding to a counterclaim as a supported response stage and state clearly what the matching tool can do here.
- **medium** · not-their-case · step `case-forms` — The default catalogue displays unrelated attendance, vexatious-litigant and other forms instead of a focused set for the counterclaim response.
  - Page says: "Showing 240 of 240 forms."
  - Fix: Default to the forms needed for this response and keep the complete catalogue behind an optional browse control.
- **medium** · repetition · step `reload-reopens-case` — Reloading the saved case still asks for the known service date.
  - Page says: "If you were served with a defendant's claim, what date was it served?"
  - Fix: Persist the service date as structured case data and restore it on reload.
- **low** · typo-kept · step `spelling-suggestions` — The suggested correction retains the run-on construction and fails to capitalize the court name.
  - Page says: "I sued my former business partner in superior court for 110000 he took from our company account."
  - Fix: Suggest a grammatically complete sentence that preserves the allegation and amount while correctly naming the Superior Court.

## held-back-civil-summary-judgment

*Defendant served with a motion for summary judgment.*

The journey identifies the correct court and motion-response issue, calculates the main responding deadlines correctly, and avoids predicting the outcome. However, it repeatedly mixes the supplier's obligations into the defendant's tasks and points to starting-motion or already-filed defence forms. The most serious omission is the corporation's representation restriction, while conflicting stage records persist into the saved case and reload. A respondent-only checklist, appropriate forms and preparation guidance, complete filing and service instructions, and consistent saved events would make this substantially more usable.

- **high** · missing · step `after-analysis` — The initial results page gives only a generic motion rule rather than answering the user's urgent question about responding documents and dates.
  - Page says: "Civil Rule 37 governs motion jurisdiction and procedure."
  - Fix: Immediately show the defendant's responding factum, evidence and responding motion record requirements, with deadlines calculated from December 3, 2026.
- **high** · not-their-case · step `after-analysis` — The offered draft is for a defence that the company has already filed, not its response to the summary judgment motion.
  - Page says: "Create Statement of Defence (Form 18A) draft"
  - Fix: Offer preparation of the responding affidavit, factum and motion record instead of another defence.
- **high** · not-their-case · step `stage-confirmed` — The defendant's next-step card leads with the supplier's moving-party tasks, and this irrelevant branch persists through the counted results, overview and reload.
  - Page says: "If you are bringing the motion for summary judgment"
  - Fix: Filter the next-step card to the known responding party and keep moving-party information out of its primary instructions.
- **high** · contradiction · step `stage-confirmed` — The card says 'after' while the detailed answer says 'before', making the uncounted deadline instructions contradictory.
  - Page says: "4 days after the date the motion will be heard, counting backwards"
  - Fix: Say 'at least four days before the hearing, excluding weekends and holidays under the applicable rule' and show the calculated date immediately.
- **high** · missing · step `stage-confirmed` — The results do not warn that a corporation must be represented by a lawyer unless the court grants leave under rule 15.01(2), despite knowing that the company is the defendant.
  - Page says: "If you are responding, serve your affidavits and other evidence"
  - Fix: Prominently explain rule 15.01(2), distinguish giving witness evidence from representing the company, and direct the user to an Ontario civil-litigation lawyer for timely help.
- **high** · not-their-case · step `stage-confirmed` — The forms panel foregrounds the form for bringing a motion rather than the responding affidavit and service forms, and the same mismatch appears on later results, overview and Forms pages.
  - Page says: "Form 37A — Notice of Motion"
  - Fix: Feature Form 4D and Form 16B, explain that the responding factum and motion record are documents rather than a new notice of motion, and show Form 37B only with its applicable condition.
- **high** · missing · step `stage-confirmed` — Mail is offered as a service method without explaining deemed service timing, which the defendant needs to meet the November 27 service deadline.
  - Page says: "by mailing a copy of the document"
  - Fix: Explain the applicable deemed-service rule for mail and permitted service methods for the supplier's lawyer, making clear when service must take effect.
- **high** · contradiction · step `case-overview` — The overview classifies the case as a conference or settlement step while also recording the confirmed motion stage and scheduled summary judgment hearing, and the contradiction survives reload.
  - Page says: "What your records say: Conference / settlement step"
  - Fix: Reconcile the recorded defence and served motion into one consistent motion-response stage across the overview, timeline and saved case.
- **high** · contradiction · step `case-timeline` — The timeline repeats the incorrect conference classification instead of the confirmed motion-response stage.
  - Page says: "Conference / settlement step"
  - Fix: Display the summary judgment response stage and record the December 3, 2026 hearing as the event anchoring its deadlines.
- **high** · not-their-case · step `case-timeline` — The first deadline entry is the moving party's deadline, presented in the defendant's personal timeline as though it were one of their tasks.
  - Page says: "2026-11-24"
  - Fix: Keep only the defendant's deadlines in their task timeline and label any necessary opponent deadline separately.
- **high** · not-their-case · step `case-forms` — The form matcher offers a Notice of Motion or an exception to notice rather than the documents needed to respond to the motion already served.
  - Page says: "Which civil motion document are you preparing?"
  - Fix: Use the known responding role to present affidavit, factum, responding motion record and proof-of-service guidance without a moving-party questionnaire.
- **high** · not-their-case · step `case-case-file` — The printable defendant case file includes the supplier's moving-party deadline among the user's deadlines.
  - Page says: "2026-11-24: If you are bringing the motion for summary judgment"
  - Fix: Print only responding-party obligations in the user's deadline list and explicitly distinguish any opponent obligations.
- **medium** · not-their-case · step `intake-form` — The intake mixes this invoice dispute with extensive human-rights, government, privacy and other unrelated questions, which remain visible after the motion-response situation is known.
  - Page says: "Human Rights ground, if any"
  - Fix: Once the story identifies an existing summary judgment motion, show only relevant motion-response questions and leave other issue fields optional and collapsed.
- **medium** · repetition · step `after-analysis` — The page asks the user to confirm a stage already explicitly established by their account of a served summary judgment motion and scheduled hearing.
  - Page says: "Where is your case right now?"
  - Fix: Record the motion-response stage from the story and offer an optional correction without requiring another answer.
- **medium** · jargon · step `stage-confirmed` — The central required document is named without explaining that a factum is the written argument or how it differs from affidavit evidence.
  - Page says: "serve your factum"
  - Fix: Define the factum in plain language and provide a respondent-specific outline alongside the affidavit and motion-record instructions.
- **medium** · jargon · step `stage-confirmed` — The page uses an unexplained legal expression in its warning about witnesses with personal knowledge.
  - Page says: "draw an adverse inference"
  - Fix: Explain neutrally that the court may draw an unfavourable conclusion from the absence of evidence from a knowledgeable witness, without predicting what it will do here.
- **medium** · missing · step `stage-confirmed` — The generic instructions do not explain how the already identified defective-parts photos and complaint emails can be organized as evidence for this motion.
  - Page says: "You must set out specific facts, in affidavits or other evidence"
  - Fix: Explain how a witness with relevant knowledge can describe the disputed deliveries and identify the photos and emails as affidavit exhibits, with instructions for swearing or affirming the affidavit.
- **medium** · missing · step `stage-confirmed` — The fee section states the supplier's fee but never tells this defendant whether filing the responding materials attracts a fee.
  - Page says: "Filing a motion (paid by the person bringing it): $339"
  - Fix: State the applicable fee or absence of a fee for the responding filings, with an official source, rather than using the moving party's fee as the answer.
- **medium** · missing · step `stage-confirmed` — The filing instructions do not identify which portal accepts the responding motion materials or explain what to do when the stated online deadline restriction applies.
  - Page says: "Civil Claims Online or Civil Submissions Online portal"
  - Fix: Identify the appropriate submission route for these documents and give the court-office filing alternative for deadlines three business days away or fewer.
- **medium** · repetition · step `stage-confirmed` — The same lengthy procedural paragraph is displayed in the next-step card and again under 'What to do next', with further overlapping instructions under 'Your deadline'.
  - Page says: "If you are responding, you cannot rest only on what your pleading says or denies."
  - Fix: Use a short respondent checklist at the top and put explanations and sources in a single detailed section.
- **medium** · missing · step `stage-confirmed` — The displayed source list cites the summary judgment test but does not attach the relevant rule 20.02, 20.03 and 37.10 citations to the card's evidence and filing requirements.
  - Page says: "all sources are in the full answer below"
  - Fix: Place the applicable rule citation or official link beside each evidence, factum, motion-record and deadline requirement.
- **medium** · missing · step `deadline-counted` — The conditional responding-party confirmation deadline remains a relative period even after the hearing date has been counted.
  - Page says: "by 10 a.m. four days before the hearing"
  - Fix: Show the applicable conditional Form 37B deadline as November 27, 2026 at 10 a.m., with its rule and trigger.
- **medium** · not-their-case · step `case-overview` — The saved overview adds Toronto filing guidance even though the journey has recorded Barrie, and this irrelevant regional branch also appears on Forms and reload.
  - Page says: "In the Toronto region, file online through the Ontario Courts Public Portal."
  - Fix: Preserve the recorded location and show the applicable filing route, allowing the user to correct the court location if necessary.
- **medium** · missing · step `case-timeline` — The event list does not record the defence already filed or the known December 3 hearing, despite displaying deadlines derived from that hearing.
  - Page says: "Nothing recorded yet."
  - Fix: Save the supplied procedural events with their provenance and request only genuinely missing event dates.
- **medium** · contradiction · step `case-forms` — The page promises matching for its motion question but then says matching is available only when starting a case or responding to one.
  - Page says: "Answer these and we will show the official forms that match your answers."
  - Fix: State the motion-matching limitation before any questionnaire and provide a reliable respondent-specific document list instead.
- **medium** · not-their-case · step `case-forms` — The default forms list overwhelms the motion respondent with unrelated documents instead of prioritizing the required responding forms.
  - Page says: "Showing 240 of 240 forms."
  - Fix: Default to forms relevant to this response and make the complete official catalogue an optional browsing view.
- **medium** · not-their-case · step `case-drafts` — The drafts page again promotes a defence already filed while omitting dedicated responding factum and motion-record preparation.
  - Page says: "Statement of Defence (Form 18A)"
  - Fix: Prioritize the responding affidavit, factum and motion-record index, and place any existing-defence work in a secondary option.
- **medium** · missing · step `case-drafts` — The chronology draft has no events even though the story supplies a dated hearing and identifies the filed defence and served motion.
  - Page says: "0 items from your timeline and dated documents"
  - Fix: Populate known events from the story, retaining unknown dates as unknown rather than discarding the events.
- **medium** · missing · step `case-case-file` — The portable case file says nothing is recorded despite the supplied defence, served motion and dated hearing, leaving those events buried in the story.
  - Page says: "Steps you recorded"
  - Fix: Include a structured procedural history and the December 3, 2026 hearing date alongside the responding deadlines.
- **low** · jargon · step `after-analysis` — This internal-sounding status label does not explain what the defendant needs to do.
  - Page says: "Verified workflow guidance only"
  - Fix: Replace the label with a plain heading identifying the rules for responding to the summary judgment motion.

## held-back-civil-wrongful-dismissal

*Fired without cause after 14 years; the package offered is small. Over the Small Claims limit.*

The journey correctly keeps this person in Superior Court, names the starting forms, shows the $243 fee and saves the June 30, 2028 limitation calculation across navigation and reload. It also avoids grading the claim or predicting an award. However, it wrongly labels the claim as already prepared, omits personal-service instructions and surrounds the next step with unrelated legal branches. The highest-priority improvements are a concise employment-specific preparation checklist, complete Mississauga filing and employer-service guidance, and consistent reuse of saved facts throughout the forms, timeline and case summary.

- **high** · contradiction · step `stage-confirmed` — The site asserts that a claim is prepared without evidence of a prepared claim, repeats this on later results and overview pages, and ultimately shows 'No drafts yet.'
  - Page says: "Where you are: Statement of claim prepared, not yet issued"
  - Fix: Describe the stage as preparing to start an action and direct the user to prepare Form 14A before having it issued.
- **high** · missing · step `stage-confirmed` — The visible guidance gives a service period but never explains personal service, who can receive service for the employer, or how to record proof of service, including on later results and overview pages.
  - Page says: "You must serve a statement of claim within six months after it is issued."
  - Fix: Add sourced instructions for personal service on the employer after issuance, including the appropriate recipient and Affidavit of Service, Form 16B.
- **high** · missing · step `case-forms` — The Forms page promises service instructions but contains no visible explanation of how to serve the issued claim.
  - Page says: "the form, the fee, where to file it and how to serve it"
  - Fix: Add a service section explaining personal service on the employer, the six-month period and proof of service with the relevant rules and form.
- **medium** · not-their-case · step `intake-form` — The intake displays discrimination, government, institutional and other unrelated fields without tailoring them to this wrongful-dismissal story, and repeats them on subsequent intake views.
  - Page says: "Human Rights ground, if any"
  - Fix: After reading the story, show employment-action questions and keep unrelated issue fields behind an optional change-of-issue control.
- **medium** · missing · step `intake-form` — The page presents a large questionnaire without explaining which questions this employee needs to answer to start the action or why most of them matter.
  - Page says: "Confirm the civil details needed next"
  - Fix: Acknowledge the dismissal story and guide the employee through one relevant question at a time with a short explanation where needed.
- **medium** · not-their-case · step `stage-confirmed` — The opening next-step instructions include a mortgage form and unrelated construction, class-proceeding and property branches, with the same material repeated on later results and overview pages.
  - Page says: "Form 14B for a mortgage action"
  - Fix: Lead with Form 14A and the Rule 76 requirements for this $90,000 employment claim, retaining Form 14C as a clearly explained alternative.
- **medium** · not-their-case · step `stage-confirmed` — The full answer devotes substantial space to defamation and unrelated limitation exceptions that do not concern this dismissal, and repeats them in later views.
  - Page says: "For libel in a newspaper or broadcast"
  - Fix: Explain the two-year limitation applicable to this dismissal and move unrelated limitation regimes out of this person's answer.
- **medium** · jargon · step `stage-confirmed` — The instructions use unexplained terms such as 'leave' and 'on notice' while presenting themselves as plain guidance for a person without a lawyer.
  - Page says: "the court's leave obtained on notice to the defendant"
  - Fix: Explain that leave means court permission and that an application made on notice requires notifying the other party.
- **medium** · repetition · step `stage-confirmed` — The long next-step paragraph appears both in the card and under 'What to do next' on the same page, and this duplication continues in subsequent results and overview views.
  - Page says: "The usual document to start an action is a statement of claim"
  - Fix: Use a short personalized action checklist in the card and reserve additional explanation for the full answer.
- **medium** · missing · step `stage-confirmed` — The filing section names two portals generically without explicitly connecting Mississauga to the outside-Toronto route or identifying the filing location to select.
  - Page says: "Outside Toronto, file online through the Civil Claims Online or Civil Submissions Online portal."
  - Fix: State that Mississauga uses the outside-Toronto route and identify the appropriate Superior Court filing office or location selection and portal steps.
- **medium** · missing · step `stage-confirmed` — The results explain procedure but do not explain what this employee needs to plead and document for wrongful dismissal or how the termination letter, unsigned release and pay records relate to those requirements.
  - Page says: "Your statement of claim must then say the action is brought under Rule 76."
  - Fix: Provide a sourced employment-specific preparation checklist covering the employment agreement, termination, claimed loss and mitigation without assessing entitlement or predicting an award.
- **medium** · repetition · step `deadline-counted` — The page still asks for the event date after extracting June 30, 2026 and saving the calculated deadline, and repeats the request after forward navigation, on the overview and after reload.
  - Page says: "On what day did the thing your claim is about happen?"
  - Fix: Show the saved termination date and calculation with an optional edit control rather than asking for the date again.
- **medium** · missing · step `deadline-counted` — The page does not distinguish a court office's procedural assistance from legal advice about discoverability and the applicable limitation deadline, and repeats this assurance in later views.
  - Page says: "the court office can confirm both"
  - Fix: Explain that court staff can assist with filing procedures but a lawyer should check any uncertainty about the legal limitation date.
- **medium** · not-their-case · step `case-overview` — The case page reintroduces Toronto filing instructions despite the saved Mississauga location, and the same irrelevant instruction appears on Forms and after reload.
  - Page says: "In the Toronto region, file online through the Ontario Courts Public Portal."
  - Fix: Preserve the saved location across case pages and show only the applicable outside-Toronto filing route by default.
- **medium** · missing · step `case-timeline` — The factual timeline remains empty despite a known termination date that the site has already used for its deadline calculation.
  - Page says: "Nothing recorded yet."
  - Fix: Offer the June 30, 2026 termination as a story-derived event to confirm and include it in the factual timeline once confirmed.
- **medium** · jargon · step `case-timeline` — The deadline's source is an unidentified section number rather than a recognizable statute citation, and the printable case file likewise gives only 's. 4'.
  - Page says: "Computed from s. 4"
  - Fix: Name the Limitations Act, 2002, section 4, link to the official provision and briefly explain the two-year rule.
- **medium** · repetition · step `case-forms` — The forms selector asks the user to re-establish the action type and whether it has started even though the site has already identified a new Superior Court civil action.
  - Page says: "Is this a general civil action?"
  - Fix: Populate the selector from the saved story and confirmed stage and ask only genuinely unresolved questions.
- **medium** · contradiction · step `case-forms` — The page says no information is missing immediately after saying that unanswered questions must be saved to identify matching forms.
  - Page says: "No missing form information is currently flagged."
  - Fix: Distinguish an incomplete forms check from a completed check with no missing information.
- **medium** · not-their-case · step `case-forms` — The default list floods this new employment action with unrelated hearing, dismissal, vexatious-litigant, disability and other forms instead of prioritizing the forms needed now.
  - Page says: "Showing 240 of 240 forms."
  - Fix: Default to forms for the saved next step and place the complete court-form catalogue behind an explicit browse option.
- **medium** · missing · step `case-drafts` — The chronology tool offers no items despite the dated dismissal in the saved story, continuing the factual-timeline omission.
  - Page says: "0 items from your timeline and dated documents."
  - Fix: Use confirmed story-derived events as well as dated documents to populate the chronology.
- **medium** · missing · step `case-case-file` — The portable case summary omits the recorded $90,000 claim amount and the list of available termination, release and pay documents.
  - Page says: "Your case on one page."
  - Fix: Include the saved claim amount and distinguish documents the user says they possess from files actually uploaded.

## held-back-family-served-motion-to-change

*Mother served with her ex's motion to change (lower) child support.*

The journey eventually identifies the correct motion-to-change response forms and calculates a correct, persistent November 2 deadline without predicting the support outcome. However, the Form 10 draft offers and inapplicable information-program task create serious procedural risks. The site should preserve the exact case type across every page, show the existing court and applicable fee, and replace repeated generic text with a concise financial-disclosure and evidence checklist. Saved facts should consistently populate the intake, timeline and case pages.

- **high** · not-their-case · step `after-analysis` — The offered draft is an answer to an application rather than a response to the motion to change she received.
  - Page says: "Create Answer (Form 10) draft"
  - Fix: Offer Form 15B with Form 13, or clearly state that Form 15B drafting is unavailable and link to the official forms.
- **high** · contradiction · step `after-analysis` — The results page switches to the application-answer rule after the intake correctly identified Form 15B and rule 15.
  - Page says: "Official source: O. Reg. 114/99, Family Law Rules, r. 10 (1)."
  - Fix: Preserve the motion-to-change classification and show the applicable rule 15 response requirements throughout the journey.
- **high** · not-their-case · step `stage-confirmed` — The next-step card imposes an information-program requirement on this support-only motion to change, although the later explanation limits that requirement to motions not only about support.
  - Page says: "Attend the mandatory information program."
  - Fix: Remove the program task and its 45-day deadline from this support-only case unless an applicable court order requires attendance.
- **high** · missing · step `stage-confirmed` — The page names a portal but never identifies the court and existing court file in which she must file her response.
  - Page says: "Outside Toronto, file online through the Justice Services Online portal."
  - Fix: Identify the court from her served documents, or ask for that missing detail, and explain that she must file in that existing case.
- **high** · not-their-case · step `case-forms` — The form-matching question treats responding to the other side as evidence of an application response even though her case is already identified as a motion to change.
  - Page says: "Are you responding to a Family Application?"
  - Fix: Use the known motion-to-change document type to select Form 15B and Form 13 without reopening the application-answer branch.
- **high** · not-their-case · step `case-drafts` — The saved-case draft menu still offers the wrong response form after the exact step and deadline have been correctly established.
  - Page says: "Answer (Form 10)"
  - Fix: Replace the Form 10 option with Form 15B drafting or an explicit limitation and official Form 15B link.
- **medium** · not-their-case · step `intake-form` — General divorce, property and court-selection information appears before intake even though this user needs to respond in an existing child-support case.
  - Page says: "The Family Law Act's property rules (Part I) and matrimonial home rules (Part II)"
  - Fix: Prioritize identifying the court and file number on her served motion, and put unrelated court-selection information behind an optional link.
- **medium** · contradiction · step `intake-form` — The recorded-facts panel says her municipality is unknown while the same page says her saved location is Sudbury, Ontario.
  - Page says: "Your municipality: Not answered yet"
  - Fix: Use the saved Sudbury location consistently in both the recorded-facts panel and case guidance.
- **medium** · missing · step `intake-filled` — The recorded-facts panel still treats children as unknown despite her story and parenting details identifying two boys.
  - Page says: "The case involves children: Not answered yet"
  - Fix: Populate known facts from her story and details, asking only about genuinely unresolved information.
- **medium** · missing · step `stage-confirmed` — The financial-disclosure instructions refer her to a rule instead of giving a usable list of the documents she must gather with Form 13.
  - Page says: "They include the papers in rule 13 (3.1)"
  - Fix: Provide a sourced, plain-language checklist of the financial attachments required for her response.
- **medium** · not-their-case · step `stage-confirmed` — Arrears-cancellation, property and matrimonial-home branches clutter the immediate instructions for responding to a proposed child-support reduction.
  - Page says: "If you are the one asking to change or cancel arrears"
  - Fix: Show her Form 15B and Form 13 tasks first and reserve unrelated branches for cases where those claims are identified.
- **medium** · repetition · step `deadline-counted` — The page continues asking for the service date after extracting October 2 and saving the calculated deadline.
  - Page says: "If you were served with a motion to change, what date was it served?"
  - Fix: Show the saved service date with an optional edit control instead of asking the same question again.
- **medium** · not-their-case · step `case-overview` — The saved case page reintroduces Toronto filing instructions despite the known Sudbury location and earlier filtering to outside-Toronto instructions.
  - Page says: "In the Toronto region, file online through the Ontario Courts Public Portal."
  - Fix: Carry the saved location into case pages and show only the applicable filing route.
- **medium** · repetition · step `case-overview` — The same lengthy response instructions appear in the next-step card and again in the full answer.
  - Page says: "Do you disagree with the change, or want the court to make an added or different change?"
  - Fix: Keep the card to a personalized task checklist and place the detailed sourced explanation in an optional expandable section.
- **medium** · missing · step `case-overview` — The overview does not explain how to organize her existing order and truck posts or what income disclosure to check when responding to the claimed income reduction.
  - Page says: "Where you are: Served with a motion to change a final order"
  - Fix: Give sourced guidance on reviewing the ex's financial disclosure and organizing the order and posts as evidence without predicting what they prove or whether support will change.
- **medium** · missing · step `case-timeline` — The timeline omits the October 2 service event even though that date has been confirmed and used to calculate the response deadline.
  - Page says: "Nothing recorded yet."
  - Fix: Add the confirmed service event with its source and distinguish it from uploaded-document events.
- **medium** · missing · step `case-forms` — The page promises the fee but displays no fee amount or statement that no fee applies.
  - Page says: "the form, the fee, where to file it and how to serve it"
  - Fix: Show the applicable response filing fee or a sourced no-fee statement after identifying her court.
- **medium** · not-their-case · step `case-overview` — This referral does not explain that the civil advice service is not a family-law advice route for her support response.
  - Page says: "Pro Bono Ontario — Free legal advice by phone for certain civil matters."
  - Fix: Prioritize family-law help and remove or clearly qualify services that do not handle her issue.
- **low** · broken · step `spelling-suggestions` — Missing spaces in “againstordinarily” and “plusthe” make the table explanation harder to read.
  - Page says: "againstordinarily"
  - Fix: Correct the spacing throughout the repeated table explanation.

## held-back-family-support-not-paid

*Support order in place but the payor has stopped paying; enforcement.*

The journey correctly recognizes enforcement, preserves the story and confirmed stage across navigation and reload, and explains that FRO's Director controls enforcement while the order is filed there. It does not grade the case, and its legal material is sourced. However, this recipient must work through substantial new-application and unrelated court material before reaching a dense explanation that still does not tell her how to address FRO inactivity. The priority is a short, personalized FRO action plan with official contact and escalation resources, an explicit service limit, and clear guidance on whether any form, filing, fee or service is needed.

- **high** · not-their-case · step `spelling-suggestions` — The child-support application builder directs this recipient toward obtaining a support amount when she already has a $650 monthly order and needs enforcement, and remains visible after enforcement is confirmed.
  - Page says: "This produces your application and the rule that decides the amount."
  - Fix: Suppress the new-support application builder for this journey and replace it with FRO enforcement guidance.
- **high** · missing · step `case-overview` — The supposed next-step answer does not tell the recipient how to contact FRO about inactivity, what to ask, what information to provide, or how to escalate an unresolved concern.
  - Page says: "What to do next"
  - Fix: Give a concrete recipient action using her order and FRO statements, with official FRO contact and complaint guidance.
- **high** · missing · step `case-overview` — Generic legal-help referrals do not explain that the site cannot manage FRO's enforcement process or direct her to FRO-specific assistance.
  - Page says: "Want a person to check this step with you?"
  - Fix: State the site's FRO-process limit explicitly and link to official FRO account, contact and escalation resources alongside suitable family-law help.
- **high** · missing · step `case-forms` — The page never identifies a relevant next form or explains that her immediate FRO follow-up does not require a new court application.
  - Page says: "Forms for this case"
  - Fix: State whether a form is needed for the actual next action and provide its official source if one is required.
- **medium** · not-their-case · step `intake-form` — The prominent divorce, property and municipality material concerns choosing where to start a case rather than enforcing this existing FRO-filed support order, and remains prominent through forward-to-results.
  - Page says: "WHAT THE STATUTES SAY ABOUT WHICH COURT"
  - Fix: Lead with existing-order enforcement and show court-selection information only if a relevant court step is being considered.
- **medium** · contradiction · step `spelling-suggestions` — The recorded-facts panel treats children as unknown despite the story expressly identifying child support for their daughter, and this persists on later builder pages.
  - Page says: "The case involves children: Not answered yet"
  - Fix: Extract the child-related facts already supplied and let the user correct them rather than marking them unanswered.
- **medium** · contradiction · step `intake-form` — The same page says the location is confirmed as Thunder Bay but marks the user's municipality unanswered, with the mismatch persisting on subsequent builder pages.
  - Page says: "Your municipality: Not answered yet"
  - Fix: Use the saved Thunder Bay location consistently in the recorded-facts panel.
- **medium** · repetition · step `spelling-suggestions` — The application questions ask again about the child and living arrangement already supplied as one daughter, age five, living with the user, and recur on later builder pages.
  - Page says: "Tell me about the children this is for."
  - Fix: Reuse the recorded child details and ask only for genuinely missing information relevant to enforcement.
- **medium** · not-their-case · step `spelling-suggestions` — The lengthy table-calculation lesson expressly says it is not about the user's case and distracts from collecting unpaid support under an existing order.
  - Page says: "How a table amount is worked out: find the income row, then add the percentage"
  - Fix: Remove the table lesson from the enforcement journey and keep it available only as optional background.
- **medium** · contradiction · step `after-analysis` — The results page says a starting-document draft is not offered while still displaying the child-support application builder and its draft button.
  - Page says: "a draft of it is not offered here"
  - Fix: Make the available drafting controls consistent with the recorded existing-order stage.
- **medium** · jargon · step `stage-confirmed` — The next-step card starts with an undefined 'there' and 'Director' rather than identifying FRO, and repeats this opening on subsequent results and overview pages.
  - Page says: "While a support order is filed there, only the Director may enforce it."
  - Fix: Start by saying that her order is already filed with the Family Responsibility Office and explaining that its Director is responsible for enforcement.
- **medium** · not-their-case · step `stage-confirmed` — Refiling and handing over existing private enforcement occupy the next-step card despite this order already being filed with FRO and no withdrawal being reported.
  - Page says: "An order that was withdrawn from the Director's office may be filed there again at any time."
  - Fix: Keep the main card about the active FRO file and place withdrawal or refiling information behind clearly labelled optional branches.
- **medium** · missing · step `case-overview` — The answer gives a limited court-enforcement list but does not explain FRO's administrative enforcement tools or what information the recipient can supply to support their use.
  - Page says: "The ways include a request for a financial statement, seizure and sale, and garnishment."
  - Fix: Explain the relevant FRO enforcement tools from official sources, identify who uses them, and distinguish those powers from actions the recipient can take herself.
- **medium** · not-their-case · step `case-overview` — The next-step card includes enforcement of other kinds of orders rather than staying focused on unpaid child support.
  - Page says: "Other orders may be enforced in three ways."
  - Fix: Remove other-order enforcement from this card and show it only for a matching order type.
- **medium** · jargon · step `case-overview` — The enforcement list uses unexplained legal remedies that a person without a lawyer cannot readily understand.
  - Page says: "a writ to seize property for a time, a contempt order, and naming a receiver"
  - Fix: Explain relevant remedies in plain language, including who initiates them, and omit irrelevant remedies.
- **medium** · repetition · step `case-overview` — The entire lengthy next-step paragraph is repeated under the full answer's 'What to do next' heading, including on reload.
  - Page says: "While a support order is filed there, only the Director may enforce it."
  - Fix: Use a short actionable card followed by a fuller explanation that adds detail instead of duplicating it.
- **medium** · missing · step `case-overview` — The research section raises the user's central question but supplies only a statutory duty quotation rather than an answer about review or escalation.
  - Page says: "how can the recipient request an enforcement review or escalate concerns about inactivity?"
  - Fix: Answer the review and escalation question in plain words with the appropriate official procedural links.
- **medium** · missing · step `case-timeline` — The timeline does not surface the reported 2024 order or non-payment since May 2026 even as events needing date confirmation.
  - Page says: "Nothing recorded yet."
  - Fix: Create provisional timeline entries from the story and ask for any exact dates needed before treating them as confirmed.
- **medium** · not-their-case · step `case-forms` — An unfiltered catalogue beginning with stay and dismissal forms substitutes for enforcement-specific guidance and includes divorce, adoption and child-protection material.
  - Page says: "Showing 146 of 146 forms."
  - Fix: Lead with this recipient's applicable action and put the complete catalogue behind an optional browse control.
- **medium** · broken · step `case-case-file` — The case file directs the user to deadline-date questions that are not shown in the visible overview for this enforcement step.
  - Page says: "Give the dates asked for under “Your next step” on the Overview tab"
  - Fix: Show a step-specific deadline explanation and link to date questions only when those questions actually exist.
- **low** · jargon · step `case-overview` — The saved document description is an internal-looking label that blurs the distinction between the court order she reported and an agreement.
  - Page says: "order agreement"
  - Fix: Display 'Existing court order' as the recorded document type.
- **low** · contradiction · step `case-forms` — Forms 13.1 and 13A say no PDF is connected but also display 'Current official PDF'.
  - Page says: "No official PDF is connected in the library."
  - Fix: Show only file formats actually connected to each form.

## held-back-sc-defendant-trial

*Defendant with a trial date who needs a witness to come.*

The journey eventually identifies the correct court, defendant role, Form 18A, issuing fee, and basic personal-service requirement without grading the defence. It does not finish the practical task: the known trial date never becomes a service deadline, and the attendance-money calculation is missing. Incorrect served-papers classification, repeated Defence offers, and the 'other side' service heading undermine otherwise useful guidance. The priority is a persistent, witness-specific checklist covering issuance, January 4, 2027 personal service, attendance money, and proof of service, consistently reflected in the timeline and printable case file.

- **high** · not-their-case · step `after-analysis` — The offered action is to draft a defence that the user expressly says was already filed, rather than obtain a summons for the upcoming trial.
  - Page says: "Create Defence (Form 9A) draft"
  - Fix: Offer Form 18A and the steps for having it issued and personally served with attendance money.
- **high** · missing · step `stage-confirmed` — The page does not turn the known January 14, 2027 trial date into the January 4, 2027 summons-service deadline.
  - Page says: "at least 10 days before the trial"
  - Fix: Show January 4, 2027 as the latest date for personal service with attendance money, explain the calculation, and save it to the case deadlines.
- **high** · wrong-side · step `stage-confirmed` — This heading incorrectly identifies the summons recipient as the opposing party when the summons must be personally served on the neighbour.
  - Page says: "Serving it on the other side"
  - Fix: Use the heading 'Personally serve your witness' and separately explain any circumstances requiring copies to other parties.
- **high** · missing · step `stage-confirmed` — The page never gives the attendance-money amounts or calculation needed to tender the required payment when serving the neighbour.
  - Page says: "Attendance money includes a fee for the witness to attend court each day and travel expenses to get to court."
  - Fix: Show the sourced daily witness fee and travel allowances, and request only the missing travel details needed to calculate the payment.
- **high** · not-their-case · step `stage-confirmed` — The case snapshot falsely describes a confirmed issue about understanding newly served papers rather than a contractor dispute already at trial preparation.
  - Page says: "Being served and not understanding the papers"
  - Fix: Describe the case as a contractor's payment claim being defended at trial, with a reluctant eyewitness requiring a summons.
- **high** · missing · step `forward-to-results` — Going back and forward retains the trial stage but still does not calculate the summons-service deadline from the saved trial date.
  - Page says: "at least 10 days before the trial"
  - Fix: Retain and display the January 4, 2027 service deadline alongside the January 14, 2027 trial date.
- **high** · missing · step `case-overview` — The saved case's main action page still gives only a relative summons-service period rather than the user's actual deadline.
  - Page says: "at least 10 days before the trial"
  - Fix: Place the January 4, 2027 personal-service deadline prominently in the next-step card and save it to the timeline and printable case file.
- **high** · not-their-case · step `case-overview` — The saved case overview continues to label the user's issue as understanding served papers despite the recorded trial stage.
  - Page says: "Being served and not understanding the papers"
  - Fix: Persist a case description that reflects the contractor dispute and need to summon the neighbour for trial.
- **high** · missing · step `case-timeline` — The timeline omits the explicitly supplied trial date and the summons deadline that can be calculated from it.
  - Page says: "Nothing dated yet."
  - Fix: Show the extracted trial date as awaiting confirmation if necessary and include the sourced summons-service deadline.
- **high** · wrong-side · step `case-forms` — The forms page repeats the misleading heading that suggests serving the summons on the contractor instead of the witness.
  - Page says: "Serving it on the other side"
  - Fix: Label this section as personal service on the witness and explain separately when another party needs a copy.
- **high** · missing · step `case-forms` — The page intended to explain how to serve Form 18A does not provide the amounts or calculation for the mandatory attendance-money payment.
  - Page says: "with their attendance money"
  - Fix: Provide the sourced witness fee and travel allowances and a calculation using the witness's necessary travel details.
- **high** · not-their-case · step `case-drafts` — The draft menu again promotes preparing a defence already filed rather than the witness summons needed at this stage.
  - Page says: "Defence (Form 9A)"
  - Fix: Remove the routine new-defence offer at this stage and prioritize Form 18A preparation or a clear link to its official completion instructions.
- **high** · broken · step `case-case-file` — The printable file directs the user to date questions that the visible Overview does not contain, despite the trial date already being in the story.
  - Page says: "Give the dates asked for under “Your next step” on the Overview tab"
  - Fix: Use the saved trial date to populate deadlines and provide a working confirmation or correction control if needed.
- **high** · missing · step `case-case-file` — The printable case file contains no summons-service deadline even though it reproduces the January 14, 2027 trial date.
  - Page says: "Deadlines worked out from your dates None yet."
  - Fix: Include the January 4, 2027 personal-service deadline with the attendance-money requirement and source.
- **high** · missing · step `reload-reopens-case` — Reloading successfully restores the case but still leaves its known summons-service deadline uncalculated.
  - Page says: "at least 10 days before the trial"
  - Fix: Persist and restore the trial date and calculated January 4, 2027 service deadline together.
- **high** · not-their-case · step `reload-reopens-case` — Reloading preserves the incorrect case classification rather than the user's actual trial-witness issue.
  - Page says: "Being served and not understanding the papers"
  - Fix: Correct the saved classification and ensure the corrected contractor-dispute and trial-witness description survives reload.
- **medium** · jargon · step `spelling-suggestions` — This mixture of classification labels does not clearly distinguish the completed settlement conference from the upcoming trial.
  - Page says: "trial · contract/agreement dispute, responding/defence, settlement"
  - Fix: Say that the user is defending a contractor's claim, has completed the settlement conference, and is preparing for trial on January 14, 2027.
- **medium** · repetition · step `intake-filled` — The page asks what evidence the user has without acknowledging the neighbour's eyewitness evidence already described.
  - Page says: "Still useful to add: your legal name, the other party’s name, the other party’s address for service, what evidence you have."
  - Fix: Record the neighbour as a potential witness and ask only for missing details needed to obtain and serve his summons.
- **medium** · not-their-case · step `after-analysis` — The page discusses withholding a case-starting document even though this defendant needs help securing a trial witness.
  - Page says: "Your records show the document that starts this case has already been filed"
  - Fix: Acknowledge the filed defence and completed settlement conference, then explain the witness-summons action available now.
- **medium** · missing · step `stage-confirmed` — The next-step card leads with general evidence preparation instead of directly applying the summons procedure to the reluctant neighbour.
  - Page says: "At least 30 days before trial, you can serve documents"
  - Fix: Lead with obtaining an issued Form 18A for the neighbour and put general trial-evidence preparation in a secondary section.
- **medium** · missing · step `stage-confirmed` — The additional evidence-service period is not counted to a date despite the trial date being known.
  - Page says: "At least 30 days before trial"
  - Fix: Show December 15, 2026 for the stated 30-day evidence-service period, with its source and any applicable qualifications.
- **medium** · not-their-case · step `stage-confirmed` — The evidence checklist focuses on receipt of court papers instead of the neighbour's observations and the deck dispute.
  - Page says: "How the papers arrived (Source)"
  - Fix: Organize the known eyewitness evidence and relevant deck documents, then identify the information needed to summon the witness.
- **medium** · repetition · step `stage-confirmed` — The same long next-step paragraph appears again verbatim under the full answer, adding length without further practical guidance.
  - Page says: "At least 30 days before trial, you can serve documents, statements, and audio or visual records"
  - Fix: Keep one concise action checklist and use the expanded answer for additional explanation and sources.
- **medium** · missing · step `stage-confirmed` — The card's source list omits the provisions governing its documentary-evidence and witness-summons statements, even though witness-summons provisions appear farther down the page.
  - Page says: "Sources: Rules of the Small Claims Court, O. Reg. 258/98, r. 16.01 (1); Rules of the Small Claims Court, O. Reg. 258/98, r. 17.01 (2)"
  - Fix: Attach the relevant evidence and summons provisions directly to those statements rather than presenting these two provisions as their sources.
- **medium** · not-their-case · step `stage-confirmed` — The displayed source excerpt includes creditor enforcement instructions unrelated to obtaining this trial witness.
  - Page says: "Notice of Garnishment (8)"
  - Fix: Display the relevant summons subsection and make surrounding unrelated provisions optional.
- **medium** · missing · step `stage-confirmed` — The page introduces police apprehension without showing the preceding court process and conditions for dealing with a properly summoned witness who fails to attend.
  - Page says: "to assist the police in apprehending the witness"
  - Fix: Explain the sourced court process and prerequisites before mentioning Form 20K or police apprehension.
- **medium** · repetition · step `back-to-intake` — Returning to intake again prompts for evidence already described in the saved story without showing that the neighbour's evidence has been extracted.
  - Page says: "what evidence you have"
  - Fix: Preserve an editable record of the known witness evidence and ask only for information still missing.
- **medium** · repetition · step `case-timeline` — The card quoting 'Now the trial is on January 14 2027' asks the user to enter the exact date already supplied.
  - Page says: "The exact date, if you know it"
  - Fix: Prefill January 14, 2027 and the trial event type, allowing confirmation or correction without re-entry.
- **medium** · broken · step `case-timeline` — The single card for 'I filed my defence in the spring, and we had the settlement conference' allows one event classification for two distinct court events.
  - Page says: "What kind of step was this?"
  - Fix: Split the sentence into separate proposed defence-filing and settlement-conference events with their known details prefilled.
- **medium** · jargon · step `case-forms` — The page exposes internal routing terminology rather than plainly explaining the limited availability of personalized form selection.
  - Page says: "No form-routing rules cover the "trial" stage yet."
  - Fix: Explain that automatic selection of additional trial forms is unavailable while clearly retaining Form 18A as the identified next form.
- **medium** · contradiction · step `case-forms` — This blanket statement conflicts with the Form 18A match displayed at the top of the same page.
  - Page says: "We could not match forms to where your case is"
  - Fix: Say that Form 18A is identified for the witness summons but the site cannot automatically select every other trial-related form.
- **medium** · repetition · step `case-forms` — The same help heading and four-service referral list appear twice on the page.
  - Page says: "Want a person to help pick the right form?"
  - Fix: Show one referral section beside the explanation of the form-selection limitation.
- **medium** · broken · step `case-forms` — The promised deadline is not on the Overview, which shows only an uncalculated period.
  - Page says: "The deadline for your step is on your Overview."
  - Fix: Display the calculated deadline on both pages and make the reference link lead to that deadline.

## held-back-sc-guided-dog-bite

*Bitten by a neighbour's dog while walking; wants medical costs and lost wages.*

The journey correctly identifies a plaintiff's dog-bite money claim, names Form 7A and eventually calculates and preserves the July 19, 2028 deadline without grading the case. However, it prematurely treats the claim as prepared, leaves the compensation total unresolved and does not provide usable service instructions. The most important improvements are to reuse confirmed facts automatically, guide preparation of the actual claim before filing, and explain the dog-owner liability rules in plain language tied to the user's evidence needs. Repeated filing text and unrelated statutory material make the otherwise useful guidance harder to navigate.

- **high** · not-their-case · step `stage-confirmed` — The site treats the user as ready to file a prepared claim even though no completed claim or draft is shown, and repeats this unsupported stage through the reloaded overview.
  - Page says: "Where you are: Claim prepared but not filed"
  - Fix: Identify the immediate step as preparing Form 7A, with filing guidance clearly identified as the following step.
- **high** · missing · step `stage-confirmed` — The filing guidance does not explain how to serve the neighbours, the time allowed for serving the issued claim, or how to record proof of service.
  - Page says: "the clerk returns stamped copies for you to serve on each defendant."
  - Fix: Add sourced instructions for serving each defendant within six months after issuance, permitted service methods and completing Form 8A.
- **high** · missing · step `back-to-intake` — The intake declares completion without resolving whether the approximate $1,235 includes six days of lost wages or obtaining a definite total that includes the requested pain-and-scar compensation.
  - Page says: "That's everything needed for now."
  - Fix: Ask one focused question at a time to record medical expenses, lost-wage calculations and the amount the user wants to claim for pain and scarring, without valuing the case for them.
- **high** · missing · step `case-forms` — The promised next-step information provides the form, fee and filing instructions but no practical service instructions, while the catalogue only names personal service or an alternative.
  - Page says: "the form, the fee, where to file it and how to serve it."
  - Fix: Include a dedicated, sourced service section explaining the applicable methods, six-month service period and Form 8A.
- **medium** · repetition · step `story-proposals` — The same July 19, 2026 date is presented for confirmation twice, once as the situation date and again as the injury date.
  - Page says: "If this involves an injury, what date did it happen?"
  - Fix: Show one confirmed bite date and reuse it for both purposes.
- **medium** · missing · step `claim-type-suggestion` — The page asks for claim-type confirmation while also asking the total dollar amount, contrary to the promised one-question-at-a-time conversation.
  - Page says: "This sounds like it may be about: Dog bite or attack (Dog Owners' Liability Act) — is that right?"
  - Fix: Finish confirming the dog-bite claim type before displaying the amount question.
- **medium** · missing · step `after-analysis` — The drafting gate asks the user to choose a remedy without carrying forward their already-confirmed request for compensation.
  - Page says: "Choose what you are asking the court for."
  - Fix: Carry forward the request for money compensation and ask only about any unresolved additions, such as interest and costs.
- **medium** · missing · step `stage-confirmed` — The next-step card initially withholds a calculated deadline even though July 19, 2026 has already been confirmed and saved.
  - Page says: "Give the date below and we will count the last day for you."
  - Fix: Calculate and display July 19, 2028 automatically, explaining the discovery-date assumption and allowing correction.
- **medium** · repetition · step `stage-confirmed` — The calculator asks again for the known bite date, and the same request remains on deadline-counted, forward-to-results, case-overview and reload-reopens-case.
  - Page says: "On what day did the thing your claim is about happen?"
  - Fix: Use the saved July 19, 2026 date and offer an explicit edit control rather than another intake question.
- **medium** · missing · step `stage-confirmed` — The explanation of discovery and its presumption is not supported by the relevant Limitations Act section 5 citation in the displayed source list.
  - Page says: "You are presumed to have known them on the day of the act or omission, unless shown otherwise."
  - Fix: Cite and link section 5 beside the discovery explanation, alongside section 4 for the two-year period.
- **medium** · repetition · step `stage-confirmed` — The entire filing paragraph is repeated verbatim under the full answer, adding substantial duplication that persists on subsequent results and overview pages.
  - Page says: "If your claim is based on a document, attach a copy to each copy of the claim"
  - Fix: Keep a short action summary in the card and reserve the detailed filing instructions for the expanded answer.
- **medium** · jargon · step `stage-confirmed` — The central explanation of the neighbours' blame allegation is presented as a technical research question and statutory extracts rather than a visible plain-language explanation.
  - Page says: "how could an allegation of contributory negligence affect liability?"
  - Fix: Explain from section 2 that the user must establish ownership, the bite and resulting losses, that owner negligence need not be proved, and that proven contribution by the injured person can reduce damages without assessing this claim.
- **medium** · not-their-case · step `stage-confirmed` — The displayed owner-definition extract includes extensive pit-bull classification material unrelated to this German shepherd bite, and recurs on later results and overview pages.
  - Page says: "In determining whether a dog is a pit bull"
  - Fix: Show the relevant owner definition and keep unrelated statutory definitions behind an official-source link.
- **medium** · missing · step `back-to-intake` — The conversation does not explain why this additional safety question matters to the court guidance.
  - Page says: "Has the other party threatened you, or done anything that makes you feel unsafe?"
  - Fix: Briefly explain how the answer affects safety resources or urgent help before asking the question.
- **medium** · not-their-case · step `back-to-intake` — The evidence guidance includes pet-injury records and veterinary bills although the known injury is to the user's leg.
  - Page says: "Veterinary records for an injured pet"
  - Fix: Tailor the evidence checklist to human medical records, injury photographs, receipts, wage records, witnesses and dog ownership.
- **medium** · not-their-case · step `case-timeline` — The site offers the already-understood bite incident for classification as a possible court-process step despite knowing nothing has been filed.
  - Page says: "They might describe steps in the court process."
  - Fix: Keep the bite as a factual incident in the chronology and reserve court-step classification for statements that actually describe procedural events.
- **medium** · repetition · step `case-timeline` — The proposed bite entry asks for a date already present in the quoted sentence and confirmed in the case.
  - Page says: "The exact date, if you know it"
  - Fix: Populate July 19, 2026 automatically and allow the user to edit it.
- **medium** · repetition · step `case-forms` — The form selector asks money-versus-property again even though the saved story and compensation request already establish a money claim.
  - Page says: "What ordinary claim are you starting?"
  - Fix: Reuse the saved money-claim answer and let the user change it if necessary.
- **medium** · contradiction · step `case-forms` — The page reports no missing form information immediately after saying answers and saved confirmations are required to identify matching forms.
  - Page says: "No missing form information is currently flagged."
  - Fix: Either use the existing case facts to identify the forms or clearly list the genuinely unresolved confirmations.
- **medium** · missing · step `case-drafts` — The chronology option omits the known dated bite because it only draws from procedural timeline entries and documents.
  - Page says: "What happened, in date order: 0 items from your timeline and dated documents."
  - Fix: Include confirmed factual incidents from intake, starting with the July 19, 2026 bite, while keeping them distinct from court-process steps.
- **medium** · missing · step `case-case-file` — The printable case file omits the saved amount, evidence description and correct next form, leaving out important information already available elsewhere.
  - Page says: "Your case on one page."
  - Fix: Include the compensation amount and unresolved components, described evidence, and Form 7A as the immediate preparation task.
- **medium** · jargon · step `case-case-file` — The standalone printable deadline cites only an unidentified section number, so the user cannot identify its legal source from the printout.
  - Page says: "The general deadline to start a court case (s. 4)"
  - Fix: Name and link the Limitations Act, 2002, sections 4 and 5, and include the date and discovery assumption used in the calculation.
- **low** · repetition · step `after-analysis` — The identical testing notice appears twice on this page.
  - Page says: "Testing: this feature is switched on while we test it"
  - Fix: Display the notice once beside the drafting feature it qualifies.
- **low** · broken · step `stage-confirmed` — The statutory text contains corrupted characters, also visible in the later copies of the extract.
  - Page says: "propri�taire"
  - Fix: Correct the source-text encoding so accented characters display accurately.

## held-back-sc-guided-out-of-province

*Sold equipment online to a buyer in Alberta who never paid. A case the site may not fully handle.*

The journey captures the $5,800 balance, preserves the intake, and supplies useful Ontario form and fee information without grading the claim. Its central failure is treating ordinary Ontario filing as the next step without plainly addressing the Alberta buyer or explaining the site's limits. Jurisdiction, Ontario court location, and service outside Ontario need separate, sourced explanations and a targeted referral where the site cannot proceed. The site should also correct the unsupported “claim prepared” stage, avoid steering the deadline calculator toward shipment, and preserve unresolved issues across reloads and the printable case file.

- **high** · missing · step `first-question` — The guided conversation proceeds with routine intake without acknowledging or answering the user's central question about suing an Alberta buyer from Ontario.
  - Page says: "A few questions to get the details down."
  - Fix: Acknowledge the Alberta buyer, explain that Ontario jurisdiction and service outside Ontario need separate consideration, and state the site's limits before continuing.
- **high** · missing · step `after-analysis` — The page offers Ontario claim preparation without plainly stating what the site can and cannot handle for this out-of-province defendant.
  - Page says: "Create Plaintiff's Claim draft (Form 7A)"
  - Fix: Place an Alberta-specific scope notice before claim preparation, explain the unresolved jurisdiction and service issues with sources, and link to appropriate legal help.
- **high** · contradiction · step `stage-confirmed` — The page upgrades the confirmed fact that nothing has been filed into an unsupported assertion that the claim is prepared, which persists on subsequent results and case pages.
  - Page says: "Where you are: Claim prepared but not filed"
  - Fix: Describe the user as considering or preparing a new claim and do not mark the claim ready to file without confirmation.
- **high** · missing · step `stage-confirmed` — This Ontario venue explanation does not distinguish choosing an Ontario court location from establishing whether an Ontario court can hear a dispute involving an Alberta buyer.
  - Page says: "You can file in the territorial division where the problem happened"
  - Fix: Explain that rule 6.01 addresses court location rather than resolving interprovincial jurisdiction, and identify the additional legal questions and help needed without choosing Ontario for the user.
- **high** · missing · step `stage-confirmed` — The filing guidance gives no service method, service period, or explanation of serving this buyer in Alberta.
  - Page says: "the clerk returns stamped copies for you to serve on each defendant"
  - Fix: Provide the applicable claim-service period, permitted methods outside Ontario, proof-of-service requirements, and official rule references, or explicitly identify the unsupported portion and refer the user for help.
- **high** · contradiction · step `stage-confirmed` — The calculator directs the user toward the quoted shipment date even though the page says the limitation period runs from discovery of the unpaid claim, which need not be the shipment date.
  - Page says: "Pick that date above, with its year."
  - Fix: Ask when the balance became due and what the user knew about non-payment, explaining why the shipment date alone cannot establish the discovery date.
- **high** · missing · step `case-forms` — The page promises service instructions but shows filing information and only a generic service description buried in the form catalogue.
  - Page says: "the form, the fee, where to file it and how to serve it"
  - Fix: Add an explicit service section addressing the Alberta defendant, with applicable methods, timing, proof, sources, and any site limitations.
- **high** · missing · step `case-forms` — The page gives no filing caution for the known Alberta defendant despite unresolved Ontario jurisdiction and out-of-province service.
  - Page says: "Nothing about these forms is flagged for you to check yet."
  - Fix: Flag those unresolved issues explicitly and explain that listing Form 7A does not establish that Ontario is the proper province.
- **high** · missing · step `case-drafts` — The Ontario claim-drafting option again lacks a warning that the site has not resolved whether this Alberta dispute can be brought in Ontario.
  - Page says: "The document that starts your case"
  - Fix: Carry the out-of-province limitation into the draft entry point and distinguish preparing a draft from confirming the proper province.
- **high** · missing · step `case-case-file` — The printable case file preserves an Ontario filing instruction but omits the unresolved jurisdiction and Alberta service questions that are central to the user's situation.
  - Page says: "Exact step: How do I actually file my claim, and what does it cost?"
  - Fix: Include an “Unresolved issues before filing” section recording the Alberta defendant, jurisdiction question, service question, and referral.
- **medium** · repetition · step `claim-type-suggestion` — The story already supplies the $6,800 price and $1,000 payment, but the site asks for the balance instead of extracting $5,800 for confirmation.
  - Page says: "What is the total dollar amount you are claiming?"
  - Fix: Show the calculation $6,800 minus $1,000 equals $5,800 and ask the user to confirm it.
- **medium** · contradiction · step `claim-type-suggestion` — The page asks this question alongside the amount question despite promising follow-up questions one at a time.
  - Page says: "This sounds like it may be about: Non-payment for goods sold — is that right?"
  - Fix: Resolve the claim-type confirmation before displaying the next unanswered question.
- **medium** · not-their-case · step `stage-confirmed` — An unrelated sexual-assault exception distracts from the limitation questions for this unpaid equipment sale.
  - Page says: "For example, a claim based on a sexual assault has no limitation period."
  - Fix: Keep the visible explanation focused on payment terms, discovery, and potentially relevant acknowledgments, with unrelated exceptions available separately.
- **medium** · repetition · step `stage-confirmed` — The same filing instructions appear in both the next-step card and the full answer on this page and recur in the subsequent overview pages.
  - Page says: "If your claim is based on a document, attach a copy to each copy of the claim"
  - Fix: Keep one concise actionable instruction block and make the expanded answer add explanation rather than repeat it verbatim.
- **medium** · jargon · step `stage-confirmed` — The jurisdiction section uses unexplained legal language and supplies statutory extracts rather than a visible plain-language answer to the user's question.
  - Page says: "could the proceeding be stayed in favour of another province?"
  - Fix: Explain jurisdiction and a stay in ordinary language before the extracts, including what remains unresolved for this Alberta sale.
- **medium** · missing · step `stage-confirmed` — The full answer's source list omits sources for some of its legal statements, including the sexual-assault exception and online filing review time.
  - Page says: "Sources"
  - Fix: Attach the relevant statutory citation or official link to each legal or procedural statement instead of relying on a partial source list.
- **medium** · missing · step `back-to-intake` — The conversation asks a safety question without explaining its relevance to this unpaid commercial sale.
  - Page says: "Has the other party threatened you, or done anything that makes you feel unsafe?"
  - Fix: Briefly explain whether the answer affects safe communication or available guidance before asking the question.
- **medium** · not-their-case · step `case-timeline` — The site presents shipment, non-payment, and an alleged damaged delivery as possible court steps even though the user confirmed that no case has started.
  - Page says: "They might describe steps in the court process."
  - Fix: Treat these as factual events in the dispute and reserve court-step classification for facts suggesting an actual procedural event.
- **medium** · broken · step `case-forms` — The form-matching section refers to questions and a save action that are not visible.
  - Page says: "Answer the questions above and save them to see the forms that match."
  - Fix: Render the unanswered matching questions and save control, or show the matches already established by the saved intake.
- **medium** · not-their-case · step `case-forms` — The default catalogue mixes the claimant's relevant forms with defence, enforcement, disability, and other forms unrelated to the current step.
  - Page says: "Showing 48 of 48 forms."
  - Fix: Default to forms relevant to the confirmed claimant stage and put the complete catalogue behind the optional “All forms” view.
- **medium** · contradiction · step `reload-reopens-case` — After reload, the overview replaces the earlier missing-documents notice with an all-clear message even though no document upload is shown and key jurisdiction and date issues remain unresolved.
  - Page says: "Nothing in your records needs sorting out right now."
  - Fix: Preserve outstanding document and legal-information gaps across reloads rather than displaying an unsupported all-clear.
- **low** · broken · step `after-analysis` — A missing space joins the claim type to the following explanation.
  - Page says: "non-payment for goods soldgenerally"
  - Fix: Insert a space between “sold” and “generally.”
- **low** · echo · step `stage-confirmed` — The structured “Amount” field repeats the user's full sentence rather than organizing the confirmed amount.
  - Page says: "I'm claiming $5,800, which is the amount he still owes me."
  - Fix: Display “$5,800” in the amount field and retain the original sentence only in a clearly labelled record of the user's words.

## held-back-sc-served-defendants-claim

*Sued a neighbour over a fence; the neighbour has now served a defendant's claim against her.*

The site preserves her story, avoids grading either claim and correctly withholds a new Plaintiff’s Claim draft. It also retrieves the right defendant’s-claim response rule, but fails to turn that research into an actionable next step. The most important improvements are to distinguish her two roles, prominently identify Form 9A, calculate the service-based deadline and provide filing, fee and service instructions. Those details should persist across the Overview, Forms, Timeline and printable case file without making her repeat her situation.

- **high** · missing · step `after-analysis` — The page correctly withholds a new originating claim draft but does not identify the Defence she needs to respond to the defendant’s claim.
  - Page says: "What CourtSimplified can help with next"
  - Fix: Name Defence (Form 9A) as her next step and link directly to its instructions and official form.
- **high** · missing · step `stage-confirmed` — The snapshot records only her original plaintiff role and omits her defendant role for the claim she now needs to answer.
  - Page says: "Your role Plaintiff / claimant"
  - Fix: Show both claim-specific roles and identify the $2,000 defendant’s claim as the matter requiring a response.
- **high** · missing · step `stage-confirmed` — The page quotes the response period and counting rule without calculating a deadline from the September 28 service date.
  - Page says: "within 20 days after service of the defendant's claim"
  - Fix: Confirm the service year if necessary and show October 19, 2026 for September 28, 2026 service, explaining the Sunday adjustment and whether the deadline has passed.
- **high** · missing · step `stage-confirmed` — The quoted rule does not provide practical filing channels, the applicable Defence filing fee, permitted service methods or instructions for proving service.
  - Page says: "file the defence, with proof of service, with the clerk"
  - Fix: Provide sourced instructions for serving every other party, preparing proof of service and filing Form 9A in the existing court file, including the fee.
- **high** · missing · step `case-overview` — The next-step card contains a generic question selector instead of naming Form 9A and the response deadline, and remains unchanged after reload.
  - Page says: "Your next step"
  - Fix: Persist a next-step card naming Defence (Form 9A), the calculated deadline and direct service-and-filing instructions.
- **high** · missing · step `case-forms` — The forms page leaves her to search the entire catalogue instead of identifying Form 9A for the defendant’s claim.
  - Page says: "Showing 48 of 48 forms."
  - Fix: Pin Form 9A and the relevant proof-of-service form at the top with an explanation of why she needs them.
- **high** · missing · step `case-forms` — The Form 9A description omits its use to defend a defendant’s claim, which could make her think it is not her form.
  - Page says: "The form a defendant uses to dispute a plaintiff's claim."
  - Fix: Explain that Form 9A also answers a defendant’s claim and explicitly connect that use to her situation under rule 10.03.
- **high** · missing · step `case-case-file` — The printable case file contains no deadline and asks for dates already supplied in her saved story.
  - Page says: "None yet. Give the dates asked for under “Your next step”"
  - Fix: Carry the September 28 service date into the case file and show the calculated response deadline, requesting only any genuinely missing date detail.
- **medium** · missing · step `intake-form` — The single-role selector does not explain that she is the plaintiff in her fence claim but the defendant to her neighbour’s claim.
  - Page says: "Plaintiff / claimant"
  - Fix: Allow both roles and explain that responding to the defendant’s claim requires a separate Defence.
- **medium** · missing · step `intake-form` — The document checklist has no option for a defendant’s claim received or served, although that document determines her immediate next step.
  - Page says: "What documents already exist?"
  - Fix: Add a defendant’s-claim-served option with service-date capture and route it to Form 9A.
- **medium** · repetition · step `stage-confirmed` — The page asks her to identify her situation again even though her story explicitly asks how to respond to a defendant’s claim, and this same gate returns on subsequent results and overview pages.
  - Page says: "Choose the question closest to where your case is."
  - Fix: Select the defendant’s-claim response guidance automatically and offer an optional correction.
- **medium** · not-their-case · step `stage-confirmed` — The next-step area leads with unrelated injury, pre-action and claim-starting questions rather than her current response obligation, including after returning and reloading.
  - Page says: "I was hurt on a Toronto street or sidewalk — do I have to tell the City first?"
  - Fix: Show the defendant’s-claim response first and move unrelated questions into an optional browse section.
- **medium** · jargon · step `stage-confirmed` — The visible guidance consists of dense legal extracts with unexplained terms rather than a plain-language answer to her question.
  - Page says: "a meritorious defence and a reasonable explanation for the default"
  - Fix: Lead with a sourced plain-language response tailored to her current step and place the full legal extracts behind optional expansion.
- **medium** · repetition · step `stage-confirmed` — Each short legal quotation is immediately followed by substantially the same provision again, making the response guidance unnecessarily long.
  - Page says: "Read more of the provision"
  - Fix: Display one concise explanation and keep the full provision collapsed unless requested.
- **medium** · repetition · step `case-timeline` — The timeline asks for a date again beside the sentence already stating September 28 rather than extracting it and asking only for any missing year.
  - Page says: "The exact date, if you know it"
  - Fix: Prefill the known service date and request only missing information needed to confirm it.
- **medium** · missing · step `case-timeline` — The event options distinguish issuance but do not provide a specific defendant’s-claim-served event, even though service starts her response clock.
  - Page says: "A defendant's claim was issued"
  - Fix: Split the defence filing and defendant’s-claim service into suggested events and provide a specific service event linked to the deadline.
- **medium** · contradiction · step `case-forms` — The forms page promises a deadline on the Overview, but the visible Overview provides only a question selector and uncalculated legal periods.
  - Page says: "The deadline for your step is on your Overview."
  - Fix: Calculate and display the deadline on the Overview before directing her there.
- **medium** · contradiction · step `reload-reopens-case` — This all-clear conflicts with the unrecorded service event, absent response deadline and unresolved form selection visible elsewhere in the journey.
  - Page says: "Nothing in your records needs sorting out right now."
  - Fix: List the outstanding defendant’s-claim response tasks until the relevant dates and completion steps are recorded.
- **low** · broken · step `stage-confirmed` — The research-question heading ends mid-word and runs directly into the passage count.
  - Page says: "within the court’s jurisdiction and applic(7 passages)"
  - Fix: Render the complete heading with the passage count separately.

## held-back-sc-used-car

*Bought a used car privately; the seller hid a cracked engine block. Wants the repair cost back.*

The journey correctly identifies Small Claims Court, preserves the story and amount, offers Form 7A and shows sourced fee and online-filing information without grading the claim. However, it repeatedly labels this plaintiff as someone being sued and supplies defence-oriented evidence guidance. The most important improvements are to correct and persist the case classification, explain the private-sale misrepresentation requirements in plain language, and complete the Hamilton filing and service instructions. The site should also use the recorded dates to provide a qualified limitation calculation, clarify discovery timing and stop asking for facts already supplied.

- **high** · not-their-case · step `stage-confirmed` — The page treats the claim as already prepared although the journey shows only intake information and no completed claim, and this assumption persists on subsequent results and overview pages.
  - Page says: "Where you are: Claim prepared but not filed"
  - Fix: Say the user is starting a claim and must prepare Form 7A before filing it.
- **high** · missing · step `stage-confirmed` — The filing instructions never identify the Hamilton court office or its address, leaving the paper filing route incomplete on all subsequent next-step pages.
  - Page says: "On paper, you file your Plaintiff's Claim (Form 7A) in person or by mail at the court office"
  - Fix: Provide the Hamilton Small Claims Court office's official address and filing information, while explaining the territorial connection needed to file there.
- **high** · missing · step `stage-confirmed` — The page does not explain how to serve the issued claim, the service deadline or how to prove service, and the omission persists on the later results and overview pages.
  - Page says: "the clerk returns stamped copies for you to serve on each defendant"
  - Fix: Explain permitted service methods for this individual seller, the six-month service period after issue, and completing and filing Form 8A, with official sources.
- **high** · missing · step `stage-confirmed` — No calendar deadline or provisional date is shown despite the recorded August 2026 events, and the page does not clearly distinguish discovery of the concealed defect from the purchase.
  - Page says: "Give the date below and we will count the last day for you."
  - Fix: Explain that discovery appears to have occurred around late August 2026, show a clearly qualified August 2028 limitation date or range, and request confirmation of the exact discovery date without suggesting the period has expired.
- **high** · wrong-side · step `stage-confirmed` — The case snapshot says this plaintiff is being sued and falsely labels that issue as something they confirmed.
  - Page says: "Being sued for something you did not do"
  - Fix: Show a plaintiff's claim for $5,200 in repair costs arising from an allegedly misrepresented private car sale.
- **high** · wrong-side · step `stage-confirmed` — The evidence checklist is written for a defendant rather than the buyer starting a claim.
  - Page says: "Documents your Defence relies on (Source)"
  - Fix: List evidence for the buyer's claim, including the advertisement, seller's statements, sale and payment records, mechanic's findings, repair estimate or invoice, photos and messages.
- **high** · missing · step `stage-confirmed` — The legal research section supplies excerpts rather than a plain explanation of what this buyer must establish and which relevant facts or evidence are not yet recorded.
  - Page says: "The first element of civil fraud is a false representation by the defendant."
  - Fix: Explain the relevant misrepresentation requirements in plain words, connect them neutrally to the recorded statements and repair history, and identify unresolved matters such as reliance, seller knowledge and proof of loss.
- **high** · wrong-side · step `forward-to-results` — Returning from intake still leaves the plaintiff's case classified as defending a lawsuit.
  - Page says: "Being sued for something you did not do"
  - Fix: Preserve the correct private-sale plaintiff classification when navigating back and forward.
- **high** · wrong-side · step `forward-to-results` — The returned results still give the plaintiff a defence evidence checklist.
  - Page says: "Documents your Defence relies on (Source)"
  - Fix: Regenerate the checklist from the saved plaintiff role and private-sale facts.
- **high** · wrong-side · step `case-overview` — The saved case overview continues to describe the buyer as someone being sued despite displaying the plaintiff role.
  - Page says: "Being sued for something you did not do"
  - Fix: Store and display the correct plaintiff-side private-sale issue consistently throughout the case.
- **high** · wrong-side · step `case-overview` — The saved overview continues to direct the plaintiff to organize defence documents.
  - Page says: "Documents your Defence relies on (Source)"
  - Fix: Replace the defence checklist with claim-specific evidence and clearly identified outstanding proof.
- **high** · missing · step `case-forms` — The promised next-step section gives no actionable service instructions, and the later form catalogue's reference to personal service or an alternative does not explain how to carry either out.
  - Page says: "What your next step takes: the form, the fee, where to file it and how to serve it."
  - Fix: Add a sourced service section covering the issued claim, permitted methods, the service deadline and Form 8A proof of service.
- **high** · missing · step `reload-reopens-case` — The suggested calculation uses the purchase date without explaining why discovery of the concealed defect about three weeks later may be the relevant starting point.
  - Page says: "Count my deadline from Sunday, August 2, 2026"
  - Fix: Separate purchase from discovery, ask a targeted question about when the defect became known, and show any purchase-based calculation only as a clearly explained provisional date.
- **high** · wrong-side · step `reload-reopens-case` — Reloading preserves the incorrect defendant-side issue rather than correcting the saved plaintiff case.
  - Page says: "Being sued for something you did not do"
  - Fix: Correct the stored issue classification and keep it consistent after reload.
- **high** · wrong-side · step `reload-reopens-case` — The defence evidence checklist remains in the reopened plaintiff case.
  - Page says: "Documents your Defence relies on (Source)"
  - Fix: Persist a plaintiff-side evidence checklist tailored to the misrepresented car sale.
- **medium** · not-their-case · step `spelling-suggestions` — The page classifies a claim about a misrepresented private car sale as property damage, and this classification persists on intake-filled and back-to-intake.
  - Page says: "So far this looks like: starting case · property damage"
  - Fix: Identify the issue as a private used-car sale involving alleged misrepresentation and a claim for repair costs.
- **medium** · repetition · step `spelling-suggestions` — The request for how the amount was calculated ignores the story's explanation that $5,200 is the repair cost, and repeats on intake-filled and back-to-intake.
  - Page says: "Still useful to add: your legal name, the other party’s name, the other party’s address for service, what evidence you have, how the amount was calculated."
  - Fix: Record the amount as the stated repair cost and ask only whether it comes from an estimate or a paid invoice.
- **medium** · not-their-case · step `stage-confirmed` — The next-step card includes Toronto filing instructions despite the saved Hamilton location, and repeats them on forward-to-results, case-overview and reload-reopens-case.
  - Page says: "Toronto uses the Ontario Courts Public Portal"
  - Fix: Show Hamilton's outside-Toronto filing route in the next-step card and put other regions' instructions behind an optional link.
- **medium** · repetition · step `stage-confirmed` — The page asks again for an event date even though the story already supplies the purchase date and the approximate discovery timing, and this generic question repeats on subsequent overview pages.
  - Page says: "On what day did the thing your claim is about happen?"
  - Fix: Use the saved purchase date and approximate engine-failure timing, asking only for the unresolved exact discovery date and explaining why it matters.
- **medium** · not-their-case · step `stage-confirmed` — The expanded deadline answer introduces an unrelated kind of claim, and repeats this example on later results and overview pages.
  - Page says: "For example, a claim based on a sexual assault has no limitation period."
  - Fix: Keep this answer focused on the private-sale limitation period and move unrelated exceptions to optional general guidance.
- **medium** · repetition · step `stage-confirmed` — The filing paragraph appears both in the next-step card and verbatim in the full answer, alongside repeated form and source sections, and this duplication persists on later results and overview pages.
  - Page says: "If your claim is based on a document, attach a copy to each copy of the claim"
  - Fix: Keep a concise actionable card and make the expanded answer add explanations rather than repeat the same instructions.
- **medium** · broken · step `stage-confirmed` — The evidence list displays literal '(Source)' placeholders instead of meaningful references, and these persist on later results and overview pages.
  - Page says: "Where you were and what you did (Source)"
  - Fix: Replace placeholders with usable references or remove them and present a concrete evidence checklist.
- **medium** · jargon · step `stage-confirmed` — The research section presents technical statutory wording without explaining that the quoted seller-dealing-in-goods condition is not automatically applicable to this private seller, and repeats it on later results and overview pages.
  - Page says: "there is an implied condition that the goods will be of merchantable quality"
  - Fix: Explain the private-sale distinction and the limits of these implied terms before showing the optional statutory text.
- **medium** · broken · step `stage-confirmed` — The research question ends mid-word before its passage count, and the same malformed heading appears on later results and overview pages.
  - Page says: "what effect would an as-is term or an opportunity to inspect ha(1 passage)"
  - Fix: Render the complete question and separate the passage count from its text.
- **medium** · contradiction · step `case-overview` — This all-clear conflicts with the intake's outstanding party and service details and the overview's still-unworked deadline.
  - Page says: "Nothing in your records needs sorting out right now."
  - Fix: List the known unresolved information without suggesting anything about the merits of the claim.
- **medium** · not-their-case · step `case-timeline` — The page treats buying the car, discovering the defect and unanswered texts as possible court steps even though it records that no claim has been filed.
  - Page says: "They might describe steps in the court process."
  - Fix: Organize these as factual events in a separate chronology and reserve procedural-step questions for events that actually concern court proceedings.
- **medium** · repetition · step `case-timeline` — The purchase event asks for a date already explicitly given as August 2, 2026.
  - Page says: "The exact date, if you know it"
  - Fix: Prefill the purchase date for confirmation and preserve the approximate timing of the later engine failure.
- **medium** · repetition · step `case-forms` — The page asks the user to identify a money or property claim although the saved story and $5,200 amount already describe a money claim for repairs.
  - Page says: "What ordinary claim are you starting?"
  - Fix: Use the recorded money claim and ask only for eligibility facts that remain genuinely unknown.
- **medium** · contradiction · step `case-forms` — The page presents an all-clear while simultaneously requiring answers and saved confirmations before it can show matching forms.
  - Page says: "No missing form information is currently flagged."
  - Fix: Distinguish an incomplete form check from a completed check with no missing information.
- **medium** · not-their-case · step `case-forms` — The default catalogue mixes the relevant claim forms with defence, enforcement and disability-related forms instead of narrowing the list to this plaintiff's starting stage.
  - Page says: "Showing 48 of 48 forms."
  - Fix: Default to Form 7A and the relevant service form, with the complete catalogue available through an explicit browse option.
- **medium** · missing · step `case-drafts` — The chronology draft has no items even though the saved story contains a dated purchase and an approximately dated defect discovery.
  - Page says: "What happened, in date order: 0 items from your timeline and dated documents."
  - Fix: Offer those saved factual events as clearly labelled proposed chronology entries for confirmation.
- **medium** · missing · step `case-case-file` — The printable file says 'None yet' and provides neither the applicable two-year period nor the recorded August 2026 discovery context.
  - Page says: "Deadlines worked out from your dates"
  - Fix: Include the limitation period, a qualified August 2028 date or range, and any exact discovery-date confirmation still needed.
- **medium** · missing · step `case-case-file` — The printable case file names a filing question but omits the already available Form 7A, fee and filing route.
  - Page says: "Exact step: How do I actually file my claim, and what does it cost?"
  - Fix: Include a concise next-step summary with the form, fee, Hamilton filing route and service requirements.
