/**
 * The Form 7A step's claim sentence reads as a sentence.
 *
 * What it checks: StatementOfClaimSurface, rendered for a confirmed claim type,
 * says 'Claims described as “<description>” generally involve …' — the
 * description quoted, with a space on each side of it.
 *
 * Failure it exists to catch: the PR #463 re-test (2026-10-18), where the live
 * page read "…took a deposit and disappearedgenerally involve the items below".
 *
 * Run: npm run test:statement-of-claim-text
 */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StatementOfClaimSurface from "../../app/builder/_components/StatementOfClaimSurface";
import { CLAIM_KIND_TICKED, emptyCaseFile } from "../../src/lib/case-system/caseFile/caseFile";

// The section reads the case file only (30 Oct): a ticked kind of claim and the story, as the case file holds them.
const caseFile = emptyCaseFile();
caseFile.claimKind = { state: "answered", value: "sc-claim-contractor-took-deposit-and-left", source: { kind: "answer", question: CLAIM_KIND_TICKED }, confirmed: true };
caseFile.story = "Synthetic: a contractor took a $3,000 deposit and never did the work.";
const html = renderToStaticMarkup(createElement(StatementOfClaimSurface, { caseFile, onStateMapChange: () => {} }));
const text = html.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
assert.match(text, /Claims described as “a contractor took a deposit and disappeared” generally involve the items below\./, "the description is quoted and spaced");
assert.doesNotMatch(text, /[a-z]generally\b/, "no word runs into 'generally'");
console.log("PASS Form 7A claim sentence: quoted, spaced");
