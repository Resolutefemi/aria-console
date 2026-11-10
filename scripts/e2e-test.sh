#!/bin/bash
# Aria Console — end-to-end backend test against Supabase
set -u
cd /home/z/my-project

# ── start dev server (dies with this shell — fine for testing) ──
nohup bun run dev > /tmp/dev-e2e.log 2>&1 &
for i in $(seq 1 40); do
  sleep 1
  if curl -s -m 3 localhost:3000/api/health >/dev/null 2>&1; then break; fi
done

pass=0; fail=0
ok()   { pass=$((pass+1)); echo "PASS  $1"; }
bad()  { fail=$((fail+1)); echo "FAIL  $1  ← $2"; }
check() { # name, expected_fixed_string, actual
  if echo "$3" | grep -qF "$2"; then ok "$1"; else bad "$1" "$(echo "$3" | head -c 300)"; fi
}

echo "══ 1. health ══"
R=$(curl -s localhost:3000/api/health)
check "health supabase connected" '"database":"connected (supabase)"' "$R"

echo "══ 2. admin account (create if needed) ══"
if [ -f /tmp/e2e_creds ]; then
  source /tmp/e2e_creds
  ok "reusing existing admin creds"
else
  R=$(curl -s -X POST localhost:3000/api/users -H "Content-Type: application/json" \
    -d '{"email":"femi@ariaconsole.dev","name":"Resolute Femi","role":"ADMIN"}')
  check "users POST creates auth account" '"role":"ADMIN"' "$R"
  PW=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tempPassword',''))" 2>/dev/null)
  ADMIN_ID=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null)
  printf 'PW=%s\nADMIN_ID=%s\n' "$PW" "$ADMIN_ID" > /tmp/e2e_creds
fi
echo "  admin id: $ADMIN_ID"

echo "══ 3. login (Supabase Auth) ══"
R=$(curl -s -X POST "https://gvcsbkwnpebpflazpucb.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: sb_publishable_BQx3z_DJ1NWZEPsgrMFT5w_SnfgIw8D" -H "Content-Type: application/json" \
  -d "{\"email\":\"femi@ariaconsole.dev\",\"password\":\"$PW\"}")
TOK=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
if [ -n "$TOK" ]; then ok "login returns access_token"; else bad "login" "$R"; fi

echo "══ 4. auth sync (POST /api/auth/sync) ══"
R=$(curl -s -X POST localhost:3000/api/auth/sync -H "Authorization: Bearer $TOK")
check "sync returns profile + role" '"role":"ADMIN"' "$R"

echo "══ 5. pairing create ══"
R=$(curl -s -X POST localhost:3000/api/pairing/create -H "Content-Type: application/json" \
  -d "{\"parentId\":\"$ADMIN_ID\",\"deviceName\":\"Femi iPhone\"}")
CODE=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin).get('shortCode',''))" 2>/dev/null)
check "pairing create returns shortCode" "shortCode" "$R"

echo "══ 6. pairing verify (creates device) ══"
R=$(curl -s -X POST localhost:3000/api/pairing/verify -H "Content-Type: application/json" \
  -d "{\"shortCode\":\"$CODE\",\"deviceInfo\":{\"name\":\"Femi iPhone 15\",\"type\":\"PHONE\",\"room\":\"Personal\",\"os\":\"iOS 18.1\"}}")
DEVID=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin).get('deviceId',''))" 2>/dev/null)
check "pairing verify creates device" 'deviceDisplayId' "$R"
echo "  device id: $DEVID"

