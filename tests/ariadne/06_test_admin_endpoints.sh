#!/bin/bash
# Test ADMIN endpoints


BASE="http://localhost:8082"
BASE_A="$BASE/v1/kg/admin"
PASSED=0
FAILED=0

pass() { echo "✅ PASS - $1"; PASSED=$((PASSED + 1)); return 0; }
fail() { echo "❌ FAIL - $1"; FAILED=$((FAILED + 1)); return 0; }

# 1) Test node update on existing node (use NVDA from seed)
nvda_resp=$(curl -sS "$BASE/v1/kg/context?tickers=NVDA&depth=0&limit=1")
NVDA_ID=$(echo "$nvda_resp" | jq -r '.subgraph.nodes[0].id // empty')

if [[ -n "$NVDA_ID" && "$NVDA_ID" != "null" ]]; then
  resp=$(curl -sS -X PATCH "$BASE_A/node" -H "Content-Type: application/json" -d "{
    \"node_id\": \"$NVDA_ID\",
    \"properties\": {\"test_updated\": true, \"updated_by\": \"admin_test\"}
  }")
  [[ "$(echo "$resp" | jq -r '.status // empty')" == "updated" ]] && pass "node update" || { echo "Resp: $resp"; fail "node update"; }
else
  fail "node update - NVDA not found"
fi

# 2) Test orphaned node cleanup (dry_run, should find 0 or more)
resp=$(curl -sS -X POST "$BASE_A/cleanup/orphaned-nodes?dry_run=true")
orphan_count=$(echo "$resp" | jq -r '.orphaned_count // 0')
[[ "$orphan_count" =~ ^[0-9]+$ ]] && pass "orphaned cleanup ($orphan_count found)" || { echo "Resp: $resp"; fail "orphaned cleanup"; }

# 3) Test stats endpoint
resp=$(curl -sS "$BASE_A/stats")
total=$(echo "$resp" | jq -r '.total_nodes // 0')
[[ "$total" -gt 0 ]] && pass "admin stats ($total nodes)" || { echo "Resp: $resp"; fail "admin stats"; }

# Summary
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
[ $FAILED -eq 0 ]
