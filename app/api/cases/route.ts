import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

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
  master_result?: unknown;
  caseContext?: unknown;
  evidencePackages?: unknown[];
  workspaceDocuments?: unknown[];
  syncNotes?: string[];
  metadata?: Record<string, unknown>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_CASE_REQUEST_BYTES = 1_000_000;

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function createCaseId() {
  return randomUUID();
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Authentication is required.",
    },
    { status: 401 },
  );
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

function buildMasterResult(
  body: SaveCaseRequestBody,
): Record<string, unknown> {
  const existing = asRecord(body.master_result);
  const persistedRecord = asRecord(existing.persistedRecord);
  const persistedMetadata = asRecord(persistedRecord.metadata);

  return {
    ...existing,

    caseContext: body.caseContext || existing.caseContext || null,

    persistedRecord: {
      id: body.id || body.caseId || persistedRecord.id || null,
      title:
        body.title ||
        persistedRecord.title ||
        existing.title ||
        "Untitled CourtSimplified case",
      casePath:
        body.casePath ||
        body.path ||
        persistedRecord.casePath ||
        existing.casePath ||
        "unknown",
      stage:
        body.stage ||
        persistedRecord.stage ||
        existing.stage ||
        "not-sure",
      status:
        body.status ||
        persistedRecord.status ||
        existing.status ||
        "ready-for-sync",
      evidencePackages:
        body.evidencePackages ||
        persistedRecord.evidencePackages ||
        [],
      workspaceDocuments:
        body.workspaceDocuments ||
        persistedRecord.workspaceDocuments ||
        [],
      syncNotes: normalizeStringArray(
        body.syncNotes || persistedRecord.syncNotes,
      ),
      metadata: {
        ...persistedMetadata,
        ...(body.metadata || {}),
        lastSavedBy: "app/api/cases/route.ts",
        lastSavedAt: new Date().toISOString(),
      },
    },

    updatedAt: new Date().toISOString(),
  };
}

function buildCaseRow(body: SaveCaseRequestBody, authenticatedUserId: string) {
  const id = body.id || body.caseId || createCaseId();

  const masterResult = buildMasterResult({
    ...body,
    id,
  });
  const persistedRecord = asRecord(masterResult.persistedRecord);

  return {
    id,

    user_id: authenticatedUserId,

    title:
      body.title ||
      persistedRecord.title ||
      masterResult.title ||
      "Untitled CourtSimplified case",

    court_path:
      body.casePath ||
      body.path ||
      persistedRecord.casePath ||
      masterResult.casePath ||
      "unknown",

    current_stage:
      body.stage ||
      persistedRecord.stage ||
      masterResult.stage ||
      "not-sure",

    status:
      body.status ||
      persistedRecord.status ||
      masterResult.status ||
      "ready-for-sync",

    master_result: masterResult,

    updated_at: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id") || searchParams.get("caseId");
    const limitRaw = searchParams.get("limit");

    const requestedLimit = limitRaw ? Number(limitRaw) : 25;
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), 100)
        : 25;

    if (id) {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 404 },
        );
      }

      if (!data) {
        return NextResponse.json(
          {
            success: false,
            error: "Case not found.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        case: data,
      });
    }

    const query = supabase
      .from("cases")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);

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
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorizedResponse();
    }

    const contentLength = Number(req.headers.get("content-length") || 0);

    if (contentLength > MAX_CASE_REQUEST_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "The case payload is too large.",
        },
        { status: 413 },
      );
    }

    const supabase = getSupabaseAdmin();

    const body: SaveCaseRequestBody = await req.json();

    if (JSON.stringify(body).length > MAX_CASE_REQUEST_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "The case payload is too large.",
        },
        { status: 413 },
      );
    }

    const row = buildCaseRow(body, user.id);

    const { data: existingCase, error: ownershipError } = await supabase
      .from("cases")
      .select("id,user_id")
      .eq("id", row.id)
      .maybeSingle();

    if (ownershipError) {
      return NextResponse.json(
        {
          success: false,
          error: ownershipError.message,
        },
        { status: 500 },
      );
    }

    if (existingCase && existingCase.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Case not found.",
        },
        { status: 404 },
      );
    }

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
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorizedResponse();
    }

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

    const { data, error } = await supabase
      .from("cases")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Case not found.",
        },
        { status: 404 },
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
