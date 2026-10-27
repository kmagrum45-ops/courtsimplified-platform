import { withConfirmedGuidance } from "@/src/lib/security/intakeGuidanceGate";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { UUID_PATTERN } from "@/src/lib/case-system/events/caseEventRequest";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

/**
 * The assistant conversation, saved with the case (2026-10-08). It lived
 * only in the browser, so a person returning on another device found it gone
 * (site owner: "like starting over"). Table: case_chat_messages
 * (20261009090000_case_reader_and_case_chat.sql), owner-only by RLS and an
 * owner foreign key; this route uses the person's own session, never the
 * service role, so RLS decides what they can read and write.
 *
 *   GET    ?caseId=   the case's messages, oldest first (last 200), each with its law
 *   POST   { caseId, messages: [{ role, content, law? }] }   appends (at most 4); answers their ids
 *   PATCH  { caseId, id, law }   the law found for a question, once its lookup finishes
 *   DELETE { caseId }   clears the conversation ("Clear chat")
 *
 * THE LAW SHOWN WITH AN ANSWER IS KEPT WITH IT (Chrome, 28 Oct): a reopened chat showed each answer's
 * words but not the sections and citations shown live, which were held only in the page. They are
 * saved with the question they answer (column `law`, 20261028090000_case_chat_law.sql). Until that
 * migration is applied the column is missing: the messages save and load without it, and the law
 * stays in the browser's copy, as before.
 *
 * Until the first migration is applied the table does not exist: every call
 * answers { ok: false } and the chat keeps its browser copy, as before.
 */

const MAX_CONTENT = 8_000;
const MAX_APPEND = 4;
/** The law found for one question: a checked answer and its sources, as the page shows them. */
// Below the database's 200 KB (which measures jsonb's text, with a space after every ":" and ","),
// so anything the route accepts also fits there (reviewer, 28 Oct).
const MAX_LAW_BYTES = 150_000;

/**
 * Oldest first. A question and its answer are saved in one statement, so they share created_at; within
 * one moment the question comes first (reviewer, 28 Oct: the order was not guaranteed, and a question's
 * law shows under the message after it).
 */
export function inOrder<T extends { role: string; created_at: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || (a.role === b.role ? 0 : a.role === "user" ? -1 : 1));
}

/** The law kept with a question: an object of a sane size, else nothing. */
export function validLaw(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length <= MAX_LAW_BYTES ? (value as Record<string, unknown>) : null;
  } catch { return null; }
}
/** The table has no `law` column yet (the migration is not applied): Postgres 42703, or PostgREST's PGRST204. */
const noLawColumn = (error: { code?: string; message?: string } | null) => Boolean(error && (error.code === "42703" || error.code === "PGRST204" || /\blaw\b/.test(error.message ?? "")));

function sessionClient(request: Request) {
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

export type ChatMessageRow = { role: "user" | "assistant"; content: string; law?: Record<string, unknown> };

export function validMessages(value: unknown): ChatMessageRow[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_APPEND) return null;
  const rows: ChatMessageRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { role, content, law } = item as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, MAX_CONTENT);
    if (!text) return null;
    const kept = validLaw(law);
    rows.push({ role, content: text, ...(kept ? { law: kept } : {}) });
  }
  return rows;
}

async function signedIn(request: Request) {
  const user = await getAuthenticatedUser(request).catch(() => null);
  const supabase = user ? sessionClient(request) : null;
  return user && supabase ? { user, supabase } : null;
}

async function getGuidance(request: Request) {
  const caseId = new URL(request.url).searchParams.get("caseId") ?? "";
  if (!UUID_PATTERN.test(caseId)) return NextResponse.json({ ok: false, error: "A saved case is required." }, { status: 400 });
  const session = await signedIn(request);
  if (!session) return NextResponse.json({ ok: false, error: "Sign in to see your saved conversation." }, { status: 401 });
  const read = (columns: string) => session.supabase
    .from("case_chat_messages")
    .select(columns)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(200);
  let { data, error } = await read("id, role, content, created_at, law");
  if (noLawColumn(error)) ({ data, error } = await read("id, role, content, created_at"));
  if (error) return NextResponse.json({ ok: false });
  const rows = (data ?? []) as unknown as { id: string; role: string; content: string; law?: unknown; created_at: string }[];
  return NextResponse.json({ ok: true, messages: inOrder(rows).map(({ id, role, content, law }) => ({ id, role, content, ...(validLaw(law) ? { law, lawSaved: true } : {}) })) });
}

async function postGuidance(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const messages = validMessages(body.messages);
  if (!UUID_PATTERN.test(caseId) || !messages) return NextResponse.json({ ok: false, error: "A saved case and messages are required." }, { status: 400 });
  const session = await signedIn(request);
  if (!session) return NextResponse.json({ ok: false, error: "Sign in to save the conversation." }, { status: 401 });
  const insert = (rows: ChatMessageRow[]) => session.supabase
    .from("case_chat_messages")
    .insert(rows.map((message) => ({ ...message, case_id: caseId, user_id: session.user.id })))
    .select("id");
  let { data, error } = await insert(messages);
  // No law column yet: the messages still save, without it.
  if (noLawColumn(error)) ({ data, error } = await insert(messages.map(({ role, content }) => ({ role, content }))));
  return NextResponse.json({ ok: !error, ...(error ? {} : { ids: ((data ?? []) as { id: string }[]).map((row) => row.id) }) });
}

/** The law for a saved question, once its lookup has finished (the question was saved before it). */
async function patchGuidance(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const id = typeof body.id === "string" ? body.id : "";
  const law = validLaw(body.law);
  if (!UUID_PATTERN.test(caseId) || !UUID_PATTERN.test(id) || !law) return NextResponse.json({ ok: false, error: "A saved question and its law are required." }, { status: 400 });
  const session = await signedIn(request);
  if (!session) return NextResponse.json({ ok: false, error: "Sign in to save the conversation." }, { status: 401 });
  const { error } = await session.supabase.from("case_chat_messages").update({ law }).eq("id", id).eq("case_id", caseId);
  return NextResponse.json({ ok: !error });
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "A valid request body is required." }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  if (!UUID_PATTERN.test(caseId)) return NextResponse.json({ ok: false, error: "A saved case is required." }, { status: 400 });
  const session = await signedIn(request);
  if (!session) return NextResponse.json({ ok: false, error: "Sign in to clear the conversation." }, { status: 401 });
  const { error } = await session.supabase.from("case_chat_messages").delete().eq("case_id", caseId);
  return NextResponse.json({ ok: !error });
}

export const GET = withConfirmedGuidance(getGuidance, {"currentAnalysis":true});

export const POST = withConfirmedGuidance(postGuidance, {"currentAnalysis":true});

export const PATCH = withConfirmedGuidance(patchGuidance, {"currentAnalysis":true});
