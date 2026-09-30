/**
 * THE CLAIM-BARRING TIER — authored first, because getting these late is fatal.
 *
 * Every other deadline in this product changes what a person can do next. Miss one
 * of these and, subject to the statute's own exceptions, there is no action at all.
 * A user who fell on an icy municipal sidewalk on 1 December and arrives here on
 * 15 February has already lost the claim, and nothing would have told them.
 *
 * They are also the deadlines a self-represented person is least likely to know
 * exist. Nobody expects a ten-day clock on a fall.
 *
 * *** WHY THESE SEVEN, IN THIS ORDER ***
 *
 * Ranked by how badly silence hurts. A notice measured in DAYS from the incident
 * comes before one measured in weeks, and a hard limitation running from a date the
 * user cannot change comes before a discoverable one.
 *
 * *** WHAT IS DELIBERATELY NOT HERE ***
 *
 * No prose. Each profile names the stage that carries its content, the provision
 * that creates the bar, and the corpus sources a drafter may quote. The sentences
 * are Part C.
 *
 * And no arithmetic about any user. `limitationNote.runsFrom` says what the clock
 * runs from; it never says whether a particular person is out of time. That is
 * applying law to facts, and `before-filing:limitation-period-may-have-passed`
 * exists to route them to somebody who may do it.
 */

import * as C from "../stage-map/citations";
import type { ClaimTypeProfile } from "./claimTypeProfile";

