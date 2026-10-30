/**
 * The sentences the danger screens are held to, in one place (data only; no checks run
 * on import). verifyChrome29octSafety.ts holds storySuggestsDanger (the safety question
 * and the case file's Safety line) to MUST_FLAG / MUST_NOT_FLAG; verifySafetyFooter.ts
 * holds the emergency notice's rule (storyNamesPresentDanger) to the same lists plus
 * NOTICE_MUST_SHOW / NOTICE_MUST_NOT_SHOW (site owner, 2026-10-30).
 */
export const MUST_FLAG = [
  "he hit me",
  "I'm afraid of him",
  "He threatened me last week.",
  "He said he would kill me.",
  "He never hit me until last month, and now he does when he drinks.",
  "There was no violence before, but he hit me on Sunday.",
  "I'm scared he'll take the kids and not come back.",
  "He is not violent with the kids but he hits me.",
  "I don't feel safe at home.",
  "I'm not safe with him.",
  "He follows me to work.",
  // Owner, 29 Oct: a threat with a denial in the same sentence is still a threat. When unsure, flagged.
  "he threatens me but no violence yet",
];
export const MUST_NOT_FLAG = [
  "No violence. He's a good dad just unreliable.",
  "He never hit me.",
  "There has never been any violence.",
  "He's not violent, just late with payments.",
  "I'm not afraid of him, I just want a schedule.",
  "No threats, no abuse, he's just disorganized.",
  "There is no abuse in our relationship.",
  "The bakery invoice for the wedding cake is still unpaid.",
];

/** The owner's rule of 2026-10-30: the person is in danger, afraid for their safety, or threatened or hurt now. */
export const NOTICE_MUST_SHOW = [
  "He threatened me and I'm scared.",
  "I don't feel safe at home.",
  "Synthetic story: my former landlord threatened me when I asked for my $1,500 deposit back in June 2026. I am scared to go back there. I have the lease.",
  "Synthetic story: my former business partner threatened me after I asked for the $80,000 he owes me under our agreement in May 2026. I am afraid of him. I have the agreement.",
  "Synthetic story: we separated in May 2026. He threatened me in front of our son, age 6, and I am scared to meet him alone. I want a parenting order.",
  "He hit me years ago, and last week he came to my door and hit me again.",
];
/** Past events with no present danger, ordinary conflict, legal threats, a Family case on its own. */
export const NOTICE_MUST_NOT_SHOW = [
  "The customer threatened to sue me over the invoice.",
  "He threatened me with a lawsuit if I did not pay.",
  "Synthetic story: our relationship ended last year. We have two children, ages 4 and 7, who live with me. I want child support; he has paid nothing since March 2026.",
  "He hit me years ago; we have not spoken since.",
  "He was abusive when we were together, but I moved out in 2019 and we have no contact.",
  "There was violence in our marriage. We divorced in 2015.",
  "I'm afraid I lost the receipt.",
  "I'm afraid of losing my deposit.",
  "He got a restraining order against his brother in 2019.",
  "My neighbour is angry about the fence and we argue about it.",
];
