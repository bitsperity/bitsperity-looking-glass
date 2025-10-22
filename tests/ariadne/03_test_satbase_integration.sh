#!/bin/bash
# Test Satbase integration (Learn & Ingest endpoints)


BASE="http://localhost:8082"
PASSED=0
FAILED=0

test_case() {
  local name=$1
  local command=$2
  local expected=$3
  
  echo -e "\n━━━ TEST: $name"
  result=$(eval "$command")
  
  if eval "$expected"; then
    echo "✅ PASS"
    echo "   Result: $result"
    PASSED=$((PASSED + 1))
  else
    echo "❌ FAIL"
    echo "   Result: $result"
    FAILED=$((FAILED + 1))
  fi
}

echo "🧪 Testing Satbase Integration"
echo "================================"

# Test 1: Price Correlation
test_case \
  "POST /v1/kg/learn/correlation (NVDA, AMD, TSM)" \
  "curl -sS -X POST '$BASE/v1/kg/learn/correlation' \
    -H 'Content-Type: application/json' \
    -d '{\"symbols\":[\"NVDA\",\"AMD\",\"TSM\"],\"from_date\":\"2025-09-01\",\"to_date\":\"2025-09-30\",\"method\":\"spearman\",\"threshold\":0.5}'" \
  "[[ \$(echo \$result | jq -r '.status') == 'started' ]]"

# Wait for correlation processing
echo "  ⏳ Waiting for correlation to complete..."
sleep 3

# Check logs for success
echo "  📋 Checking Ariadne logs..."
docker logs --tail 10 alpaca-bot-ariadne-api-1 | grep -E "(Fetched price data|Created.*correlation)" | tail -2

# Test 2: Price Ingestion
test_case \
  "POST /v1/kg/ingest/prices (NVDA, AMD)" \
  "curl -sS -X POST '$BASE/v1/kg/ingest/prices' \
    -H 'Content-Type: application/json' \
    -d '{\"symbols\":[\"NVDA\",\"AMD\"],\"from_date\":\"2025-09-01\",\"to_date\":\"2025-09-30\"}'" \
  "[[ \$(echo \$result | jq -r '.status') == 'started' ]]"

# Wait for ingestion
echo "  ⏳ Waiting for ingestion to complete..."
sleep 3

# Check logs
echo "  📋 Checking Ariadne logs..."
docker logs --tail 10 alpaca-bot-ariadne-api-1 | grep -E "(events created|✓.*events)" | tail -2

# Test 3: Community Detection
test_case \
  "POST /v1/kg/learn/community" \
  "curl -sS -X POST '$BASE/v1/kg/learn/community' \
    -H 'Content-Type: application/json' \
    -d '{\"relationship_types\":[\"SUPPLIES_TO\",\"COMPETES_WITH\"]}'" \
  "[[ \$(echo \$result | jq -r '.status') == 'started' ]]"

# Summary
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "  📈 Total:  $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
  echo -e "\n🎉 All Satbase integration tests passed!"
  exit 0
else
  echo -e "\n⚠️  Some tests failed!"
  exit 1
fi

