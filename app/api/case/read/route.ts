import { withConfirmedGuidance } from "@/src/lib/security/intakeGuidanceGate";
import { confirmedIntakeRevision } from "@/src/lib/case-system/intakeReview";
import { createClient } from "@supabase/supabase-js";
import { updateMasterResult } from "@/src/lib/case-system/updateCaseRecord";
import { NextResponse } from "next/server";

import { userStory } from "@/src/lib/case-system/userStory";
import { UUID_PATTERN } from "@/src/lib/case-system/events/caseEventRequest";
import { caseWordsFrom, readCase } from "@/src/lib/case-system/intake/caseReaderModel";
import type { CasePicture } from "@/src/lib/case-system/intake/caseReader";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { caseReaderEnabled } from "@/src/lib/content-library/phaseScope";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

/**
 * POST /api/case/read { caseId } (2026-10-08, master plan Phase 3): the case
 * reader (intake/caseReader.ts) reads what the person has written on their
 * own saved case and stores the checked picture on it (master_result.
 * casePicture), so every page offers the step and dates their words describe.
 *
 * Off unless CASE_READER=on. Signed in, and only the case's owner. The words
 * read are the saved case's, never the request's. Nothing here decides
 * anything: the picture only feeds suggestions the person confirms.
 */
export const maxDuration = 60;

type OwnedCase = { master_result?: unknown; court_path?: string | null };

type Dependencies = {
  enabled: () => boolean;
  hasAi: () => boolean;
  authenticate: (request: Request) => Promise<{ id: string } | null>;
  ownedCase: (request: Request, user: { id: string }, caseId: string) => Promise<OwnedCase | null>;
  read: (personsWords: string, transcript: string, caseId: string) => Promise<CasePicture>;
  /** Writes casePicture only, onto the case as it is NOW (the read takes seconds; the person may have saved since). */
  save: (request: Request, user: { id: string }, caseId: string, picture: Record<string, unknown>, inputRevision?: string | null) => Promise<boolean>;
};

function authenticatedClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return url && key && token
    ? createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}

export function createCaseReadPost(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    enabled: () => caseReaderEnabled(),
    hasAi: hasConfiguredServerAi,
    authenticate: async (request) => (await getAuthenticatedUser(request)) as { id: string } | null,
    ownedCase: async (request, user, caseId) =>
      (await getAuthenticatedOwnedCase(request, user as never, caseId)) as OwnedCase | null,
    read: (personsWords, transcript, caseId) => readCase(personsWords, transcript, process.env.OPENAI_API_KEY ?? "", { caseId }),
    save: async (request, user, caseId, picture, inputRevision) => {
      const supabase = authenticatedClient(request);
      if (!supabase) return false;
      // Never over a stage or date saved while the reading was running
      // (updateCaseRecord.ts).
      const saved = await updateMasterResult(supabase, { caseId, userId: user.id }, (current) => inputRevision && confirmedIntakeRevision(current, undefined, caseId) !== inputRevision ? { reject: "stale-intake" } : ({ ...current, casePicture: picture }));
      return saved.ok;
    },
    ...overrides,
  };

  return async function caseReadPost(request: Request) {
    if (!deps.enabled()) return NextResponse.json({ ok: true, picture: null, skipped: "off" });
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
    }
    const caseId = typeof body.caseId === "string" ? body.caseId : "";
    /*
     * saveOnServer: false (2026-10-14): the builder writes the picture itself,
     * inside its one write queue for the case (positionSave.ts runCaseWrite),
     * so this write never runs beside the page's own saves of the same row.
     * The route then only reads and returns the picture as it would have
     * stored it (storedPicture). Without it, the route saves as before.
     */
    const saveOnServer = body.saveOnServer !== false;
    if (
      !UUID_PATTERN.test(caseId) ||
      Object.keys(body).some((key) => key !== "caseId" && key !== "saveOnServer") ||
      (body.saveOnServer !== undefined && body.saveOnServer !== false)
    ) {
      return NextResponse.json({ ok: false, error: "A saved case is required." }, { status: 400 });
    }
    const user = await deps.authenticate(request).catch(() => null);
    if (!user) return NextResponse.json({ ok: true, picture: null, skipped: "signed-out" });
    if (!deps.hasAi()) return NextResponse.json({ ok: true, picture: null, skipped: "no-ai" });
    const owned = await deps.ownedCase(request, user, caseId).catch(() => null);
    if (!owned) return NextResponse.json({ ok: false, error: "The case could not be found." }, { status: 404 });

    const master = (owned.master_result && typeof owned.master_result === "object" ? owned.master_result : {}) as Record<string, unknown>;
    const story = userStory(master.intakeData as never);
    const { personsWords, transcript } = caseWordsFrom(master, story);
    if (personsWords.trim().length < 20) return NextResponse.json({ ok: true, picture: null, skipped: "nothing-to-read" });

    let picture: CasePicture;
    try {
      picture = await deps.read(personsWords, transcript, caseId);
    } catch {
      // The site carries on exactly as before without it.
      return NextResponse.json({ ok: true, picture: null, skipped: "read-failed" });
    }
    const storedPicture = { ...picture, readAt: new Date().toISOString() };
    if (!saveOnServer) return NextResponse.json({ ok: true, picture, saved: false, storedPicture });
    const saved = await deps.save(request, user, caseId, storedPicture, confirmedIntakeRevision(master, owned.court_path, caseId)).catch(() => false);
    return NextResponse.json({ ok: true, picture, saved });
  };
}

export const POST = withConfirmedGuidance(createCaseReadPost(), {"currentAnalysis":true});
