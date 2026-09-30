/**
 * The overview shows what fits the claim the user confirmed, and nothing is
 * silently dropped or reworded.
 *
 * COSTS NOTHING. Pure functions and source files.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - a route is hidden when NO claim type was confirmed (the list must stay
 *     complete until the user has said what kind of claim this is);
 *   - the monetary-limit route is ever hidden (it can apply to any claim);
 *   - the vehicle / tenancy routes are shown for a claim type they are not
 *     about, or hidden for the one they are;
 *   - the route map names a route id or claim type id that does not exist
 *     (a typo would silently show or hide the wrong thing);
 *   - splitLead loses or changes text (lead + rest must equal the original);
 *   - a starting-steps pinpoint names a rule the vendored rules text does not
 *     contain.
 *
 * Run: node --import tsx scripts/verification/verifyOverviewRelevance.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { JURISDICTION_ROUTES } from "../../src/lib/case-system/intake/jurisdictionRoutes";
import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import {
  ROUTE_CLAIM_TYPE_KEYS,
  ROUTE_CLAIM_TYPE_VALUES,
  routesForConfirmedClaimType,
} from "../../src/lib/case-system/intake/jurisdictionRouteRelevance";
import { splitLead } from "../../src/lib/case-system/format/previewText";
import { DEFENCE_CONCEPTS } from "../../src/lib/case-system/intake/claimTypes";
import { STARTING_A_SMALL_CLAIMS_ACTION } from "../../src/lib/content-library/smallClaimsStartingSteps";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const ids = (routes: readonly { id: string }[]) => routes.map((route) => route.id).sort().join(",");
const ALL = ids(JURISDICTION_ROUTES);
const LIMIT = "sc-route-exceeds-jurisdiction-superior-court";
const VEHICLE = "sc-route-vehicle-property-damage-dcpd";
const TENANCY = "sc-route-residential-tenancy-ltb";

function main(): void {
  // 2026-09-30, site owner: the summary is about the user's own case. With
  // nothing confirmed, nothing is listed; the limit route appears on the
  // amount, not on the claim type.
  check("no confirmed claim type and no amount lists nothing", routesForConfirmedClaimType(JURISDICTION_ROUTES, undefined).length === 0);
  check("null claim type and a small amount lists nothing", routesForConfirmedClaimType(JURISDICTION_ROUTES, null, 1500).length === 0);
  check(
    "an amount over \$50,000 lists the monetary-limit route, whatever the claim type",
    ids(routesForConfirmedClaimType(JURISDICTION_ROUTES, null, 68500)) === LIMIT,
  );
  check(
    "an amount of exactly \$50,000 does not list it",
    !routesForConfirmedClaimType(JURISDICTION_ROUTES, "sc-claim-unpaid-debt-services", 50000).some((r) => r.id === LIMIT),
  );
  void ALL;

  const contractor = routesForConfirmedClaimType(JURISDICTION_ROUTES, "sc-claim-breach-of-contract-services").map((r) => r.id);
  check("a contractor claim does not list the auto-insurance or residential-tenancy routes", !contractor.includes(VEHICLE) && !contractor.includes(TENANCY), contractor.join(","));

  check(
    "a vehicle-accident claim lists the auto-insurance route",
    routesForConfirmedClaimType(JURISDICTION_ROUTES, "sc-claim-vehicle-accident-uninsured-driver-property-damage").some((r) => r.id === VEHICLE),
  );
  check(
    "a commercial-tenancy claim lists the residential-tenancy route",
    routesForConfirmedClaimType(JURISDICTION_ROUTES, "sc-claim-commercial-tenancy-dispute").some((r) => r.id === TENANCY),
  );

  const routeIds = new Set(JURISDICTION_ROUTES.map((route) => route.id));
  const claimIds = new Set(CLAIM_TYPES.map((claimType) => claimType.id));
  const badRoutes = ROUTE_CLAIM_TYPE_KEYS.filter((id) => !routeIds.has(id));
  const badClaims = ROUTE_CLAIM_TYPE_VALUES.filter((id) => !claimIds.has(id));
  check("every route named in the relevance map exists", badRoutes.length === 0, badRoutes.join(", "));
  check("every claim type named in the relevance map exists", badClaims.length === 0, badClaims.join(", "));

  // ---- splitLead never loses or changes text ----
  const samples = [
    ...DEFENCE_CONCEPTS.map((concept) => concept.plainExplanation),
    ...JURISDICTION_ROUTES.map((route) => route.whyNotSmallClaims),
    "Short.",
    "One very long sentence without any full stop that goes on and on ".repeat(10),
  ];
  const lossy = samples.filter((text) => {
    const { lead, rest } = splitLead(text);
    const joined = rest ? `${lead} ${rest}` : lead;
    return joined.replace(/\s+/g, " ").trim() !== text.replace(/\s+/g, " ").trim();
  });
  check("splitLead keeps every word of the original, in order", lossy.length === 0, lossy[0]?.slice(0, 80));
  const longest = [...DEFENCE_CONCEPTS].sort((a, b) => b.plainExplanation.length - a.plainExplanation.length)[0];
  check("the longest defence text is shortened to a lead", splitLead(longest.plainExplanation).rest.length > 0);

  // ---- starting steps name real rules ----
  const rules = readFileSync(
    path.join(process.cwd(), "docs", "sources", "corpus", "oreg-258-98-small-claims-rules.txt"),
    "utf8",
  ).replace(/\s+/g, " ");
  const missingRules = STARTING_A_SMALL_CLAIMS_ACTION.filter((step) => {
    const ruleNumber = step.pinpoint.match(/r\. (\d+\.\d+)/)?.[1];
    return !ruleNumber || !rules.includes(` ${ruleNumber} `);
  }).map((step) => step.pinpoint);
  check("every starting-steps pinpoint is a rule in the vendored rules text", missingRules.length === 0, missingRules.join(", "));
  check("the six-month service window matches the rules text", rules.includes("served within six months after the date it is issued"));
  check("the 20-day defence period matches the rules text", rules.includes("within 20 days of being served with the claim"));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
