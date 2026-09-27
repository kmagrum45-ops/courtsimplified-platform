/**
 * The gates a block must pass to be published — in ONE place.
 *
 * *** WHY THIS IS SHARED RATHER THAN WRITTEN TWICE ***
 *
 * Two things need to apply these checks: the promotion script, which decides
 * whether a run may become the published set, and the verification suite,
 * which decides whether the published set is still good. If those two had
 * their own copies they would drift, and the drift would be silent in the
 * worst direction — promotion permitting something the suite would reject, or
 * the suite passing content promotion would have refused.
 *
 * So there is one function. Promotion refuses a block it returns failures for;
 * the suite fails on the same. A gate added here is added to both at once.
 *
 * *** WHY IT RE-CHECKS THINGS THE PIPELINE ALREADY CHECKED ***
 *
 * The pipeline checked them against the corpus as it stood during that run.
 * These run against the corpus as it stands NOW. A re-vendoring that moves
 * rule text must invalidate content verified against the old text, and the
 * only way to know is to look again rather than to trust a stored verdict.
 */

import { corpus, findQuote, predictsOutcome } from "./verifiedContentPipeline";
import type { CaseStage } from "../../src/lib/case-system/stage-map/stageMap";
import {
  answerText,
  NO_SOURCE_NOTICE,
  renderDeadlineSection,
  type StageAnswer,
} from "../../src/lib/content-library/stageAnswers";
import type { GenericAnswer } from "../../src/lib/content-library/genericAnswers";
import { readability, TARGET_GRADE } from "../../src/lib/content-library/readability";
import { assessReadability } from "../../src/lib/content-library/readabilityExceptions";

/** Statuses a user may be shown. `needs-human` and `draft` are never published. */
export const PUBLISHABLE = ["verified-draft", "no-source", "approved"] as const;

export function isPublishable(answer: { verification: { status: string } }): boolean {
  return (PUBLISHABLE as readonly string[]).includes(answer.verification.status);
}

/*
 * American spellings. "defense" is the one that is not cosmetic: the document
 * a defendant files is a DEFENCE (Form 9A), so the American spelling sends a
 * person looking for a form that appears on no Ontario court page.
 */
const US_SPELLINGS =
  /\b(defense|favor|favors|favored|honor|honors|labor|center|centers|judgement)\b/gi;

/**
 * Is this block written for the wrong reader?
 *
 * *** THE CHECK NOTHING ELSE CAN MAKE ***
 *
 * An independent review found, in the PUBLISHED library and marked
 * verified-draft, a block on `plaintiff:defence-period-expired-no-defence` — a
 * plaintiff asking "they never responded, what can I do?" — that said:
 *
 *   "You may file a Defence [Form 9A]…"
 *
 * Every existing gate passed it, and none of them was broken. Each sentence
 * was a TRUE statement about a defendant, the verifier found real support, and
 * every quote was in the corpus. Sentence-level verification cannot see that
 * the reader is the wrong person, because no individual sentence is false.
 *
 * *** WHY THIS IS TWO CHECKS AND NOT A LIST OF BANNED PHRASES ***
 *
 * Correcting the first wording produced "The plaintiff may file a request to
 * note YOU in default" — on the plaintiff's own stage, still written for the
 * defendant. Chasing phrasings would never end.
 *
 * So the second check is the general property: a block written for one side
 * does not describe that side in the third person. If a plaintiff's block says
 * "the plaintiff may…", the person it is speaking to is not the plaintiff.
 * ("Plaintiff's Claim" is excluded — that is the name of Form 7A.)
 *
 * *** EXPORTED, BECAUSE IT BELONGS IN THE DRAFTING LOOP TOO ***
 *
 * Running only at promotion meant the pipeline kept producing the same wrong
 * block and only found out afterwards. The drafter can fix this if it is told,
 * so the same function feeds the redraft.
 */
