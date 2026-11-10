#!/usr/bin/env bash
# E2E verification: signup works with NO confirmation-link step.
# Server start + tests + user cleanup all in one invocation.
set -uo pipefail
cd /home/z/my-project

PORT=3100
BASE="http://127.0.0.1:$PORT"
EMAIL="aria-noconfirm-e2e@example.com"
PASS="NoConfirm#2026x"
COOKIE=/tmp/aria_noconfirm_cookies.txt
rm -f "$COOKIE"

cleanup_user() {
  # Remove the E2E test user: public.users row first, then auth user.
  bun -e '
    const { createClient } = require("@supabase/supabase-js");
    const admin = createClient(process.env.U, process.env.S, { auth: { persistSession: false } });
    const email = process.env.E;
    (async () => {
      await admin.from("users").delete().eq("email", email);
      const { data } = await admin.auth.admin.listUsers({ perPage: 500 });
      const u = (data?.users ?? []).find((x) => x.email === email);
      if (u) { await admin.auth.admin.deleteUser(u.id); console.log("  cleanup: auth user deleted"); }
      else console.log("  cleanup: auth user not found (already gone)");
      process.exit(0);
    })();
  ' >/dev/null 2>&1
  env U="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)" \
      S="$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)" \
      E="$EMAIL" \
      true
}

cleanup_user_pre() {
  env U="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)" \
      S="$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)" \
      E="$EMAIL" \
      bun -e '
    const { createClient } = require("@supabase/supabase-js");
    const admin = createClient(process.env.U, process.env.S, { auth: { persistSession: false } });
    (async () => {
      await admin.from("users").delete().eq("email", process.env.E);
      const { data } = await admin.auth.admin.listUsers({ perPage: 500 });
      const u = (data?.users ?? []).find((x) => x.email === process.env.E);
      if (u) await admin.auth.admin.deleteUser(u.id);
      console.log("pre-cleanup done");
      process.exit(0);
    })();
  '
}

cleanup_user_pre

# ── start production server (output: standalone) ────────────────────
# NOTE: the standalone server.js does NOT load .env.local — vars must
# be exported explicitly (in production the platform supplies them).
set -a; source .env.local; set +a
# Guard: real keys required (placeholders fail with 401 from Supabase)
case "$NEXT_PUBLIC_SUPABASE_ANON_KEY$SUPABASE_SERVICE_ROLE_KEY" in
  *PASTE_*) echo "FAIL: .env.local still contains placeholder keys — paste real values from Supabase → Settings → API first."; exit 1;;
esac
PORT=$PORT HOSTNAME=127.0.0.1 node .next/standalone/server.js >/tmp/aria_noconfirm_server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for i in $(seq 1 60); do
  curl -sf "$BASE/api/health" >/dev/null 2>&1 && break
  sleep 1
  if [ $i -eq 60 ]; then echo "FAIL: server did not start"; tail -20 /tmp/aria_noconfirm_server.log; exit 1; fi
done
echo "server ready on :$PORT"

PASS_COUNT=0; FAIL_COUNT=0
ok()   { PASS_COUNT=$((PASS_COUNT+1)); echo "  ✔ $1"; }
bad()  { FAIL_COUNT=$((FAIL_COUNT+1)); echo "  ✘ $1"; }

# ── 1. fresh signup: must log in immediately, no confirmation ───────
echo "TEST 1: fresh signup returns a session (no confirmation step)"
BODY=$(curl -s -w '\n%{http_code}' -D /tmp/aria_noconfirm_hdr.txt -c "$COOKIE" \
  -X POST "$BASE/api/auth/signup" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"NoConfirm E2E\"}")
CODE=$(echo "$BODY" | tail -1); JSON=$(echo "$BODY" | head -n -1)
[ "$CODE" = "200" ] && ok "status 200 (got $CODE)" || bad "expected 200, got $CODE: $JSON"
echo "$JSON" | rg -q '"needsConfirmation"' && bad "response still mentions needsConfirmation" || ok "no needsConfirmation in response"
echo "$JSON" | rg -q '"profile"' && ok "profile returned" || bad "no profile in response"
grep -qi 'set-cookie: .*aria_session=' /tmp/aria_noconfirm_hdr.txt && ok "aria_session cookie set" || bad "no aria_session cookie"
echo "$JSON" | rg -q '"email_confirmed_at":"[^"]+"' && ok "user email_confirmed_at set" || bad "email_confirmed_at missing"
echo "$JSON" | rg -qi 'needsConfirmation|confirmation link|Check your email' && bad "confirm-flow copy in response" || ok "no confirm-flow copy in response"

# ── 2. session resolves with the cookie ─────────────────────────────
echo "TEST 2: session resolves with the signup cookie"
CODE=$(curl -s -o /tmp/aria_sess.json -w '%{http_code}' -b "$COOKIE" "$BASE/api/auth/session")
[ "$CODE" = "200" ] && rg -q '"email"' /tmp/aria_sess.json && ok "session 200 with profile" || bad "session failed ($CODE)"

# ── 3. duplicate signup gives a friendly 409 ────────────────────────
echo "TEST 3: duplicate signup → 409 friendly message"
BODY=$(curl -s -w '\n%{http_code}' -X POST "$BASE/api/auth/signup" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
CODE=$(echo "$BODY" | tail -1); JSON=$(echo "$BODY" | head -n -1)
[ "$CODE" = "409" ] && echo "$JSON" | rg -q 'already exists' && ok "409 + friendly message" || bad "got $CODE: $JSON"

# ── 4. direct sign-in with the same credentials works ───────────────
echo "TEST 4: immediate sign-in works (user already confirmed)"
CODE=$(curl -s -o /tmp/aria_signin.json -w '%{http_code}' -X POST "$BASE/api/auth/signin" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
[ "$CODE" = "200" ] && ok "signin 200" || bad "signin failed ($CODE): $(cat /tmp/aria_signin.json)"

# ── 5. UI page renders and carries no confirmation copy ─────────────
echo "TEST 5: /login page renders without confirmation-link copy"
HTML=$(curl -s "$BASE/login")
echo "$HTML" > /tmp/aria_login.html
echo "$HTML" | rg -qi 'check your email|confirmation link' && bad "login page still shows confirmation copy" || ok "no confirmation copy on /login"
echo "$HTML" | rg -qi 'Welcome back|Aria Console' && ok "login page renders" || bad "login page content missing"

# ── cleanup ─────────────────────────────────────────────────────────
cleanup_user_pre
echo ""
echo "RESULT: $PASS_COUNT passed, $FAIL_COUNT failed"
[ "$FAIL_COUNT" -eq 0 ]
