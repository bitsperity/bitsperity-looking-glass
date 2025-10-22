#!/bin/bash
# Test WRITE endpoints: fact, observation, hypothesis


BASE="http://localhost:8082/v1/kg"
PASSED=0
FAILED=0

pass() { echo "✅ PASS - $1"; PASSED=$((PASSED + 1)); return 0; }
fail() { echo "❌ FAIL - $1"; FAILED=$((FAILED + 1)); return 0; }

# Resolve internal ids per ticker via own context calls
get_id() {
  local t=$1
  local resp=$(curl -sS "http://localhost:8082/v1/kg/context?tickers=$t&depth=0")
  echo "$resp" | jq -r ".subgraph.nodes[] | select(.label==\"Company\" and .properties.ticker==\"$t\") | .id" | head -1
}

NVDA_ID=$(get_id NVDA)
AMD_ID=$(get_id AMD)
INTC_ID=$(get_id INTC)

if [[ -z "$NVDA_ID" || -z "$AMD_ID" || -z "$INTC_ID" ]]; then
  echo "❌ Could not resolve NVDA/AMD/INTC ids"
  echo "  NVDA_ID=$NVDA_ID AMD_ID=$AMD_ID INTC_ID=$INTC_ID"
  exit 1
fi

REL=PARTNERS_WITH

# 1) fact (idempotent behaviour allowed)
resp=$(curl -sS -X POST "$BASE/fact" -H "Content-Type: application/json" -d "{
  \"source_id\": \"$NVDA_ID\",
  \"source_label\": \"Company\",
  \"target_id\": \"$INTC_ID\",
  \"target_label\": \"Company\",
  \"rel_type\": \"$REL\",
  \"source\": \"write_test\",
  \"confidence\": 0.7,
  \"valid_from\": \"2024-01-01T00:00:00Z\"
}") || true
if [[ "$(echo "$resp" | jq -r '.status // empty')" == "created" ]]; then
  pass "fact"
else
  # Check if relation exists already (idempotency)
  ctx=$(curl -sS "http://localhost:8082/v1/kg/context?tickers=NVDA&depth=1")
  exists=$(echo "$ctx" | jq -r ".subgraph.edges[] | select(.rel_type==\"$REL\" and .source_id==\"$NVDA_ID\" and .target_id==\"$INTC_ID\") | .rel_type" | head -1)
  if [[ "$exists" == "$REL" ]]; then
    pass "fact (idempotent)"
  else
    echo "Resp: $resp"; fail "fact"
  fi
fi

# 2) observation
now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
resp=$(curl -sS -X POST "$BASE/observation" -H "Content-Type: application/json" -d "{
  \"date\": \"$now\",
  \"content\": \"Test observation about NVDA\",
  \"tags\": [\"test\", \"observation\"],
  \"related_tickers\": [\"NVDA\"],
  \"related_events\": [],
  \"confidence\": 0.9
}") || true
[[ "$(echo "$resp" | jq -r '.status // empty')" == "created" ]] && pass "observation" || { echo "Resp: $resp"; fail "observation"; }

# 3) hypothesis
resp=$(curl -sS -X POST "$BASE/hypothesis" -H "Content-Type: application/json" -d "{
  \"source_id\": \"$NVDA_ID\",
  \"source_label\": \"Company\",
  \"target_id\": \"$AMD_ID\",
  \"target_label\": \"Company\",
  \"hypothesis\": \"NVDA product launch increases AMD GPU demand lag\",
  \"confidence\": 0.6,
  \"properties\": {\"relation_type\": \"AFFECTS\", \"created_by\": \"write_test\", \"manifold_thought_id\": \"thought_write_test\"}
}") || true
HYP_ID=$(echo "$resp" | jq -r '.hypothesis_id // empty')
[[ -n "$HYP_ID" ]] && pass "hypothesis" || { echo "Resp: $resp"; fail "hypothesis"; }

echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
[ $FAILED -eq 0 ]
