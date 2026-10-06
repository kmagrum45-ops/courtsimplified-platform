#!/usr/bin/env bash
# Resolves, fetches and verifies every source request in a list, one at a
# time, for .github/workflows/courtsimplified-source-requests.yml.
#
#   bash scripts/sources/processSourceRequests.sh requests.tsv results.tsv
#
# requests.tsv: "<issue number>\t<law name>" per line (issue 0 = run by hand).
# results.tsv:  "<issue number>\t<law name>\t<outcome>" per line, outcome one of
#   vendored:<id>       fetched, and its text carries its own title (and, for
#                       e-Laws, the current-consolidation line)
#   in-library:<id>     already in the library before this run
#   not-verified:<id>   resolved, but the fetched text did not verify; its
#                       declaration is removed again, so nothing unverified stays
#   unresolved=<why>    no official source could be named
# Prints "verified=yes" on stdout's last line when anything was vendored.
#
# WHY A LIST (2026-10-05). The workflow used to take only the issue that
# triggered it. GitHub keeps one running and ONE pending run per concurrency
# group and cancels any older pending one, so a burst of requests -- the
# coverage test named 15 missing laws at once -- would have lost all but two.
# Each run now sweeps every open request, so a cancelled run loses nothing.
set -uo pipefail

REQUESTS="$1"
RESULTS="$2"
: > "$RESULTS"
VENDORED_IDS=""
ANY=no

in_manifest() {
  node -e "const m=require('./docs/sources/corpus/manifest.json'); process.exit(m.entries.some(e=>e.id===process.argv[1])?0:1)" "$1"
}

# Removes the declaration AND the failure fetchCorpus recorded for it in the
# manifest. Leaving the failure behind (2026-10-06) made test:rules-corpus
# fail "a declared source is not in the corpus" for the whole run, so one law
# that did not verify (the Fraudulent Conveyances Act) kept eight that did
# out of the library.
# e-Laws answers HTTP 403 for a file that does not exist, and some Acts are
# published only under an "elaws_statutes_" file name (the Negligence Act,
# and the Fraudulent Conveyances Act, whose plain name was a 403 on
# 2026-10-06; SOURCING_NOTES.md, "the elaws_statutes_ prefix cuts both
# ways"). That form can also be a stale copy, so the retry must find "TO THE
# E-LAWS CURRENCY DATE", which only a current consolidation prints.
try_prefixed() {
  node -e "
    const fs=require('fs'); const id=process.argv[1];
    const p='scripts/rules/requestedSources.json';
    const list=JSON.parse(fs.readFileSync(p,'utf8'));
    const e=list.find(x=>x.id===id);
    const m=e && /^https:\/\/www\.ontario\.ca\/laws\/docs\/([0-9a-z]+_e\.doc)$/.exec(e.url);
    if (!m) process.exit(1);
    e.url='https://www.ontario.ca/laws/docs/elaws_statutes_'+m[1];
    if (!e.mustContain.includes('TO THE E-LAWS CURRENCY DATE')) e.mustContain.push('TO THE E-LAWS CURRENCY DATE');
    fs.writeFileSync(p, JSON.stringify(list,null,2)+'\n');" "$1"
}

drop_declaration() {
  node -e "
    const fs=require('fs'); const id=process.argv[1];
    const p='scripts/rules/requestedSources.json';
    const list=JSON.parse(fs.readFileSync(p,'utf8')).filter(e=>e.id!==id);
    fs.writeFileSync(p, JSON.stringify(list,null,2)+'\n');
    const m='docs/sources/corpus/manifest.json';
    const manifest=JSON.parse(fs.readFileSync(m,'utf8'));
    manifest.failures=manifest.failures.filter(f=>f.id!==id);
    fs.writeFileSync(m, JSON.stringify(manifest,null,2)+'\n');" "$1"
}

while IFS=$'\t' read -r num name; do
  [ -z "${name:-}" ] && continue
  out="$(npx tsx scripts/sources/resolveSourceRequest.ts "$name" 2>/dev/null | tail -1)"
  echo "::notice title=Resolve::#$num $name -> $out" >&2
  case "$out" in
    id=*)
      id="${out#id=}"
      npx tsx scripts/rules/fetchCorpus.ts --only "$id" > "fetch-$id.log" 2>&1
      if ! in_manifest "$id" && grep -q "HTTP 403" "fetch-$id.log" && try_prefixed "$id"; then
        echo "::notice title=Fetch::$id was a 403; trying the elaws_statutes_ file name" >&2
        npx tsx scripts/rules/fetchCorpus.ts --only "$id" > "fetch-$id.log" 2>&1
      fi
      if in_manifest "$id"; then
        printf '%s\t%s\tvendored:%s\n' "$num" "$name" "$id" >> "$RESULTS"
        VENDORED_IDS="$VENDORED_IDS $id"
        ANY=yes
      else
        reason="$(grep -m1 -iE 'fail|missing|not contain|minimum' "fetch-$id.log" | cut -c1-160)"
        echo "::warning title=Fetch::$id did not verify: $reason" >&2
        drop_declaration "$id"
        printf '%s\t%s\tnot-verified:%s\n' "$num" "$name" "$id" >> "$RESULTS"
      fi
      ;;
    in-library=*)
      id="${out#in-library=}"
      # Vendored earlier in this same run, for another request naming it.
      if [[ " $VENDORED_IDS " == *" $id "* ]]; then
        printf '%s\t%s\tvendored:%s\n' "$num" "$name" "$id" >> "$RESULTS"
      else
        printf '%s\t%s\tin-library:%s\n' "$num" "$name" "$id" >> "$RESULTS"
      fi
      ;;
    *)
      printf '%s\t%s\t%s\n' "$num" "$name" "${out:-unresolved=no result}" >> "$RESULTS"
      ;;
  esac
done < "$REQUESTS"

echo "verified=$ANY"
