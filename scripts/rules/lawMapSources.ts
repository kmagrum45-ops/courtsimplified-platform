/**
 * Laws the law map names that were not saved yet (docs/law-map/STATUS.md,
 * "Laws to save", 2026-10-13). Each is fetched through the Vendor Sources
 * workflow and kept only if the fetched text contains its mustContain
 * strings, so a wrong address fails closed instead of saving the wrong text.
 *
 * Not here, and why: the Human Rights Tribunal's and the Landlord and Tenant
 * Board's Rules of Procedure and Interpretation Guidelines are published as
 * PDFs linked from tribunalsontario.ca pages (the page itself holds no rule
 * text); the Crown Prosecution Manual directive has no confirmed address yet;
 * the Criminal Proceedings Rules (SI/2012-7) Justice Laws page returned only
 * about 1,100 characters on 2026-10-13 (not the rule text).
 * They stay unconfirmed in the map until saved by hand (a human snapshot).
 */

import type { CorpusSource } from "./corpusSources";

const ELAWS = (id: string) => `https://www.ontario.ca/laws/docs/${id}_e.doc`;
const FED_ACT = (id: string) => `https://laws-lois.justice.gc.ca/eng/acts/${id}/FullText.html`;
const FED_REG = (id: string) => `https://laws-lois.justice.gc.ca/eng/regulations/${id}/FullText.html`;

const ontario = (id: string, elaws: string, title: string, citation: string, marker: string, why: string): CorpusSource => ({
  id,
  title,
  citation,
  url: ELAWS(elaws),
  format: "elaws-doc",
  mustContain: [marker, "CONSOLIDATION PERIOD"],
  why,
});

const federal = (id: string, url: string, title: string, citation: string, marker: string, why: string): CorpusSource => ({
  id,
  title,
  citation,
  url,
  format: "html",
  mustContain: [marker],
  why,
});

