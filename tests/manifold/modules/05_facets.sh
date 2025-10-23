#!/bin/bash
# Module 5: Faceted Discovery

echo "=== Module 5: Faceted Discovery ==="

# Test 1: Get all facets (type, tickers, sectors, tags)
RESP=$(curl -sS -X POST "$BASE_URL/search" -H "Content-Type: application/json" -d '{
  "query": "semiconductor AI infrastructure",
  "facets": ["type", "tickers", "sectors", "tags"],
  "limit": 50
}')

test_json_field "Facets - status" "$RESP" ".status" "ok"

# Validate facet structure
TYPE_FACET_COUNT=$(echo "$RESP" | jq '.facets.type | length')
test_count "Type facets exist" "$RESP" ".facets.type | length" "1"

TICKER_FACET_COUNT=$(echo "$RESP" | jq '.facets.tickers | length')
test_count "Ticker facets exist" "$RESP" ".facets.tickers | length" "1"

SECTOR_FACET_COUNT=$(echo "$RESP" | jq '.facets.sectors | length')
test_count "Sector facets exist" "$RESP" ".facets.sectors | length" "1"

TAG_FACET_COUNT=$(echo "$RESP" | jq '.facets.tags | length')
test_count "Tag facets exist" "$RESP" ".facets.tags | length" "1"

# Test 2: Verify specific facet values
NVDA_COUNT=$(echo "$RESP" | jq '.facets.tickers[] | select(.value == "NVDA") | .count')
test_count "NVDA appears in ticker facets" "$RESP" ".facets.tickers[] | select(.value == \"NVDA\") | .count" "1"

# Test 3: Facets with broad query (browse mode)
RESP=$(curl -sS -X POST "$BASE_URL/search" -H "Content-Type: application/json" -d '{
  "query": "trading stocks market",
  "facets": ["type"],
  "limit": 100
}')
test_count "Broad query facets - types" "$RESP" ".facets.type | length" "1"

echo ""

