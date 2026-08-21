import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  resolveBetaProcedureAuthority,
  type BetaProcedureAuthorityMetadata,
} from "../../../../src/lib/case-system/authority-intelligence/betaProcedureAuthority";

type CourtPath = "small-claims" | "family" | "civil";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizeCourtArea(courtPath: unknown): CourtPath | null {
  if (courtPath === "small-claims" || courtPath === "family" || courtPath === "civil") {
    return courtPath;
  }

  return null;
}

function stage(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function withBetaProcedureAuthority(
  records: Record<string, unknown>[],
  context: { courtArea: CourtPath; procedureStage: string; asOf?: Date },
) {
  return records.map((record) => ({
    ...record,
    betaAuthority: resolveBetaProcedureAuthority(
      record as BetaProcedureAuthorityMetadata,
      context,
    ),
  }));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { courtPath?: unknown; stage?: unknown };
    const courtArea = normalizeCourtArea(body.courtPath);
    const procedureStage = stage(body.stage);

    if (!courtArea || !procedureStage) {
      return NextResponse.json(
        { error: "A supported court path and procedure stage are required." },
        { status: 400 },
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase server keys are missing." },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("legal_procedure_rules")
      .select("*")
      .eq("court_area", courtArea)
      .eq("procedure_stage", procedureStage)
      .eq("is_active", true);

    if (error) {
      console.error("Procedures Supabase error:", error.message);
      return NextResponse.json(
        { error: "Failed to load procedure rules." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      withBetaProcedureAuthority((data || []) as Record<string, unknown>[], {
        courtArea,
        procedureStage,
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to process procedure rules." },
      { status: 500 },
    );
  }
}