export const LAW_MAP_SOURCES: CorpusSource[] = [
  ontario("reciprocal-enforcement-of-judgments-act", "90r05", "Reciprocal Enforcement of Judgments Act", "R.S.O. 1990, c. R.5", "RECIPROCAL ENFORCEMENT OF JUDGMENTS", "Enforcing a judgment from another province in Ontario."),
  ontario("judicial-review-procedure-act", "90j01", "Judicial Review Procedure Act", "R.S.O. 1990, c. J.1", "JUDICIAL REVIEW PROCEDURE ACT", "How a decision of a tribunal or public body is reviewed in the Divisional Court."),
  ontario("ombudsman-act", "90o06", "Ombudsman Act", "R.S.O. 1990, c. O.6", "OMBUDSMAN ACT", "Complaints to the Ontario Ombudsman about public bodies."),
  ontario("special-investigations-unit-act-2019", "19s01", "Special Investigations Unit Act, 2019", "S.O. 2019, c. 1, Sched. 5", "SPECIAL INVESTIGATIONS UNIT ACT", "When the SIU investigates police, and what it reports."),
  ontario("oreg-239-02-municipal-highway-maintenance", "020239", "Minimum Maintenance Standards for Municipal Highways", "O. Reg. 239/02", "MINIMUM MAINTENANCE STANDARDS", "The standards a municipality's road repair is measured against."),
  ontario("fippa", "90f31", "Freedom of Information and Protection of Privacy Act", "R.S.O. 1990, c. F.31", "FREEDOM OF INFORMATION AND PROTECTION OF PRIVACY ACT", "Asking a provincial body for records, and appeals."),
  ontario("mfippa", "90m56", "Municipal Freedom of Information and Protection of Privacy Act", "R.S.O. 1990, c. M.56", "MUNICIPAL FREEDOM OF INFORMATION", "Asking a municipality or police service for records."),
  ontario("occupational-health-and-safety-act", "90o01", "Occupational Health and Safety Act", "R.S.O. 1990, c. O.1", "OCCUPATIONAL HEALTH AND SAFETY ACT", "Workplace harassment and violence duties, and reprisal complaints."),
  ontario("workplace-safety-and-insurance-act-1997", "97w16", "Workplace Safety and Insurance Act, 1997", "S.O. 1997, c. 16, Sched. A", "WORKPLACE SAFETY AND INSURANCE ACT", "Workplace injury benefits and the bar on suing the employer."),
  ontario("interjurisdictional-support-orders-act-2002", "02i13", "Interjurisdictional Support Orders Act, 2002", "S.O. 2002, c. 13", "INTERJURISDICTIONAL SUPPORT ORDERS ACT", "Support when one party lives outside Ontario."),
  ontario("labour-relations-act-1995", "95l01", "Labour Relations Act, 1995", "S.O. 1995, c. 1, Sched. A", "LABOUR RELATIONS ACT", "Unionized workers' grievances and arbitration."),
  ontario("oreg-290-98-landlord-tenant-selection", "980290", "Business Practices Permissible to Landlords in Selecting Prospective Tenants", "O. Reg. 290/98", "Landlord", "What a landlord may ask for when choosing tenants (Human Rights Code)."),
  ontario("oreg-9-18-standard-lease", "180009", "Standard Forms of Lease", "O. Reg. 9/18", "lease", "When the standard lease is required."),
  ontario("oreg-2-05-court-fee-waivers", "050002", "Court Fee Waivers", "O. Reg. 2/05", "FEE WAIVER", "Who qualifies to have court fees waived."),
  ontario("oreg-456-96-prescribed-crimes", "960456", "Prescribed Crimes (Victims' Bill of Rights, 1995)", "O. Reg. 456/96", "Victims", "Which crimes the Victims' Bill of Rights provisions apply to."),
  ontario("civil-remedies-act-2001", "01r28", "Civil Remedies Act, 2001", "S.O. 2001, c. 28", "CIVIL REMEDIES ACT", "Forfeiture of proceeds of unlawful activity and compensation to victims."),

  federal("crown-liability-and-proceedings-act-canada", FED_ACT("C-50"), "Crown Liability and Proceedings Act (Canada)", "R.S.C. 1985, c. C-50", "Crown Liability and Proceedings Act", "Suing the federal Crown."),
  federal("federal-courts-act", FED_ACT("F-7"), "Federal Courts Act", "R.S.C. 1985, c. F-7", "Federal Courts Act", "Judicial review of federal decisions."),
  federal("canada-labour-code", FED_ACT("L-2"), "Canada Labour Code", "R.S.C. 1985, c. L-2", "Canada Labour Code", "Federally regulated workers' unjust dismissal complaints."),
  federal("employment-insurance-act", FED_ACT("E-5.6"), "Employment Insurance Act", "S.C. 1996, c. 23", "Employment Insurance Act", "Employment insurance after a job ends."),
  federal("employment-insurance-regulations", FED_REG("SOR-96-332"), "Employment Insurance Regulations", "SOR/96-332", "Employment Insurance Regulations", "How earnings on separation affect benefits."),
  federal("department-of-employment-and-social-development-act", FED_ACT("H-5.7"), "Department of Employment and Social Development Act", "S.C. 2005, c. 34", "Department of Employment and Social Development Act", "Appeals to the Social Security Tribunal."),
  federal("family-orders-and-agreements-enforcement-assistance-act", FED_ACT("F-1.4"), "Family Orders and Agreements Enforcement Assistance Act", "R.S.C. 1985, c. 4 (2nd Supp.)", "Family Orders and Agreements Enforcement Assistance Act", "Federal help enforcing support: garnishing federal payments, licence denial."),
  federal("canadian-human-rights-act", FED_ACT("H-6"), "Canadian Human Rights Act", "R.S.C. 1985, c. H-6", "Canadian Human Rights Act", "Discrimination by federally regulated employers and services."),
  federal("corrections-and-conditional-release-act", FED_ACT("C-44.6"), "Corrections and Conditional Release Act", "S.C. 1992, c. 20", "Corrections and Conditional Release Act", "What a victim can be told about an offender in federal custody."),
];
