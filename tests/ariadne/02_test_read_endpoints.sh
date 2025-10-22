#!/bin/bash
# Test all READ endpoints with clear expectations

BASE="http://localhost:8082"
PASSED=0
FAILED=0

# Test result tracking
test_case() {
  local name=$1
  local command=$2
  local expected=$3
  
  echo -e "\n━━━ TEST: $name"
  result=$(eval "$command")
  
  if eval "$expected"; then
    echo "✅ PASS"
    PASSED=$((PASSED + 1))
  else
    echo "❌ FAIL"
    echo "   Result: $result"
    FAILED=$((FAILED + 1))
  fi
}

echo "🧪 Testing READ Endpoints"
echo "=========================="

# Test 1: Context by Ticker
test_case \
  "GET /v1/kg/context?tickers=NVDA&depth=1" \
  "curl -sS '$BASE/v1/kg/context?tickers=NVDA&depth=1'" \
  "[[ \$(echo \$result | jq -r '.subgraph.nodes | length') -gt 0 ]]"

# Test 2: Context by Topic
test_case \
  "GET /v1/kg/context?topic=Technology&depth=1" \
  "curl -sS '$BASE/v1/kg/context?topic=Technology&depth=1&limit=50'" \
  "[[ \$(echo \$result | jq -r '.subgraph.nodes | length') -gt 0 ]]"

# Test 3: Timeline for Ticker
test_case \
  "GET /v1/kg/timeline?ticker=NVDA" \
  "curl -sS '$BASE/v1/kg/timeline?ticker=NVDA'" \
  "[[ \$(echo \$result | jq -r '.events | length') =~ ^[0-9]+$ ]]"

# Test 4: Similar Entities (Weighted Jaccard)
test_case \
  "GET /v1/kg/similar-entities?ticker=NVDA&method=weighted_jaccard" \
  "curl -sS '$BASE/v1/kg/similar-entities?ticker=NVDA&method=weighted_jaccard&limit=5'" \
  "[[ \$(echo \$result | jq -r '.similar | length') =~ ^[0-9]+$ ]]"

# Test 5: Admin Stats
test_case \
  "GET /v1/kg/admin/stats" \
  "curl -sS '$BASE/v1/kg/admin/stats'" \
  "[[ \$(echo \$result | jq -r '.total_nodes') =~ ^[0-9]+$ ]]"

# Test 6: Patterns Search
test_case \
  "GET /v1/kg/patterns?category=technical" \
  "curl -sS '$BASE/v1/kg/patterns?category=technical'" \
  "[[ \$(echo \$result | jq -r '.patterns | length') =~ ^[0-9]+$ ]]"

# Test 7: Current Regimes
test_case \
  "GET /v1/kg/regimes/current" \
  "curl -sS '$BASE/v1/kg/regimes/current'" \
  "[[ \$(echo \$result | jq -r '.regimes | length') =~ ^[0-9]+$ ]]"

# Test 8: Impact Analysis (by event query)
test_case \
  "GET /v1/kg/impact?event_query=Export&k=5" \
  "curl -sS '$BASE/v1/kg/impact?event_query=Export&k=5'" \
  "[[ \$(echo \$result | jq -r '.impacted_entities | length') =~ ^[0-9]+$ ]] || [[ \$(echo \$result | jq -r '.detail') == 'Event not found' ]]"

# Summary
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"

echo "  📈 Total:  $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
  echo -e "\n🎉 All read tests passed!"
  exit 0
else
  echo -e "\n⚠️  Some read tests failed!"
  exit 1
fi

