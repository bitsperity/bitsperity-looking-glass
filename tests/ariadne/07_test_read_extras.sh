#!/bin/bash
# Extra READ endpoints: patterns/occurrences, regimes/similar, health


BASE="http://localhost:8082"
PASSED=0
FAILED=0

pass() { echo "✅ PASS - $1"; PASSED=$((PASSED + 1)); return 0; }
fail() { echo "❌ FAIL - $1"; FAILED=$((FAILED + 1)); return 0; }

# health
resp=$(curl -sS "$BASE/health")
[[ "$(echo "$resp" | jq -r '.status // empty')" == "ok" ]] && pass "health" || { echo "Resp: $resp"; fail "health"; }

# kg stats
resp=$(curl -sS "$BASE/v1/kg/admin/stats")
[[ "$(echo "$resp" | jq -r '.total_nodes // empty')" =~ ^[0-9]+$ ]] && pass "kg stats" || { echo "Resp: $resp"; fail "kg stats"; }

# patterns list (may be empty)
resp=$(curl -sS "$BASE/v1/kg/patterns?category=technical")
[[ "$(echo "$resp" | jq -r '.patterns | length')" =~ ^[0-9]+$ ]] && pass "patterns list" || { echo "Resp: $resp"; fail "patterns list"; }

# occurrences if any pattern exists
PATTERN_ID=$(echo "$resp" | jq -r '.patterns[0].pattern.id // empty')
if [[ -n "$PATTERN_ID" && "$PATTERN_ID" != "null" ]]; then
  occ=$(curl -sS "$BASE/v1/kg/patterns/$PATTERN_ID/occurrences")
  [[ "$(echo "$occ" | jq -r '.occurrences | length')" =~ ^[0-9]+$ ]] && pass "pattern occurrences" || { echo "Resp: $occ"; fail "pattern occurrences"; }
else
  echo "ℹ️  no pattern present; skipping occurrences"
fi

# regimes current
resp=$(curl -sS "$BASE/v1/kg/regimes/current")
[[ "$(echo "$resp" | jq -r '.regimes | length')" =~ ^[0-9]+$ ]] && pass "regimes current" || { echo "Resp: $resp"; fail "regimes current"; }

# regimes similar (if any current)
CURR_ID=$(echo "$resp" | jq -r '.regimes[0].id // empty')
if [[ -n "$CURR_ID" && "$CURR_ID" != "null" ]]; then
  sim=$(curl -sS "$BASE/v1/kg/regimes/similar?id=$CURR_ID")
  [[ "$(echo "$sim" | jq -r '.similar | length')" =~ ^[0-9]+$ ]] && pass "regimes similar" || { echo "Resp: $sim"; fail "regimes similar"; }
else
  echo "ℹ️  no current regime; skipping similar"
fi

# Summary
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
[ $FAILED -eq 0 ]
