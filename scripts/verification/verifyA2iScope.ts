/**
 * The platform only does what A2I has approved.
 *
 * COSTS NOTHING. Pure data checks.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - a "needs-a2i-approval" capability switched on with no recorded approval
 *     (date, reference, conditions) -- i.e. someone turned on legal-services
 *     help without the regulator's written go-ahead;
 *   - isInScope() reporting such a switch as on anyway;
 *   - court-document drafting following anything other than the
 *     formCompletion switch;
 *   - the testing preview switching on an unapproved capability in
 *     PRODUCTION, or without the preview variable set exactly to "on";
 *   - a previewed capability not being reported as preview-only, so a screen
 *     could show it without the "testing only" notice.
 *
 * It does NOT assert which switches are on: approving one is exactly the work
 * this registry exists to make easy (CLAUDE.md section 5, "a check must assert
 * a property, not a current value").
 *
 * Run: node --import tsx scripts/verification/verifyA2iScope.ts
 */

import { pathToFileURL } from "node:url";

import {
  A2I_SCOPE,
  isInScope,
  listScope,
  scopeIsPreviewOnly,
  type ScopeKey,
} from "../../src/lib/case-system/policy/a2iScope";
import { COURT_DOCUMENT_DRAFTING_ENABLED } from "../../src/lib/case-system/policy/courtDocumentDrafting";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function main(): void {
  // The first checks describe the real-user state, so run them with no preview.
  const previewAtStart = process.env.NEXT_PUBLIC_CS_SCOPE_PREVIEW;
  delete process.env.NEXT_PUBLIC_CS_SCOPE_PREVIEW;

  const unapproved = listScope().filter(
    (c) =>
      c.tier === "needs-a2i-approval" &&
      c.enabled &&
      !(c.approval && c.approval.approvedOn && c.approval.reference && c.approval.conditions),
  );
  check(
    "no approval-tier capability is switched on without a recorded A2I approval",
    unapproved.length === 0,
    unapproved.map((c) => c.id).join(", "),
  );

  const leaks = (Object.keys(A2I_SCOPE) as ScopeKey[]).filter((key) => {
    const c = A2I_SCOPE[key] as { tier: string; approval?: unknown };
    return c.tier === "needs-a2i-approval" && !c.approval && isInScope(key);
  });
  check("isInScope never reports an unapproved approval-tier capability as on", leaks.length === 0, leaks.join(", "));

  // The drafting constant was evaluated at import, under the starting environment.
  if (previewAtStart !== undefined) process.env.NEXT_PUBLIC_CS_SCOPE_PREVIEW = previewAtStart;
  check(
    "court-document drafting follows the formCompletion switch",
    COURT_DOCUMENT_DRAFTING_ENABLED === isInScope("formCompletion"),
  );
  delete process.env.NEXT_PUBLIC_CS_SCOPE_PREVIEW;

  // ---- testing preview ----
  const keys = Object.keys(A2I_SCOPE) as ScopeKey[];
  const unapprovedKeys = keys.filter((key) => {
    const c = A2I_SCOPE[key] as { tier: string; approval?: unknown };
    return c.tier === "needs-a2i-approval" && !c.approval;
  });
  const saved = {
    preview: previewAtStart,
    vercel: process.env.VERCEL_ENV,
    publicVercel: process.env.NEXT_PUBLIC_VERCEL_ENV,
  };
  const setEnv = (preview?: string, vercel?: string, publicVercel?: string) => {
    for (const [name, value] of [
      ["NEXT_PUBLIC_CS_SCOPE_PREVIEW", preview],
      ["VERCEL_ENV", vercel],
      ["NEXT_PUBLIC_VERCEL_ENV", publicVercel],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };

  setEnv("on", "preview", "preview");
  check(
    "the preview turns on every unapproved capability for testing",
    unapprovedKeys.every((key) => isInScope(key) && scopeIsPreviewOnly(key)),
  );
  check(
    "information-tier capabilities are never reported as preview-only",
    keys.filter((key) => A2I_SCOPE[key].tier === "information").every((key) => !scopeIsPreviewOnly(key)),
  );

  setEnv("on", "production", undefined);
  check("the preview never applies in production (server variable)", unapprovedKeys.every((key) => !isInScope(key)));
  setEnv("on", undefined, "production");
  check("the preview never applies in production (public variable)", unapprovedKeys.every((key) => !isInScope(key)));
  setEnv("true", "preview", "preview");
  check("the preview needs the variable set exactly to \"on\"", unapprovedKeys.every((key) => !isInScope(key)));
  setEnv(undefined, undefined, undefined);
  check("with no preview variable, unapproved capabilities are off", unapprovedKeys.every((key) => !isInScope(key)));
  setEnv(saved.preview, saved.vercel, saved.publicVercel);

  const ids = listScope().map((c) => c.id);
  check("capability ids are unique", new Set(ids).size === ids.length);

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
