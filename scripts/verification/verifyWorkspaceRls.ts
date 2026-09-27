/**
 * One litigant cannot reach another's documents. Proved by trying it, against a real
 * database, with two real accounts.
 *
 * WHAT THIS CATCHES: the incident this whole feature is written to prevent — a
 * cross-user read of somebody's medical records, bank statements or solicitor's letters.
 *
 * *** WHY THIS EXISTS WHEN THERE IS ALREADY AN RLS SUITE ***
 *
 * `verifyCaseRlsPolicyContract` is entirely static. It reads the migration files and
 * asserts the policy DDL is there. That is worth having, and it proves the policies are
 * WRITTEN — not that they WORK. A policy can be present and wrong; a `USING` clause can
 * name the wrong column; a table can have policies and not have RLS enabled, in which
 * case the policies are inert and the table is open.
 *
 * None of that is visible in the DDL text. So this suite signs in as a second user and
 * tries to read, change and delete the first user's rows and files.
 *
 * *** THE THING THAT MAKES OR BREAKS A TEST LIKE THIS ***
 *
 * **Row Level Security FILTERS; it does not error.** A `SELECT` of another user's rows
 * returns an empty result and a 200, not a permission error. So a check written as "this
 * should throw" passes whether RLS works or not, and passes just as happily against a
 * table with no policies at all — because an unauthorised read that returns rows still
 * does not throw.
 *
 * Every assertion below is therefore on ROW COUNT, not on an error.
 *
 * *** AND THE POSITIVE CONTROL IS NOT OPTIONAL ***
 *
 * "User B sees 0 of user A's documents" is also what you get from a query with a typo, a
 * wrong table name, or a client that never authenticated. Zero is the expected answer and
 * zero is what failure looks like, which is the worst possible arrangement.
 *
 * So B must SEE THEIR OWN document in the same run, through the same client. Without
 * that, a green result here means nothing.
 *
 * *** SAFETY ***
 *
 * Creates and deletes real accounts, so it refuses to run against anything but staging —
 * by REF, checked here in addition to assertNotProduction, because this writes. Cleanup
 * runs in `finally`, including after a failure: abandoned probe accounts accumulate in a
 * project that is supposed to hold no user data.
 *
 * COSTS: a few seconds and four rows in staging. No model, no money.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceRls.ts
 */

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const STAGING_REF = "icpvzwxyjsdgyqfkwycw";
const BUCKET = "case-evidence";

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

function env(): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) parsed[match[1]] = match[2].trim();
  }
  return parsed;
}

type Probe = {
  id: string;
  email: string;
  caseId: string;
  documentId: string;
  storagePath: string;
  client: SupabaseClient;
};

