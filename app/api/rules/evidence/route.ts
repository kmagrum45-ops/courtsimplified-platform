// app/api/rules/evidence/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizeCourtArea(courtPath: string) {
  if (courtPath === "small-claims") return "small-claims";
  if (courtPath === "family") return "family";
  if (courtPath === "civil") return "civil";
  return courtPath;
}

export async function POST(req: Request) {
  try {
    const { courtPath, issues } = await req.json();

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase server keys are missing." },
        { status: 500 }
      );
    }

    const normalizedIssues = Array.isArray(issues)
      ? issues.filter(Boolean)
      : [];

    if (normalizedIssues.length === 0) {
      return NextResponse.json([]);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("legal_evidence_rules")
      .select("*")
      .eq("court_area", normalizeCourtArea(courtPath))
      .in("issue_name", normalizedIssues)
      .eq("is_active", true);

    if (error) {
      console.error("Evidence Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load evidence rules." },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Evidence API error:", error);
    return NextResponse.json(
      { error: "Failed to process evidence rules." },
      { status: 500 }
    );
  }
}