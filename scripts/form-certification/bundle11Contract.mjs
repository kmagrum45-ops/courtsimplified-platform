import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const manifestPath = resolve(import.meta.dirname, "ontarioFormCertificationManifest.json");

export function civilPleadingContract() {
  const bundle = JSON.parse(readFileSync(manifestPath, "utf8")).generatedBundle;
  const checkedAt = bundle.checkedAt;
  return {
    ...bundle,
    checkedAt,
    asOf: new Date(`${checkedAt}T12:00:00Z`),
    buildFixture(item) {
      const facts = {
        courtPath: item.courtType,
        province: "Ontario",
        stage: item.allowedStage,
        formApplicability: { civil: { pleadingPosture: item.requiredFact.equals } },
      };
      return {
        facts,
        authority: {
          authority_source_id: item.mappingSourceId,
          authority_source_type: "primary-procedural-rule",
          official_source_url: bundle.authority.url,
          authority_citation: bundle.authority.citation,
          authority_pinpoint: item.governingRulePinpoint,
          authority_issuing_body: bundle.authority.issuingBody,
          authority_checked_at: checkedAt,
          authority_review_status: "verified-for-workflow",
          authority_court_area: item.courtType,
          authority_topic: "civil-pleading-posture",
          authority_stage_applicability: [item.allowedStage],
          canonical_form_id: item.canonicalFormId,
          canonical_form_court_type: item.courtType,
          form_revision_or_effective_at: item.formRevisionOrEffectiveAt,
          form_review_status: "verified-for-workflow",
          applicability_conditions: {
            all: [
              { path: "courtPath", equals: item.courtType },
              { path: "province", equals: "Ontario" },
              { path: "stage", equals: item.allowedStage },
              item.requiredFact,
            ],
          },
        },
        catalog: {
          canonical_form_id: item.canonicalFormId,
          court_type: item.courtType,
          form_source_id: item.sourceId,
          official_source_url: item.officialFormUrl,
          form_revision_or_effective_at: item.formRevisionOrEffectiveAt,
          form_checked_at: checkedAt,
          form_review_status: "verified-catalog-source",
        },
      };
    },
  };
}
