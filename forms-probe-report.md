# Can each official form be filled automatically?

Probed 430 forms on 2026-10-05.

| Court | Forms | Fillable PDF | of which hybrid XFA | Word with fields | XFA-only | Word, no fields | Unreadable |
|---|---|---|---|---|---|---|---|
| small-claims | 46 | 0 | 0 | 46 | 0 | 0 | 0 |
| civil | 240 | 13 | 13 | 65 | 1 | 156 | 5 |
| family | 144 | 1 | 0 | 140 | 0 | 0 | 3 |

Of the fields in fillable PDFs, 100% carry a human description (tooltip).

## Examples

### small-claims Form 1A (Word) — Additional Parties

- checkbox: `Check58`
- checkbox: `Check58`
- checkbox: `Check58`

### civil Form 18B — Notice of Intent to Defend

- `form1[0].page1[0].navigationBtns[0].Print[0]` (Button) — "Print Form"

### civil Form 1A (Word) — Notice of Objection to Proposed Method of Attendance


### family Form 6C — Lawyer or Paralegal’s Certificate of Service

- `Name of court` (TextField) — "Name of court"
- `leaving a copy with the person` (CheckBox) — "leaving a copy with the person"
- `who is a lawyer who accepted service in writing on a copy of the document` (CheckBox) — "who is a lawyer who accepted service in writing on a copy of the document"
- `who is the persons lawyer of record` (CheckBox) — "who is the person’s lawyer of record"
- `on the document most recently filed in court by the person` (CheckBox) — "on the document most recently filed in court by the person"
- `Court File Number, page 1` (TextField) — "Court File Number, page 1"
- `Court File Number, page 2` (TextField) — "Court File Number, page 2"
- `Court office address` (TextField) — "Court office address"

### family Form 1.4 (Word) — Request for Stay or Dismissal under Rule 1.4

- text: `CourtFileNo`
- text: `Text4`
- text: `Text4`
- text: `Text4`

## Every form

