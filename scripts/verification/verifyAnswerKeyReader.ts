/**
 * THE ANSWER KEY'S READER (tests/answer-key/readAnswerKey.ts): reads a (case, field, expected)
 * table as CSV, tab-separated or Markdown, the same rows from each; refuses a row with an empty
 * cell, a header without the three columns, and a case and field given twice.
 *
 * Failure it exists to catch: an answer key read with a hole or a duplicate, so a case's
 * mismatch passes unnoticed once the 20-case key arrives (site owner, 2026-10-25).
 * Synthetic rows only; the real key is not in the repository yet.
 */
import { answerKeyByCase, readAnswerKey } from "../../tests/answer-key/readAnswerKey";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`); if (!ok) failures += 1; };
const throws = (text: string) => { try { readAnswerKey(text); return false; } catch { return true; } };

const csv = 'case,field,expected\nm01,court,Small Claims Court\nm01,form,"Form 7A, Plaintiff\'s Claim"\n# a note\n\nm02,side,respondent\n';
const tsv = "Case\tField\tExpected\nm01\tcourt\tSmall Claims Court\nm01\tform\tForm 7A, Plaintiff's Claim\nm02\tside\trespondent\n";
const md = "| case | field | expected |\n|---|---|---|\n| m01 | court | Small Claims Court |\n| m01 | form | Form 7A, Plaintiff's Claim |\n| m02 | side | respondent |\n";
const plain = (text: string) => JSON.stringify(readAnswerKey(text).map(({ caseId, field, expected }) => [caseId, field, expected]));
check("CSV, tab-separated and Markdown give the same rows", plain(csv) === plain(tsv) && plain(tsv) === plain(md), plain(csv));
check("a quoted comma stays in the cell", readAnswerKey(csv)[1].expected === "Form 7A, Plaintiff's Claim");
check("columns in another order are read by name", plain("expected,case,field\nrespondent,m02,side\n") === JSON.stringify([["m02", "side", "respondent"]]));
check("grouped by case", answerKeyByCase(readAnswerKey(md)).get("m01")?.get("court") === "Small Claims Court");
check("an empty cell is refused", throws("case,field,expected\nm01,court,\n"));
check("a header without the three columns is refused", throws("case,value\nm01,x\n"));
check("a case and field given twice is refused", throws("case,field,expected\nm01,court,A\nm01,court,B\n"));
check("an empty key is refused", throws("\n# nothing\n"));

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exit(failures ? 1 : 0);
