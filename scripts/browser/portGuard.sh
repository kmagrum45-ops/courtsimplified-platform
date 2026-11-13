#!/usr/bin/env bash
# ONE RUN PER PORT, AND A RUN ONLY EVER STOPS ITS OWN SERVER (sourced by carryLocal.sh; 12 Nov 2026).
#
# WHAT FAILURE IT EXISTS TO CATCH. On 12 Nov a local page-test run lost its server on its third story and then saw
# another run's password screen, then "connection refused", for the remaining 32 stories. An earlier run on the
# same port had kept going in the background: (1) its cleanup force-stopped EVERY listener on the port, including
# the new run's server; (2) its next specs then started their own servers on that port, with their own random
# site password; (3) the new run had also rebuilt the build the older run was serving from. In CI each job runs
# on its own machine, so this needs two runs on one machine; it is guarded anyway, because when it happens it looks
# exactly like a broken page.
#
# Functions (a run calls them in this order):
#   port_lock PORT DIR      take PORT for this run (a lock under DIR); refuse while a live run holds it
#   port_in_use PORT        true when anything answers on PORT, over IPv4 or IPv6
#   serving_register ROOT DIR / build_allowed ROOT DIR
#                           a run serving ROOT's build registers itself; a build of ROOT is refused while any
#                           live run is registered (it would replace the files that run is serving)
#   port_listeners PORT     the process ids listening on PORT (Windows netstat; empty elsewhere)
#   own_server_check PORT PASSWORD OUT
#                           the server answering on PORT accepts THIS run's site password (not another run's server)
#   port_release            undo port_lock and serving_register (only this run's own entries)

_key_of() { printf '%s' "$1" | cksum | cut -d' ' -f1; }
_alive() { [ -n "$1" ] && kill -0 "$1" 2>/dev/null; }

port_lock() {
  local port=$1 dir="$2/port-$1.lock" owner
  mkdir -p "$2"
  if ! mkdir "$dir" 2>/dev/null; then
    owner=$(cat "$dir/pid" 2>/dev/null || true)
    if _alive "$owner"; then
      echo "carry-local: REFUSED. Port ${port} is held by another run (process ${owner}); use another CARRY_PORT or wait for it." >&2
      return 1
    fi
    echo "carry-local: port ${port}: taking over the lock of a run that has ended"
  fi
  echo "$$" > "$dir/pid"
  PORT_LOCK_DIR=$dir
}

port_in_use() {
  (echo > "/dev/tcp/127.0.0.1/$1") 2>/dev/null && return 0
  curl -6 -s -o /dev/null --max-time 2 "http://localhost:$1/" && return 0  # IPv6 loopback (::1), named as localhost
  return 1
}

serving_register() {
  SERVING_DIR="$2/serving-$(_key_of "$1")"
  mkdir -p "$SERVING_DIR"
  : > "$SERVING_DIR/$$"
}

build_allowed() {
  local dir="$2/serving-$(_key_of "$1")" file pid
  [ -d "$dir" ] || return 0
  for file in "$dir"/*; do
    [ -e "$file" ] || continue
    pid=$(basename "$file")
    if [ "$pid" != "$$" ] && _alive "$pid"; then
      echo "carry-local: REFUSED. Another run (process ${pid}) is serving this build; building now would replace its files. Wait for it, or run with CARRY_SKIP_BUILD." >&2
      return 1
    fi
    rm -f "$file"
  done
  return 0
}

port_listeners() {
  command -v taskkill >/dev/null 2>&1 || return 0
  netstat -ano 2>/dev/null | grep -E "[:.]$1 .*LISTEN" | awk '{print $NF}' | sort -u
}

own_server_check() {
  # The password goes to curl in a header file only this user can read, never on a command line.
  local header="$3/.site-access-header" code
  ( umask 077; printf 'Cookie: cs_site_access=%s\n' "$2" > "$header" )
  code=$(curl -s -o /dev/null --max-time 30 -w '%{http_code}' -H @"$header" "http://localhost:$1/" || true)
  rm -f "$header"
  case "$code" in
    2??|3??) return 0 ;;
    *) echo "carry-local: REFUSED. The server on port $1 does not accept this run's site password (HTTP ${code:-none}): it is not this run's server." >&2; return 1 ;;
  esac
}

port_release() {
  if [ -n "${PORT_LOCK_DIR:-}" ] && [ "$(cat "$PORT_LOCK_DIR/pid" 2>/dev/null)" = "$$" ]; then rm -rf "$PORT_LOCK_DIR"; fi
  if [ -n "${SERVING_DIR:-}" ]; then rm -f "$SERVING_DIR/$$"; fi
}
