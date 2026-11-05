// Stub (failing first): replaced by the writer in the next commit.
import type { ChangeInput, SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
export type CaseWriteRecovery = { read(section: string, key: string): unknown; put(section: string, key: string, value: unknown, touched?: boolean, external?: boolean, fromReview?: boolean, reaffirm?: true | string): void; getReview(): { checkpoint: Checkpoint }; getSavedMaster(): Record<string, unknown> | null };
export type WriteOptions = { touched?: boolean; external?: boolean; fromReview?: boolean; reaffirm?: true | string; facts?: Record<string, unknown> };
export function writeAnswer(_recovery: CaseWriteRecovery, _section: string, _field: string, _value: unknown, _options: WriteOptions = {}): void {}
export function writeChange(_recovery: CaseWriteRecovery, _fact: SlotFact, _change: ChangeInput): void {}
export function choosePending(_recovery: CaseWriteRecovery, _fact: SlotFact, _keepMine: boolean): void {}
