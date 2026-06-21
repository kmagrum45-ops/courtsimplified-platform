import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type SaveCaseRequestBody = {
  id?: string;
  caseId?: string;
  userId?: string;
  title?: string;
  casePath?: string;
  path?: string;
  stage?: string;
  status?: string;
  master_result?: any;
  caseContext?: any;
  evidencePackages?: any[];
  workspaceDocuments?: any[];
  syncNotes?: string[];
  metadata?: any;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function createCaseId() {
  return `case_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => clean(item)).filter(Boolean);
  }

  if (typeof value === "string" && clean(value)) {
    return [clean(value)];
  }

  return [];
}

function buildMasterResult(body: SaveCaseRequestBody) {
  const existing = body.master_result || {};

  return {
    ...existing,

    caseContext: body.caseContext || existing.caseContext || null,

    persistedRecord: {
      id: body.id || body.caseId || existing?.persistedRecord?.id || null,
      title:
        body.title ||
        existing?.persistedRecord?.title ||
        existing?.title ||
        "Untitled CourtSimplified case",
      casePath:
        body.casePath ||
        body.path ||
        existing?.persistedRecord?.casePath ||
        existing?.casePath ||
        "unknown",
      stage:
        body.stage ||
        existing?.persistedRecord?.stage ||
        existing?.stage ||
        "not-sure",
      status:
        body.status ||
        existing?.persistedRecord?.status ||
        existing?.status ||
        "ready-for-sync",
      evidencePackages:
        body.evidencePackages ||
        existing?.persistedRecord?.evidencePackages ||
        [],
      workspaceDocuments:
        body.workspaceDocuments ||
        existing?.persistedRecord?.workspaceDocuments ||
        [],
      syncNotes: normalizeStringArray(
        body.syncNotes || existing?.persistedRecord?.syncNotes,
      ),
      metadata: {
        ...(existing?.persistedRecord?.metadata || {}),
        ...(body.metadata || {}),
        lastSavedBy: "app/api/cases/route.ts",
        lastSavedAt: new Date().toISOString(),
      },
    },

    updatedAt: new Date().toISOString(),
  };
}

function buildCaseRow(body: SaveCaseRequestBody) {
  const id = body.id || body.caseId || createCaseId();

  const masterResult = buildMasterResult({
    ...body,
    id,
  });

  return {
    id,

    user_id: body.userId || null,

    title:
      body.title ||
      masterResult?.persistedRecord?.title ||
      masterResult?.title ||
      "Untitled CourtSimplified case",

    case_path:
      body.casePath ||
      body.path ||
      masterResult?.persistedRecord?.casePath ||
      masterResult?.casePath ||
      "unknown",

    stage:
      body.stage ||
      masterResult?.persistedRecord?.stage ||
      masterResult?.stage ||
      "not-sure",

    status:
      body.status ||
      masterResult?.persistedRecord?.status ||
      masterResult?.status ||
      "ready-for-sync",

    master_result: masterResult,

    updated_at: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id") || searchParams.get("caseId");
    const userId = searchParams.get("userId");
    const limitRaw = searchParams.get("limit");

    const limit = limitRaw ? Number(limitRaw) : 25;

    if (id) {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        case: data,
      });
    }

    let query = supabase
      .from("cases")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? limit : 25);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      cases: data || [],
    });
  } catch (error) {
    console.error("cases GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CourtSimplified could not load cases.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const body: SaveCaseRequestBody = await req.json();

    const row = buildCaseRow(body);

    const { data, error } = await supabase
      .from("cases")
      .upsert(row, {
        onConflict: "id",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      case: data,
      metadata: {
        id: data?.id || row.id,
        savedAt: new Date().toISOString(),
        source: "app/api/cases/route.ts",
      },
    });
  } catch (error) {
    console.error("cases POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CourtSimplified could not save the case.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id") || searchParams.get("caseId");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing case id.",
        },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("cases").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error("cases DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CourtSimplified could not delete the case.",
      },
      { status: 500 },
    );
  }
}