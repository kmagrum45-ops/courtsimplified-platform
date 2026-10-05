/**
 * Authored profiles whose pre-suit step is a NOTICE THAT DOES NOT BAR THE CLAIM.
 *
 * The claim-barring tier (claimBarringProfiles.ts) holds the notices whose
 * absence ends the action. This file holds the next tier: a notice the law
 * requires before suing, where missing it changes what happens next (costs,
 * interest) but does not stop the case. Kept apart so "claimBarring: false"
 * never sits in a list whose whole meaning is "missing this is fatal".
 *
 * 2026-10-05. Added from a live run: a pedestrian hit by a city bus was shown
 * only the general two-year limitation, because no profile covered an injury
 * from a vehicle. Insurance Act s. 258.3 applies to any bodily injury or death
 * "arising directly or indirectly from the use or operation of an automobile".
 */

import * as C from "../stage-map/citations";
import type { ClaimTypeProfile } from "./claimTypeProfile";

export const NOTICE_PROFILES: ClaimTypeProfile[] = [
  {
    id: "sc-claim-motor-vehicle-injury",
    family: "injury",
    name: "An injury from a car, truck, bus or other vehicle",
    contentStatus: "authored",
    alsoRelevantTo: ["sc-claim-injury-on-public-transit", "sc-claim-escooter-bicycle-or-pedestrian-collision"],
    sides: {
      bringing: "the person injured — a pedestrian, cyclist, passenger or driver",
      defending: "the vehicle's owner or driver, which can be a business or a municipality that runs a transit service",
    },
    forum: { kind: "small-claims", because: C.S_MONETARY_LIMIT },
    notices: [
      {
        stageId: "before-filing:notice-vehicle-injury",
        countFromEvent: "injury-occurred",
        because: C.S_INSURANCE_258_3_1_NOTICE,
        claimBarring: false,
      },
    ],
    limitationNote: {
      because: C.S_LIMITATIONS_4_BASIC,
      runsFrom: "the day the claim was discovered, which the Act defines separately",
    },
    gather: [
      "the date, time and exact place it happened",
      "the vehicle's licence plate, and for a bus the route number and time",
      "the name of anyone who saw it",
      "any police report number",
      "hospital and medical records, X-rays and receipts",
      "the date you applied for accident benefits, and to whom",
      "a copy of the notice of your intention to sue, and how and when it was served",
    ],
    sourceIds: ["insurance-act", "negligence-act", "limitations-act-2002", "legislation-act-2006"],
    scenarios: [
      "I was hit by a bus while waiting to cross at a crosswalk and dislocated my shoulder",
      "A car turned into me while I was crossing the street and I broke my leg",
      "A driver opened a door into me while I was cycling and I was hurt",
      "I was a passenger and got injured when the driver rear-ended another car",
      "A delivery truck backed into me in a parking lot and I hurt my back",
    ],
  },
];
