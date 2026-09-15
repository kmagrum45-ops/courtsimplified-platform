/**
 * Creates a real `cases` row owned by the run's own harness user.
 *
 * WHY A REAL ROW AND NOT A ROUTE STUB. The candidate surface is served by
 * `GET /api/cases/event-candidates`, which reads `master_result` from the
 * database on the SERVER. Stubbing `rest/v1/cases` in the browser — what
 * intakeDriver does — never reaches that read, so the route would see no case
 * and return nothing, and the spec would pass or fail for the wrong reason.
 *
 * WHERE THE TIMELINE GOES, AND WHY IT IS THE POINT. Entries live at
 * `master_result.masterCase.timeline`. The route read `master_result.timeline`
 * — top level, written by nothing — from the day it shipped, so every request
 * resolved zero candidates and the surface was permanently empty. The seed
 * below writes the CORRECT location. If someone moves the read back, the
 * candidate assertions fail, which is the whole reason this spec exists.
 */

import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function readEnvVar(name: string): string {
  if (process.env[name]) return process.env[name] as string;

  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return "";

  const pattern = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`);
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = pattern.exec(line);
    if (match) return match[1].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

/** Sentences the seeded case's narrative parse produced. */
export const SEEDED_SENTENCES = [
  "I served the defendant with the claim on 4 March.",
  "I sent a final invoice in January and heard nothing back.",
];

export type SeededCase = { caseId: string };

export async function seedCaseWithTimeline(userId: string): Promise<SeededCase> {
  const supabaseUrl = readEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnvVar("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (environment or .env.local) to seed a case.",
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // An hour ago, so every event this run records postdates it. Relative, not
  // a fixed date: a hardcoded timestamp stops being in the past eventually,
  // and a check that expires is worse than one that fails.
  const analysedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("cases")
    .insert({
      user_id: userId,
      court_path: "small-claims",
      title: "Harness seeded case",
      status: "active",
      current_stage: "already-started",
      master_result: {
        courtPath: "small-claims",
        province: "Ontario",
        masterCase: {
          stage: "already-started",
          courtPath: "small-claims",
          // The location that matters. See the note at the top of this file.
          timeline: SEEDED_SENTENCES.map((sentence, index) => ({
            id: `timeline_seed_${index}`,
            title: sentence.slice(0, 40),
            description: sentence,
            sourceText: sentence,
          })),
        },
        // Deliberately absent: `intakeFacts`. The stage must come from
        // confirmed events alone, so that confirming one is the only thing
        // that can move it. Seeding intake facts would let the stage be
        // right for a reason the spec is not testing.
        //
        // Deliberately PRESENT, and dated in the past: `derivedFrom`. An
        // analysis with no derivedFrom is "never-analyzed", not stale — by
        // design, so that users whose analyses predate the field are not told
        // theirs is out of date on the strength of a missing key. A seed
        // without it therefore makes the freshness banner unreachable no
        // matter what the user records, and the spec's banner assertion could
        // never pass. This represents the case the banner exists for: an
        // analysis that ran, before the event was recorded.
        derivedFrom: { at: analysedAt, latestEventCreatedAt: null },
      },
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Could not seed a harness case: ${error?.message || "no row returned"}`);
  }

  return { caseId: data.id as string };
}
