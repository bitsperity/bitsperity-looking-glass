#!/bin/bash
# Ariadne Backend Phase 1+2 Validation Script
# Tests all 7 new endpoints and validates responses

API_BASE="http://localhost:8082"

echo "=============================================="
echo "ARIADNE PHASE 1+2 ENDPOINT VALIDATION"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local name=$1
    local url=$2
    local expected_field=$3
    
    echo -e "\n${YELLOW}Testing: $name${NC}"
    echo "URL: $url"
    
    response=$(curl -s "$url")
    
    if echo "$response" | jq -e ".$expected_field" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}: $expected_field found in response"
        echo "$response" | jq '.' | head -15
    else
        echo -e "${RED}❌ FAIL${NC}: $expected_field not found"
        echo "$response"
    fi
}

# Phase 1: Fundament
echo -e "\n${YELLOW}=== PHASE 1: FUNDAMENT ===${NC}"

test_endpoint \
    "Search" \
    "$API_BASE/v1/kg/search?text=test" \
    "status"

test_endpoint \
    "Path Finding" \
    "$API_BASE/v1/kg/path?from_id=1&to_id=2&max_hops=5" \
    "status"

test_endpoint \
    "Time Slice" \
    "$API_BASE/v1/kg/time-slice?as_of=2025-01-01T00:00:00" \
    "status"

# Phase 2: Analytics
echo -e "\n${YELLOW}=== PHASE 2: GRAPH-ANALYTICS ===${NC}"

test_endpoint \
    "Centrality (PageRank)" \
    "$API_BASE/v1/kg/analytics/centrality?algo=pagerank&topk=5" \
    "status"

test_endpoint \
    "Communities (Louvain)" \
    "$API_BASE/v1/kg/analytics/communities?algo=louvain" \
    "status"

test_endpoint \
    "Node Similarity" \
    "$API_BASE/v1/kg/analytics/similarity?node_id=1&topk=5" \
    "status"

test_endpoint \
    "Link Prediction" \
    "$API_BASE/v1/kg/analytics/link-prediction?node_id=1&topk=5" \
    "status"

# Error handling test
echo -e "\n${YELLOW}=== ERROR HANDLING ===${NC}"
echo -e "${YELLOW}Testing Invalid DateTime${NC}"
response=$(curl -s "$API_BASE/v1/kg/time-slice?as_of=invalid")
if echo "$response" | jq -e ".detail" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}: Error handling working"
    echo "$response" | jq '.detail'
else
    echo -e "${RED}❌ FAIL${NC}: No error message"
    echo "$response"
fi

echo -e "\n${GREEN}=============================================="
echo "VALIDATION COMPLETE"
echo "==============================================${NC}\n"
