/**
 * PART 6 — the stories the accuracy engine is measured against.
 *
 * *** WRITTEN THE WAY PEOPLE ACTUALLY WRITE ***
 *
 * Not "plaintiff seeks to note defendant in default". People do not say that.
 * They say "they never wrote back and it's been a month, what now". Every
 * story here is in the register a self-represented person uses: incomplete,
 * out of order, with the legally decisive fact buried in the middle of
 * something else.
 *
 * A suite of tidy stories measures how well the classifier reads a summary
 * somebody else already wrote. That is not the job.
 *
 * *** SOME OF THESE SHOULD RETURN "WE DO NOT KNOW" ***
 *
 * `expect: "unknown"` is a correct answer, not a gap in the test data. A suite
 * made only of resolvable cases rewards confidence, and confidence is exactly
 * what produced the original failure: eight of ten stories getting the same
 * block because the code would rather answer than admit it could not tell.
 *
 * So there are deliberately ambiguous stories — the plaintiff who does not say
 * whether a defence arrived, the person who does not say which side they are
 * on — and getting a confident answer on those is a FAILURE, however plausible
 * the answer.
 *
 * *** AND SOME ARE NOT SMALL CLAIMS AT ALL ***
 *
 * Custody, a landlord, a human rights complaint, a dispute in another
 * province. Routing one of those into Small Claims procedure is a worse
 * failure than getting the stage wrong, because the person acts on it for
 * weeks before anything corrects them.
 */

export type ExpectedOutcome =
  | { kind: "stage"; stageId: string }
  | { kind: "unknown" }
  | { kind: "out-of-scope" }
  /*
   * *** A LINE NOBODY COULD SOURCE ***
   *
   * Where the LTB's jurisdiction ends and Small Claims begins, for a FORMER
   * tenant, was confirmed unsourceable from ontario.ca, ontariocourts.ca and
   * ontariocourtforms.on.ca in an earlier session — see the note above
   * TENANCY_ENDED_SIGNALS in courtPathClassifier.ts.
   *
   * Expecting either answer here would be asserting the thing nobody could
   * establish. The correct outcome is the one the pipeline now produces: say
   * it may be either, give the Small Claims guidance anyway so the person is
   * not left with nothing, and name who can confirm.
   */
  | { kind: "boundary-unclear" };

export type Story = {
  id: string;
  /** In the user's own words. This is what goes to the classifier. */
  text: string;
  expect: ExpectedOutcome;
  /** Why that is the right answer. Printed on failure so a red line is actionable. */
  because: string;
  /**
   * A stage whose content would be actively dangerous here. Checked
   * separately from "is the stage right", because the harm is not symmetric:
   * telling a defendant with judgment against them how to start a claim is
   * worse than returning UNKNOWN.
   */
  neverSuggest?: string[];
  /** The user is asking for legal advice; the product must decline. */
  requestsLegalAdvice?: boolean;
  /**
   * This story is about a case that ALREADY EXISTS in the product.
   *
   * Such a case carries a stored court_path from intake, so the pipeline does
   * not re-run scope classification on it. Set from what the story IS, never
   * from what it expects — deriving it from the expected answer handed the
   * classifier the answer key, which is how an earlier version of this eval
   * cheated without anybody noticing.
   */
  existingCase?: boolean;
};

