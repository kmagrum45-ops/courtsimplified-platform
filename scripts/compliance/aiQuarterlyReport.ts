/**
 * The quarterly AI supervision report.
 *
 * WHAT IT IS FOR. Under the LSO Access to Innovation framework the licensee
 * supervises the AI, and supervision that happens only when something goes
 * wrong is not supervision. This produces the numbers a reviewer needs on a
 * schedule: how much the system called a model, what for, how often it failed,
 * how often someone asked for legal advice, and how often the output guard
 * refused to show something.
 *
 * WHO RUNS IT. The licensee, locally, with the service role key from
 * .env.local. It is a script and not a route on purpose — a URL that returns
 * the audit log is a URL someone has to defend, and this needs no such
 * defending. There is no admin role in this codebase (see the migration's
 * Decision 3), so "admin-only" is enforced by the key living on a machine an
 * operator is sitting at.
 *
 *   node --import tsx --env-file=.env.local scripts/compliance/aiQuarterlyReport.ts
 *   node --import tsx --env-file=.env.local scripts/compliance/aiQuarterlyReport.ts --from 2026-07-01 --to 2026-09-30
 *
 * Defaults to the last 90 days.
 *
 * WHAT IT DELIBERATELY DOES NOT SHOW. Anything identifying a user, and
 * anything a user wrote. The table holds neither (migration Decision 1), and
 * the aggregates here would not reveal them even if it did. A supervision
 * report that requires reading people's legal problems is a report a licensee
 * would reasonably hesitate to run, and a report nobody runs is worth nothing.
 *
 * ON AN EMPTY RESULT. It says the log is empty and exits 0. That is not the
 * same as "nothing happened" and the output says so: until the migration has
 * been applied and the app has served traffic with it, empty is the expected
 * answer, and reading it as "no AI calls were made" would be exactly wrong.
 */

import { createClient } from "@supabase/supabase-js";

type LogRow = {
  created_at: string;
  call_type: string;
  model: string;
  prompt_version: string;
  validation_result: string;
  requests_legal_advice: boolean | null;
  output_guard_blocked: number;
  latency_ms: number;
};

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return null;
  return process.argv[index + 1];
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index];
}

function table(rows: Array<Record<string, string | number>>): void {
  if (rows.length === 0) {
    console.log("  (none)");
    return;
  }
  const columns = Object.keys(rows[0]);
  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => String(row[column]).length)),
  );

  console.log("  " + columns.map((c, i) => c.padEnd(widths[i])).join("  "));
  console.log("  " + widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of rows) {
    console.log("  " + columns.map((c, i) => String(row[c]).padEnd(widths[i])).join("  "));
  }
}

/*
 * A note on why every exit below sets process.exitCode and returns instead of
 * calling process.exit(1).
 *
 * process.exit() while the Supabase client still has a socket closing aborts
 * libuv on Windows ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)").
 * The exit code is the same either way, but the abort prints a C stack trace
 * underneath the message — so the clearest failure this script has, "the
 * migration has not been applied yet", arrived looking like a crash in the
 * script rather than an answer from it.
 */
