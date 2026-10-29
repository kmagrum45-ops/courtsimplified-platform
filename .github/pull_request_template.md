## What this changes

<!-- In plain words: what a person using the site will notice, and why. -->

## Checklist

- [ ] **A2I policy:** does this change what AI writes or shows, a switch, or a capability's scope? `npm run test:a2i-guard` passes.
- [ ] **Privacy:** does this change what is sent to the AI, stored, logged, or kept in the browser?
- [ ] **Same fix everywhere:** applied in Small Claims, civil and family; guided and review routes; chat; results; case page; forms.
- [ ] **Legal content needs review:** does this add or edit static legal content (stage answers, claim types, glossary, guides, quoted citations, fixed rules)? If yes, every changed item has "needs review" status, and each one is listed here by its id. Nothing is marked reviewed by code or by Claude: only the site owner's saved review marks an item reviewed, with the date set when it is saved.
  <!-- Changed items needing review (id — what changed): -->
- [ ] **Site brief updated** (`docs/SITE_BRIEF.md`, once the brief is on main) for anything that changed.