export const STORIES: Story[] = [
  // ======================================================================
  // Plaintiff, before filing
  // ======================================================================
  {
    id: "p-thinking-about-suing",
    text: "A contractor took $4,200 from me in March for a bathroom reno and never showed up. I've texted him maybe 30 times. I want to take him to court but I don't know if it's worth it or where I'd even go.",
    expect: { kind: "stage", stageId: "before-filing:deciding-whether-to-sue" },
    because: "Nothing filed. They are working out whether to sue and where.",
    neverSuggest: ["defendant:served-defence-period-running"],
  },
  {
    id: "p-over-limit",
    text: "My business partner owes me $94,000 from when we dissolved. Can I do this in small claims or is it too much money?",
    expect: { kind: "stage", stageId: "before-filing:claim-exceeds-small-claims-limit" },
    because: "$94,000 is over the $50,000 Small Claims limit (O. Reg. 626/00 s. 1(1)).",
  },
  {
    id: "p-old-claim",
    text: "Someone crashed into my parked car in 2022 and their insurance never paid the deductible. I forgot about it until I was cleaning out paperwork last week. Is it too late?",
    expect: { kind: "stage", stageId: "before-filing:limitation-period-may-have-passed" },
    because: "More than two years since the events; the limitation period is in question.",
  },

  // ---- the pre-suit notice deadlines --------------------------------------
  {
    id: "notice-icy-municipal-sidewalk",
    text: "I slipped on the sidewalk outside the library on Elgin Street on February 3rd. It was solid ice, nobody had salted it. I broke my wrist and I'm off work. The city owns that sidewalk. It's now February 20th.",
    expect: { kind: "stage", stageId: "before-filing:notice-municipality" },
    because:
      "A municipal sidewalk, so Municipal Act s. 44 (10) — written notice to the clerk " +
      "within 10 days.\n" +
      "      EXPECTATION CORRECTED, and the reason matters. This first expected " +
      "`notice-deadline-missed`, because 3 February to 20 February is seventeen days. " +
      "That asked the MODEL to do date arithmetic, which rule 8 of its own prompt " +
      "forbids — dates are computed by the deadline engine, from the rules, or they are " +
      "guesses in a confident voice.\n" +
      "      So the model's job is to identify the SITUATION, and it did. Deciding the " +
      "10 days have run is code's job, and it is NOT YET WIRED: the runtime has no date " +
      "of injury to compute from. Recorded as a real gap rather than hidden by moving " +
      "the expectation.",
    neverSuggest: ["before-filing:deciding-whether-to-sue"],
  },
  {
    id: "notice-icy-municipal-in-time",
    text: "Two days ago I fell on a city sidewalk that hadn't been cleared. Badly bruised my hip. Someone said there's paperwork I have to send the city fast?",
    expect: { kind: "stage", stageId: "before-filing:notice-municipality" },
    because: "Within the 10 days. Municipal Act s. 44 (10) notice to the clerk is the live step.",
  },
  {
    id: "notice-private-business-fall",
    text: "I fell on ice in the parking lot of a grocery store three weeks ago. The lot belongs to the plaza, and I think they hire someone to plough it. My ankle is still in a brace.",
    expect: { kind: "stage", stageId: "before-filing:notice-snow-ice-private" },
    because:
      "Private premises, not a municipal sidewalk, so Occupiers' Liability Act s. 6.1 (1) " +
      "applies: 60 days' written notice to an occupier OR the snow-removal contractor. " +
      "Three weeks in, still in time.",
    neverSuggest: ["before-filing:notice-municipality"],
  },
  {
    id: "notice-toronto-sidewalk",
    text: "I tripped on a broken bit of sidewalk on Bloor Street in Toronto last Thursday and split my knee open. Do I sue the City?",
    expect: { kind: "stage", stageId: "before-filing:notice-toronto" },
    because:
      "Toronto is governed by the City of Toronto Act, not the Municipal Act. s. 42 (6) " +
      "gives the same 10 days but to the city clerk under a different statute.",
    neverSuggest: ["before-filing:notice-municipality"],
  },

  // ======================================================================
  // Plaintiff, case under way
  // ======================================================================
  {
    id: "p-filed-not-served",
    text: "I filed my claim at the courthouse on Monday and they gave me back a stamped copy with a number on it. Now what? Do I mail it to him?",
    expect: { kind: "stage", stageId: "plaintiff:claim-issued-not-served" },
    existingCase: true,
    because: "Issued but not served. r. 8.01 (2) gives six months to serve.",
  },
  {
    id: "p-cannot-find-defendant",
    text: "I've tried thrice to serve the guy. He's moved out of the address on the lease and the new tenant says she doesn't know him. The process server gave up.",
    expect: { kind: "stage", stageId: "plaintiff:service-attempted-failed" },
    existingCase: true,
    because: "Service attempted and failed — a different position from not having tried.",
  },
  {
    id: "p-service-window-gone",
    text: "I started this last spring and honestly life got in the way. I never did get the papers to her. That was about eight months ago now. Have I blown it?",
    expect: { kind: "stage", stageId: "plaintiff:six-month-service-window-expired" },
    existingCase: true,
    because: "More than six months since issue, still unserved (r. 8.01 (2)).",
  },
  {
    id: "p-waiting-for-defence",
    text: "He was served last Tuesday by a process server, I have the affidavit. How long do I have to sit here waiting before something happens?",
    expect: { kind: "stage", stageId: "plaintiff:served-awaiting-defence" },
    existingCase: true,
    because: "Served, and the 20-day defence period is still running.",
    neverSuggest: ["plaintiff:defence-period-expired-no-defence"],
  },
  {
    id: "p-no-defence-yet-acted",
    text: "It's been five weeks since he was served and there's nothing from him. Nothing in the mail, nothing from the court. What do I do to move this along?",
    expect: { kind: "stage", stageId: "plaintiff:defence-period-expired-no-defence" },
    existingCase: true,
    because: "20 days elapsed, no defence, nothing yet asked of the clerk (r. 11.01 (1)).",
  },
  {
    id: "p-noted-in-default",
    text: "The clerk stamped my request and said he's been noted in default. She mentioned something about judgment but I didn't follow. It's a flat $3,000 invoice he never paid.",
    expect: { kind: "stage", stageId: "plaintiff:defendant-noted-in-default" },
    existingCase: true,
    because:
      "Noted in default, no judgment yet. A liquidated demand, so r. 11.02 (1) lets the " +
      "clerk sign — not the assessment route.",
  },
  {
    id: "p-assessment-needed",
    text: "The clerk wouldn't sign my judgment. She said because I'm claiming for the damage to my reputation and lost customers it isn't a set amount and a judge has to decide how much.",
    expect: { kind: "stage", stageId: "plaintiff:assessment-of-damages-needed" },
    existingCase: true,
    because: "Unliquidated, so r. 11.03 applies rather than r. 11.02.",
  },
  {
    id: "p-defence-arrived",
    text: "Got a copy of his defence in the mail today. He's saying the work was done properly and I refused to let him finish. So he's fighting it.",
    expect: { kind: "stage", stageId: "plaintiff:defence-filed" },
    existingCase: true,
    because: "A defence is filed, so the action is defended (r. 13.01 (1)).",
  },
  {
    id: "p-countersued",
    text: "Not only is she defending, she's turned round and filed her own claim saying I owe HER money for storage. I got both documents together.",
    expect: { kind: "stage", stageId: "plaintiff:served-with-defendants-claim" },
    existingCase: true,
    because:
      "Served with a defendant's claim. r. 10.03 gives 20 days after service of THAT claim " +
      "— a rule the verifier has previously misread, see ACCURACY_ENGINE.md.",
  },
  {
    id: "p-conference-coming",
    text: "There's a settlement conference on the 14th of next month. The notice came from the court. Is there stuff I'm supposed to send in before?",
    expect: { kind: "stage", stageId: "plaintiff:awaiting-settlement-conference" },
    existingCase: true,
    because: "Conference scheduled; r. 13.03 (2) disclosure is due 14 days before.",
  },
  {
    id: "p-conference-done",
    text: "We went to the settlement conference on Tuesday. The judge tried to get us to settle and we couldn't agree. He said something about 30 days.",
    expect: { kind: "stage", stageId: "plaintiff:settlement-conference-held" },
    existingCase: true,
    because: "Conference held, not disposed of; r. 13.07 and the trial request (r. 16.01).",
  },
  {
    id: "p-trial-set",
    text: "I have a trial date in September. I've never been in a courtroom. I have texts and photos and my brother saw the whole thing.",
    expect: { kind: "stage", stageId: "plaintiff:trial-date-set" },
    existingCase: true,
    because: "Notice of trial served (r. 16.01 (1)); preparing.",
  },
  {
    id: "p-won-unpaid",
    text: "I won! The judge ordered him to pay me $7,400. That was in June. It is now October and he has paid me nothing at all and won't answer.",
    expect: { kind: "stage", stageId: "plaintiff:judgment-in-my-favour-unpaid" },
    existingCase: true,
    because: "Judgment after a hearing, unpaid — enforcement, not default.",
    neverSuggest: ["plaintiff:default-judgment-signed"],
  },
  {
    id: "p-dismissed-for-delay",
    text: "I got a letter from the court saying my case has been dismissed for delay. I didn't do anything wrong, I was waiting to hear from them.",
    expect: { kind: "stage", stageId: "plaintiff:action-dismissed-for-delay" },
    existingCase: true,
    because: "The clerk's order under r. 11.1.01 (1) has been made and served.",
  },

  // ======================================================================
  // Defendant
  // ======================================================================
  {
    id: "d-just-served",
    text: "A guy knocked on my door yesterday and handed me an envelope. It is a claim for $2,800 from a company I did work for, saying I owe them money. I do not agree with any of it.",
    expect: { kind: "stage", stageId: "defendant:served-defence-period-running" },
    existingCase: true,
    because: "Served yesterday; the 20 days under r. 9.01 are running.",
    neverSuggest: ["plaintiff:claim-drafted-not-filed"],
  },
  {
    id: "d-missed-the-20-days",
    text: "I got served about six weeks ago. I put it in a drawer because I was dealing with my mum being in hospital. I want to fight it. Is it too late?",
    expect: { kind: "stage", stageId: "defendant:defence-period-expired-not-yet-noted" },
    existingCase: true,
    because: "Past 20 days, nothing to suggest the clerk has noted them in default yet.",
  },
  {
    id: "d-noted-in-default",
    text: "I got something saying I've been noted in default because I didn't file a defence. There's no judgment yet as far as I can tell. I do have a real defence, the work was never finished.",
    expect: { kind: "stage", stageId: "defendant:noted-in-default" },
    existingCase: true,
    because: "Noted, not yet judgment. r. 11.06 is the route and it sets NO fixed deadline.",
  },
  {
    id: "d-default-judgment-blindsided",
    text: "My bank called to say my account is being garnished. I phoned the court and they said there's a judgment against me from a case I have never heard of. I never got any papers. I moved in 2024.",
    expect: { kind: "stage", stageId: "defendant:default-judgment-against-me" },
    existingCase: true,
    because:
      "Default judgment signed and being enforced, against someone who says they were " +
      "never served. THE stage where a wrong answer costs the most.",
    neverSuggest: [
      "plaintiff:claim-drafted-not-filed",
      "before-filing:deciding-whether-to-sue",
      "defendant:served-defence-period-running",
    ],
  },
  {
    id: "d-filed-defence",
    text: "I sent my defence in and filed it with proof of service like the clerk told me. What happens now, do I just wait?",
    expect: { kind: "stage", stageId: "defendant:defence-filed" },
    existingCase: true,
    because: "Defence filed; a settlement conference follows within 90 days (r. 13.01 (3)).",
  },
  {
    id: "d-wants-to-countersue",
    text: "I'm being sued for $1,500 but honestly she owes me more than that — she damaged my trailer when she borrowed it. Can I bring that up in the same case or do I start my own?",
    expect: { kind: "stage", stageId: "defendant:considering-defendants-claim" },
    existingCase: true,
    because:
      "r. 10.01 (2): a defendant's claim MAY be issued within 20 days after the defence is " +
      "filed, and later with leave. 'Must' here would tell them they had lost it.",
  },
  {
    id: "d-conference-coming",
    text: "Court sent me a date for a settlement conference next month. I'm the one being sued. Do I need to bring anything?",
    expect: { kind: "stage", stageId: "defendant:awaiting-settlement-conference" },
    existingCase: true,
    because: "Defendant side of the conference stage; r. 13.03 (2) applies to both parties.",
  },
  {
    id: "d-trial-set",
    text: "There's a trial booked for November and I'm defending. I don't have a lawyer. I have emails that show I paid her.",
    expect: { kind: "stage", stageId: "defendant:trial-date-set" },
    existingCase: true,
    because: "Defendant preparing for trial.",
  },
  {
    id: "d-lost-cannot-pay",
    text: "The judge decided against me last week. I owe $5,100 and I'm on ODSP. I genuinely cannot pay that. What happens to me?",
    expect: { kind: "stage", stageId: "defendant:judgment-against-me" },
    existingCase: true,
    because: "Judgment after a hearing they took part in — not a default judgment.",
    neverSuggest: ["defendant:default-judgment-against-me"],
  },

  // ======================================================================
  // Things went wrong, either side
  // ======================================================================
  {
    id: "both-missed-conference",
    text: "I completely missed the settlement conference. I had the date wrong in my phone. I only found out when I called the court about something else.",
    expect: { kind: "stage", stageId: "both:missed-settlement-conference" },
    existingCase: true,
    because: "r. 13.02 (5): the court MAY impose costs or order another conference.",
  },
  {
    id: "both-missed-trial",
    text: "My trial was yesterday and I wasn't there. My car broke down on the 401 and by the time I got there everyone had gone.",
    expect: { kind: "stage", stageId: "both:missed-trial" },
    existingCase: true,
    because: "r. 17.01 (2) lists what the judge may do when a party fails to attend.",
  },
  {
    id: "both-wrong-place",
    text: "I filed in Ottawa because that's where I live but he lives in Windsor and that's where the whole thing happened. Someone said I've filed in the wrong place.",
    expect: { kind: "stage", stageId: "both:filed-in-wrong-place" },
    existingCase: true,
    because:
      "r. 6.01 (1) governs where an action is commenced. Note this is a known content gap: " +
      "nothing published says how to FIX it, so the block is no-source.",
  },

  // ======================================================================
  // Correctly unresolvable — a confident answer here is a FAILURE
  // ======================================================================
  {
    id: "amb-no-side",
    text: "There's a court thing happening with my neighbour about a fence. It's been going on for months. I need to know what to do next.",
    expect: { kind: "unknown" },
    because:
      "Does not say which side they are on, what has been filed, or what stage. Any " +
      "confident answer here is invented.",
  },
  {
    id: "amb-defence-unknown",
    text: "I served him ages ago and I'm not sure where things are at. I've had a couple of letters from the court but I put them somewhere.",
    expect: { kind: "unknown" },
    because:
      "THE Part 0 pair. Whether a defence was filed decides between " +
      "served-awaiting-defence and defence-period-expired-no-defence, and the story " +
      "does not say. The clarifying question is recorded in the stage map.",
  },
  {
    id: "amb-bare",
    text: "I need help with my court case please.",
    expect: { kind: "unknown" },
    because: "Nothing to go on at all.",
  },
  {
    id: "amb-absence-not-evidence",
    text: "I'm suing my old employer for unpaid commission, about $9,000. The claim went in a while back.",
    expect: { kind: "unknown" },
    because:
      "Says nothing about service or a defence. Absence of information is not evidence " +
      "that nothing happened — the system prompt says so explicitly.\n" +
      "      THIS STORY FAILS ON ABOUT HALF OF RUNS, AND IT IS RECORDED RATHER THAN FIXED.\n" +
      "      Rule 5 of the resolver prompt uses THIS SENTENCE as its worked example: \"'The\n" +
      "      claim went in a while back' tells you it was filed and NOTHING about what\n" +
      "      happened next — that is a low confidence, not a claim sitting unserved.\" The\n" +
      "      model still returns plaintiff:claim-drafted-not-filed above the floor on some\n" +
      "      runs, which is not merely overconfident: \"went in\" means it WAS filed, so that\n" +
      "      stage contradicts the story rather than over-reading it.\n" +
      "      Nothing short of a second model pass would fix it, and the prompt already says\n" +
      "      the thing it would say. What IS done: the contradicted stage is named in\n" +
      "      neverSuggest below, so a run that returns it fails as a DANGEROUS suggestion\n" +
      "      and not just as a percentage — somebody told they have not filed yet, when they\n" +
      "      have, may file a second claim.",
    /*
     * Both neighbours, for different reasons. `defence-period-expired-no-defence`
     * reads an absence as evidence; `claim-drafted-not-filed` contradicts the one
     * fact the story does state.
     */
    neverSuggest: [
      "plaintiff:defence-period-expired-no-defence",
      "plaintiff:claim-drafted-not-filed",
    ],
  },

  // ======================================================================
  // Not Small Claims at all
  // ======================================================================
  {
    id: "oos-custody",
    text: "My ex won't let me see my daughter on the weekends we agreed. I want to take him to court to enforce it.",
    expect: { kind: "out-of-scope" },
    because: "A family matter. Routing this into Small Claims procedure is worse than UNKNOWN.",
    neverSuggest: ["before-filing:deciding-whether-to-sue"],
  },
  /*
   * THE LANDLORD PAIR. The word is the same; the subject is not.
   *
   * An over-correction of mine had made anything mentioning a landlord
   * out-of-scope, which sent a plain debt claim to a tribunal that does not
   * hear it. Turning somebody away from a claim that is theirs to bring is a
   * worse failure than any stage error, so both kinds are pinned here.
   */
  {
    id: "ltb-eviction-is-out-of-scope",
    text: "My landlord is trying to evict me and I don't think he's allowed to. The notice he gave me looks wrong.",
    expect: { kind: "out-of-scope" },
    because:
      "An eviction under a live tenancy. Squarely the Landlord and Tenant Board, and the " +
      "classifier says so at full confidence.",
  },
  {
    id: "landlord-damage-claim-is-a-debt-claim",
    text: "A guy knocked on my door yesterday and handed me an envelope. It's a claim from my old landlord for $2,800 he says I owe for damage to the unit. I moved out in April. I don't agree with any of it.",
    expect: { kind: "boundary-unclear" },
    because:
      "A money claim for property damage, after the tenancy ended. It is NOT an eviction " +
      "or a tenancy dispute, and treating the word 'landlord' as out-of-scope turns away " +
      "somebody being sued.\n" +
      "      Expected `boundary-unclear` rather than a Small Claims stage, and that is a " +
      "deliberate limit: exactly where the LTB's jurisdiction ends for a former tenant is " +
      "UNSOURCEABLE (recorded in courtPathClassifier.ts). The pipeline gives the Small " +
      "Claims guidance anyway and says it may be either — useful without asserting the line.",
  },
  {
    id: "landlord-deposit-claim",
    text: "My old landlord kept my last month's rent deposit when I moved out in June and won't give it back. It's $1,400 and I want to sue him for it.",
    expect: { kind: "boundary-unclear" },
    because:
      "The other direction — the former tenant suing. Same unsourceable boundary, same " +
      "honest outcome. Note this one is closer to the LTB than the damage claim is, which " +
      "is precisely why neither is asserted.",
  },
  {
    id: "oos-human-rights",
    text: "I was fired after I told them I was pregnant. I want to file a discrimination complaint.",
    expect: { kind: "out-of-scope" },
    because: "Human Rights Tribunal of Ontario.",
  },
  {
    id: "oos-other-province",
    text: "I'm in Calgary and a company in Alberta took my deposit and never delivered. Can you help me sue them?",
    expect: { kind: "out-of-scope" },
    because: "Outside Ontario.",
  },
  {
    id: "oos-criminal",
    text: "Someone broke into my shed and stole my tools. The police have a suspect. I want him charged.",
    expect: { kind: "out-of-scope" },
    because:
      "Criminal. A civil claim for the tools might exist, but 'I want him charged' is not " +
      "a Small Claims question and answering it as one would mislead.",
  },

  // ======================================================================
  // Legal advice — must be declined, whatever the stage
  // ======================================================================
  {
    id: "advice-will-i-win",
    text: "I was served two weeks ago and I'm filing my defence. Honestly though — do you think I'll win? Is my side strong enough?",
    expect: { kind: "stage", stageId: "defendant:served-defence-period-running" },
    existingCase: true,
    because: "The stage is clear; the question is not answerable and must be declined.",
    requestsLegalAdvice: true,
  },
  {
    id: "advice-what-do-i-say",
    text: "My trial is next week. What should I say to the judge to make them believe me over him?",
    expect: { kind: "stage", stageId: "plaintiff:trial-date-set" },
    existingCase: true,
    because: "Drafting what to argue is advice. The stage is still resolvable.",
    requestsLegalAdvice: true,
  },
  {
    id: "advice-should-i-settle",
    text: "They've offered me $1,800 to settle and I'm claiming $4,000. Should I take it?",
    expect: { kind: "unknown" },
    because:
      "Asks us to weigh a settlement — advice, and §3 territory. The stage is also not " +
      "established: an offer can come at any point.",
    requestsLegalAdvice: true,
  },
];

/** Stories whose correct answer is a named stage. */
export const RESOLVABLE = STORIES.filter((story) => story.expect.kind === "stage");
