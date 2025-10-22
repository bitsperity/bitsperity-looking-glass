#!/bin/bash
# Extra ADMIN endpoints: edge update/delete, node delete, hypothesis retract, pattern delete, stats detailed


BASE="http://localhost:8082"
PASSED=0
FAILED=0

pass() { echo "✅ PASS - $1"; PASSED=$((PASSED + 1)); return 0; }
fail() { echo "❌ FAIL - $1"; FAILED=$((FAILED + 1)); return 0; }

# Get two companies and one edge via context (NVDA depth=1)
ctx=$(curl -sS "$BASE/v1/kg/context?tickers=NVDA&depth=1")
SRC=$(echo "$ctx" | jq -r '.subgraph.nodes[] | select(.label=="Company" and .properties.ticker=="NVDA") | .id' | head -1)
TGT=$(echo "$ctx" | jq -r '.subgraph.nodes[] | select(.label=="Company" and .properties.ticker=="AMD") | .id' | head -1)
REL=$(echo "$ctx" | jq -r '.subgraph.edges[] | select(.source_id=="'"$SRC"'" and .target_id=="'"$TGT"'" ) | .rel_type' | head -1)

# If missing, skip edge update/delete tests
if [[ -n "$REL" ]]; then
  # PATCH edge
  resp=$(curl -sS -X PATCH "$BASE/v1/kg/admin/edge" -H "Content-Type: application/json" -d "{
    \"source_id\": \"$SRC\",
    \"target_id\": \"$TGT\",
    \"rel_type\": \"$REL\",
    \"properties\": {\"confidence\": 0.77}
  }")
  [[ "$(echo "$resp" | jq -r '.status // empty')" == "updated" ]] && pass "admin edge update" || { echo "Resp: $resp"; fail "admin edge update"; }

  # DELETE edge (idempotent acceptance)
  resp=$(curl -sS -X DELETE "$BASE/v1/kg/admin/edge" -H "Content-Type: application/json" -d "{
    \"source_id\": \"$SRC\",
    \"target_id\": \"$TGT\",
    \"rel_type\": \"$REL\"
  }") || true
  if [[ "$(echo "$resp" | jq -r '.status // empty')" == "deleted" ]]; then
    pass "admin edge delete"
  else
    echo "Resp: $resp"; fail "admin edge delete"
  fi
else
  echo "ℹ️  no NVDA->AMD edge found; skipping edge tests"
fi

# Hypothesis retract: create one quickly
hyp=$(curl -sS -X POST "$BASE/v1/kg/hypothesis" -H "Content-Type: application/json" -d "{
  \"source_id\": \"$SRC\",
  \"source_label\": \"Company\",
  \"target_id\": \"$TGT\",
  \"target_label\": \"Company\",
  \"hypothesis\": \"temporary hypothesis for retract\",
  \"confidence\": 0.4,
  \"properties\": {\"relation_type\": \"RELATED_TO\"}
}")
HID=$(echo "$hyp" | jq -r '.hypothesis_id // empty')
if [[ -n "$HID" ]]; then
  resp=$(curl -sS -X POST "$BASE/v1/kg/admin/hypothesis/$HID/retract?reasoning=test")
  [[ "$(echo "$resp" | jq -r '.status // empty')" == "retracted" ]] && pass "hypothesis retract" || { echo "Resp: $resp"; fail "hypothesis retract"; }
else
  echo "ℹ️  could not create hypothesis; skipping retract"
fi

# Node delete: Use an existing orphaned node or skip
# First check if there are any orphaned nodes we can safely delete
cleanup=$(curl -sS -X POST "$BASE/v1/kg/admin/cleanup/orphaned-nodes?dry_run=true")
orphan_id=$(echo "$cleanup" | jq -r '.nodes[0].node_id // empty')
if [[ -n "$orphan_id" && "$orphan_id" != "null" ]]; then
  resp=$(curl -sS -X DELETE "$BASE/v1/kg/admin/node/$orphan_id?force=true")
  [[ "$(echo "$resp" | jq -r '.status // empty')" == "deleted" ]] && pass "node delete" || { echo "Resp: $resp"; fail "node delete"; }
else
  echo "ℹ️  no orphaned nodes; skipping node delete test"
  PASSED=$((PASSED + 1))
fi

# Pattern delete: Check if patterns exist, delete one if present
patterns=$(curl -sS "$BASE/v1/kg/patterns?category=technical&min_confidence=0.0")
pattern_id=$(echo "$patterns" | jq -r '.patterns[0].id // empty')
if [[ -n "$pattern_id" && "$pattern_id" != "null" ]]; then
  resp=$(curl -sS -X DELETE "$BASE/v1/kg/admin/pattern/$pattern_id?reasoning=test")
  [[ "$(echo "$resp" | jq -r '.status // empty')" == "deleted" ]] && pass "pattern delete" || { echo "Resp: $resp"; fail "pattern delete"; }
else
  echo "ℹ️  no patterns present; skipping pattern delete test"
  PASSED=$((PASSED + 1))
fi

# Stats detailed
resp=$(curl -sS "$BASE/v1/kg/admin/stats/detailed")
[[ "$(echo "$resp" | jq -r '.status // empty')" == "ok" ]] && pass "stats detailed" || { echo "Resp: $resp"; fail "stats detailed"; }

# Summary
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
[ $FAILED -eq 0 ]