export function wrongReaderProblems(
  text: string,
  side: CaseStage["side"],
  sourceIds: string[],
): string[] {
  if (side !== "plaintiff" && side !== "defendant") return [];

  const problems: string[] = [];

  /** Steps only the OTHER side takes. In this block they address the wrong reader. */
  const OTHER_SIDE_STEP: Record<"plaintiff" | "defendant", RegExp> = {
    plaintiff:
      /\byou\b[^.]{0,30}\b(file|filed|filing|serve|served|prepare|complete)\b[^.]{0,40}\b(defence|form 9a)\b/i,
    defendant:
      /\byou\b[^.]{0,30}\b(file|filed|filing|request)\b[^.]{0,40}\b(request to clerk|form 9b|note the defendant in default)\b/i,
  };

  /*
   * Who served whom. A plaintiff SERVES the claim; a defendant IS SERVED with
   * it. So "since you were served with the claim" on a plaintiff's stage has
   * the parties the wrong way round, even in a block that is otherwise right.
   *
   * This is the third pattern in this class, and the last I will add by
   * wording. The general check below is what carries the weight; these three
   * exist because they are the specific confusions that actually reached
   * published content.
   */
  const SERVICE_DIRECTION: Record<"plaintiff" | "defendant", RegExp> = {
    plaintiff: /\byou (were|have been|was) served\b/i,
    defendant: /\byou (served|have served)\b[^.]{0,30}\b(the claim|them|the defendant)\b/i,
  };

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (SERVICE_DIRECTION[side].test(sentence)) {
      problems.push(
        `this is a ${side}'s block but has service the wrong way round — a plaintiff serves ` +
          `the claim, a defendant is served with it: "${sentence.trim().slice(0, 110)}"`,
      );
      break;
    }
  }

  /** This block's own side, described as somebody else. */
  const OWN_SIDE_THIRD_PERSON: Record<"plaintiff" | "defendant", RegExp> = {
    plaintiff: /\bthe plaintiff\b(?!'s claim)\s+(?:\w+\s+){0,2}(may|can|must|shall|will|has|have|is|are|needs?|files?|filed|serves?|served|obtains?|requests?|asks?)\b/i,
    defendant: /\bthe defendant\b(?!'s claim)\s+(?:\w+\s+){0,2}(may|can|must|shall|will|has|have|is|are|needs?|files?|filed|serves?|served|obtains?|requests?|asks?)\b/i,
  };

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (OTHER_SIDE_STEP[side].test(sentence)) {
      problems.push(
        `this is a ${side}'s block but tells the reader to take the other side's step: ` +
          `"${sentence.trim().slice(0, 120)}"`,
      );
      break;
    }
  }

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (OWN_SIDE_THIRD_PERSON[side].test(sentence)) {
      problems.push(
        `this is a ${side}'s block but describes "the ${side}" as somebody else, so it is ` +
          `written for the other party: "${sentence.trim().slice(0, 120)}"`,
      );
      break;
    }
  }

  /*
   * A block sourced ONLY from the other side's guide is wrong before a word of
   * it is read. This was the mechanical cause: a side-blind source mapping.
   */
  const OTHER_SIDE_GUIDE: Record<"plaintiff" | "defendant", string[]> = {
    plaintiff: ["guide-replying-to-a-claim", "scj-how-to-respond"],
    defendant: ["guide-making-a-claim"],
  };

  if (sourceIds.length > 0 && sourceIds.every((id) => OTHER_SIDE_GUIDE[side].includes(id))) {
    problems.push(
      `a ${side}'s block sourced ONLY from the other side's guide (${sourceIds.join(", ")}) — ` +
        `the content will be written for the wrong reader`,
    );
  }

  return problems;
}

/**
 * Does this text claim the law does not provide something?
 *
 * *** AN ABSENCE IS A CLAIM, AND IT IS THE ONE WE CANNOT CHECK ***
 *
 * Every other legal statement in this product is verified by finding it in the
 * corpus. An absence cannot be verified that way at all — you can only fail to
 * find something, which is a fact about your search, not about the law.
 *
 * We asserted it twice and were wrong both times, in the direction that does
 * the most harm:
 *
 *   `both:missed-trial` said "the rules do not set out a step for this" while
 *   r. 17.01 (4) and (5) gave a set-aside remedy on a 30-day clock, five lines
 *   below the rule the stage cited.
 *
 *   A comment justifying the whole no-source category said "nothing anywhere
 *   says how to fix having commenced it in the wrong place". r. 6.01 (2) and
 *   (3) — subrules of the rule already cited — are the remedy.
 *
 * Both times the citation list stopped short and we published the gap as
 * though it were the law. A person reading that concludes there is nothing to
 * be done and stops.
 *
 * So the product may say what IT does not have. It may never say what the law
 * does not have.
 */
