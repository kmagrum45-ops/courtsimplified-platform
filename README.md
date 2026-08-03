# CourtSimplified beta checkpoint

This is the repaired full project root. Open this exact folder in Visual
Studio Code—the folder that contains `package.json`.

## First setup on Windows

Install Node.js 22 LTS and Visual Studio Code. Then open this project folder,
choose **Terminal → New Terminal**, and run:

```powershell
node --version
npm ci
Copy-Item .env.example .env.local
```

Open `.env.local` and add your own Supabase and OpenAI values. Never paste
secret values into source files and never commit `.env.local`.

Start the app:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

Open <http://localhost:3000>.

## Verification commands

Run these from the project root:

```powershell
npm run test:small-claims
npm run test:case-isolation
npx tsc --noEmit --pretty false
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build
npm run test:ai-context
```

The checkpoint passed all five checks before packaging.

## What this checkpoint repairs

- Ontario and the selected procedural stage now reach the AI Case Partner on
  every message and survive later conversation turns.
- The canonical `MasterCaseSchema` is preserved when chat memory is merged.
- Small Claims analysis now runs through a server route, so a signed-in user
  can use the server-only AI key; public previews use a deterministic fallback
  and cannot spend AI credits.
- Starting claimants are tested against Form 7A routing, while responding
  defendants are tested against Form 9A routing.
- Valid evidence, agreement, invoice, payment, damage, and defence guidance is
  no longer hidden by broad keyword filters.
- Existing cases, evidence, workspaces, trial packages, settlement pages, and
  exports use the selected case ID instead of borrowing the last global case.
- The legacy service-role case API now requires a verified Supabase user and
  scopes reads, writes, and deletes to that user.
- Broken `/documents` links now point to `/document-workspace`.

## 8 GB laptop guidance

An 8 GB laptop is enough for this Next.js beta. Keep OpenAI and Supabase hosted;
do not try to run a large language model locally. Close memory-heavy programs
during production builds and keep `NODE_OPTIONS` at 4096 MB as shown above.

## Current non-blocking debt

The production build, TypeScript, and functional tests pass. The uploaded
project began with 111 ESLint errors across legacy scripts and older modules;
this checkpoint reduces that inherited count to 101. Treat the remaining lint
cleanup as a separate engineering pass rather than mixing it into Small Claims
beta behavior.
