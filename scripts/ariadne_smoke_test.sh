#!/bin/bash

# Ariadne Knowledge Graph - Smoke Test
# Tests all core API endpoints

set -e

BASE_URL="${ARIADNE_BASE_URL:-http://localhost:8082}"
echo "🧪 Testing Ariadne API at $BASE_URL"
echo "=========================================="

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=${5:-200}
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
        PASS=$((PASS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $status, expected $expected_status)"
        echo "Response: $body"
        FAIL=$((FAIL + 1))
        return 1
    fi
}

# 1. Health Check
echo ""
echo "=== Health & Stats ==="
test_endpoint "Health check" "GET" "/health"
test_endpoint "Database stats" "GET" "/v1/kg/stats"

# 2. Write Operations - Create some test data
echo ""
echo "=== Write Operations ==="

# First, we need to create some nodes to test with
# Create test companies via fact endpoint (which will fail if nodes don't exist)
# So we'll use direct Cypher via a helper endpoint or create nodes first

echo "Setting up test data..."

# We'll need to manually create some test companies for the smoke test
# In production, these would come from news ingestion

# For now, let's test the endpoints that don't require existing data

# Test observation (creates its own node)
OBSERVATION_DATA='{
  "date": "2025-10-21T12:00:00Z",
  "content": "NVDA showing strong momentum after earnings beat. AI demand remains robust.",
  "tags": ["earnings", "ai", "momentum"],
  "related_tickers": ["NVDA"],
  "related_events": [],
  "confidence": 0.9
}'

test_endpoint "Add observation" "POST" "/v1/kg/observation" "$OBSERVATION_DATA"

# 3. Ingestion (background tasks)
echo ""
echo "=== Ingestion (Background) ==="

# Ingest recent news
test_endpoint "Ingest news (start)" "POST" "/v1/kg/ingest/news?from_date=2025-10-20&to_date=2025-10-21&limit=10" "" 200

echo -e "${YELLOW}⏳ Waiting 5 seconds for ingestion to process...${NC}"
sleep 5

# Check if data was created
test_endpoint "Stats after ingestion" "GET" "/v1/kg/stats"

# 4. Read Operations (after ingestion)
echo ""
echo "=== Read Operations ==="

# These might return empty results if no data ingested, but should not error
test_endpoint "Get context (empty)" "GET" "/v1/kg/context?topic=semiconductor&limit=50"

# Get similar entities (might be empty)
# test_endpoint "Get similar entities" "GET" "/v1/kg/similar-entities?ticker=NVDA&limit=5"

# 5. Learn Operations
echo ""
echo "=== Learn Operations (Background) ==="

# Start correlation analysis
test_endpoint "Compute correlations (start)" "POST" "/v1/kg/learn/correlation" \
    '{"symbols": ["NVDA", "AMD", "TSM"], "window": 30, "method": "spearman"}' 200

# Start community detection
test_endpoint "Detect communities (start)" "POST" "/v1/kg/learn/community" "" 200

# Summary
echo ""
echo "=========================================="
echo -e "Test Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