async function main() {
  console.log("");
  console.log("WORKSPACE RLS — one litigant cannot reach another's documents");
  console.log("");

  const config = env();
  const url = config.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = config.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const ref = (url ?? "").match(/https:\/\/([a-z0-9]+)\./)?.[1] ?? null;

  /*
   * By ref, and refusing rather than warning. This creates accounts and uploads objects;
   * "probably not production" is not a standard for that.
   */
  if (ref !== STAGING_REF) {
    fail(
      "refusing to run: this suite creates real accounts and must only touch staging",
      `configured ref is ${ref ?? "none"}, expected ${STAGING_REF}`,
    );
    return;
  }

  console.log(`  target ${ref} (staging)`);
  console.log("");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const probes: Probe[] = [];

  try {
    // ---- two real accounts, each with a case and a document ----

    for (const label of ["a", "b"]) {
      const email = `rls-probe-${label}-${randomUUID()}@example.invalid`;
      const password = `probe-${randomUUID()}`;

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError || !created.user) {
        fail("could not create a probe account", createError?.message ?? "no user returned");
        return;
      }

      const userId = created.user.id;
      const caseId = randomUUID();
      const documentId = randomUUID();
      const storagePath = `${userId}/${caseId}/${documentId}`;

      const { error: caseError } = await admin
        .from("cases")
        .insert({ id: caseId, user_id: userId, court_path: "small-claims", title: "RLS probe" });

      if (caseError) {
        fail("could not create a probe case", caseError.message);
        return;
      }

      const { error: documentError } = await admin.from("workspace_documents").insert({
        id: documentId,
        case_id: caseId,
        user_id: userId,
        storage_path: storagePath,
        original_name: `probe-${label}.txt`,
        mime: "text/plain",
        size_bytes: 12,
        sha256: randomUUID().replace(/-/g, ""),
      });

      if (documentError) {
        fail("could not create a probe document", documentError.message);
        return;
      }

      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(storagePath, new Blob([`probe ${label}\n`], { type: "text/plain" }), {
          contentType: "text/plain",
          upsert: true,
        });

      if (uploadError) {
        fail("could not upload a probe object", uploadError.message);
        return;
      }

      // Signed in as themselves, with the ANON key — the browser's position.
      const client = createClient(url, anonKey, { auth: { persistSession: false } });
      const { error: signInError } = await client.auth.signInWithPassword({ email, password });

      if (signInError) {
        fail("a probe account could not sign in", signInError.message);
        return;
      }

      probes.push({ id: userId, email, caseId, documentId, storagePath, client });
    }

    const [a, b] = probes;
    console.log(`  created two accounts, two cases, two documents, two objects`);
    console.log("");

    // -----------------------------------------------------------------------
    // 1. THE POSITIVE CONTROL — without this, every "0 rows" below is worthless
    // -----------------------------------------------------------------------

    {
      const problems: string[] = [];

      const { data: own, error } = await b.client
        .from("workspace_documents")
        .select("id")
        .eq("id", b.documentId);

      if (error) problems.push(`B could not read their own document: ${error.message}`);
      if ((own ?? []).length !== 1) {
        problems.push(
          `B sees ${(own ?? []).length} of their own documents, expected 1. Every ` +
            `cross-user assertion below expects 0 rows, so if this client cannot read ` +
            `anything the whole suite passes for the wrong reason.`,
        );
      }

      const { data: ownFile, error: ownFileError } = await b.client.storage
        .from(BUCKET)
        .download(b.storagePath);

      if (ownFileError || !ownFile) {
        problems.push(
          `B could not download their own file (${ownFileError?.message ?? "no data"}), so a ` +
            `refused download below proves nothing about RLS`,
        );
      }

      if (problems.length === 0) {
        pass("B can read their own document row and download their own file (positive control)");
      } else {
        fail("the positive control failed — nothing else in this suite is evidence", problems.join("\n"));
        return;
      }
    }

    // -----------------------------------------------------------------------
    // 2. B cannot READ A's rows — asserted on row count, not on an error
    // -----------------------------------------------------------------------

    {
      const problems: string[] = [];

      const reads: [string, () => Promise<{ count: number; error: string | null }>][] = [
        [
          "workspace_documents by id",
          async () => {
            const { data, error } = await b.client
              .from("workspace_documents")
              .select("id,original_name")
              .eq("id", a.documentId);
            return { count: (data ?? []).length, error: error?.message ?? null };
          },
        ],
        [
          "workspace_documents by A's user_id",
          async () => {
            const { data, error } = await b.client
              .from("workspace_documents")
              .select("id")
              .eq("user_id", a.id);
            return { count: (data ?? []).length, error: error?.message ?? null };
          },
        ],
        [
          "workspace_documents unfiltered (the whole table)",
          async () => {
            const { data, error } = await b.client.from("workspace_documents").select("id,user_id");
            const foreign = (data ?? []).filter((row) => row.user_id !== b.id);
            return { count: foreign.length, error: error?.message ?? null };
          },
        ],
        [
          "cases by A's id",
          async () => {
            const { data, error } = await b.client.from("cases").select("id").eq("id", a.caseId);
            return { count: (data ?? []).length, error: error?.message ?? null };
          },
        ],
        [
          "workspace_document_text unfiltered",
          async () => {
            const { data, error } = await b.client
              .from("workspace_document_text")
              .select("document_id,user_id");
            const foreign = (data ?? []).filter((row) => row.user_id !== b.id);
            return { count: foreign.length, error: error?.message ?? null };
          },
        ],
      ];

      for (const [what, run] of reads) {
        const { count } = await run();
        if (count > 0) {
          problems.push(
            `B read ${count} row(s) of A's data via ${what}. This is a cross-user read of ` +
              `another litigant's case file.`,
          );
        }
      }

      if (problems.length === 0) {
        pass(`B reads 0 of A's rows across ${reads.length} query shapes, including the unfiltered table`);
      } else {
        fail("one litigant can read another's records", problems.join("\n"));
      }
    }

    // -----------------------------------------------------------------------
    // 3. B cannot CHANGE or DELETE A's rows, and cannot forge one as A
    // -----------------------------------------------------------------------

    {
      const problems: string[] = [];

      const { data: updated } = await b.client
        .from("workspace_documents")
        .update({ user_label: "written by B" })
        .eq("id", a.documentId)
        .select("id");

      if ((updated ?? []).length > 0) {
        problems.push(`B updated ${(updated ?? []).length} of A's document rows`);
      }

      const { data: deleted } = await b.client
        .from("workspace_documents")
        .delete()
        .eq("id", a.documentId)
        .select("id");

      if ((deleted ?? []).length > 0) {
        problems.push(`B DELETED ${(deleted ?? []).length} of A's document rows`);
      }

      /*
       * Forging a row that claims to be A's. An INSERT violating a WITH CHECK clause DOES
       * error, unlike a SELECT — so this one is asserted on the error being present, and
       * on the row not existing afterwards.
       */
      const forgedId = randomUUID();
      const { error: forgeError } = await b.client.from("workspace_documents").insert({
        id: forgedId,
        case_id: a.caseId,
        user_id: a.id,
        storage_path: `${a.id}/${a.caseId}/${forgedId}`,
        original_name: "forged.txt",
        mime: "text/plain",
        size_bytes: 1,
        sha256: randomUUID().replace(/-/g, ""),
      });

      if (!forgeError) {
        problems.push("B inserted a document row claiming to belong to A");
      }

      const { data: forged } = await admin
        .from("workspace_documents")
        .select("id")
        .eq("id", forgedId);

      if ((forged ?? []).length > 0) {
        problems.push("a forged row belonging to A exists in the table");
      }

      // And A's row is untouched.
      const { data: original } = await admin
        .from("workspace_documents")
        .select("id,user_label")
        .eq("id", a.documentId)
        .maybeSingle();

      if (!original) {
        problems.push("A's document row is GONE after B's attempts");
      } else if (original.user_label !== null) {
        problems.push(`A's row carries a label B wrote: "${original.user_label}"`);
      }

      if (problems.length === 0) {
        pass("B cannot update or delete A's rows, cannot forge one as A, and A's row is untouched");
      } else {
        fail("one litigant can change another's records", problems.join("\n"));
      }
    }

    // -----------------------------------------------------------------------
    // 4. B cannot reach A's FILE — the object, not the row
    // -----------------------------------------------------------------------

    {
      /*
       * The row is metadata. The file is the medical record. Storage is governed by four
       * policies comparing the first path segment to auth.uid(), which is a different
       * mechanism from the table policies and can fail independently.
       */
      const problems: string[] = [];

      const { data: downloaded, error: downloadError } = await b.client.storage
        .from(BUCKET)
        .download(a.storagePath);

      if (downloaded && !downloadError) {
        const text = await downloaded.text();
        problems.push(
          `B DOWNLOADED A's file (${text.length} bytes). This is the incident the whole ` +
            `feature is built to prevent.`,
        );
      }

      const { data: signed } = await b.client.storage
        .from(BUCKET)
        .createSignedUrl(a.storagePath, 60);

      if (signed?.signedUrl) {
        /*
         * A signed URL handed out for someone else's object is worse than a download: it
         * is transferable and outlives the session. Checked by USING it, because the
         * client returning a URL is not proof it works.
         */
        const response = await fetch(signed.signedUrl);
        if (response.ok) {
          problems.push(
            "B obtained a WORKING signed URL for A's file — transferable, and outliving B's session",
          );
        } else {
          problems.push(
            `B was issued a signed URL for A's file; it returned ${response.status} when used. ` +
              `Storage refused the fetch, but the URL should not have been issued.`,
          );
        }
      }

      const { data: listed } = await b.client.storage.from(BUCKET).list(a.id);
      if ((listed ?? []).length > 0) {
        problems.push(`B listed ${(listed ?? []).length} entr(ies) inside A's folder`);
      }

      if (problems.length === 0) {
        pass("B cannot download A's file, is issued no signed URL for it, and cannot list A's folder");
      } else {
        fail("one litigant can reach another's files", problems.join("\n"));
      }
    }

    // -----------------------------------------------------------------------
    // 5. RLS is ENABLED on every workspace table, not merely policied
    // -----------------------------------------------------------------------

    {
      /*
       * A table can carry policies and have RLS switched off, in which case the policies
       * are inert and the table is wide open. That is invisible in the DDL text the static
       * suite reads, and it is invisible in the checks above too if the anon role happens
       * to lack a grant.
       *
       * Probed behaviourally: an UNAUTHENTICATED client must read 0 rows from each table.
       */
      const anon = createClient(url, anonKey, { auth: { persistSession: false } });
      const problems: string[] = [];

      const tables = [
        "workspace_documents",
        "workspace_document_text",
        "workspace_timeline_events",
        "workspace_communications",
      ];

      for (const table of tables) {
        const { data } = await anon.from(table).select("*").limit(5);
        if ((data ?? []).length > 0) {
          problems.push(`an unauthenticated client read ${(data ?? []).length} row(s) from ${table}`);
        }
      }

      if (problems.length === 0) {
        pass(`an unauthenticated client reads 0 rows from all ${tables.length} workspace tables`);
      } else {
        fail("a workspace table is readable without signing in", problems.join("\n"));
      }
    }
  } finally {
    // ---- cleanup, whatever happened ----
    for (const probe of probes) {
      try {
        await admin.storage.from(BUCKET).remove([probe.storagePath]);
        await admin.from("workspace_documents").delete().eq("user_id", probe.id);
        await admin.from("cases").delete().eq("user_id", probe.id);
        await admin.auth.admin.deleteUser(probe.id);
      } catch (error) {
        console.log(
          `      cleanup warning: a probe account may remain — ${
            error instanceof Error ? error.message : "unknown"
          }`,
        );
      }
    }
    if (probes.length > 0) console.log("\n  probe accounts, rows and objects removed");
  }
}

void main()
  .catch((error: unknown) => {
    fail("the RLS suite threw", error instanceof Error ? error.message : String(error));
  })
  .finally(() => {
    console.log("");
    if (failures > 0) {
      console.log(`${failures} FAILURE(S).`);
      process.exitCode = 1;
    } else {
      console.log("All checks passed.");
    }
    console.log("");
  });