| Court | Form | Route | PDF fields (tooltips) | Word fields |
|---|---|---|---|---|
| small-claims | 1A | word-fields | error | 67 |
| small-claims | 1A.1 | word-fields | error | 29 |
| small-claims | 1B | word-fields | error | 35 |
| small-claims | 1C | word-fields | error | 19 |
| small-claims | 4A | word-fields | error | 27 |
| small-claims | 4B | word-fields | error | 46 |
| small-claims | 5A | word-fields | error | 18 |
| small-claims | 7A | word-fields | error | 56 |
| small-claims | 8A | word-fields | error | 91 |
| small-claims | 8B | word-fields | error | 85 |
| small-claims | 9A | word-fields | error | 63 |
| small-claims | 9B | word-fields | error | 30 |
| small-claims | 10A | word-fields | error | 56 |
| small-claims | 11A | word-fields | error | 39 |
| small-claims | 11B | word-fields | error | 74 |
| small-claims | 11.2A | word-fields | error | 121 |
| small-claims | 11.3A | word-fields | error | 22 |
| small-claims | 13A | word-fields | error | 52 |
| small-claims | 13B | word-fields | error | 16 |
| small-claims | 14A | word-fields | error | 19 |
| small-claims | 14B | word-fields | error | 17 |
| small-claims | 14C | word-fields | error | 17 |
| small-claims | 14D | word-fields | error | 26 |
| small-claims | 15A | word-fields | error | 100 |
| small-claims | 15B | word-fields | error | 36 |
| small-claims | 18A | word-fields | error | 18 |
| small-claims | 18B | word-fields | error | 10 |
| small-claims | 20A | word-fields | error | 33 |
| small-claims | 20B | word-fields | error | 20 |
| small-claims | 20C | word-fields | error | 60 |
| small-claims | 20D | word-fields | error | 60 |
| small-claims | 20E | word-fields | error | 57 |
| small-claims | 20E.1 | word-fields | error | 59 |
| small-claims | 20F | word-fields | error | 40 |
| small-claims | 20G | word-fields | error | 52 |
| small-claims | 20H | word-fields | error | 25 |
| small-claims | 20I | word-fields | error | 60 |
| small-claims | 20J | word-fields | error | 25 |
| small-claims | 20K | word-fields | error | 37 |
| small-claims | 20L | word-fields | error | 17 |
| small-claims | 20M | word-fields | error | 75 |
| small-claims | 20N | word-fields | error | 15 |
| small-claims | 20O | word-fields | error | 41 |
| small-claims | 20P | word-fields | error | 83 |
| small-claims | 20Q | word-fields | error | 114 |
| small-claims | 20R | word-fields | error | 19 |
| civil | 1A | word-fields | 0 (0) | 6 |
| civil | 2.1A | word-fields | — | 9 |
| civil | 2.1B | word-no-fields (plain document) | — | 0 |
| civil | 2.2A | word-no-fields (plain document) | — | 0 |
| civil | 2.2B | word-no-fields (plain document) | — | 0 |
| civil | 2.2C | word-no-fields (plain document) | — | 0 |
| civil | 2.2D | word-no-fields (plain document) | — | 0 |
| civil | 2.2E | word-no-fields (plain document) | — | 0 |
| civil | 2.2F | word-fields | — | 13 |
| civil | 2.2G | word-fields | — | 3 |
| civil | 4A | word-no-fields (plain document) | — | 0 |
| civil | 4B | word-no-fields (plain document) | error | 0 |
| civil | 4C | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 4D | word-fields | — | 2 |
| civil | 4E | word-no-fields (plain document) | error | 0 |
| civil | 4F | word-fields | — | 3 |
| civil | 7A | word-no-fields (plain document) | — | 0 |
| civil | 7B | word-no-fields (plain document) | — | 0 |
| civil | 7C | word-no-fields (plain document) | — | 0 |
| civil | 8A | word-no-fields (plain document) | error | 0 |
| civil | 11A | word-no-fields (plain document) | — | 0 |
| civil | 14A | word-no-fields (plain document) | error | 0 |
| civil | 14B | word-no-fields (plain document) | error | 0 |
| civil | 14C | word-no-fields (plain document) | error | 0 |
| civil | 14D | word-no-fields (plain document) | error | 0 |
| civil | 14E | word-fields | 0 (0) | 3 |
| civil | 14E.1 | word-no-fields (plain document) | error | 0 |
| civil | 14F | word-fields | — | 44 |
| civil | 15A | word-no-fields (plain document) | error | 0 |
| civil | 15B | word-no-fields (plain document) | error | 0 |
| civil | 15C | word-no-fields (plain document) | — | 0 |
| civil | 16A | word-no-fields (plain document) | — | 0 |
| civil | 16B | word-fields | — | 2 |
| civil | 16B.1 | word-no-fields (plain document) | — | 0 |
| civil | 16C | word-no-fields (plain document) | — | 0 |
| civil | 17A | word-no-fields (plain document) | error | 0 |
| civil | 17B | word-no-fields (plain document) | error | 0 |
| civil | 17C | word-no-fields (plain document) | error | 0 |
| civil | 18A | word-no-fields (plain document) | error | 0 |
| civil | 18B | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 19A | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 19B | word-no-fields (plain document) | — | 0 |
| civil | 19C | word-no-fields (plain document) | — | 0 |
| civil | 19D | word-no-fields (plain document) | error | 0 |
| civil | 22A | word-no-fields (plain document) | error | 0 |
| civil | 23A | word-no-fields (plain document) | error | 0 |
| civil | 23B | word-no-fields (plain document) | error | 0 |
| civil | 23C | word-no-fields (plain document) | error | 0 |
| civil | 24.1A | word-no-fields (plain document) | — | 0 |
| civil | 24.1B | word-fields | — | 3 |
| civil | 24.1C | word-no-fields (plain document) | — | 0 |
| civil | 24.1D | word-no-fields (plain document) | — | 0 |
| civil | 25A | word-no-fields (plain document) | error | 0 |
| civil | 27A | word-no-fields (plain document) | — | 0 |
| civil | 27B | xfa-only (no AcroForm; Word has no fields either) | 0 (0) XFA | 0 |
| civil | 27C | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 27D | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 28A | word-no-fields (plain document) | error | 0 |
| civil | 28B | word-no-fields (plain document) | error | 0 |
| civil | 28C | word-no-fields (plain document) | error | 0 |
| civil | 29A | word-no-fields (plain document) | error | 0 |
| civil | 29B | word-no-fields (plain document) | error | 0 |
| civil | 29C | word-no-fields (plain document) | error | 0 |
| civil | 30A | word-fields | 0 (0) | 2 |
| civil | 30B | word-fields | 0 (0) | 2 |
| civil | 30C | word-no-fields (plain document) | error | 0 |
| civil | 34A | word-fields | — | 8 |
| civil | 34B | word-fields | — | 8 |
| civil | 34C | word-no-fields (plain document) | — | 0 |
| civil | 34D | word-no-fields (plain document) | — | 0 |
| civil | 34E | word-no-fields (plain document) | — | 0 |
| civil | 35A | word-no-fields (plain document) | error | 0 |
| civil | 35B | word-fields | — | 2 |
| civil | 37A | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 37B | word-no-fields (plain document) | — | 0 |
| civil | 37C | word-no-fields (plain document) | — | 0 |
| civil | 38A | word-no-fields (plain document) | error | 0 |
| civil | 38B | word-no-fields (plain document) | — | 0 |
| civil | 42A | word-no-fields (plain document) | — | 0 |
| civil | 43A | word-no-fields (plain document) | — | 0 |
| civil | 44A | word-no-fields (plain document) | — | 0 |
| civil | 47A | word-no-fields (plain document) | error | 0 |
| civil | 48D | word-no-fields (plain document) | — | 0 |
| civil | 49A | word-no-fields (plain document) | error | 0 |
| civil | 49B | word-no-fields (plain document) | error | 0 |
| civil | 49C | word-no-fields (plain document) | error | 0 |
| civil | 49D | word-no-fields (plain document) | error | 0 |
| civil | 49E | word-fields | — | 3 |
| civil | 50A | word-no-fields (plain document) | — | 0 |
| civil | 51A | word-no-fields (plain document) | error | 0 |
| civil | 51B | unreadable | error | error |
| civil | 53 | word-no-fields (plain document) | — | 0 |
| civil | 53A | word-fields | 0 (0) | 3 |
| civil | 53B | word-no-fields (plain document) | — | 0 |
| civil | 53C | word-fields | — | 3 |
| civil | 53D | word-no-fields (plain document) | — | 0 |
| civil | 55A | word-fields | — | 3 |
| civil | 55B | word-fields | 0 (0) | 3 |
| civil | 55C | word-no-fields (plain document) | — | 0 |
| civil | 55D | word-fields | 0 (0) | 3 |
| civil | 55E | word-no-fields (plain document) | error | 0 |
| civil | 55F | word-no-fields (plain document) | error | 0 |
| civil | 55G | word-no-fields (plain document) | — | 0 |
| civil | 56A | word-no-fields (plain document) | — | 0 |
| civil | 57A | word-no-fields (plain document) | — | 0 |
| civil | 57B | word-no-fields (plain document) | error | 0 |
| civil | 58A | word-fields | 0 (0) | 3 |
| civil | 58B | word-fields | 0 (0) | 3 |
| civil | 58C | word-no-fields (plain document) | — | 0 |
| civil | 59A | word-no-fields (plain document) | — | 0 |
| civil | 59B | word-no-fields (plain document) | — | 0 |
| civil | 59C | word-no-fields (plain document) | — | 0 |
| civil | 59D | word-no-fields (plain document) | — | 0 |
| civil | 60A | word-fields | — | 1 |
| civil | 60B | word-no-fields (plain document) | — | 0 |
| civil | 60C | word-no-fields (plain document) | — | 0 |
| civil | 60D | word-no-fields (plain document) | — | 0 |
| civil | 60E | word-no-fields (plain document) | — | 0 |
| civil | 60F | word-no-fields (plain document) | — | 0 |
| civil | 60G | word-no-fields (plain document) | — | 0 |
| civil | 60G.1 | word-no-fields (plain document) | — | 0 |
| civil | 60H | word-no-fields (plain document) | — | 0 |
| civil | 60H.1 | word-no-fields (plain document) | — | 0 |
| civil | 60I | word-no-fields (plain document) | — | 0 |
| civil | 60I.1 | word-no-fields (plain document) | error | 0 |
| civil | 60J | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 60K | word-no-fields (plain document) | — | 0 |
| civil | 60L | word-no-fields (plain document) | — | 0 |
| civil | 60M | word-no-fields (plain document) | error | 0 |
| civil | 60N | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 60O | word-no-fields (plain document) | — | 0 |
| civil | 61A | word-fields | — | 15 |
| civil | 61A.1 | word-fields | — | 17 |
| civil | 61A.2 | word-fields | — | 19 |
| civil | 61A.3 | word-fields | — | 20 |
| civil | 61B | word-no-fields (plain document) | — | 0 |
| civil | 61C | word-no-fields (plain document) | — | 0 |
| civil | 61D | word-no-fields (plain document) | — | 0 |
| civil | 61E | word-no-fields (plain document) | — | 0 |
| civil | 61F | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 61G | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 61H | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 61I | word-no-fields (plain document) | — | 0 |
| civil | 61I.1 | word-no-fields (plain document) | — | 0 |
| civil | 61J | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 61J.1 | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 61K | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 61L | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 61M | word-fields | — | 23 |
| civil | 61N | word-fields | — | 24 |
| civil | 61O | word-fields | — | 16 |
| civil | 61P | word-fields | — | 22 |
| civil | 62A | word-fields | 0 (0) | 3 |
| civil | 63A | word-no-fields (plain document) | — | 0 |
| civil | 63B | word-no-fields (plain document) | — | 0 |
| civil | 64A | word-fields | 0 (0) | 2 |
| civil | 64B | word-no-fields (plain document) | — | 0 |
| civil | 64C | word-no-fields (plain document) | — | 0 |
| civil | 64D | word-no-fields (plain document) | error | 0 |
| civil | 64E | word-no-fields (plain document) | — | 0 |
| civil | 64F | word-fields | 0 (0) | 2 |
| civil | 64G | word-no-fields (plain document) | — | 0 |
| civil | 64H | word-no-fields (plain document) | — | 0 |
| civil | 64I | word-no-fields (plain document) | — | 0 |
| civil | 64J | word-no-fields (plain document) | — | 0 |
| civil | 64K | word-no-fields (plain document) | — | 0 |
| civil | 64L | word-no-fields (plain document) | — | 0 |
| civil | 64M | word-no-fields (plain document) | — | 0 |
| civil | 64N | word-fields | 0 (0) | 3 |
| civil | 64O | word-fields | 0 (0) | 3 |
| civil | 64P | word-fields | 0 (0) | 3 |
| civil | 64Q | word-fields | 0 (0) | 3 |
| civil | 65A | word-no-fields (plain document) | — | 0 |
| civil | 66A | word-no-fields (plain document) | — | 0 |
| civil | 68A | word-fields | 0 (0) | 3 |
| civil | 68B | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 68C | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 68D | word-no-fields (plain document) | — | 0 |
| civil | 72A | pdf-acroform (hybrid XFA: drop XFA, fill AcroForm) | 1 (1) XFA | 0 |
| civil | 72B | word-fields | 0 (0) | 2 |
| civil | 72C | word-no-fields (plain document) | — | 0 |
| civil | 73A | word-fields | — | 3 |
| civil | 76A | word-no-fields (plain document) | — | 0 |
| civil | 76B | word-no-fields (plain document) | — | 0 |
| civil | 76C | word-no-fields (plain document) | — | 0 |
| civil | 76D | word-no-fields (plain document) | error | 0 |
| civil | 74A | word-fields | — | 101 |
| civil | 74B | word-fields | — | 10 |
| civil | 74B.1 | word-fields | — | 10 |
| civil | 74C | word-fields | — | 13 |
| civil | 74D | word-fields | — | 2 |
| civil | 74E | word-fields | — | 2 |
| civil | 74F | word-fields | — | 8 |
| civil | 74G | word-fields | — | 12 |
| civil | 74I | word-no-fields (plain document) | — | 0 |
| civil | 74J | word-fields | — | 41 |
| civil | 74K | word-no-fields (plain document) | — | 0 |
| civil | 74L | word-no-fields (plain document) | — | 0 |
| civil | 74M | word-fields | — | 2 |
| civil | 74N | word-no-fields (plain document) | — | 0 |
| civil | 74O | word-fields | — | 9 |
| civil | 74P | word-no-fields (plain document) | — | 0 |
| civil | 74.1A | word-fields | — | 95 |
| civil | 74.1B | word-fields | — | 42 |
| civil | 74.1C | word-fields | — | 3 |
| civil | 74.1D | word-fields | — | 9 |
| civil | 74.1E | word-fields | — | 8 |
| civil | 74.1F | word-fields | — | 3 |
| civil | 74.43 | word-fields | 0 (0) | 2 |
| civil | 74.44 | unreadable | — | error |
| civil | 74.45 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.45.1 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.46 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.46.1 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.47 | word-fields | 0 (0) | 2 |
| civil | 74.48 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.49 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.49.1 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.49.2 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.49.3 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.49.4 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 74.50 | word-no-fields (plain document) | — | 0 |
| civil | 74.51 | word-no-fields (plain document) | — | 0 |
| civil | 75.1 | word-no-fields (plain document) | — | 0 |
| civil | 75.10 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 75.11 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 75.12 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 75.13 | word-no-fields (plain document) | error | 0 |
| civil | 75.14 | word-fields | — | 2 |
| civil | 75.2 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 75.3 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 75.4 | word-no-fields (plain document) | 0 (0) | 0 |
| civil | 75.5 | word-fields | 0 (0) | 3 |
| civil | 75.6 | word-fields | 0 (0) | 3 |
| civil | 75.7 | word-no-fields (plain document) | — | 0 |
| civil | 75.8 | word-no-fields (plain document) | — | 0 |
| civil | 75.1A | unreadable | — | error |
| civil | 75.1B | word-fields | — | 3 |
| civil | 75.1C | unreadable | — | error |
| civil | 75.1D | unreadable | — | error |
| family | 1.4 | word-fields | — | 29 |
| family | 1.4A | word-fields | — | 27 |
| family | 4 | word-fields | error | 17 |
| family | 6 | unreadable | error | — |
| family | 6A | unreadable | error | — |
| family | 6B | word-fields | error | 70 |
| family | 6C | pdf-acroform | 82 (82) | 80 |
| family | 8 | word-fields | error | 151 |
| family | 8.01 | word-fields | error | 11 |
| family | 8A | word-fields | error | 149 |
| family | 8B | word-fields | error | 115 |
| family | 8B.1 | word-fields | error | 53 |
| family | 8B.2 | word-fields | error | 65 |
| family | 8C | word-fields | error | 46 |
| family | 8D | word-fields | error | 25 |
| family | 8D.1 | word-fields | error | 20 |
| family | 8D.2 | word-fields | error | 27 |
| family | 8D.3 | word-fields | error | 13 |
| family | 10 | word-fields | error | 79 |
| family | 10A | word-fields | error | 16 |
| family | 12 | word-fields | error | 23 |
| family | 13 | word-fields | error | 337 |
| family | 13A | word-fields | error | 603 |
| family | 13B | word-fields | error | 186 |
| family | 13C | word-fields | — | 408 |
| family | 13.1 | word-fields | error | 325 |
| family | 14 | word-fields | error | 19 |
| family | 14A | word-fields | error | 13 |
| family | 14B | word-fields | error | 24 |
| family | 14C | word-fields | error | 50 |
| family | 14D | word-fields | error | 19 |
| family | 15 | word-fields | error | 153 |
| family | 15B | word-fields | error | 131 |
| family | 15C | word-fields | error | 165 |
| family | 15D | word-fields | error | 123 |
| family | 17 | word-fields | error | 27 |
| family | 17A | word-fields | error | 120 |
| family | 17B | word-fields | error | 129 |
| family | 17C | word-fields | error | 115 |
| family | 17D | word-fields | error | 120 |
| family | 17E | word-fields | error | 154 |
| family | 17F | word-fields | error | 49 |
| family | 17G | word-fields | error | 29 |
| family | 20 | word-fields | error | 17 |
| family | 20A | word-fields | error | 54 |
| family | 20B | word-fields | error | 16 |
| family | 20.2 | word-fields | error | 15 |
| family | 22 | word-fields | error | 11 |
| family | 22A | word-fields | error | 39 |
| family | 23 | word-fields | error | 27 |
| family | 23A | word-fields | error | 33 |
| family | 23B | word-fields | error | 23 |
| family | 23C | word-fields | error | 133 |
| family | 25 | word-fields | error | 22 |
| family | 25A | word-fields | error | 21 |
| family | 25B | word-fields | error | 35 |
| family | 25C | word-fields | — | 30 |
| family | 25D | word-fields | error | 138 |
| family | 25E | word-fields | error | 14 |
| family | 25F | word-fields | error | 28 |
| family | 25G | word-fields | error | 31 |
| family | 25H | word-fields | error | 18 |
| family | 26 | word-fields | error | 208 |
| family | 26A | word-fields | error | 97 |
| family | 26B | word-fields | error | 41 |
| family | 26C | word-fields | error | 78 |
| family | 26D | word-fields | — | 39 |
| family | 27 | word-fields | error | 10 |
| family | 27A | word-fields | error | 10 |
| family | 27B | word-fields | error | 41 |
| family | 27C | word-fields | error | 19 |
| family | 28 | word-fields | error | 74 |
| family | 28A | word-fields | error | 19 |
| family | 28B | word-fields | error | 34 |
| family | 28C | word-fields | error | 16 |
| family | 29 | word-fields | error | 69 |
| family | 29A | word-fields | error | 15 |
| family | 29B | word-fields | error | 27 |
| family | 29C | word-fields | error | 16 |
| family | 29D | word-fields | error | 25 |
| family | 29E | word-fields | error | 22 |
| family | 29F | word-fields | error | 28 |
| family | 29G | word-fields | error | 13 |
| family | 29H | word-fields | error | 22 |
| family | 29I | word-fields | error | 23 |
| family | 29J | word-fields | error | 21 |
| family | 30 | word-fields | error | 12 |
| family | 30A | word-fields | error | 13 |
| family | 30B | word-fields | error | 23 |
| family | 31 | word-fields | error | 18 |
| family | 32 | word-fields | error | 24 |
| family | 32A | word-fields | error | 23 |
| family | 32B | word-fields | error | 44 |
| family | 32C | unreadable | error | — |
| family | 32D | word-fields | error | 48 |
| family | 32.1 | word-fields | — | 95 |
| family | 32.1A | word-fields | error | 18 |
| family | 33 | word-fields | error | 19 |
| family | 33A | word-fields | error | 30 |
| family | 33B | word-fields | error | 55 |
| family | 33B.1 | word-fields | error | 169 |
| family | 33B.2 | word-fields | error | 102 |
| family | 33C | word-fields | error | 46 |
| family | 33D | word-fields | error | 54 |
| family | 33D.1 | word-fields | — | 61 |
| family | 33D.2 | word-fields | — | 33 |
| family | 33D.3 | word-fields | — | 36 |
| family | 33E | word-fields | error | 32 |
| family | 33F | word-fields | error | 27 |
| family | 34 | word-fields | error | 27 |
| family | 34A | word-fields | error | 87 |
| family | 34B | word-fields | error | 25 |
| family | 34C | word-fields | error | 25 |
| family | 34D | word-fields | error | 33 |
| family | 34E | word-fields | error | 13 |
| family | 34F | word-fields | error | 34 |
| family | 34G | word-fields | error | 45 |
| family | 34G.1 | word-fields | — | 78 |
| family | 34H | word-fields | — | 75 |
| family | 34H.1 | word-fields | error | 44 |
| family | 34I | word-fields | error | 36 |
| family | 34J | word-fields | error | 16 |
| family | 34K | word-fields | — | 181 |
| family | 34L | word-fields | error | 33 |
| family | 34M | word-fields | error | 27 |
| family | 34M.1 | word-fields | error | 28 |
| family | 34N | word-fields | error | 45 |
| family | 35.1 | word-fields | error | 238 |
| family | 35.1A | word-fields | error | 68 |
| family | 36 | word-fields | error | 72 |
| family | 36A | word-fields | error | 108 |
| family | 36B | word-fields | error | 16 |
| family | 37 | word-fields | — | 28 |
| family | 37A | word-fields | — | 15 |
| family | 37B | word-fields | — | 23 |
| family | 37C | word-fields | — | 21 |
| family | 37D | word-fields | — | 20 |
| family | 37E | word-fields | error | 17 |
| family | 38 | word-fields | — | 30 |
| family | 39 | word-fields | error | 10 |
| family | 43 | word-fields | — | 59 |
| family | 43A | word-fields | — | 33 |
| family | 43B | word-fields | — | 108 |
| family | 43C | word-fields | — | 28 |
