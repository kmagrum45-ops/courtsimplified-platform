# Which Supabase project is which

**THIS FILE IS THE SOURCE OF TRUTH.** Established 26 September 2026 by reading
the live systems, not by reading other documents.

Every fact below was verified by a command, and the command is given. Where the
display name and the reality disagree, **the ref decides**.

---

## The two projects

| Ref | Display name | Region | Status | What it IS |
|---|---|---|---|---|
| `fddlpnibovkkkgboabqb` | `courtsimplified-dev` | `ca-central-1` | ACTIVE_HEALTHY | **PRODUCTION.** The live database |
| `ffymjxjcnwakgdmldpne` | `courtsimplified` | `us-west-2` | ACTIVE_HEALTHY | **STAGING.** Nothing points at it |

Both are in organisation `rcxzxczzgsnrrmfdujvv`.

### How production was identified

Not from the name — the name says the opposite. From the deployment:

```
vercel env pull <temp file outside the repo> --environment=production
grep -oE 'https://[a-z]{20}\.supabase\.co' <that file>
  -> https://fddlpnibovkkkgboabqb.supabase.co
```

The Vercel **production** environment's `NEXT_PUBLIC_SUPABASE_URL` points at
`fddlpnibovkkkgboabqb`. That is what serves real users, so that is production,
whatever it is called in the dashboard.

`.env.local` on this machine points at the same ref — i.e. **local development
currently runs against production**. See "State to fix" below.

---

## ⚠️ THE DISPLAY NAMES ARE BACKWARDS

The project named `courtsimplified-dev` is **the live one**.
The project named `courtsimplified` is **the spare**.

Until they are renamed, **identify a project by its ref and never by its name.**
Any instruction anywhere that says "apply it to dev first" is, read literally, an <!-- [dev-wording-quoted] -->
instruction to apply it to production.

---

## Two things that differ from what the older docs say

Recorded rather than silently corrected, because a document that disagrees with
the system is a hazard and somebody should know which way it drifted.

**1. `ffymjxjcnwakgdmldpne` is NOT paused.**
`docs/security/DATA_FLOW_INVENTORY.md` §2.1 and `CLAUDE.md` §6 both record it as
INACTIVE / "dormant and paused". `supabase projects list` reports
**ACTIVE_HEALTHY**. It appears to have been restored at some point without the
docs being updated. Nothing needed restoring.

**2. Vercel has no Supabase variables outside production.**

| Variable | Environments |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production only |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production only |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only |
| `OPENAI_API_KEY` | Production, Preview |

So Preview deployments have no database configuration at all, rather than
pointing at the wrong one. That is safe today and is a gap to fill once staging
has the schema.

---

## State to fix

| What | Found | Wanted |
|---|---|---|
| Supabase CLI link | linked to `fddlpnibovkkkgboabqb` (**production**) | linked to staging |
| `.env.local` | points at production | points at staging |
| Display names | backwards | `courtsimplified-prod` / `courtsimplified-staging` |
| Vercel Preview | no Supabase vars | staging vars |

---

## Verifying this file yourself

```
supabase projects list                       # refs, names, regions, status
vercel env pull <temp file> --environment=production
cat supabase/.temp/project-ref               # which project the CLI would target
```

Never paste the contents of an env file anywhere. The ref is public; the keys
beside it are not.
