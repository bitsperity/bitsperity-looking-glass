#!/bin/bash

# Ariadne Phase 3+4 Endpoint Validation Script
# Tests: Contradictions, Gaps, Anomalies, Duplicates, Risk, Lineage

set -e

API="http://localhost:8082"
PASS=0
FAIL=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    
    echo -e "\n${YELLOW}Testing: $name${NC}"
    echo "  Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API$endpoint" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API$endpoint" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "  Status: ${GREEN}✅ 200 OK${NC}"
        
        # Try to extract key info from response
        if echo "$body" | jq . >/dev/null 2>&1; then
            count=$(echo "$body" | jq -r '.count // "N/A"' 2>/dev/null)
            status=$(echo "$body" | jq -r '.status // "N/A"' 2>/dev/null)
            echo "  Response: status=$status, count=$count"
        fi
        
        PASS=$((PASS + 1))
    else
        echo -e "  Status: ${RED}❌ $http_code${NC}"
        echo "  Error: $body"
        FAIL=$((FAIL + 1))
    fi
}

# Main execution
print_header "ARIADNE BACKEND PHASE 3+4: ENDPOINT VALIDATION"

echo -e "\n${YELLOW}Step 1: Reset Graph${NC}"
curl -s -X POST "$API/v1/kg/admin/reset?confirm=true" | jq '.' || echo "Reset attempt made"

echo -e "\n${YELLOW}Step 2: Create Temporal Snapshot${NC}"
curl -s -X POST "$API/v1/kg/admin/snapshot-degrees?label=Company" | jq '.' || echo "Snapshot creation"

print_header "PHASE 3: QUALITY ENDPOINTS"

test_endpoint "Contradictions" "GET" "/v1/kg/quality/contradictions"
test_endpoint "Gaps" "GET" "/v1/kg/quality/gaps"
test_endpoint "Gaps with params" "GET" "/v1/kg/quality/gaps?min_relations=5&gap_threshold=0.4"
test_endpoint "Anomalies" "GET" "/v1/kg/quality/anomalies"
test_endpoint "Anomalies (Z-score)" "GET" "/v1/kg/quality/anomalies?z_threshold=2.0"
test_endpoint "Duplicates" "GET" "/v1/kg/quality/duplicates"
test_endpoint "Duplicates (threshold)" "GET" "/v1/kg/quality/duplicates?similarity_threshold=0.80"

print_header "PHASE 4: DECISION ENDPOINTS"

# These require data, so we expect either results or 404 (not found)
test_endpoint "Risk Scoring" "GET" "/v1/kg/decision/risk?ticker=TSLA"
test_endpoint "Lineage Tracing" "GET" "/v1/kg/decision/lineage?ticker=TSLA"

print_header "VALIDATION SUMMARY"

echo ""
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"

TOTAL=$((PASS + FAIL))

if [ $FAIL -eq 0 ] && [ $PASS -gt 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    exit 1
fi
