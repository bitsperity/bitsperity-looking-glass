#!/bin/bash

# Ariadne Advanced Decision Suite - Error Handling Test Suite
# Tests: 404, 400, 422, 500 errors, boundary checks, invalid params, rollback

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

test_error() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_code=$5
    
    echo -e "\n${YELLOW}Test: $name${NC}"
    echo "  Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API$endpoint" 2>&1)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$API$endpoint" 2>&1)
    else
        return
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_code" ]; then
        echo -e "  Status: ${GREEN}✅ $http_code (expected)${NC}"
        if echo "$body" | jq . >/dev/null 2>&1; then
            detail=$(echo "$body" | jq -r '.detail // "N/A"' 2>/dev/null)
            echo "  Error: $detail" | head -c 100
        fi
        ((PASS++))
    else
        echo -e "  Status: ${RED}✗ $http_code (expected $expected_code)${NC}"
        ((FAIL++))
    fi
}

# ============================================================================
print_header "ERROR HANDLING: 404 NOT FOUND (5 tests)"
# ============================================================================

test_error \
    "Impact: Nonexistent ticker 404" \
    "GET" \
    "/v1/kg/decision/impact?ticker=FAKECO2024" \
    "" \
    "404"

test_error \
    "Confidence: Nonexistent source 404" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=NOSUCHCO" \
    "" \
    "404"

test_error \
    "Learning History: Nonexistent relation 404" \
    "GET" \
    "/v1/kg/admin/learning/history?relation_id=invalidid12345" \
    "" \
    "404"

test_error \
    "Dedup Execute: Nonexistent nodes 404" \
    "POST" \
    "/v1/kg/admin/deduplicate/execute" \
    '{
        "source_id": "fakeid1",
        "target_id": "fakeid2",
        "dry_run": false
    }' \
    "404"

test_error \
    "Impact: No source (neither ticker nor node_id) 400" \
    "GET" \
    "/v1/kg/decision/impact" \
    "" \
    "400"

# ============================================================================
print_header "ERROR HANDLING: BOUNDARY VIOLATIONS (8 tests)"
# ============================================================================

test_error \
    "Impact: Max depth too high (>5) 422" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&max_depth=10" \
    "" \
    "422"

test_error \
    "Impact: Max depth too low (<1) 422" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&max_depth=0" \
    "" \
    "422"

test_error \
    "Opportunities: Limit too high (>50) 422" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company&limit=100" \
    "" \
    "422"

test_error \
    "Opportunities: Negative weight 422" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company&w_gap=-0.1" \
    "" \
    "422"

test_error \
    "Confidence: Max depth too high (>10) 422" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&max_depth=15" \
    "" \
    "422"

test_error \
    "Confidence: Invalid mode 422" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&mode=invalid_mode" \
    "" \
    "422"

test_error \
    "Dedup Plan: Threshold >1.0 422" \
    "GET" \
    "/v1/kg/admin/deduplicate/plan?threshold=1.5" \
    "" \
    "422"

test_error \
    "Learning: Invalid max_adjust 422" \
    "POST" \
    "/v1/kg/admin/learning/apply-feedback" \
    '{
        "label": "Company",
        "max_adjust": 1.5
    }' \
    "422"

# ============================================================================
print_header "ERROR HANDLING: INVALID REQUEST BODY (4 tests)"
# ============================================================================

test_error \
    "Dedup Execute: Missing required fields 422" \
    "POST" \
    "/v1/kg/admin/deduplicate/execute" \
    '{
        "source_id": "test"
    }' \
    "422"

test_error \
    "Dedup Execute: Invalid strategy 422" \
    "POST" \
    "/v1/kg/admin/deduplicate/execute" \
    '{
        "source_id": "test1",
        "target_id": "test2",
        "strategy": "invalid_strategy"
    }' \
    "422"

test_error \
    "Learning Feedback: Invalid window_days 422" \
    "POST" \
    "/v1/kg/admin/learning/apply-feedback" \
    '{
        "label": "Company",
        "window_days": -10
    }' \
    "422"

test_error \
    "Learning Feedback: Invalid step 422" \
    "POST" \
    "/v1/kg/admin/learning/apply-feedback" \
    '{
        "label": "Company",
        "step": 1.5
    }' \
    "422"

# ============================================================================
print_header "ERROR HANDLING: MALFORMED REQUESTS (3 tests)"
# ============================================================================

test_error \
    "Invalid JSON body" \
    "POST" \
    "/v1/kg/admin/deduplicate/execute" \
    'invalid json {' \
    "422"

test_error \
    "Dedup Execute: Invalid decay param" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&decay=invalid" \
    "" \
    "422"

test_error \
    "Confidence: Non-numeric depth" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&max_depth=notanumber" \
    "" \
    "422"

# ============================================================================
print_header "SUMMARY"
# ============================================================================

echo ""
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All error-handling tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