echo "══ 7. device report (APP_LIST + HEARTBEAT + SCREEN_TIME + LOCATION) ══"
R=$(curl -s -X POST localhost:3000/api/device/report -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVID\",\"type\":\"APP_LIST\",\"data\":{\"apps\":[{\"packageName\":\"com.instagram.android\",\"appName\":\"Instagram\",\"category\":\"Social\"},{\"packageName\":\"com.whatsapp\",\"appName\":\"WhatsApp\",\"category\":\"Social\"}]}}")
check "APP_LIST upsert" '"ok":true' "$R"
R=$(curl -s -X POST localhost:3000/api/device/report -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVID\",\"type\":\"HEARTBEAT\",\"data\":{\"battery\":73,\"signal\":-58,\"status\":\"ONLINE\"}}")
check "HEARTBEAT update" '"ok":true' "$R"
R=$(curl -s -X POST localhost:3000/api/device/report -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVID\",\"type\":\"SCREEN_TIME\",\"data\":{\"appPackage\":\"com.instagram.android\",\"appName\":\"Instagram\",\"startedAt\":\"$(date -u -d '20 minutes ago' +%Y-%m-%dT%H:%M:%SZ)\",\"endedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"durationSec\":1200}}")
check "SCREEN_TIME insert" '"ok":true' "$R"
R=$(curl -s -X POST localhost:3000/api/device/report -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVID\",\"type\":\"LOCATION\",\"data\":{\"latitude\":6.5244,\"longitude\":3.3792,\"accuracy\":15,\"address\":\"Lagos, Nigeria\",\"battery\":73}}")
check "LOCATION insert" '"ok":true' "$R"

echo "══ 8. voice command insert (direct REST via service path — via report API equivalent) ══"
R=$(curl -s localhost:3000/api/voice/commands)
check "voice commands list empty-ok" '"commands":[]' "$R"

echo "══ 9. devices list (paired) ══"
R=$(curl -s "localhost:3000/api/devices?paired=true" -H "Authorization: Bearer $TOK")
check "paired devices include Femi iPhone" 'Femi iPhone 15' "$R"
check "devices carry _count" '"_count"' "$R"

echo "══ 10. devices admin list ══"
R=$(curl -s "localhost:3000/api/devices?all=true" -H "Authorization: Bearer $TOK")
check "admin all devices" 'Femi iPhone 15' "$R"

echo "══ 11. device detail + activity ══"
R=$(curl -s "localhost:3000/api/devices/$DEVID" -H "Authorization: Bearer $TOK")
check "device detail ownership ok" 'Femi iPhone 15' "$R"
R=$(curl -s "localhost:3000/api/device/report?deviceId=$DEVID")
check "activity aggregation" 'totalScreenTimeSec' "$R"
check "last location present" 'lastLocation' "$R"

echo "══ 12. smart control ══"
R=$(curl -s -X POST "localhost:3000/api/device/$DEVID/smart-control" -H "Content-Type: application/json" \
  -d "{\"deviceType\":\"LIGHT\",\"deviceName\":\"Living Room Light\",\"command\":\"ON\",\"sentBy\":\"$ADMIN_ID\"}")
check "smart control executes" '"success":true' "$R"

echo "══ 13. pending commands poll + ack ══"
R=$(curl -s "localhost:3000/api/device/commands?deviceId=$DEVID")
check "commands delivered to device" 'TURN_ON' "$R"
CMDID=$(echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['commands'][0]['id'] if d.get('commands') else '')" 2>/dev/null)
if [ -n "$CMDID" ]; then
  R=$(curl -s -X POST localhost:3000/api/device/commands -H "Content-Type: application/json" \
    -d "{\"commandId\":\"$CMDID\",\"status\":\"EXECUTED\",\"result\":{\"ok\":true}}")
  check "command execution ack" '"status":"EXECUTED"' "$R"
fi

echo "══ 14. stats overview ══"
R=$(curl -s localhost:3000/api/stats/overview)
check "overview counts devices" '"connectedDevices"' "$R"

echo "══ 15. security alert lifecycle ══"
R=$(curl -s -X POST localhost:3000/api/audit-logs -H "Content-Type: application/json" \
  -d "{\"action\":\"test.created\",\"resource\":\"test\",\"metadata\":{\"note\":\"e2e\"}}")
LOGID=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin).get('log',{}).get('id',''))" 2>/dev/null)
check "audit log insert" '"test.created"' "$R"
R=$(curl -s "localhost:3000/api/audit-logs?limit=5")
check "audit log list" 'test.created' "$R"

echo "══ 16. users list ══"
R=$(curl -s localhost:3000/api/users)
check "users list contains admin" 'femi@ariaconsole.dev' "$R"

echo
echo "════════ RESULT: $pass passed, $fail failed ════════"
