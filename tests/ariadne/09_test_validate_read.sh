#!/bin/bash
# Validate READ endpoints: pending-validation, hypothesis/{id}


BASE_V="http://localhost:8082/v1/kg/validate"
BASE_W="http://localhost:8082/v1/kg"
PASSED=0
FAILED=0

pass() { echo "✅ PASS - $1"; PASSED=$((PASSED + 1)); return 0; }
fail() { echo "❌ FAIL - $1"; FAILED=$((FAILED + 1)); return 0; }

# Create hypothesis and add multiple evidences to trigger pending
ctx=$(curl -sS "$BASE_W/context?tickers=NVDA&depth=0")
SRC=$(echo "$ctx" | jq -r '.subgraph.nodes[0].id')
TGT=$(curl -sS "$BASE_W/context?tickers=AMD&depth=0" | jq -r '.subgraph.nodes[0].id')

hresp=$(curl -sS -X POST "$BASE_W/hypothesis" -H "Content-Type: application/json" -d "{
  \"source_id\": \"$SRC\",
  \"source_label\": \"Company\",
  \"target_id\": \"$TGT\",
  \"target_label\": \"Company\",
  \"hypothesis\": \"pending threshold test\",
  \"confidence\": 0.5,
  \"properties\": {\"relation_type\": \"AFFECTS\"}
}")
HID=$(echo "$hresp" | jq -r '.hypothesis_id // empty')
[[ -n "$HID" ]] || { echo "❌ Could not create hypothesis"; exit 1; }

# Create 3 evidence items to reach threshold 3
# Use existing events from price ingestion instead of creating new ones
events=$(curl -sS "$BASE_W/timeline?ticker=NVDA" | jq -r '.price_events[].id' | head -3)
counter=0
for ev_id in $events; do
  if [[ -n "$ev_id" ]]; then
    curl -sS -X POST "$BASE_V/hypothesis/$HID/evidence" -H "Content-Type: application/json" -d "{
      \"hypothesis_id\": \"$HID\",
      \"evidence_type\": \"supporting\",
      \"evidence_source_id\": \"$ev_id\",
      \"evidence_source_type\": \"PriceEvent\",
      \"confidence\": 0.5,
      \"annotated_by\": \"tester\"
    }" >/dev/null
    counter=$((counter + 1))
  fi
  [[ $counter -ge 3 ]] && break
done

# If not enough events, create observations as evidence fallback
if [[ $counter -lt 3 ]]; then
  echo "ℹ️  Not enough price events, using observations as evidence"
  for i in $(seq $counter 2); do
    obs=$(curl -sS -X POST "$BASE_W/observation" -H "Content-Type: application/json" -d "{
      \"text\": \"observation evidence $i for hypothesis $HID\",
      \"confidence\": 0.5,
      \"source\": \"test\",
      \"properties\": {}
    }" | jq -r '.observation_id // empty')
    if [[ -n "$obs" ]]; then
      curl -sS -X POST "$BASE_V/hypothesis/$HID/evidence" -H "Content-Type: application/json" -d "{
        \"hypothesis_id\": \"$HID\",
        \"evidence_type\": \"supporting\",
        \"evidence_source_id\": \"$obs\",
        \"evidence_source_type\": \"Observation\",
        \"confidence\": 0.5,
        \"annotated_by\": \"tester\"
      }" >/dev/null
    fi
  done
fi

# pending validations
resp=$(curl -sS "$BASE_V/hypotheses/pending-validation?min_annotations=3")
[[ "$(echo "$resp" | jq -r '.status // empty')" == "success" ]] && pass "pending validations" || { echo "Resp: $resp"; fail "pending validations"; }

# get hypothesis detail
h=$(curl -sS "$BASE_V/hypotheses/$HID")
[[ "$(echo "$h" | jq -r '.hypothesis.id // empty')" == "$HID" ]] && pass "get hypothesis" || { echo "Resp: $h"; fail "get hypothesis"; }

# Summary
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
[ $FAILED -eq 0 ]
