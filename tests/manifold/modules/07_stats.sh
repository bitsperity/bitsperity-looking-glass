#!/bin/bash
# Module 7: Statistics

echo "=== Module 7: Statistics ==="

# Test 1: Get overall stats
RESP=$(curl -sS "$BASE_URL/stats")
test_json_field "Stats - status" "$RESP" ".status" "ok"
test_count "Stats - total thoughts" "$RESP" ".total" "7"

# Validate stats structure
test_count "Stats - by_type keys" "$RESP" ".by_type | keys | length" "1"
test_count "Stats - by_status keys" "$RESP" ".by_status | keys | length" "1"

# Validate specific counts
test_count "Stats - hypothesis count" "$RESP" ".by_type.hypothesis // 0" "2"

# Test 2: Get stats filtered by ticker
RESP=$(curl -sS "$BASE_URL/stats?tickers=NVDA")
test_json_field "Stats filtered by ticker - status" "$RESP" ".status" "ok"
test_count "Stats - NVDA thoughts" "$RESP" ".total" "1"

# Test 3: Validate average confidence
RESP=$(curl -sS "$BASE_URL/stats")
AVG_CONF=$(echo "$RESP" | jq -r '.avg_confidence')
TOTAL=$((TOTAL + 1))
if (( $(echo "$AVG_CONF > 0 && $AVG_CONF <= 1" | bc -l) )); then
    echo "✅ Average confidence is valid (0 < $AVG_CONF <= 1)"
    PASSED=$((PASSED + 1))
else
    echo "❌ Average confidence out of range: $AVG_CONF"
    FAILED=$((FAILED + 1))
fi

# Test 4: Validate validation rate
VAL_RATE=$(echo "$RESP" | jq -r '.validation_rate')
TOTAL=$((TOTAL + 1))
if (( $(echo "$VAL_RATE >= 0 && $VAL_RATE <= 1" | bc -l) )); then
    echo "✅ Validation rate is valid (0 <= $VAL_RATE <= 1)"
    PASSED=$((PASSED + 1))
else
    echo "❌ Validation rate out of range: $VAL_RATE"
    FAILED=$((FAILED + 1))
fi

echo ""

