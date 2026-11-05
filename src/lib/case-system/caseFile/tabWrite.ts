// Stub (failing first): replaced by the writer in the next commit.
import type { CaseFile, FactChanges } from "./caseFile";
import type { FactId } from "./factRecord";
export class UnmappedField extends Error {}
export type AnswerWrite = { section: string; field: string; before: unknown; after: unknown; facts?: Partial<Record<FactId, unknown>> };
export function answerChanges(_sections: Record<string, unknown>, _write: AnswerWrite, _held?: CaseFile, _now: Date = new Date()): FactChanges | null { return null; }
