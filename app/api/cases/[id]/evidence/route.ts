import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import { getAuthenticatedUser, getAuthenticatedOwnedCase } from "@/src/lib/supabase/serverAuth";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EVIDENCE_BUCKET = "case-evidence";
const MAX_EVIDENCE_FILE_BYTES = 50 * 1024 * 1024; // matches the bucket's file_size_limit

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

function clean(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || "evidence-file";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180);
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Authentication is required." },
    { status: 401 },
  );
}

function caseNotFoundResponse() {
  return NextResponse.json(
    { success: false, error: "Case not found." },
    { status: 404 },
  );
}

async function requireOwnedCase(req: NextRequest, caseId: string) {
  const user = await getAuthenticatedUser(req);
  if (!user) return { error: unauthorizedResponse() } as const;

  const ownedCase = await getAuthenticatedOwnedCase(req, user, caseId);
  if (!ownedCase) return { error: caseNotFoundResponse() } as const;

  return { user, ownedCase } as const;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: caseId } = await params;
    const auth = await requireOwnedCase(req, caseId);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_EVIDENCE_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: "The file is too large." },
        { status: 413 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded." },
        { status: 400 },
      );
    }

    if (file.size > MAX_EVIDENCE_FILE_BYTES) {
      return NextResponse.json(
        { success: false, error: "The file is too large." },
        { status: 413 },
      );
    }

    const title = clean(formData.get("title")) || file.name;
    const category = clean(formData.get("category")) || null;
    const description = clean(formData.get("description")) || null;
    const evidenceDateRaw = clean(formData.get("evidenceDate"));
    const evidenceDate = isValidDate(evidenceDateRaw) ? evidenceDateRaw : null;
    const source = clean(formData.get("source")) || null;
    const relevance = clean(formData.get("relevance")) || null;

    const evidenceId = randomUUID();
    const storagePath = `${user.id}/${caseId}/${evidenceId}/${sanitizeFileName(file.name)}`;

    const supabase = getSupabaseAdmin();
    const fileBytes = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(storagePath, fileBytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("case_evidence")
      .insert({
        id: evidenceId,
        case_id: caseId,
        user_id: user.id,
        title,
        category,
        description,
        evidence_date: evidenceDate,
        source,
        relevance,
        storage_path: storagePath,
      })
      .select("*")
      .single();

    if (error) {
      // Keep Storage and the database from drifting apart if the insert fails.
      await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, evidence: data },
      { status: 200 },
    );
  } catch (error) {
    console.error("cases/[id]/evidence POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CourtSimplified could not upload the evidence file.",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: caseId } = await params;
    const auth = await requireOwnedCase(req, caseId);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("case_evidence")
      .select("*")
      .eq("case_id", caseId)
      .eq("user_id", user.id)
      .order("evidence_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, evidence: data || [] });
  } catch (error) {
    console.error("cases/[id]/evidence GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CourtSimplified could not load evidence.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: caseId } = await params;
    const auth = await requireOwnedCase(req, caseId);
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const evidenceId = searchParams.get("evidenceId") || searchParams.get("id");

    if (!evidenceId) {
      return NextResponse.json(
        { success: false, error: "Missing evidence id." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existing, error: fetchError } = await supabase
      .from("case_evidence")
      .select("id,storage_path")
      .eq("id", evidenceId)
      .eq("case_id", caseId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Evidence not found." },
        { status: 404 },
      );
    }

    const { error: deleteError } = await supabase
      .from("case_evidence")
      .delete()
      .eq("id", evidenceId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 },
      );
    }

    if (existing.storage_path) {
      await supabase.storage.from(EVIDENCE_BUCKET).remove([existing.storage_path]);
    }

    return NextResponse.json({ success: true, deletedId: evidenceId });
  } catch (error) {
    console.error("cases/[id]/evidence DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CourtSimplified could not delete the evidence file.",
      },
      { status: 500 },
    );
  }
}