async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Run with --env-file=.env.local.",
    );
    process.exitCode = 1;
    return;
  }

  const toArg = argValue("--to");
  const fromArg = argValue("--from");

  for (const [flag, value] of [["--from", fromArg], ["--to", toArg]] as const) {
    if (value !== null && !isIsoDate(value)) {
      console.error(`${flag} must be a date in YYYY-MM-DD form; got "${value}".`);
      process.exitCode = 1;
      return;
    }
  }

  const to = toArg ? new Date(`${toArg}T23:59:59.999Z`) : new Date();
  const from = fromArg
    ? new Date(`${fromArg}T00:00:00.000Z`)
    : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);

  if (from > to) {
    console.error("--from is after --to.");
    process.exitCode = 1;
    return;
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Paged, because a quarter of traffic is not a single response. A report
  // that silently truncated at 1,000 rows would understate every number in it.
  const rows: LogRow[] = [];
  const pageSize = 1_000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("ai_call_log")
      .select(
        "created_at, call_type, model, prompt_version, validation_result, requests_legal_advice, output_guard_blocked, latency_ms",
      )
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Could not read ai_call_log.");
      console.error(`  code: ${error.code ?? "(none)"}`);
      console.error(
        "  If this is 'relation does not exist', the migration has not been applied yet:\n" +
          "  supabase/migrations/20260922120000_add_ai_call_log.sql",
      );
      process.exitCode = 1;
      return;
    }

    rows.push(...((data ?? []) as LogRow[]));
    if (!data || data.length < pageSize) break;
  }

  const period = `${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`;

  console.log("");
  console.log("AI SUPERVISION REPORT");
  console.log(`Period: ${period}`);
  console.log("");

  if (rows.length === 0) {
    console.log("No AI calls recorded in this period.");
    console.log("");
    console.log("This is NOT the same as 'the system made no AI calls'. An empty log also");
    console.log("means the migration has not been applied, or the app has not served traffic");
    console.log("since it was. Confirm which before recording this as a finding.");
    return;
  }

  // ---- Volume by call type ----
  const byType = new Map<string, LogRow[]>();
  for (const row of rows) {
    const list = byType.get(row.call_type) ?? [];
    list.push(row);
    byType.set(row.call_type, list);
  }

  console.log(`1. VOLUME — ${rows.length} call(s) across ${byType.size} call type(s)`);
  console.log("");
  table(
    [...byType.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([callType, list]) => {
        const latencies = list.map((row) => row.latency_ms).sort((a, b) => a - b);
        return {
          call_type: callType,
          calls: list.length,
          models: [...new Set(list.map((row) => row.model))].join(", "),
          prompt_versions: new Set(list.map((row) => row.prompt_version)).size,
          p50_ms: percentile(latencies, 0.5),
          p95_ms: percentile(latencies, 0.95),
        };
      }),
  );

  // ---- Validation outcomes ----
  const failures = rows.filter((row) => row.validation_result !== "valid");
  console.log("");
  console.log(
    `2. VALIDATION — ${failures.length} of ${rows.length} call(s) did not return usable output ` +
      `(${((failures.length / rows.length) * 100).toFixed(1)}%)`,
  );
  console.log("");
  const byOutcome = new Map<string, number>();
  for (const row of rows) {
    byOutcome.set(row.validation_result, (byOutcome.get(row.validation_result) ?? 0) + 1);
  }
  table(
    [...byOutcome.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([outcome, count]) => ({ validation_result: outcome, calls: count })),
  );

  // ---- Legal-advice requests ----
  const advice = rows.filter((row) => row.requests_legal_advice === true);
  console.log("");
  console.log(`3. LEGAL-ADVICE REQUESTS — ${advice.length} call(s) flagged`);
  console.log("");
  console.log(
    "  Each of these showed the user the fixed deflection message and the four referral",
    "\n  resources, and nothing else. The count is the supervision signal; what the user",
    "\n  wrote is deliberately not recorded (migration Decision 1).",
  );
  if (advice.length > 0) {
    console.log("");
    const byMonth = new Map<string, number>();
    for (const row of advice) {
      const month = row.created_at.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }
    table(
      [...byMonth.entries()]
        .sort()
        .map(([month, count]) => ({ month, flagged: count })),
    );
  }

  // ---- Output guard ----
  const blocked = rows.reduce((total, row) => total + (row.output_guard_blocked ?? 0), 0);
  const callsWithBlocks = rows.filter((row) => (row.output_guard_blocked ?? 0) > 0);
  console.log("");
  console.log(
    `4. OUTPUT GUARD — ${blocked} string(s) refused across ${callsWithBlocks.length} call(s)`,
  );
  console.log("");
  if (blocked === 0) {
    console.log("  Nothing was blocked. Every string a render path tried to show was either a");
    console.log("  content-library item or an allowlisted system message.");
  } else {
    console.log("  A nonzero count is worth reading, not just recording. It means either that");
    console.log("  content is awaiting licensee review, or that a render path tried to show");
    console.log("  text that is not in the library. The second is the finding.");
    console.log("");
    table(
      [...byType.entries()]
        .map(([callType, list]) => ({
          call_type: callType,
          strings_blocked: list.reduce((total, row) => total + (row.output_guard_blocked ?? 0), 0),
        }))
        .filter((row) => row.strings_blocked > 0)
        .sort((a, b) => b.strings_blocked - a.strings_blocked),
    );
  }

  // ---- Prompt changes ----
  console.log("");
  console.log("5. PROMPT CHANGES IN PERIOD");
  console.log("");
  console.log("  prompt_version is a hash of the system prompt. More than one version for a");
  console.log("  call type means the prompt changed during the period, which is a thing a");
  console.log("  reviewer should know before comparing this quarter to the last one.");
  console.log("");
  const changed = [...byType.entries()]
    .map(([callType, list]) => ({
      call_type: callType,
      versions: new Set(list.map((row) => row.prompt_version)).size,
    }))
    .filter((row) => row.versions > 1);
  table(changed);

  console.log("");
}

main().catch((error) => {
  console.error("Report failed.", error instanceof Error ? error.name : "UnknownError");
  process.exitCode = 1;
});
