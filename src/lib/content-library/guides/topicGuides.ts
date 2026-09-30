/**
 * In-depth guides: appeals, costs, default proceedings, summary judgment and
 * simplified procedure, limitation periods, enforcement, motions, trial
 * preparation, getting help, fee waivers (2026-09-30).
 *
 * WHY. The site's legal information was almost all Small Claims: no appeals
 * guide for any court, no explanation of costs, no civil or family default
 * judgment, no summary judgment. Each guide here was written from the vendored
 * statutes, rules and ontario.ca / Steps to Justice pages in
 * docs/sources/corpus only, with every quoted phrase verbatim, and then read
 * independently against the cited provisions (84 of 322 paragraphs
 * corrected, nearly all for a condition or exception the source states).
 *
 * test:topic-guides checks mechanically what can be: every quote is in a
 * listed source, every paragraph ends with its citation, no advice words, the
 * sources exist and resolve to an official page. Meaning cannot be checked
 * mechanically; an edit needs the same read against the source.
 */
import appeals from "./appeals.json";
import costs from "./costs.json";
import defaultProceedings from "./default-proceedings.json";
import enforcing from "./enforcing-a-judgment.json";
import feeWaivers from "./fee-waivers.json";
import gettingHelp from "./getting-help.json";
import trial from "./getting-ready-for-trial.json";
import limitations from "./limitation-periods.json";
import motions from "./motions.json";
import summaryJudgment from "./summary-judgment-and-simplified-procedure.json";
import startingCivil from "./starting-a-civil-action.json";
import discovery from "./discovery.json";
import mediation from "./mandatory-mediation.json";
import parenting from "./parenting.json";
import childSupport from "./child-support.json";
import spousalSupport from "./spousal-support.json";
import propertyDivision from "./property-division.json";
import matrimonialHome from "./matrimonial-home.json";
import divorce from "./divorce.json";
import restrainingOrders from "./restraining-orders.json";
import courtFees from "./court-fees.json";
import evidence from "./evidence.json";
import tenantLandlord from "./tenant-and-landlord.json";
import humanRights from "./human-rights.json";
import employmentStandards from "./employment-standards.json";
import debtCollections from "./debt-and-collections.json";
import carAccidents from "./car-accidents-and-insurance.json";
import condoDisputes from "./condo-disputes.json";
import constructionLiens from "./construction-liens.json";

export type GuideCourt = "small-claims" | "civil" | "family" | "all";

export type TopicGuideSource = {
  localText: string;
  sourceName: string;
  pinpoints: string;
  officialUrl: string | null;
  retrievedAt: string | null;
};

export type TopicGuide = {
  id: string;
  title: string;
  courts: GuideCourt[];
  intro: string;
  sections: { heading: string; court: GuideCourt; paragraphs: string[] }[];
  sources: TopicGuideSource[];
};

/**
 * In reading order: starting out, during a case, after a decision, help;
 * then family law topics, then other kinds of disputes. 29 guides (10 added the same day, read against
 * their sources the same way: 54 of about 300 paragraphs corrected).
 */
export const TOPIC_GUIDES: TopicGuide[] = [
  limitations,
  startingCivil,
  defaultProceedings,
  motions,
  discovery,
  mediation,
  summaryJudgment,
  evidence,
  trial,
  costs,
  enforcing,
  appeals,
  courtFees,
  feeWaivers,
  gettingHelp,
  divorce,
  parenting,
  childSupport,
  spousalSupport,
  propertyDivision,
  matrimonialHome,
  restrainingOrders,
  // Matters decided mostly outside the three courts, or with their own
  // statute (courts: ["all"]). Added 2026-09-30.
  tenantLandlord,
  humanRights,
  employmentStandards,
  debtCollections,
  carAccidents,
  condoDisputes,
  constructionLiens,
] as TopicGuide[];

export function topicGuide(id: string): TopicGuide | null {
  return TOPIC_GUIDES.find((guide) => guide.id === id) ?? null;
}

/** Stable id for one paragraph, for the content inventory and the output guard. */
export function paragraphId(guideId: string, sectionIndex: number, paragraphIndex: number): string {
  return `guide:${guideId}:${sectionIndex + 1}.${paragraphIndex + 1}`;
}

export const GUIDE_COURT_LABELS: Record<GuideCourt, string> = {
  "small-claims": "Small Claims Court",
  civil: "Superior Court (civil)",
  family: "Family court",
  all: "All courts",
};
