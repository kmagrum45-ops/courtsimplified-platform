import {
  AuthorityCollection,
  AuthorityMetadata,
} from "./authoritySourceSchema";

function nowIso(): string {
  return new Date().toISOString();
}

const timestamp = nowIso();

const ONTARIO_CIVIL_AUTHORITIES: AuthorityMetadata[] = [
  {
    id: "ON_CIVIL_RULES_OF_CIVIL_PROCEDURE_001",
    title: "Ontario Rules of Civil Procedure",
    sourceType: "rule-of-court",
    jurisdiction: "Ontario",
    bindingLevel: "binding",
    verificationStatus: "needs-review",
    status: "active",
    citation: {
      citation: "Rules of Civil Procedure",
    },
    domains: ["civil", "procedure"],
    keywords: [
      "civil procedure",
      "pleadings",
      "motions",
      "service",
      "filing",
      "discovery",
      "trial",
    ],
    summary:
      "Ontario civil procedure rules governing Superior Court civil proceedings.",
    practicalMeaning:
      "CourtSimplified must use this authority to verify civil filing, service, motion, pleading, discovery, trial, and enforcement steps before giving final procedural guidance.",
    proceduralImpact: [
      "Controls civil procedure sequencing",
      "Controls pleadings, motions, service, deadlines, discovery, trial, and enforcement workflow",
      "Must be checked before recommending civil court steps or forms",
    ],
    evidenceImpact: [
      "May affect affidavit, documentary evidence, discovery, and trial evidence workflow",
    ],
    burdenImpact: [
      "Does not usually define substantive burden, but affects how proof is presented procedurally",
    ],
    strategicImpact: [
      "Wrong rule or wrong procedural step can delay or weaken the case",
      "Rules must be verified before court package generation",
    ],
    limitations: [
      "Needs official source verification before citation",
      "Rule numbers and deadlines must be verified separately",
    ],
    warnings: [
      "Do not cite or apply a specific rule number unless verified from the official current source",
    ],
    relatedAuthorities: [],
    confidence: 70,
  },
  {
    id: "ON_CIVIL_COURTS_OF_JUSTICE_ACT_001",
    title: "Courts of Justice Act",
    sourceType: "statute",
    jurisdiction: "Ontario",
    bindingLevel: "binding",
    verificationStatus: "needs-review",
    status: "active",
    citation: {
      citation: "Courts of Justice Act",
    },
    domains: ["civil", "procedure"],
    keywords: [
      "Ontario courts",
      "Superior Court",
      "jurisdiction",
      "court powers",
      "procedure",
      "appeals",
    ],
    summary:
      "Ontario statute governing court structure, court powers, and related civil justice framework.",
    practicalMeaning:
      "CourtSimplified should use this as a core Ontario civil authority when screening forum, jurisdiction, court powers, and procedural pathway issues.",
    proceduralImpact: [
      "Supports court-path and jurisdiction analysis",
      "May affect appeal, court power, and procedural authority questions",
    ],
    evidenceImpact: [],
    burdenImpact: [],
    strategicImpact: [
      "Important when deciding whether a matter belongs in Superior Court or another forum",
    ],
    limitations: [
      "Specific sections must be verified before citation",
      "Must be checked against the user’s court path and remedy",
    ],
    warnings: [
      "Do not cite sections without verifying current text and applicability",
    ],
    relatedAuthorities: [],
    confidence: 70,
  },
  {
    id: "ON_CIVIL_LIMITATIONS_ACT_2002_001",
    title: "Limitations Act, 2002",
    sourceType: "statute",
    jurisdiction: "Ontario",
    bindingLevel: "binding",
    verificationStatus: "needs-review",
    status: "active",
    citation: {
      citation: "Limitations Act, 2002",
    },
    domains: ["civil", "procedure", "damages", "negligence", "contracts", "defamation"],
    keywords: [
      "limitation period",
      "discoverability",
      "basic limitation",
      "ultimate limitation",
      "claim discovered",
      "delay",
    ],
    summary:
      "Ontario limitations statute relevant to whether civil claims are started in time.",
    practicalMeaning:
      "CourtSimplified must flag limitation and discoverability risk whenever dates are old, unclear, disputed, or procedurally significant.",
    proceduralImpact: [
      "May determine whether a claim can proceed",
      "Requires date-by-date chronology before drafting or filing",
    ],
    evidenceImpact: [
      "Requires evidence of event date, discovery date, knowledge, delay, and any facts affecting discoverability",
    ],
    burdenImpact: [
      "May shift practical burden onto the user to explain dates and discovery facts clearly",
    ],
    strategicImpact: [
      "Limitation risk can lead to early dismissal or settlement pressure",
      "Must be screened before pleadings are generated",
    ],
    limitations: [
      "Specific limitation periods and exceptions must be verified before use",
      "Different claims may have different notice or limitation rules",
    ],
    warnings: [
      "Do not state a deadline until the exact claim type, dates, and current statutory text are verified",
    ],
    relatedAuthorities: [],
    confidence: 70,
  },
  {
    id: "ON_CIVIL_FORM_14A_STATEMENT_OF_CLAIM_001",
    title: "Form 14A Statement of Claim",
    sourceType: "official-form",
    jurisdiction: "Ontario",
    bindingLevel: "binding",
    verificationStatus: "needs-review",
    status: "active",
    citation: {
      citation: "Form 14A",
    },
    domains: ["civil", "procedure"],
    keywords: [
      "Statement of Claim",
      "Form 14A",
      "civil pleading",
      "start claim",
    ],
    summary:
      "Ontario civil pleading form commonly used to start an action by Statement of Claim.",
    practicalMeaning:
      "CourtSimplified may recommend this only after confirming the user is starting an Ontario civil action and the claim belongs in the correct court path.",
    proceduralImpact: [
      "Potential starting document for certain civil actions",
      "Must align with claim type, relief, parties, limitation issues, and court path",
    ],
    evidenceImpact: [
      "Pleading should be supported by organized facts and later evidence, but evidence is not simply dumped into the pleading",
    ],
    burdenImpact: [
      "Requires legally material facts supporting each cause of action",
    ],
    strategicImpact: [
      "Poor pleading structure can trigger amendment demands, motion risk, or confusion",
    ],
    limitations: [
      "Official form version must be verified before generation",
      "May not be the correct document for applications, motions, appeals, tribunal matters, or family matters",
    ],
    warnings: [
      "Do not recommend Form 14A unless court path and procedural posture confirm a civil action is being started",
    ],
    relatedAuthorities: [
      {
        authorityId: "ON_CIVIL_RULES_OF_CIVIL_PROCEDURE_001",
        relationship: "applies",
      },
    ],
    confidence: 65,
  },
  {
    id: "ON_CIVIL_PUBLIC_AUTHORITY_SCREENING_001",
    title: "Ontario civil public authority screening placeholder",
    sourceType: "secondary-source",
    jurisdiction: "Ontario",
    bindingLevel: "not-authoritative",
    verificationStatus: "needs-review",
    status: "unknown",
    domains: ["civil", "charter", "constitutional", "institutional-liability", "procedure"],
    keywords: [
      "Crown liability",
      "police liability",
      "public authority",
      "Charter damages",
      "immunity",
      "leave",
      "notice",
      "misfeasance",
      "operational negligence",
    ],
    summary:
      "Placeholder authority object reminding the system that public authority cases require specialized verified authority before drafting.",
    practicalMeaning:
      "CourtSimplified must not treat public authority claims as ordinary negligence claims without screening immunity, discretion, notice, leave, jurisdiction, causation, and remedy.",
    proceduralImpact: [
      "May require threshold motion or leave analysis",
      "May require notice or statutory screening",
      "May require separating operational conduct from protected discretion",
    ],
    evidenceImpact: [
      "Requires records showing knowledge, role, chronology, conduct, causation, and harm",
    ],
    burdenImpact: [
      "Requires careful pleading of actionable conduct, causation, foreseeability, and remedy",
    ],
    strategicImpact: [
      "High strike or threshold risk if framed incorrectly",
      "Must avoid hindsight framing and protected-discretion attacks",
    ],
    limitations: [
      "This is not legal authority",
      "Must be replaced with verified cases, statutes, and procedural sources",
    ],
    warnings: [
      "Do not cite this object",
      "Use only as internal screening reminder until verified authority is added",
    ],
    relatedAuthorities: [],
    confidence: 40,
  },
];

export const ONTARIO_CIVIL_AUTHORITY_COLLECTION: AuthorityCollection = {
  id: "ONTARIO_CIVIL_AUTHORITY_COLLECTION_001",
  version: "1.0.0",
  createdAt: timestamp,
  updatedAt: timestamp,
  authorities: ONTARIO_CIVIL_AUTHORITIES,
};

export function getOntarioCivilAuthorityCollection(): AuthorityCollection {
  return ONTARIO_CIVIL_AUTHORITY_COLLECTION;
}

export function getOntarioCivilAuthorities(): AuthorityMetadata[] {
  return ONTARIO_CIVIL_AUTHORITIES;
}