const ABSENCE_CLAIMS: RegExp[] = [
  // The rules / the Act / the law does not provide, set out, say, allow…
  /\b(the )?(rules?|act|legislation|law|statute|regulation)\b[^.]{0,30}\b(do(es)? not|don'?t|doesn'?t)\b/i,
  // The court / the clerk / a judge cannot or does not…
  /\b(the )?(court|clerk|judge)\b[^.]{0,20}\b(cannot|can'?t|has no power|does not (allow|provide|permit))\b/i,
  // Blanket absences.
  /\b(there is|there'?s) (no|nothing)\b[^.]{0,30}\b(rule|step|remedy|provision|procedure|way to)\b/i,
  /\bnothing (in the rules|anywhere|in the act)\b/i,
  /\bno (rule|provision|procedure|remedy) (exists|covers|applies|for)\b/i,
  /\bnot (set out|provided for|addressed) (in|by) the (rules?|act)\b/i,
];

export function assertsAbsenceProblems(text: string): string[] {
  const problems: string[] = [];

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const hit = ABSENCE_CLAIMS.find((pattern) => pattern.test(sentence));
    if (!hit) continue;
    problems.push(
      `claims the law does not provide something, which is an assertion nothing in the ` +
        `corpus can verify — an absence can only be failed to find: ` +
        `"${sentence.trim().slice(0, 120)}". Say what WE do not have instead.`,
    );
    break;
  }

  return problems;
}

/**
 * Everything wrong with this block, as plain sentences. Empty means publishable.
 *
 * `stage` is the stage map entry it answers. Passing it in rather than looking
 * it up keeps this a pure function, which is what lets the suite run it against
 * a synthetic block that is wrong on purpose.
 */
/**
 * Phrases that describe HOW something is done, which a block may use only if a
 * source it cites actually uses them.
 *
 * *** THE GLOSS THAT KEPT GETTING THROUGH ***
 *
 * City of Toronto Act s. 42 (6) and Municipal Act s. 44 (10) both say notice
 * must have "been served upon or sent by registered mail to" the clerk. Blocks
 * kept rendering that as "serve it on the city clerk IN PERSON or send it by
 * registered mail".
 *
 * Service is a defined procedure and personal delivery is not the same thing as
 * personal service. The verifier caught this once, correctly, and then passed the
 * same gloss on a later run — which is the whole argument for a code gate: a
 * model's judgment about a subtle distinction is not stable across runs, and
 * this one decides whether somebody's notice was validly given.
 *
 * *** WHY THIS IS A PROPERTY AND NOT A BANNED-WORDS LIST ***
 *
 * The rule is not "never say in person". It is "do not say it unless a source
 * you are citing says it". The corpus is the authority, exactly as it is for
 * every quote: if `occupiers-liability-act` says "personally served", a block
 * resting on it may say personally served. If no cited source contains the
 * phrase, the block invented the procedure.
 */
const PROCEDURAL_GLOSSES = [
  "in person",
  "by hand",
  "hand-deliver",
  "hand deliver",
  "deliver it personally",
  "delivered personally",
  "drop it off",
];

/*
 * *** TWO BUGS IN THE FIRST VERSION OF THIS GATE, BOTH FOUND BY PROBING IT ***
 *
 * 1. IT MATCHED SUBSTRINGS. "in person" is inside "certaIN PERSONs", and the City
 *    of Toronto Act's table of contents contains "DELEGATION TO CERTAIN PERSONS".
 *    So the gate licensed the gloss from a heading about delegation. This is the
 *    exact class of bug the court-path classifier's header records — bare "rent"
 *    matching inside "parent", bare "lease" inside "please" — and I reproduced it
 *    in a new file the same day. Word boundaries now.
 *
 * 2. IT ASKED THE WRONG AUTHORITY. Searching an entire Act for a phrase is far too
 *    weak: these statutes run to thousands of lines, and almost any everyday
 *    phrase appears somewhere in one. What licenses a block's wording is the
 *    passage the block actually RESTS ON — the quotes the verifier found and the
 *    code gate located in the corpus. So the authority is those quotes, not the
 *    whole source.
 */
export function glossProblems(text: string, supportingQuotes: string[]): string[] {
  const support = supportingQuotes.join("  ").toLowerCase();
  const problems: string[] = [];

  for (const gloss of PROCEDURAL_GLOSSES) {
    const boundary = new RegExp(`\\b${gloss.replace(/[-\s]/g, "[-\\s]")}\\b`, "i");
    if (!boundary.test(text)) continue;
    if (boundary.test(support)) continue;
    problems.push(
      `says "${gloss}" to describe how something is served or filed, and no passage this ` +
        `block rests on uses that phrase. Service is a defined procedure: "served upon" is ` +
        `not "in person", and telling someone to hand a notice over when the provision ` +
        `requires service may cost them the claim`,
    );
  }

  return problems;
}

/*
 * *** FORUM-CHECK ONLY: THESE STAGES ROUTE, THEY DO NOT INSTRUCT ***
 *
 * Three before-filing stages are the catch-alls a MISCLASSIFIED matter lands on.
 * "Can I sue over this, and is Small Claims the right court?" is what a criminal
 * complaint, a tenancy dispute or a human-rights matter looks like after two
 * model components have each got it wrong.
 *
 * A person who arrives there needs to be told WHICH FORUM handles their kind of
 * matter. Small Claims procedure is the one thing that would send them further in
 * the wrong direction — and it is exactly what a drafter given those stages will
 * reach for, because the stage map hands it r. 6.01 and a limitation period.
 *
 * So the block may name no form, no rule, and no Small Claims step.
 *
 * *** WHAT IS STILL ALLOWED, AND WHY THE LIST IS SHAPED THIS WAY ***
 *
 * The monetary limit stays allowed: $50,000 is the line BETWEEN Small Claims and
 * Civil, so stating it is forum-check content and not procedure. "A lawyer or
 * paralegal can tell you" stays allowed. The clarifying questions come from the
 * stage map's own recorded boundaries and never appear in block prose at all.
 *
 * The patterns catch the things that only make sense once you are already in this
 * court: a numbered form, a numbered rule, the clerk, a defence, default, a
 * settlement conference, service of a claim. "File a claim" on its own is NOT
 * caught — the limitation period applies to filing in any court, and telling
 * somebody time may have run out is routing-adjacent rather than instruction.
 */
const SMALL_CLAIMS_PROCEDURE: Array<{ pattern: RegExp; what: string }> = [
  { pattern: /\bForm\s+\d+[A-Z]?\b/i, what: "a numbered court form" },
  { pattern: /\br(?:ule)?\.?\s*\d+\.\d+/i, what: "a numbered rule" },
  { pattern: /\bthe clerk\b/i, what: "the clerk" },
  { pattern: /\bdefence\b/i, what: "a defence" },
  { pattern: /\bnot(?:e|ed|ing) (?:you |them |the defendant )?in default\b/i, what: "noting in default" },
  { pattern: /\bdefault judgment\b/i, what: "default judgment" },
  { pattern: /\bsettlement conference\b/i, what: "a settlement conference" },
  { pattern: /\btrial date\b/i, what: "a trial date" },
  { pattern: /\baffidavit of service\b/i, what: "an affidavit of service" },
  { pattern: /\bserve (?:the|your) (?:claim|defence|documents)\b/i, what: "serving a court document" },
  { pattern: /\bfile (?:it |the |your )?(?:claim |defence )?with the court\b/i, what: "filing with the court" },
  { pattern: /\bplaintiff's claim\b/i, what: "the Plaintiff's Claim" },
  { pattern: /\bdefendant's claim\b/i, what: "the Defendant's Claim" },
  { pattern: /\bmotion\b/i, what: "a motion" },
];

/**
 * Does this block instruct on Small Claims procedure where it may only route?
 *
 * Exported so the drafting loop can feed it back, not only the promotion gate. A
 * gate that can only refuse wastes four attempts and leaves the stage unwritten;
 * a drafter told "this stage is forum-check only" can write the right block.
 */
export function forumCheckOnlyProblems(text: string, stage: CaseStage): string[] {
  if (!stage.forumCheckOnly) return [];

  const problems: string[] = [];

  for (const { pattern, what } of SMALL_CLAIMS_PROCEDURE) {
    const match = pattern.exec(text);
    if (!match) continue;
    problems.push(
      `names ${what} ("${match[0]}"), and ${stage.id} may carry FORUM-CHECK content ` +
        `only — which court or tribunal handles this kind of matter. This is a stage a ` +
        `misclassified matter lands on, so procedure sends the reader further in the ` +
        `wrong direction. Say which forum, say the monetary line, and stop`,
    );
  }

  return problems;
}

/**
 * A deadline that bars the claim must appear with EVERY exception the stage map
 * records for it.
 *
 * *** WHY THIS IS A GATE AND NOT A REVIEWER'S JOB ***
 *
 * `docs/spot-check-guide.md` opens its list of highest-risk items with exactly
 * this instruction: check that every block stating one of the three pre-suit
 * notice deadlines ALSO states the exceptions — not a bar where the injured
 * person died, and not a bar where a judge finds a reasonable excuse and no
 * prejudice. "A block giving the number without those would frighten someone out
 * of a claim they still have. That failure is invisible — the person simply goes
 * away and never tells anyone."
 *
 * Four successive drafting runs on the same three stages produced, variously: the
 * excuse exception and not the death exception, the death exception and not the
 * excuse, both, and neither. Every one of those runs passed every other gate.
 * The pipeline is not deterministic, so "I read it and it was complete" is a
 * statement about one run, and the next promotion could publish a bar with no
 * exceptions while the suite stayed green.
 *
 * *** HOW IT DECIDES THE EXCEPTION IS PRESENT ***
 *
 * Not by semantics, which a check cannot do. Each exception's DISTINCTIVE WORDS
 * are derived from its own quote — the words in it that do not appear in the
 * quote of the rule it qualifies — and the block must use at least two of them
 * (or the only one, where a quote yields just one). So s. 44 (11) is satisfied by
 * a block that says "death" and "injured", and not by one that merely repeats
 * the notice requirement.
 *
 * Derived rather than hand-listed, so adding an exception to a stage
 * automatically extends the requirement instead of needing a second edit
 * somewhere else.
 */
export function barExceptionProblems(text: string, stage: CaseStage): string[] {
  const lower = text.toLowerCase();
  const problems: string[] = [];

  for (const deadline of stage.deadlines) {
    if (deadline.consequence !== "bars-the-claim") continue;

    for (const exception of deadline.exceptions) {
      // An exception that IS the rule carries no extra qualification to state.
      if (exception.pinpoint === deadline.rule.pinpoint) continue;

      const ruleWords = new Set(wordsOf(deadline.rule.quote));
      const distinctive = [...new Set(wordsOf(exception.quote))].filter(
        (word) => word.length >= 5 && !ruleWords.has(word),
      );
      if (distinctive.length === 0) continue;

      /*
       * *** THE WORDS MUST LAND IN ONE SENTENCE ***
       *
       * Counting them across the whole block passed a Toronto notice block that
       * did NOT state the death exception. Its `whatsHappening` said "10 days from
       * the day you were INJURED" and its `whatHappensAfter` said "the FAILURE to
       * give notice" — two of s. 42 (7)'s distinctive words, in different
       * sentences, meaning entirely different things. Words like "injured" and
       * "person" occur naturally all through injury content, so proximity is what
       * distinguishes stating an exception from happening to use its vocabulary.
       */
      const needed = distinctive.length === 1 ? 1 : 2;
      const sentences = lower.split(/(?<=[.!?])\s+/);
      const best = sentences.reduce((most, sentence) => {
        const hits = distinctive.filter((word) => sentence.includes(word));
        return hits.length > most.length ? hits : most;
      }, [] as string[]);
      const found = best;

      if (found.length < needed) {
        problems.push(
          `states a deadline that BARS THE CLAIM (${deadline.rule.pinpoint}) without the ` +
            `exception at ${exception.pinpoint}. A bar without its exceptions frightens ` +
            `people out of claims they still have, and they never come back to tell us. ` +
            `Looked for ${needed} of: ${distinctive.slice(0, 8).join(", ")}; found ` +
            `${found.length === 0 ? "none in any one sentence" : found.join(" + ") + " in one sentence"}`,
        );
      }
    }
  }

  return problems;
}

/** Lowercased alphabetic words, for the distinctive-word derivation above. */
function wordsOf(quote: string): string[] {
  return quote.toLowerCase().match(/[a-z]+/g) ?? [];
}

/**
 * What every gate below actually reads. Both `StageAnswer` and `GenericAnswer`
 * satisfy it structurally, which is what lets one implementation serve both without
 * either type learning about the other.
 */
export type GateableAnswer = {
  whatsHappening: string;
  whatToDoNext: string;
  yourDeadline: string | null;
  whatHappensAfter: string;
  citations: StageAnswer["citations"];
  sourceIds: string[];
  verification: StageAnswer["verification"];
};

/**
 * A block shown to everybody must not assume which party is reading it.
 *
 * *** WHY THIS EXISTS: AN ABSENT GATE IS WORSE THAN A NEW ONE ***
 *
 * `wrongReaderProblems` protects a stage block by knowing whose stage it is, and it
 * returns nothing when the side is neither plaintiff nor defendant. A generic block
 * has no side, so that protection silently evaporates — and a block shown to
 * EVERYBODY that tells the reader to file a defence is worse than a defendant's
 * block that does, because the plaintiff reading it has no way to know it was not
 * written for them.
 *
 * So the gate is replaced rather than skipped. The patterns are the same confusions
 * `wrongReaderProblems` catches, minus any assumption about which side is wrong.
 */
/**
 * A duty stated by halves, and a period stated without its "at least".
 *
 * *** WHY THE VERIFIER CANNOT CATCH THIS, WHICH IS THE WHOLE REASON IT IS A GATE ***
 *
 * The verifier checks each sentence against the sources: it catches a sentence that
 * says something the source does not. It has no view on what the block LEFT OUT,
 * because an omission is not a sentence.
 *
 * The serving-documents block passed 11 of 11 verdicts at grade 7.82 and never told
 * the reader to file anything. r. 13.03 (2) reads "each party shall serve on every
 * other party AND FILE WITH THE COURT" — two obligations in one breath. Everything the
 * block said was true; a litigant following it exactly would have served their
 * documents and not filed them, which is not compliance. Found by reading the draft,
 * not by any check, which is why there is now a check.
 *
 * This is the same family as `barExceptionProblems` and the admissibility-discretion
 * gate: a proposition whose qualifier or second half must travel with it.
 *
 * *** THE "AT LEAST" HALF ***
 *
 * r. 13.03 (2) and r. 18.02 (1) both say "at least N days before". A block that says
 * "N days before" has stated a different, narrower thing — it reads as a single
 * permitted day rather than a floor, and a reader who cannot serve on precisely that
 * day does not know that earlier is fine. The source's own qualifier is cheap to keep.
 */
export function dutyCompletenessProblems(
  text: string,
  citations: readonly { pinpoint: string; quote: string }[],
): string[] {
  const problems: string[] = [];

  for (const citation of citations) {
    const quote = citation.quote;

    /*
     * A citation that imposes serving AND filing. Matched on the quote's own words so
     * it cannot drift from what was authored.
     */
    if (/\bserve\b[^.]*\band file\b/i.test(quote) || /\bfile with the court\b/i.test(quote)) {
      const mentionsFiling = /\bfil(e|es|ed|ing)\b/i.test(text);
      if (!mentionsFiling) {
        problems.push(
          `${citation.pinpoint} requires serving AND filing with the court, and the block ` +
            `never mentions filing. A reader following this exactly would serve their ` +
            `documents and not file them, which is not compliance.`,
        );
      }
    }

    /*
     * "At least N days" in the source, stated as a bare "N days" in the block.
     *
     * Only fires where the block actually states that same number, so a block that
     * omits the period entirely is not caught here — that is a different problem, and
     * one the stage-map deadline section handles for stage blocks.
     */
    const atLeast = /\bat least (\d{1,3}) days\b/i.exec(quote);
    if (atLeast) {
      const period = atLeast[1];
      const statesPeriod = new RegExp(`\\b${period}\\s+days\\b`, "i").test(text);
      if (statesPeriod) {
        const keepsFloor = new RegExp(
          `\\b(at least|no later than|or more|minimum of)\\s+(\\w+\\s+){0,2}${period}\\s+days\\b`,
          "i",
        ).test(text);
        if (!keepsFloor) {
          problems.push(
            `${citation.pinpoint} says "at least ${period} days", and the block says ` +
              `"${period} days" without the floor. That reads as one permitted day rather ` +
              `than a minimum, so a reader who cannot serve on exactly that day does not ` +
              `learn that earlier is fine.`,
          );
        }
      }
    }
  }

  return problems;
}

export function partyNeutralProblems(text: string): string[] {
  const problems: string[] = [];

  /** Steps only one side ever takes. In a block shown to both, each is wrong for half its readers. */
  const ONE_SIDED_STEPS: { pattern: RegExp; whose: string }[] = [
    {
      pattern: /\byou\b[^.]{0,30}\b(file|filed|filing|serve|served|prepare|complete)\b[^.]{0,40}\b(defence|form 9a)\b/i,
      whose: "only a defendant files a defence",
    },
    {
      pattern: /\byou\b[^.]{0,30}\b(file|filed|filing|request)\b[^.]{0,40}\b(request to clerk|form 9b|note the defendant in default)\b/i,
      whose: "only a plaintiff notes a defendant in default",
    },
    {
      pattern: /\byou (were|have been|was) served with the claim\b/i,
      whose: "only a defendant is served with the claim",
    },
    {
      pattern: /\byou (served|have served)\b[^.]{0,30}\b(the claim|the defendant)\b/i,
      whose: "only a plaintiff serves the claim",
    },
  ];

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    for (const { pattern, whose } of ONE_SIDED_STEPS) {
      if (pattern.test(sentence)) {
        problems.push(
          `this block is shown whatever position the case is in, but it assumes a side — ` +
            `${whose}: "${sentence.trim().slice(0, 110)}"`,
        );
      }
    }
  }

  /*
   * Describing either party in the third person is fine here and would be a failure
   * in a stage block. That asymmetry is deliberate: a generic block genuinely has no
   * "own side", so "each party" and "the other parties" are the correct register, and
   * the rule it rests on is itself written that way — r. 13.03 (2) says "each party
   * shall serve on every other party".
   */
  return problems;
}

/**
 * The gate for a block that belongs to a stage.
 *
 * Thin on purpose: a block whose stage does not resolve is refused here, and
 * everything else is the one shared implementation below.
 */
export function gateFailures(answer: StageAnswer, stage: CaseStage | undefined): string[] {
  if (!stage) {
    return [`answers stage "${answer.stageId}", which is not in the stage map`];
  }
  return allGateFailures(answer, stage);
}

/**
 * The gate for a stage-INDEPENDENT block (src/lib/content-library/genericAnswers.ts).
 *
 * *** WHY THIS IS NOT A SECOND GATE FUNCTION ***
 *
 * A separate implementation would be a second chance to be weaker, and the weaker
 * one always wins in the end because it is the one that passes. So there is ONE
 * implementation, `allGateFailures`, and it takes a nullable stage. Every
 * stage-dependent check inside it is guarded by `if (stage)` and carries an
 * explicit `else` — nothing is skipped for a generic block, it is replaced:
 *
 *   deadline byte-match      -> the deadline section must be null
 *   wrongReaderProblems      -> partyNeutralProblems (the block has no side, so it
 *                               must not tell the reader to take one side's step)
 *   forumCheckOnlyProblems   -> n/a: a generic block routes nobody to a forum
 *   barExceptionProblems     -> n/a: a generic block states no claim-barring deadline,
 *                               and `statesTheBar` below still fires if one appears
 */
export function genericGateFailures(answer: GateableAnswer): string[] {
  return allGateFailures(answer, null);
}

/**
 * Everything both kinds of block must satisfy, plus the stage-shaped checks where
 * a stage exists and their stage-free equivalents where it does not.
 */
function allGateFailures(answer: GateableAnswer, stage: CaseStage | null): string[] {
  const failures: string[] = [];

  if (!isPublishable(answer)) {
    failures.push(`status is "${answer.verification.status}", which is never shown to a user`);
  }

  if (answer.verification.status === ("approved" as string)) {
    failures.push("claims `approved`, which only a licensee may set — never the pipeline");
  }

  // ---- every section present, none abandoned -----------------------------

  if (!answer.whatsHappening || !answer.whatToDoNext || !answer.whatHappensAfter) {
    failures.push("a section is empty, so the block answers only part of the question");
  }

  if (answerText(answer).includes("NOT_SUPPORTED")) {
    failures.push("contains NOT_SUPPORTED, which is the drafter giving up and must never ship");
  }

  // ---- the deadline matches the stage map, exactly ------------------------

  /*
   * Not "has a deadline section" — the RIGHT one. The deadline is rendered by
   * code from the stage map, so the published text must be byte-identical to
   * what that renderer produces today. Anything else means the block was
   * hand-edited, or the stage map moved after promotion.
   */
  if (stage) {
    const expected = renderDeadlineSection(stage.deadlines);
    if ((answer.yourDeadline ?? null) !== (expected ?? null)) {
      failures.push(
        expected
          ? "the deadline section does not match what the stage map renders — the block was " +
            "edited after promotion, or the stage map changed and this content was not re-promoted"
          : "states a deadline the stage map does not have",
      );
    }
  } else if ((answer.yourDeadline ?? null) !== null) {
    /*
     * A generic block has no stage, so it has no authored StageDeadline[] and there
     * is nothing for renderDeadlineSection to produce. A deadline section here could
     * only have been hand-written, which is the one thing ACCURACY_ENGINE decision 4
     * took out of the model's hands. Periods still appear inside the ordinary
     * sections, where the verifier checks them against quoted rule text.
     */
    failures.push(
      "carries a deadline section, but a stage-independent block has no stage map " +
        "deadline to render one from — so this text was hand-written",
    );
  }

  // ---- provenance --------------------------------------------------------

  if (answer.citations.length === 0 && (answer.sourceIds ?? []).length === 0) {
    failures.push("no provenance: neither a cited rule nor a source support was found in");
  }

  // ---- every quote still in the corpus, checked NOW ----------------------

  for (const verdict of answer.verification.verdicts) {
    if (!verdict.supported || !verdict.quote) continue;

    /*
     * *** A VERDICT MAY NOT CLAIM CORPUS SUPPORT IT DOES NOT HAVE ***
     *
     * The premise is the stage map's own description. A verdict resting on it
     * must record `quoteFound: false`, and must never name a corpus source.
     * An independent review found sixteen verdicts recorded as
     * `supported: true, quoteFound: true` against `sourceId: "stage-premise"` —
     * the system verifying its prose against its own prose and booking it as
     * corpus support.
     */
    if (verdict.sourceId === "stage-premise") {
      if (verdict.quoteFound) {
        failures.push(
          `a verdict cites the stage map as its source and claims quoteFound — our own ` +
            `prose is not corpus support, and recording it as such is circular`,
        );
      }
      continue;
    }

    /*
     * A named source must be a real corpus file. `guide-after-judgment` is;
     * an invented id is not, and a verdict naming one has been checked against
     * nothing.
     */
    if (verdict.sourceId && !corpus().has(verdict.sourceId)) {
      failures.push(
        `a verdict names "${verdict.sourceId}" as its source, which is not a vendored ` +
          `corpus file — nothing checked it`,
      );
    }

    for (const quote of verdict.quote.split(" | ")) {
      if (quote.trim().length < 25) continue;
      if (findQuote(quote) === null) {
        failures.push(
          `rests on a passage that is not in the vendored corpus: "${quote.slice(0, 90)}"`,
        );
      }
    }
  }

  if (answer.verification.status === "verified-draft") {
    const unsupported = answer.verification.verdicts.filter((verdict) => !verdict.supported);
    if (unsupported.length > 0) {
      failures.push(`${unsupported.length} sentence(s) are unsupported in a verified block`);
    }
    if (answer.verification.verdicts.length === 0) {
      failures.push("verified-draft with no verdicts at all — nothing was actually checked");
    }
  }

  // ---- a no-source block says so, and only where it is true --------------

  if (answer.verification.status === "no-source") {
    const empty = new Set(answer.verification.sectionsWithoutSource);
    if (empty.size === 0) {
      failures.push("marked no-source but no section is recorded as empty");
    }
    if (!answerText(answer).includes(NO_SOURCE_NOTICE)) {
      failures.push("marked no-source but does not carry the notice, so it reads as guidance");
    }
    for (const name of ["whatToDoNext", "whatHappensAfter"] as const) {
      const section = answer[name];
      if (!section?.includes(NO_SOURCE_NOTICE)) continue;
      if (!empty.has(name) || section.trim() !== NO_SOURCE_NOTICE) {
        failures.push(
          `the no-source notice sits in "${name}" alongside real guidance, so the block ` +
            `says it cannot help immediately after helping`,
        );
      }
    }
  }

  // ---- the block must address the right party ----------------------------

  if (stage) {
    failures.push(...wrongReaderProblems(answerText(answer), stage.side, answer.sourceIds ?? []));
  } else {
    failures.push(...partyNeutralProblems(answerText(answer)));
  }

  /*
   * ---- the prose gates run on what a MODEL wrote --------------------------
   *
   * *** WHY THE DEADLINE SECTION IS EXCLUDED, AND WHY THAT IS NOT A LOOPHOLE ***
   *
   * `assertsAbsenceProblems` fired on the deadline section of all three pre-suit
   * notice blocks, on this sentence:
   *
   *   "Under the statute it does not — only Sunday and holidays are excluded."
   *
   * which is MY OWN Saturday warning, written in decision 4, and the gate is mine
   * too, written in decision 1. Between them they made the three claim-barring
   * notice stages impossible to publish: every run would produce a block whose
   * code-rendered deadline text violated a gate no drafter could avoid, because
   * no drafter writes that text.
   *
   * It is also a false positive on its own terms. Decision 1 forbids claiming the
   * law provides no remedy — an absence nothing in the corpus can verify. This
   * sentence says which days a statutory list NAMES, and s. 88 (2) is an
   * enumeration: "Sunday" is in it and "Saturday" is not, which is a fact about
   * the text, checkable by reading it.
   *
   * So these two gates now run on the model-written sections. That is the same
   * division decision 4 already settled for the verifier: the deadline section is
   * not model output, it is assembled from the stage map's authored fields, every
   * quote checked by test:stage-map on every run, and the gate below requires it
   * BYTE-IDENTICAL to what the renderer produces. A stronger guarantee than a
   * prose gate, not a weaker one — and applying a gate designed for model prose to
   * code-rendered text is the same category error as sending it to the verifier.
   */
  const modelProse = [answer.whatsHappening, answer.whatToDoNext, answer.whatHappensAfter]
    .filter(Boolean)
    .join("\n\n");

  failures.push(...assertsAbsenceProblems(modelProse));
  failures.push(
    ...glossProblems(
      modelProse,
      (answer.verification.verdicts ?? [])
        .map((verdict) => verdict.quote ?? "")
        .filter((quote) => quote.length > 0),
    ),
  );

  // ---- forum-check stages route; they do not instruct ---------------------

  if (stage) failures.push(...forumCheckOnlyProblems(answerText(answer), stage));

  // ---- a claim-barring deadline carries EVERY exception the stage records -

  if (stage) failures.push(...barExceptionProblems(answerText(answer), stage));

  // ---- a duty stated by halves, or a period without its floor ------------
  failures.push(...dutyCompletenessProblems(answerText(answer), answer.citations ?? []));

  // ---- a bar stated without the thing that qualifies it ------------------

  /*
   * *** THE LIMITATION PERIOD IS NOT A FLAT PROPOSITION ***
   *
   * An independent review found a published block rendering Limitations Act
   * s. 4 as:
   *
   *   "A proceeding shall not be commenced in respect of a claim after the
   *    second anniversary of the day on which the claim was discovered."
   *
   * The corpus reads "**Unless this Act provides otherwise,** a proceeding
   * shall not be commenced…". The dropped words are the ones that preserve
   * discovery (s. 5), minors and incapacity (ss. 6-7), and the suspensions.
   *
   * The harm is specific and one-directional: somebody out of time ON THE FACE
   * OF IT, but with a later discovery date or a suspension, reads an
   * unqualified bar in the block whose entire purpose is "am I out of time?"
   * and abandons a live claim. Nobody ever reports that.
   *
   * So: state the two-year bar and you must also carry the qualifier, or
   * discovery, or say the date is not established.
   */
  const statesTheBar =
    /\b(two years|second anniversary)\b/i.test(answerText(answer)) &&
    /\b(shall not be commenced|cannot (start|bring)|too late|barred)\b/i.test(answerText(answer));

  if (statesTheBar) {
    const carriesTheQualifier =
      /unless this act provides otherwise/i.test(answerText(answer)) ||
      /\bdiscover(ed|y)\b/i.test(answerText(answer)) ||
      /\bnot been established\b/i.test(answerText(answer));

    if (!carriesTheQualifier) {
      failures.push(
        "states the two-year limitation bar without the qualifier that limits it " +
          `("Unless this Act provides otherwise"), or discovery, or that the date is not ` +
          `established — a reader with a later discovery date would abandon a live claim`,
      );
    }
  }

  /*
   * ---- ADMISSIBILITY STATED WITHOUT THE JUDGE'S DISCRETION -----------------
   *
   * *** THE SAME SHAPE OF ERROR AS THE LIMITATION BAR ABOVE, POINTING THE OTHER WAY ***
   *
   * r. 18.02 (1) says a document served at least 30 days before trial "shall be
   * received in evidence, UNLESS THE TRIAL JUDGE ORDERS OTHERWISE". Drafts of the
   * serving-documents block repeatedly dropped the last four words, producing
   * "serve it 30 days before trial to ensure it is received in evidence" and
   * "they will be part of the court record and can be used during the trial".
   *
   * The harm is the mirror of the limitation case. There, dropping a qualifier made
   * a live claim look dead. Here it makes an evidentiary question look settled: a
   * litigant who believes service alone guarantees admission does not prepare to
   * put the document in any other way, and finds out at trial. The judge's
   * discretion is the whole difference between a right and a route.
   *
   * So: state the 30-day admissibility and you must carry the discretion with it.
   */
  const text0 = answerText(answer);
  const statesAdmissibility =
    /\b30 days\b/i.test(text0) &&
    /\b(received in evidence|admitted|be used (at|during) (the )?trial|part of the court record)\b/i.test(
      text0,
    );

  if (statesAdmissibility) {
    const carriesDiscretion =
      /unless the (trial )?judge orders otherwise/i.test(text0) ||
      /\bthe (trial )?judge (may|can) (decide|order|rule)\b/i.test(text0);

    if (!carriesDiscretion) {
      failures.push(
        "states that serving a document 30 days before trial gets it into evidence, " +
          'without the qualifier that limits it ("unless the trial judge orders ' +
          'otherwise") — a reader would stop preparing any other way to prove it',
      );
    }
  }

  // ---- how it reads ------------------------------------------------------

  const text = answerText(answer);

  const prediction = predictsOutcome(text);
  if (prediction) {
    failures.push(
      `predicts an outcome ("${prediction}") — refused even when a source says it (CLAUDE.md §3)`,
    );
  }

  const spellings = Array.from(new Set(Array.from(text.matchAll(US_SPELLINGS), (m) => m[0])));
  if (spellings.length > 0) {
    failures.push(`American spelling: ${spellings.join(", ")}`);
  }

  /*
   * *** READING LEVEL, WITH THE TERM-OF-ART EXCEPTION ***
   *
   * `assessReadability` returns withinTarget for a block that meets grade 8, and also
   * for one that only misses it because of an allowlisted term of art — a named
   * proceeding or statutory phrase with no accurate plain substitute. See
   * readabilityExceptions.ts for the mechanism and why it cannot be used to wave
   * through padding: the term is substituted at one syllable per word, holding word and
   * sentence counts constant, and the block must then meet the target.
   *
   * This applies to stage blocks as well as generic ones, deliberately. It is a rule
   * about terms of art, not a concession to one block, and a stage block naming a
   * settlement conference has exactly the same problem. It changes nothing for the 16
   * published blocks: they top out at 7.98, so they never reach this branch.
   *
   * The grant is not silent. `readabilityExceptionFor` lets a caller retrieve the
   * exception and log it, and the drafting run prints it.
   */
  const assessment = assessReadability(text, TARGET_GRADE);
  if (!assessment.withinTarget) {
    failures.push(assessment.reason);
  }

  return failures;
}
