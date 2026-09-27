/**
 * Hands a signed upload URL to the owner of a case, for one document.
 *
 * *** THIS ROUTE'S CHECKS ARE A COURTESY, NOT THE CONTROL ***
 *
 * The client sends the first bytes of the file so the user learns immediately that
 * a .zip will not be stored, before spending a phone's upload allowance on it. But
 * the client supplies those bytes, so they prove nothing. The authoritative check
 * happens in the register route, which reads the bytes back out of storage after
 * the upload and refuses — and removes the object — if they are not what was
 * promised.
 *
 * Saying that plainly here matters, because a reader who assumes this route
 * validates the file would reasonably conclude the register route's re-check is
 * redundant and delete it.
 *
 * *** WHAT IS ACTUALLY ENFORCED HERE ***
 *
 *   - the caller is authenticated, by bearer token, never by an id in the body
 *   - the case belongs to them, via getAuthenticatedOwnedCase, which runs under
 *     their own token with RLS in effect
 *   - the object path is built by documentObjectPath, so its first segment is the
 *     caller's own user id — which is the whole of the storage access control
 *
 * No document content and no file name reaches any model on this path. Nothing
 * here calls one.
 */

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import { getAuthenticatedUser, getAuthenticatedOwnedCase } from "@/src/lib/supabase/serverAuth";
import {
  MAX_DOCUMENT_BYTES,
  SNIFF_BYTES,
  validateUpload,
} from "@/src/lib/case-workspace/fileValidation";
import {
  DOCUMENT_BUCKET,
  documentObjectPath,
  isUuid,
} from "@/src/lib/case-workspace/storagePaths";

export const runtime = "nodejs";

/*
 * The body carries 64 bytes of file head as base64, plus a name and a size. A
 * generous ceiling on the whole request keeps a malformed or hostile body from
 * being parsed at length; it is not a size limit on the FILE, which is never sent
 * to this route at all.
 */
const MAX_BODY_BYTES = 8 * 1024;

type UploadUrlRequestBody = {
  caseId?: string;
  originalName?: string;
  declaredMime?: string | null;
  sizeBytes?: number;
  /** base64 of the first SNIFF_BYTES bytes of the file. */
  head?: string;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function refuse(status: number, error: string, detail?: string) {
  return NextResponse.json({ success: false, error, detail }, { status });
}

function decodeHead(head: string | undefined): Uint8Array | null {
  if (typeof head !== "string" || head.length === 0) return null;
  try {
    const bytes = Buffer.from(head, "base64");
    // An empty result from a non-empty string means it was not base64 at all.
    return bytes.length > 0 ? new Uint8Array(bytes) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
      return refuse(413, "The request is too large.");
    }

    const body: UploadUrlRequestBody = await req.json();

    const caseId = String(body.caseId || "").trim();
    if (!isUuid(caseId)) return refuse(400, "A valid case id is required.");

    const ownedCase = await getAuthenticatedOwnedCase(req, user, caseId);
    /*
     * 404 and not 403. Distinguishing "this case is not yours" from "there is no
     * such case" tells an unauthenticated prober which case ids exist.
     */
    if (!ownedCase) return refuse(404, "Case not found.");

    const head = decodeHead(body.head);
    if (head === null) {
      return refuse(
        400,
        "The first bytes of the file are required.",
        `Send the first ${SNIFF_BYTES} bytes as base64 in "head" so the file type ` +
          `can be checked before it is uploaded.`,
      );
    }

    const sizeBytes = Number(body.sizeBytes);

    const validation = validateUpload({
      originalName: String(body.originalName || ""),
      declaredMime: body.declaredMime ?? null,
      sizeBytes,
      head,
    });

    if (!validation.ok) {
      return refuse(422, validation.reason, validation.detail);
    }

    const documentId = randomUUID();
    const storagePath = documentObjectPath({
      userId: user.id,
      caseId,
      documentId,
    });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error("workspace upload-url error:", error?.message);
      return refuse(500, "CourtSimplified could not start the upload.");
    }

    return NextResponse.json({
      success: true,
      documentId,
      storagePath,
      bucket: DOCUMENT_BUCKET,
      signedUrl: data.signedUrl,
      token: data.token,
      /*
       * Returned so the client can store the object with the type read from its
       * bytes rather than the type the browser guessed from the extension.
       */
      storedMime: validation.storedMime,
      mismatchNotice: validation.mismatchNotice,
      maxBytes: MAX_DOCUMENT_BYTES,
      /*
       * The upload is not finished when the object lands. The client must call
       * POST /api/workspace/documents to register it, and an object with no row is
       * an incomplete upload, not a document.
       */
      nextStep: "POST /api/workspace/documents with this documentId",
    });
  } catch (error) {
    console.error("workspace upload-url error:", error);
    return refuse(500, "CourtSimplified could not start the upload.");
  }
}
