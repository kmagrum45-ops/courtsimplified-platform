/**
 * THE CAUSE, READ DIRECTLY: DOES THE TAB'S WHOLE-CHECKPOINT SAVE ERASE A FACT THE SERVER WROTE?
 * (case core, before G2; founder, 1 Nov: "confirm the cause directly first").
 *
 * The claim it tests: fact-coexistence.spec.ts fails the same way before and after option A + G1a
 * because, when the unconverted form re-saves (step 3), the page saves its WHOLE intake checkpoint
 * through saveCheckpoint, which writes the tab's own snapshot over the row
 * (src/lib/case-system/intakeCheckpoint.ts:115, `intakeCheckpoint: committed`). The tab's snapshot
 * has no caseFile.facts, so the record POST /api/cases/facts wrote is gone, and option A has nothing
 * to apply.
 *
 * What it does, in Small Claims, civil and Family, signed in through the real save path:
 *   A. the other party typed into the whole form and saved (the row read: revision, updated_at);
 *   B. removed through POST /api/cases/facts (200); the row read: caseFile.facts.otherParty must be
 *      there (state "removed") -- HARD: if absent, the route itself did not write, and the cause is
 *      elsewhere;
 *   C. the form re-saves the old name (emptied, then typed back: the page's own save); the row read:
 *      the checkpoint revision must have changed (HARD: else no whole-tab save happened and the check
 *      proves nothing), and caseFile.facts.otherParty must STILL be there -- HARD, the rule the site
 *      needs; it is expected to FAIL today, with a message naming intakeCheckpoint.ts:115.
 * Printed per court and phase: only the checkpoint revision, updated_at, and the fact record's state and
 * seq. Never a token, a key or the name.
 *
 * WHAT WOULD PROVE THE CAUSE WRONG: at C the revision changed AND caseFile.facts.otherParty is still
 * present (then something else hides the removal from the screens: the readers, not the save); or at B
 * the record is already absent (then the route did not write it, and the save is not the cause).
 *
 * Reads the row with the harness's staging admin client (harnessAdmin: service key from the environment,
 * never printed; refuses production). Stand-ins: the model routes (serveModelStandIns), the situation
 * answers (autoAnswerSituation), and step B's request sent from the page with its own session (no
 * screen calls the route yet). NEEDS STAGING, alone.
 */
import { expect, test } from "@playwright/test";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openWholeForm, postFacts, savedNow, typeOtherParty, type Court } from "./harness/factRail";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const OLD = "Plum Yellow Movers Ltd.";
const STORY: Record<Court, string> = {
  "small-claims": "Synthetic: a moving company broke my dining table in May 2026. I have photos.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. I have the invoice.",
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house.",
};

type RowRead = { revision: string | null; updatedAt: string | null; fact: { state?: unknown; seq?: unknown } | null };
/** The saved row's checkpoint revision, updated_at and fact record for the other party -- nothing else. */
async function readRow(caseId: string): Promise<RowRead> {
  const { data, error } = await harnessAdmin()
    .from("cases")
    .select("updated_at, revision:master_result->intakeCheckpoint->>revision, fact:master_result->intakeCheckpoint->sections->caseFile->facts->otherParty")
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw new Error(`could not read the saved row (${error.code ?? "no code"})`);
  const row = (data ?? {}) as { updated_at?: string; revision?: string; fact?: Record<string, unknown> | null };
  const fact = row.fact && typeof row.fact === "object" ? { state: row.fact.state, seq: row.fact.seq } : null;
  return { revision: row.revision ?? null, updatedAt: row.updated_at ?? null, fact };
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`cause (${court}): the tab's whole-checkpoint save keeps the fact record the server wrote`, async ({ page }) => {
    test.setTimeout(600_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, court, userId);
      const caseId = await openWholeForm(page, court, STORY[court]);
      expect(caseId, "the intake has a saved case").toMatch(/^[0-9a-f-]{36}$/);

      // A. The old copy, typed and saved.
      await typeOtherParty(page, court, OLD);
      const a = await readRow(caseId);
      console.log(`[cause] ${court} A (form saved):     ${JSON.stringify(a)}`);

      // B. Removed through the new path.
      const removed = await postFacts(page, caseId, [{ fact: "otherParty", state: "removed", source: "person" }]);
      expect(removed.status, `POST /api/cases/facts answered ${removed.status}`).toBe(200);
      const b = await readRow(caseId);
      console.log(`[cause] ${court} B (after the POST):  ${JSON.stringify(b)}`);
      expect(b.fact?.state, "B: the route wrote caseFile.facts.otherParty (if absent, the route is the cause, not the save)").toBe("removed");

      // C. The unconverted form re-saves the old name: the page's own whole-checkpoint save.
      await typeOtherParty(page, court, "");
      await typeOtherParty(page, court, OLD);
      await savedNow(page);
      await page.waitForTimeout(3_000);
      const c = await readRow(caseId);
      console.log(`[cause] ${court} C (after the re-save): ${JSON.stringify(c)}`);
      expect(c.revision, "C: the tab saved its checkpoint again (revision changed); if not, this run proves nothing").not.toBe(b.revision);
      expect(c.fact?.state, `C: the fact record survived the tab's whole-checkpoint save. ABSENT means the cause is src/lib/case-system/intakeCheckpoint.ts:115 (saveCheckpoint writes the tab's snapshot whole: intakeCheckpoint: committed). Revision ${b.revision} -> ${c.revision}, updated_at ${b.updatedAt} -> ${c.updatedAt}`).toBe("removed");
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