export const CLAIM_BARRING_PROFILES: ClaimTypeProfile[] = [
  // ---------------------------------------------------------------------------
  // 1. Municipal sidewalk, road or bridge — TEN DAYS
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-fall-municipal-sidewalk-or-road",
    family: "injury",
    name: "A fall on a city sidewalk, road or bridge",
    contentStatus: "authored",
    alsoRelevantTo: ["sc-claim-slip-and-fall-occupier-liability"],
    sides: {
      bringing: "the person who fell",
      defending: "a municipality, and sometimes an adjacent owner as well",
    },
    forum: { kind: "small-claims", because: C.S_MONETARY_LIMIT },
    notices: [
      {
        stageId: "before-filing:notice-municipality",
        countFromEvent: "injury-occurred",
        because: C.S_MUNICIPAL_44_10_NOTICE,
        claimBarring: true,
      },
    ],
    limitationNote: {
      because: C.S_LIMITATIONS_4_BASIC,
      runsFrom: "the day the claim was discovered, which the Act defines separately",
    },
    gather: [
      "the exact place — an address, an intersection, or a photograph showing where",
      "the date and the time of day",
      "photographs of the spot, taken as soon as possible",
      "the name of anyone who saw it",
      "any report made to the municipality, and the date it was made",
      "medical records showing what was treated and when",
    ],
    sourceIds: ["municipal-act-2001", "occupiers-liability-act", "limitations-act-2002"],
    wentWrongStageIds: ["before-filing:notice-deadline-missed"],
    intakeQuestionIds: ["municipality"],
    scenarios: [
      "I tripped on a broken sidewalk downtown and broke my wrist",
      "There was a pothole in the road and I fell off my bike",
      "I slipped where the sidewalk had heaved up and hurt my knee",
      "I fell on a city walkway and the city says it is not their problem",
      /*
       * REPLACED in the full scenario review. Was "I hurt my ankle on a loose
       * paving stone outside the library". A library forecourt is the
       * institution's own land, not a highway or sidewalk, so the s. 44 regime
       * is the wrong one — that is an occupier's liability matter. Training the
       * classifier toward a 10-day municipal notice for it would attach the
       * wrong deadline to the wrong defendant.
       */
      "I tripped where the city sidewalk had cracked apart and hurt my ankle",
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. The same fall, in Toronto — TEN DAYS, different statute
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-fall-toronto-sidewalk-or-road",
    family: "injury",
    name: "A fall on a Toronto sidewalk, road or bridge",
    contentStatus: "authored",
    alsoRelevantTo: ["sc-claim-slip-and-fall-occupier-liability"],
    sides: {
      bringing: "the person who fell",
      defending: "the City of Toronto",
    },
    forum: { kind: "small-claims", because: C.S_MONETARY_LIMIT },
    notices: [
      {
        stageId: "before-filing:notice-toronto",
        countFromEvent: "injury-occurred",
        because: C.S_TORONTO_42_6_NOTICE,
        claimBarring: true,
      },
    ],
    limitationNote: {
      because: C.S_LIMITATIONS_4_BASIC,
      runsFrom: "the day the claim was discovered, which the Act defines separately",
    },
    gather: [
      "the exact place — an address, an intersection, or a photograph showing where",
      "the date and the time of day",
      "photographs of the spot, taken as soon as possible",
      "the name of anyone who saw it",
      "any report made to the City, and the date it was made",
      "medical records showing what was treated and when",
    ],
    sourceIds: ["city-of-toronto-act-2006", "occupiers-liability-act", "limitations-act-2002"],
    wentWrongStageIds: ["before-filing:notice-deadline-missed"],
    /*
     * The municipality is a CONFIRMED FACT or this profile does not apply.
     * `before-filing:notice-toronto` carries requiresConfirmedFact for the same
     * reason: Toronto has its own statute, and a model that infers "city sidewalk"
     * means Toronto would cite the wrong Act to everyone else in Ontario.
     */
    intakeQuestionIds: ["municipality"],
    scenarios: [
      "I fell on a sidewalk in Toronto and hurt my shoulder",
      /*
       * REPLACED. Was "a broken curb on Queen Street". There is a Queen Street in
       * a great many Ontario municipalities, so the scenario carries NO signal
       * that this is Toronto — and Toronto has its own statute. A scenario that
       * cannot identify the municipality does not belong on the Toronto profile.
       */
      "I tripped on a broken curb in downtown Toronto and needed stitches",
      "There was ice on a Toronto sidewalk and I fell and cracked a rib",
      "I hurt myself on a raised sidewalk slab in Scarborough",
      "I fell on a bridge walkway in Toronto and the City has not replied",
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Snow and ice on private or commercial property — SIXTY DAYS
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-fall-snow-ice-private-property",
    family: "injury",
    name: "A fall on snow or ice on private or business property",
    contentStatus: "authored",
    existingClaimTypeId: "sc-claim-slip-and-fall-occupier-liability",
    sides: {
      bringing: "the person who fell",
      defending:
        "whoever occupied the place, which can be more than one party — an owner, a tenant, and a snow-clearing contractor",
    },
    forum: { kind: "small-claims", because: C.S_MONETARY_LIMIT },
    notices: [
      {
        stageId: "before-filing:notice-snow-ice-private",
        countFromEvent: "injury-occurred",
        because: C.S_OLA_6_1_NOTICE,
        claimBarring: true,
      },
    ],
    limitationNote: {
      because: C.S_LIMITATIONS_4_BASIC,
      runsFrom: "the day the claim was discovered, which the Act defines separately",
    },
    gather: [
      "the exact place, and whose property it was if known",
      "the date and the time of day",
      "photographs of the snow or ice, taken as soon as possible",
      "the weather that day, and when it last snowed or froze",
      "the name of any business at that address",
      "the name of anyone who saw it",
      "medical records showing what was treated and when",
    ],
    /*
     * s. 6.1 (2) matters as much as s. 6.1 (1): notice goes to EACH occupier and
     * each contractor, and a user who serves the shop but not the snow contractor
     * has served one of the people they need to.
     */
    sourceIds: ["occupiers-liability-act", "limitations-act-2002"],
    wentWrongStageIds: ["before-filing:notice-deadline-missed"],
    scenarios: [
      "I slipped on ice in a grocery store parking lot and hurt my back",
      "I fell on an unsalted walkway outside my apartment building",
      "There was black ice at the entrance to a restaurant and I fell",
      "I slipped on snow the plaza had not cleared and broke my elbow",
      "I fell on ice outside a shop and the landlord says the contractor is responsible",
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. A claim against the Province — SIXTY DAYS BEFORE STARTING, or TEN AFTER
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-against-the-crown-ontario",
    family: "other",
    name: "A claim against the Ontario government",
    contentStatus: "authored",
    sides: {
      bringing: "the person claiming",
      defending: "the Crown in right of Ontario",
    },
    forum: { kind: "small-claims", because: C.S_MONETARY_LIMIT },
    /*
     * *** THIS NOTICE IS THE OPPOSITE SHAPE TO THE OTHERS ***
     *
     * The municipal and snow-and-ice notices run FROM the incident: serve within N
     * days or the claim is barred. s. 18 (1) runs the other way — notice must be
     * served at least sixty days BEFORE the proceeding starts. It is a waiting
     * period, not a reporting deadline, and a user who serves notice and files the
     * next day has the same problem as one who never served it.
     *
     * s. 18 (4) then inverts again for a property-duty claim: ten days AFTER the
     * event. Same section, both shapes.
     *
     * countFromEvent is `action-commenced` because that is the event the sixty days
     * are measured against. The engine counts backward from it.
     */
    notices: [
      {
        stageId: "before-filing:deciding-whether-to-sue",
        countFromEvent: "action-commenced",
        because: C.S_CLPA_18_1_NOTICE,
        claimBarring: true,
      },
    ],
    limitationNote: {
      because: C.S_CLPA_18_3_EXTENSION,
      runsFrom:
        "the limitation period for the claim itself, which s. 18 (3) extends by seven days past the end of the sixty-day period in defined circumstances",
    },
    gather: [
      "which ministry or agency, and the name of anyone dealt with",
      "the date of the event the claim is about",
      "every letter, email or reference number",
      "the date any notice of claim was served, and how",
    ],
    sourceIds: ["crown-liability-and-proceedings-act-2019", "limitations-act-2002"],
    scenarios: [
      "A provincial inspector damaged my equipment and the ministry will not pay",
      /*
       * REPLACED. Was "sue a provincial agency over money they took", which is
       * vague twice over: money taken by a public body is often a fee or tax
       * dispute with its own appeal route, and many provincial agencies are
       * separate legal entities rather than the Crown, so s. 18 may not apply at
       * all.
       */
      "A ministry damaged my property while doing work and will not pay for it",
      /*
       * Replaced during the 10% scenario review. The original read "The province
       * cancelled my licence and it cost me income", which is the wrong shape for
       * this profile: challenging a licensing DECISION is a judicial review matter,
       * not a damages claim, and nothing in the vendored Crown Liability and
       * Proceedings Act establishes otherwise. A scenario that trains the
       * classifier toward this profile for a judicial review question would route
       * somebody to the wrong court with a sixty-day notice they do not need.
       */
      "A provincial office lost documents I sent and I had to pay to replace them",
      /*
       * REPLACED. Was "a government road crew wrecked my fence". Road crews are
       * usually MUNICIPAL, and this profile carries the Crown's 60-days-BEFORE
       * notice while a municipality carries a 10-days-after one. Getting that
       * backwards is the most expensive confusion available in this tier, so the
       * scenario now names a provincial highway explicitly.
       */
      "A crew working on a provincial highway damaged my fence",
      "I was told to claim against the Ontario government but do not know how to start",
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. Defamation in a newspaper or broadcast — SIX WEEKS, THREE MONTHS
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-defamation-newspaper-or-broadcast",
    family: "other",
    name: "Something untrue said about you in a newspaper or on a broadcast",
    contentStatus: "authored",
    existingClaimTypeId: "sc-claim-defamation-libel-slander",
    sides: {
      bringing: "the person written or spoken about",
      defending: "the newspaper or broadcaster, and sometimes a named writer",
    },
    forum: { kind: "small-claims", because: C.S_MONETARY_LIMIT },
    /*
     * *** THE SCOPE PROVISION IS AS IMPORTANT AS THE DEADLINE ***
     *
     * ss. 5 (1) and 6 apply ONLY to newspapers printed and published in Ontario and
     * to broadcasts from a station in Ontario (s. 7). A profile that told everybody
     * defamed online they had six weeks would frighten people who do not have that
     * problem; one that told a newspaper case it had the ordinary period would end
     * the claim. Both errors are available from the same statute, which is why
     * S_LS_7_SCOPE is a source here and not a footnote.
     *
     * A Facebook post is a different matter and a different profile, declared and
     * unauthored below.
     */
    notices: [
      {
        stageId: "before-filing:deciding-whether-to-sue",
        countFromEvent: "claim-discovered",
        because: C.S_LS_5_1_NOTICE,
        claimBarring: true,
      },
    ],
    limitationNote: {
      because: C.S_LS_6_LIMITATION,
      runsFrom: "the day the libel came to the knowledge of the person defamed",
    },
    gather: [
      "a copy of what was published, with the date",
      "the name of the newspaper, station or programme",
      "the date you first saw or heard it",
      "the date any written notice was given, and how",
      "anything showing what it cost you",
    ],
    sourceIds: ["libel-and-slander-act", "limitations-act-2002"],
    intakeQuestionIds: ["limitation-if-newspaper-or-broadcast"],
    scenarios: [
      "A local paper printed something false about my business",
      "A radio station said I had been charged with something I was not",
      "My name was in a newspaper story that was wrong and customers left",
      "A TV segment accused me of something untrue",
      "An Ontario newspaper published a false claim about me last month",
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. A claim involving someone who has died — TWO YEARS FROM THE DEATH
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-by-or-against-an-estate",
    family: "other",
    name: "Money owed by or to someone who has died",
    contentStatus: "authored",
    sides: {
      bringing: "the person owed, or the estate trustee",
      defending: "the estate trustee, or the person who owes the estate",
    },
    forum: { kind: "small-claims", because: C.S_MONETARY_LIMIT },
    /*
     * *** WHY THIS IS IN THE CLAIM-BARRING TIER WITH NO NOTICE PROVISION ***
     *
     * There is no pre-suit notice. The bar is the limitation itself: s. 38 (3) runs
     * TWO YEARS FROM THE DEATH. That is a date the user cannot influence and may not
     * think of as the start of anything, and it is shorter in effect than the
     * general period because it does not wait for discovery.
     *
     * Nothing here tells a user whether their time has run. The profile's job is to
     * make sure the date of death is in the file and the question is asked.
     */
    limitationNote: {
      because: C.S_TRUSTEE_38_3_LIMITATION,
      runsFrom: "the death of the deceased",
    },
    gather: [
      "the date of death",
      "the name of the estate trustee, if known",
      "whatever records the debt — an agreement, an invoice, messages",
      "any correspondence with the estate",
    ],
    sourceIds: ["trustee-act", "limitations-act-2002"],
    scenarios: [
      "My uncle owed me money and he died last year",
      "I lent money to someone who has since passed away",
      "The estate says it will not pay an invoice my company is owed",
      "Someone who died damaged my car and nothing was ever settled",
      "I am the estate trustee and somebody owes the estate money",
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. The notice already missed
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-notice-deadline-already-missed",
    family: "defendant-side",
    name: "A notice deadline that has already gone by",
    contentStatus: "authored",
    sides: {
      bringing: "the person who did not give notice in time",
      defending: "the municipality, occupier or Crown who says notice was required",
    },
    forum: { kind: "small-claims", because: C.S_MONETARY_LIMIT },
    /*
     * *** THIS PROFILE EXISTS SO THE ANSWER IS NOT "YOU HAVE LOST" ***
     *
     * Every one of these statutes carries its own exceptions, and they are the whole
     * reason this is a position rather than an ending: death, and a reasonable excuse
     * coupled with no prejudice. A profile that stated the deadline without the
     * exceptions would turn a hard case into a closed one, which is worse than
     * saying nothing.
     *
     * It states that the exceptions exist and that only a licensee can say whether
     * one applies. It does not assess whether an excuse is reasonable — that is
     * applying law to facts, CLAUDE.md §2.
     */
    wentWrongStageIds: ["before-filing:notice-deadline-missed"],
    limitationNote: {
      because: C.S_MUNICIPAL_44_12_EXCUSE,
      runsFrom:
        "the notice period that was missed; the statutes provide exceptions the court may apply",
    },
    gather: [
      "the date of the incident",
      "the date anything was first reported, to anyone, and how",
      "why notice was not given sooner — in the user's own words, recorded not assessed",
      "anything showing the other side already knew",
    ],
    sourceIds: [
      "municipal-act-2001",
      "city-of-toronto-act-2006",
      "occupiers-liability-act",
      "crown-liability-and-proceedings-act-2019",
    ],
    scenarios: [
      "I fell three months ago and only just found out I was supposed to tell the city",
      "Nobody told me there was a ten day deadline",
      "I reported it to the store but never wrote to the city",
      "I was in hospital and could not send a letter in time",
      "The city says I am too late but they came and fixed the sidewalk right after",
    ],
  },
];
