import {
  createEmptyOntarioFamilyCase,
  type OntarioFamilyCaseData,
} from "./types/family-case";

export interface DefaultCaseBundle {
  kind: "family";
  family: OntarioFamilyCaseData;
}

export function createDefaultCase(): DefaultCaseBundle {
  return {
    kind: "family",
    family: createEmptyOntarioFamilyCase(),
  };
}