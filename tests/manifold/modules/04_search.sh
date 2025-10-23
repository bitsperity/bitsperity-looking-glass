#!/bin/bash
# Module 4: Semantic Search

echo "=== Module 4: Semantic Search ==="

# Test 1: Search for margin compression insights
RESP=$(curl -sS -X POST "$BASE_URL/search" -H "Content-Type: application/json" -d '{
  "query": "margin compression and competitive pressure",
  "limit": 5
}')
test_json_field "Search margin compression - status" "$RESP" ".status" "ok"
test_count "Search found margin compression results" "$RESP" ".count" "1"

# Validate that a hypothesis about margin compression is in results
HYP1_FOUND=$(echo "$RESP" | jq -r '.results[] | select(.thought.title | contains("margin")) | .thought.id' | head -1)
TOTAL=$((TOTAL + 1))
if [ -n "$HYP1_FOUND" ] && [ "$HYP1_FOUND" != "null" ]; then
    echo "✅ Search found margin-related hypothesis"
    PASSED=$((PASSED + 1))
else
    echo "❌ Search did not find margin-related hypothesis"
    FAILED=$((FAILED + 1))
fi

# Test 2: Search for supply chain bottlenecks
RESP=$(curl -sS -X POST "$BASE_URL/search" -H "Content-Type: application/json" -d '{
  "query": "supply chain constraints and manufacturing capacity",
  "limit": 5
}')
test_count "Search supply chain - results" "$RESP" ".count" "1"

# Test 3: Search for ASML-related thoughts
RESP=$(curl -sS -X POST "$BASE_URL/search" -H "Content-Type: application/json" -d '{
  "query": "ASML equipment manufacturing",
  "limit": 10
}')
test_count "Search ASML-related - results" "$RESP" ".count" "1"

# Test 4: Search for semiconductor thoughts
RESP=$(curl -sS -X POST "$BASE_URL/search" -H "Content-Type: application/json" -d '{
  "query": "semiconductor chips GPU",
  "limit": 10
}')
test_count "Search semiconductor - results" "$RESP" ".count" "1"

# Test 5: Search for portfolio/decision thoughts
RESP=$(curl -sS -X POST "$BASE_URL/search" -H "Content-Type: application/json" -d '{
  "query": "portfolio rebalance trim position",
  "limit": 10
}')
test_count "Search portfolio decisions - results" "$RESP" ".count" "1"

echo ""

