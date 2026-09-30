#!/usr/bin/env bash
# Fetch named pages from the COURTS' OWN decision databases into
# docs/sources/decisions/_fetched/, as raw bytes plus extracted text.
#
# WHY (2026-09-30). docs/SOURCING_NOTES.md records "no Ontario appellate law at
# all" as an unsolved gap: the cloud workspace cannot reach the courts' sites,
# WebFetch gets 403 from the Lexum databases, and CanLII must never be scraped
# (CLAUDE.md s. 2). GitHub's runners can reach the courts' own databases, which
# the Vendor Sources workflow already relies on for statutes. This is the same
# route for decisions, run by .github/workflows/courtsimplified-fetch-decisions.yml.
#
# Only the hosts below are fetched. canlii.org is deliberately NOT on the list
# and a URL naming it is refused, however it is written.
#
# Usage: URLS="url1 url2 ..." bash scripts/sources/fetchDecisionPages.sh
set -uo pipefail

ALLOWED_HOSTS="coadecisions.ontariocourts.ca decisions.scc-csc.ca www.ontariocourts.ca ontariocourts.ca"
OUT="docs/sources/decisions/_fetched"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
mkdir -p "$OUT"
INDEX="$OUT/_index.tsv"
: > "$INDEX"

for url in $URLS; do
  host=$(printf '%s' "$url" | sed -E 's#^https?://([^/]+).*#\1#')
  case "$url" in *canlii*) echo "REFUSED (CanLII is never fetched): $url"; continue ;; esac
  allowed=no
  for h in $ALLOWED_HOSTS; do [ "$host" = "$h" ] && allowed=yes; done
  if [ "$allowed" != yes ]; then echo "REFUSED (host not allowed): $url"; continue; fi

  name=$(printf '%s' "$url" | sed -E 's#^https?://##; s#[^A-Za-z0-9._-]+#_#g' | cut -c1-180)
  raw="$OUT/$name.raw"
  code=$(curl -sS -L --max-time 60 -A "$UA" -o "$raw" -w '%{http_code}' "$url")
  [ -s "$raw" ] || { echo "FAILED ($code): $url"; printf '%s\tnone\t0\t%s\t%s\n' "$code" "$name" "$url" >> "$INDEX"; continue; }
  type=$(file -b --mime-type "$raw")
  txt="$OUT/$name.txt"
  if [ "$type" = "application/pdf" ]; then
    pdftotext -layout "$raw" "$txt" 2>/dev/null || true
  else
    # Keep links visible (decision ids live in hrefs), then strip tags.
    sed -E 's#<a [^>]*href="([^"]*)"[^>]*>#[LINK \1] #g; s#<[^>]*>##g' "$raw" \
      | sed -E 's/&nbsp;/ /g; s/&amp;/\&/g; s/&#39;/'"'"'/g; s/&quot;/"/g' \
      | tr -s ' \t' | grep -v '^\s*$' > "$txt" || true
  fi
  bytes=$(stat -c %s "$raw" 2>/dev/null || echo 0)
  printf '%s\t%s\t%s\t%s\t%s\n' "$code" "$type" "$bytes" "$name" "$url" >> "$INDEX"
  echo "$code $type $bytes $url"
  sleep 2
done
