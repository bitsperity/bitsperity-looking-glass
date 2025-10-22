#!/bin/bash
# Test VALIDATE workflow: add evidence, pending, validate


BASE_V="http://localhost:8082/v1/kg/validate"
BASE_W="http://localhost:8082/v1/kg"
PASSED=0
FAILED=0

pass() { echo "✅ PASS - $1"; PASSED=$((PASSED + 1)); return 0; }
fail() { echo "❌ FAIL - $1"; FAILED=$((FAILED + 1)); return 0; }

# Create a simple hypothesis first via write endpoint (requires internal ids)
ctx=$(curl -sS "http://localhost:8082/v1/kg/context?tickers=NVDA&depth=1")
NVDA_ID=$(echo "$ctx" | jq -r '.subgraph.nodes[] | select(.label=="Company" and .properties.ticker=="NVDA") | .id' | head -1)
AMD_ID=$(echo "$ctx" | jq -r '.subgraph.nodes[] | select(.label=="Company" and .properties.ticker=="AMD") | .id' | head -1)

resp=$(curl -sS -X POST "$BASE_W/hypothesis" -H "Content-Type: application/json" -d "{
  \"source_id\": \"$NVDA_ID\",
  \"source_label\": \"Company\",
  \"target_id\": \"$AMD_ID\",
  \"target_label\": \"Company\",
  \"hypothesis\": \"NVDA affects AMD through supply constraints\",
  \"confidence\": 0.5,
  \"properties\": {\"relation_type\": \"AFFECTS\", \"manifold_thought_id\": \"thought_validate_test\"}
}")
HYP_ID=$(echo "$resp" | jq -r '.hypothesis_id // empty')
[[ -n "$HYP_ID" ]] || { echo "❌ Could not create hypothesis"; exit 1; }

# Add dummy evidence node and link using validate API expects existing Event/News/PriceEvent
# Create minimal Event
event_id="ev_$(date +%s)"
curl -sS -X POST "$BASE_W/fact" -H "Content-Type: application/json" -d "{
  \"source_id\": \"$NVDA_ID\",
  \"source_label\": \"Company\",
  \"target_id\": \"$AMD_ID\",
  \"target_label\": \"Company\",
  \"rel_type\": \"AFFECTS\",
  \"source\": \"validate_test_seed\",
  \"confidence\": 0.6
}" >/dev/null || true

# Create PriceEvent node quickly via admin cypher
docker exec alpaca-bot-neo4j-1 cypher-shell -u neo4j -p testpassword "CREATE (e:PriceEvent {id: '$event_id', symbol: 'NVDA', event_type: 'spike', occurred_at: datetime(), confidence: 0.8}) RETURN e" >/dev/null 2>&1 || true

# Add supporting evidence
resp=$(curl -sS -X POST "$BASE_V/hypothesis/$HYP_ID/evidence" -H "Content-Type: application/json" -d "{
  \"hypothesis_id\": \"$HYP_ID\",
  \"evidence_type\": \"supporting\",
  \"evidence_source_id\": \"$event_id\",
  \"evidence_source_type\": \"PriceEvent\",
  \"confidence\": 0.8,
  \"annotated_by\": \"tester\"
}")
[[ "$(echo "$resp" | jq -r '.status // empty')" == "evidence_added" ]] && pass "add evidence" || { echo "Resp: $resp"; fail "add evidence"; }

# Validate (final decision)
resp=$(curl -sS -X POST "$BASE_V/hypothesis/$HYP_ID/validate" -H "Content-Type: application/json" -d "{
  \"hypothesis_id\": \"$HYP_ID\",
  \"decision\": \"validate\",
  \"reasoning\": \"sufficient evidence\",
  \"validated_by\": \"agent_test\",
  \"create_pattern\": false
}")
[[ "$(echo "$resp" | jq -r '.status // empty')" == "validation_complete" ]] && pass "validate" || { echo "Resp: $resp"; fail "validate"; }

echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
[ $FAILED -eq 0 ]
