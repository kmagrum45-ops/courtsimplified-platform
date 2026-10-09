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
 *   GET    ?caseId=   the case's messages, oldest first (last 200)
 *   POST   { caseId, messages: [{ role, content }] }   appends (at most 4)
 *   DELETE { caseId }   clears the conversation ("Clear chat")
 *
 * Until the migration is applied the table does not exist: every call
 * answers { ok: false } and the chat keeps its browser copy, as before.
 */

const MAX_CONTENT = 8_000;
const MAX_APPEND = 4;

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

export type ChatMessageRow = { role: "user" | "assistant"; content: string };

export function validMessages(value: unknown): ChatMessageRow[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_APPEND) return null;
  const rows: ChatMessageRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, MAX_CONTENT);
    if (!text) return null;
    rows.push({ role, content: text });
  }
  return rows;
}

async function signedIn(request: Request) {
  const user = await getAuthenticatedUser(request).catch(() => null);
  const supabase = user ? sessionClient(request) : null;
  return user && supabase ? { user, supabase } : null;
}

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get("caseId") ?? "";
  if (!UUID_PATTERN.test(caseId)) return NextResponse.json({ ok: false, error: "A saved case is required." }, { status: 400 });
  const session = await signedIn(request);
  if (!session) return NextResponse.json({ ok: false, error: "Sign in to see your saved conversation." }, { status: 401 });
  const { data, error } = await session.supabase
    .from("case_chat_messages")
    .select("role, content, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ ok: false });
  const rows = (data ?? []) as { role: string; content: string }[];
  return NextResponse.json({ ok: true, messages: rows.reverse().map(({ role, content }) => ({ role, content })) });
}

export async function POST(request: Request) {
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
  const { error } = await session.supabase
    .from("case_chat_messages")
    .insert(messages.map((message) => ({ ...message, case_id: caseId, user_id: session.user.id })));
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
