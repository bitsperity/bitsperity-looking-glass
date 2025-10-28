#!/bin/bash

# Ariadne Advanced Decision Suite - Tier 1 Test Suite
# Tests: Impact Simulation, Opportunity Scoring, Confidence Propagation, Dedup, Learning
# Target: 30+ test cases covering default params, custom params, edge cases

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
    local data=$4
    local expected_code=$5
    
    echo -e "\n${YELLOW}Test: $name${NC}"
    echo "  Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API$endpoint" 2>&1)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$API$endpoint" 2>&1)
    else
        echo -e "  ${RED}✗ Unknown method: $method${NC}"
        ((FAIL++))
        return
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_code" ]; then
        echo -e "  Status: ${GREEN}✅ $http_code${NC}"
        
        # Parse response
        if echo "$body" | jq . >/dev/null 2>&1; then
            count=$(echo "$body" | jq -r '.count // .summary.count // "N/A"' 2>/dev/null)
            status=$(echo "$body" | jq -r '.status // "N/A"' 2>/dev/null)
            echo "  Response: status=$status, count=$count"
            ((PASS++))
        else
            echo -e "  ${RED}✗ Invalid JSON response${NC}"
            ((FAIL++))
        fi
    else
        echo -e "  Status: ${RED}✗ $http_code (expected $expected_code)${NC}"
        echo "  Body: $body" | head -c 200
        ((FAIL++))
    fi
}

# ============================================================================
print_header "PHASE A: IMPACT SIMULATION & OPPORTUNITIES (Tier-1: 12 tests)"
# ============================================================================

# IMPACT SIMULATION (6 tests)
print_header "Impact Simulation Tests"

test_endpoint \
    "Impact: Default params (empty graph)" \
    "GET" \
    "/v1/kg/decision/impact?ticker=NONEXISTENT" \
    "" \
    "404"

test_endpoint \
    "Impact: Max depth boundary (depth=1)" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&max_depth=1" \
    "" \
    "200"

test_endpoint \
    "Impact: Max depth boundary (depth=5)" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&max_depth=5" \
    "" \
    "200"

test_endpoint \
    "Impact: Exponential decay" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&decay=exponential&max_depth=3" \
    "" \
    "200"

test_endpoint \
    "Impact: Linear decay" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&decay=linear&max_depth=3" \
    "" \
    "200"

test_endpoint \
    "Impact: Confidence threshold filter" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&min_confidence=0.7" \
    "" \
    "200"

# OPPORTUNITY SCORING (6 tests)
print_header "Opportunity Scoring Tests"

test_endpoint \
    "Opportunities: Default weights (Company)" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company" \
    "" \
    "200"

test_endpoint \
    "Opportunities: Custom weights (gap=0.5)" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company&w_gap=0.5&w_centrality=0.3&w_anomaly=0.2" \
    "" \
    "200"

test_endpoint \
    "Opportunities: High centrality weight" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company&w_centrality=0.7" \
    "" \
    "200"

test_endpoint \
    "Opportunities: Limit boundary (limit=1)" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company&limit=1" \
    "" \
    "200"

test_endpoint \
    "Opportunities: Limit boundary (limit=50)" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company&limit=50" \
    "" \
    "200"

test_endpoint \
    "Opportunities: Alternative label (Event)" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Event" \
    "" \
    "200"

# ============================================================================
print_header "PHASE C: CONFIDENCE PROPAGATION (Tier-1: 6 tests)"
# ============================================================================

print_header "Confidence Propagation Tests"

test_endpoint \
    "Confidence: Default params (product mode)" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&to_label=Company" \
    "" \
    "200"

test_endpoint \
    "Confidence: Min aggregation mode" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&mode=min&max_depth=3" \
    "" \
    "200"

test_endpoint \
    "Confidence: Avg aggregation mode" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&mode=avg&max_depth=3" \
    "" \
    "200"

test_endpoint \
    "Confidence: Max depth boundary (depth=1)" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&max_depth=1" \
    "" \
    "200"

test_endpoint \
    "Confidence: Min confidence threshold (0.5)" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&min_confidence=0.5" \
    "" \
    "200"

