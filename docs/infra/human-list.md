# Pages a person has to save by hand — a task for Jason

**Ten pages the site cannot fetch.** Each one is a body the product needs to route
people to. Until they are saved, seven forum checks are incomplete, and an incomplete
forum check means a user is told nothing rather than told where to go.

**Time: about 20 minutes for all ten.** No technical knowledge needed. You are just
opening pages in a browser and saving them.

---

## Why this is necessary

The site fetches its legal sources automatically — 182 of them, statutes and guidance
pages, re-checked for changes on a schedule. These ten refuse:

- **Two block automated requests outright** (they return "403 Forbidden"). A browser
  gets the page; a script does not.
- **One has no page that works** — every address tried returns "not found".
- **Six return a page that looks fine but is empty** when read by anything other than
  a browser. One of them is worth knowing about: the College of Veterinarians address
  returns a page that *says* "Page not found" while reporting success, which is why it
  went unnoticed until a length check caught it.
- **One** (Victim Services) has no findable page at all and may need you to tell us
  the right address.

A page you save is a perfectly good source. The project already does this for court
decisions and Law Society by-laws — see `docs/sources/README.md`. What matters is that
we record **where it came from, when, and who saved it**, which is what the table at
the bottom is for.

---

## How to save each one

1. **Open the address** in Chrome or Edge.
2. **Check it actually loaded** — you should see the real page, not an error or a
   blank screen. If it does not load, write that in the notes column and move on.
   A page that will not load for you is a real finding, not a failure on your part.
3. **Press `Ctrl` + `S`** (or File → Save Page As).
4. **Save into this exact folder:**

   ```
   C:\Users\kmagr\courtsimplified\docs\sources\snapshots\
   ```

   Create the folder if it is not there.

5. **Use the filename in the table below, exactly** — including the `.html`. The
   filenames are how the site finds them.
6. **In the "Save as type" dropdown, choose `Webpage, Single File (*.mhtml)` if
   offered; otherwise `Webpage, HTML Only`.** Either works. Avoid "Webpage,
   Complete" — it makes a folder of images we do not need.
   - If a page will only save sensibly as a PDF, that is fine too: save it as PDF
     and change the filename's ending from `.html` to `.pdf`.
7. **Write the date you saved it** in the last column of the table, and your name
   at the bottom.

That is the whole job. Nothing is installed, nothing is run.

---

## The ten pages

| # | What it is | Address to open | Save as | Date saved |
|---|---|---|---|---|
| 1 | **TICO** — travel industry compensation fund | `https://www.tico.ca/consumers.html` | `tico-consumers.html` | |
| 2 | **FSRA** — financial services regulator, consumer pages | `https://www.fsrao.ca/consumers` | `fsra-consumers.html` | |
| 3 | **HCRA** — new home builders regulator | `https://www.hcraontario.ca/` | `hcra-home.html` | |
| 4 | **OBSI** — banking ombudsman, for consumers | `https://www.obsi.ca/en/for-consumers/` | `obsi-for-consumers.html` | |
| 5 | **Bereavement Authority** — funerals, burial, cremation | `https://thebao.ca/for-consumers/` | `bao-for-consumers.html` | |
| 6 | **College of Veterinarians** — complaints | `https://cvo.org/` — then find the public complaints page and save **that** | `cvo-complaints.html` | |
| 7 | **Tribunals Ontario** — the directory of which tribunal does what | `https://tribunalsontario.ca/` | `tribunals-ontario-directory.html` | |
| 8 | **Licence Appeal Tribunal** — auto insurance disputes | Start at `https://tribunalsontario.ca/` and follow the link to the Licence Appeal Tribunal. **Write down the address you end up on** | `licence-appeal-tribunal.html` | |
| 9 | **Consumer protection for drivers** | `https://www.ontario.ca/page/consumer-protection-information-drivers` | `cpo-drivers.html` | |
| 10 | **Ontario Victim Services** | Search ontario.ca for victim services. **Write down the address you find** — we could not locate a working one | `ontario-victim-services.html` | |

### Two that need you to find the address

**#6, #8 and #10** need a moment's looking, because the addresses we tried do not
work. If you cannot find a real page for one, write "could not find" in the notes —
that is a useful answer and means we stop looking too.

---

## When you are done

Tell whoever is working on the code, and say:

- which of the ten you saved,
- the date,
- any you could not, and what happened,
- for #6, #8 and #10, the addresses you actually used.

They will add each one to the source list with your name and the date against it, and
the site will start reading them. **Nothing you save goes on the website** — these are
read to work out where to send people, and every sentence users see is written and
checked separately.

---

## Saved by

| Name | Date | Notes |
|---|---|---|
| | | |

---

## For whoever wires these up

Each saved file becomes a `format: "human-snapshot"` source in
`scripts/rules/forumCheckSources.ts`, with a `snapshot` block giving `localPath`,
`savedAt`, `savedBy` and `becauseUnfetchable`. Always `tier: "practical"` — a
snapshot is one person's copy of one page on one day, so nothing claim-barring may
rest on one. `npm run rules:fetch` reads it from disk and hashes it like any other
source; `rules:check` cannot re-fetch it and reports its age instead. The unfetchable
reasons are already recorded in `forumCheckSources.ts`'s header and in
`docs/civil-annual-practice-audit.md`.
