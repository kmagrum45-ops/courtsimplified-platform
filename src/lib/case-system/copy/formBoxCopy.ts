/**
 * WHY A BOX OF A FILLED FORM IS LEFT BLANK: the words shown beside the box, by id (site owner, 22 Nov 2026: text a person
 * sees goes in the shared copy files by id, never typed into a screen). Started with Form 10A (maps/form10A.ts, 26 Nov
 * 2026); the older maps still hold their own reasons and move here when they are next changed.
 *
 * Plain product words: none states law, a deadline or what any box means in law. Pure.
 */
export const FORM_BOX_WHY = {
  claimNumberNotHeld: "The claim number is not held in the case record yet. Fill it in by hand.",
  courtOfficeNotHeld: "The court office is not held in the case record yet. Fill it in by hand.",
  ageNotAsked: "The site does not ask a party's age. If this party is under 18, tick the box by hand.",
  othersOnYourSideNotHeld: "Whether anyone else on your side makes this claim with you is not held in the case record yet. If they do, tick the box by hand and attach Form 1A.",
  onlyWhenYouAreTheDefendant: "Filled from the case record only when it says you are the defendant.",
  againstWhomNotHeld: "Who your claim is against is not held in the case record yet. Fill in that party's details by hand.",
  ownClaimReasonsNotHeld: "The reasons for your own claim are not held in the case record yet. Write them in your own words.",
  ownClaimAmountNotHeld: "How much your own claim is for is not held in the case record yet. Fill it in by hand.",
  interestNoWording: "Whether to claim prejudgment interest, and from what date, is not asked: the site has no checked wording for it yet.",
  interestUnderNoWording: "Which interest the claim is under is not asked: the site has no checked wording for it yet.",
  interestRateNoWording: "An agreed interest rate is not asked: the site has no checked wording for it yet.",
  pagesAttachedByHand: "Tick by hand if you attach pages.",
  writtenOnTheDay: "Written by hand on the day you sign.",
  signedByHand: "Signed by hand.",
  forTheCourtOffice: "For the court office.",
} as const;

export type FormBoxWhyId = keyof typeof FORM_BOX_WHY;
