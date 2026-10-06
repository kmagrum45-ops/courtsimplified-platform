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

drop_declaration() {
  node -e "
    const fs=require('fs'); const p='scripts/rules/requestedSources.json';
    const list=JSON.parse(fs.readFileSync(p,'utf8')).filter(e=>e.id!==process.argv[1]);
    fs.writeFileSync(p, JSON.stringify(list,null,2)+'\n');" "$1"
}

while IFS=$'\t' read -r num name; do
  [ -z "${name:-}" ] && continue
  out="$(npx tsx scripts/sources/resolveSourceRequest.ts "$name" 2>/dev/null | tail -1)"
  echo "::notice title=Resolve::#$num $name -> $out"
  case "$out" in
    id=*)
      id="${out#id=}"
      npx tsx scripts/rules/fetchCorpus.ts --only "$id" > "fetch-$id.log" 2>&1
      if in_manifest "$id"; then
        printf '%s\t%s\tvendored:%s\n' "$num" "$name" "$id" >> "$RESULTS"
        VENDORED_IDS="$VENDORED_IDS $id"
        ANY=yes
      else
        reason="$(grep -m1 -iE 'fail|missing|not contain|minimum' "fetch-$id.log" | cut -c1-160)"
        echo "::warning title=Fetch::$id did not verify: $reason"
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
