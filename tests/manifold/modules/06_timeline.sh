#!/bin/bash
# Module 6: Timeline & Evolution

echo "=== Module 6: Timeline & Evolution ==="

# Test 1: Get full timeline
RESP=$(curl -sS "$BASE_URL/timeline")
test_count "Timeline - total thoughts" "$RESP" ".timeline | length" "1"

# Test 2: Timeline filtered by type
RESP=$(curl -sS "$BASE_URL/timeline?type=hypothesis")
test_count "Timeline - hypotheses only" "$RESP" ".timeline | length" "1"

# Verify all returned thoughts are hypotheses
HYP_COUNT=$(echo "$RESP" | jq '[.timeline[] | select(.type == "hypothesis")] | length')
TOTAL_COUNT=$(echo "$RESP" | jq '.timeline | length')
TOTAL=$((TOTAL + 1))
if [ "$HYP_COUNT" -eq "$TOTAL_COUNT" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
    echo "✅ Timeline filter works - all $HYP_COUNT thoughts are hypotheses"
    PASSED=$((PASSED + 1))
else
    echo "❌ Timeline filter broken - $HYP_COUNT hypotheses out of $TOTAL_COUNT total"
    FAILED=$((FAILED + 1))
fi

# Test 3: Timeline filtered by tickers
RESP=$(curl -sS "$BASE_URL/timeline?tickers=NVDA,AMD")
test_count "Timeline - NVDA/AMD thoughts" "$RESP" ".timeline | length" "1"

echo ""