test_endpoint \
    "Confidence: Nonexistent source (404)" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=NONEXISTENT" \
    "" \
    "404"

# ============================================================================
print_header "PHASE B: DEDUPLICATION (Tier-1: 8 tests)"
# ============================================================================

print_header "Deduplication Plan & Execute Tests"

test_endpoint \
    "Dedup Plan: Default threshold (0.85)" \
    "GET" \
    "/v1/kg/admin/deduplicate/plan?label=Company&threshold=0.85" \
    "" \
    "200"

test_endpoint \
    "Dedup Plan: High threshold (0.95)" \
    "GET" \
    "/v1/kg/admin/deduplicate/plan?label=Company&threshold=0.95" \
    "" \
    "200"

test_endpoint \
    "Dedup Plan: Low threshold (0.7)" \
    "GET" \
    "/v1/kg/admin/deduplicate/plan?label=Company&threshold=0.7" \
    "" \
    "200"

test_endpoint \
    "Dedup Plan: Limit boundary (limit=1)" \
    "GET" \
    "/v1/kg/admin/deduplicate/plan?label=Company&limit=1" \
    "" \
    "200"

test_endpoint \
    "Dedup Execute: Dry-run (prefer_target)" \
    "POST" \
    "/v1/kg/admin/deduplicate/execute" \
    '{
        "source_id": "nonexistent1",
        "target_id": "nonexistent2",
        "strategy": "prefer_target",
        "dry_run": true
    }' \
    "404"

test_endpoint \
    "Dedup Execute: Dry-run (prefer_source)" \
    "POST" \
    "/v1/kg/admin/deduplicate/execute" \
    '{
        "source_id": "nonexistent1",
        "target_id": "nonexistent2",
        "strategy": "prefer_source",
        "dry_run": true
    }' \
    "404"

test_endpoint \
    "Dedup Execute: Dry-run (merge_all_properties)" \
    "POST" \
    "/v1/kg/admin/deduplicate/execute" \
    '{
        "source_id": "nonexistent1",
        "target_id": "nonexistent2",
        "strategy": "merge_all_properties",
        "dry_run": true
    }' \
    "404"

test_endpoint \
    "Dedup Plan: Alternative label (Event)" \
    "GET" \
    "/v1/kg/admin/deduplicate/plan?label=Event&threshold=0.8" \
    "" \
    "200"

# ============================================================================
print_header "PHASE D: LEARNING FEEDBACK (Tier-1: 5 tests)"
# ============================================================================

print_header "Learning Feedback Tests"

test_endpoint \
    "Learning: Dry-run (default params)" \
    "POST" \
    "/v1/kg/admin/learning/apply-feedback" \
    '{
        "label": "Company",
        "window_days": 30,
        "max_adjust": 0.2,
        "step": 0.05,
        "dry_run": true
    }' \
    "200"

test_endpoint \
    "Learning: Dry-run (smaller window)" \
    "POST" \
    "/v1/kg/admin/learning/apply-feedback" \
    '{
        "label": "Company",
        "window_days": 7,
        "max_adjust": 0.1,
        "step": 0.01,
        "dry_run": true
    }' \
    "200"

test_endpoint \
    "Learning: Dry-run (larger max_adjust)" \
    "POST" \
    "/v1/kg/admin/learning/apply-feedback" \
    '{
        "label": "Company",
        "window_days": 60,
        "max_adjust": 0.5,
        "step": 0.1,
        "dry_run": true
    }' \
    "200"

test_endpoint \
    "Learning History: Nonexistent relation" \
    "GET" \
    "/v1/kg/admin/learning/history?relation_id=nonexistent" \
    "" \
    "404"

test_endpoint \
    "Learning: Alternative label (Event)" \
    "POST" \
    "/v1/kg/admin/learning/apply-feedback" \
    '{
        "label": "Event",
        "window_days": 30,
        "dry_run": true
    }' \
    "200"

# ============================================================================
print_header "SUMMARY"
# ============================================================================

echo ""
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All Tier-1 tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
