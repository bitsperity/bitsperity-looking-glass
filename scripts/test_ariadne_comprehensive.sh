#!/bin/bash

# Ariadne Advanced Decision Suite - COMPREHENSIVE TEST SUITE
# Exhaustive testing of all endpoints with detailed validation

set -e

API="http://localhost:8082"
PASS=0
FAIL=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
}

print_subheader() {
    echo -e "\n${MAGENTA}─── $1 ───${NC}"
}

print_test() {
    echo -e "\n${YELLOW}🧪 Test: $1${NC}"
}

validate_json() {
    local json=$1
    if echo "$json" | jq . >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

check_field() {
    local json=$1
    local field=$2
    local desc=$3
    
    if echo "$json" | jq -e "$field" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $desc: $(echo "$json" | jq -r "$field")"
        return 0
    else
        echo -e "  ${RED}✗${NC} Missing: $desc"
        ((WARNINGS++))
        return 1
    fi
}

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_code=$5
    
    print_test "$name"
    echo "  Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API$endpoint" 2>&1)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$API$endpoint" 2>&1)
    else
        echo -e "  ${RED}✗ Unknown method${NC}"
        ((FAIL++))
        return
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" != "$expected_code" ]; then
        echo -e "  ${RED}✗ HTTP $http_code (expected $expected_code)${NC}"
        ((FAIL++))
        return 1
    fi
    
    echo -e "  ${GREEN}✓ HTTP $http_code${NC}"
    
    # Validate JSON
    if ! validate_json "$body"; then
        echo -e "  ${RED}✗ Invalid JSON response${NC}"
        ((FAIL++))
        return 1
    fi
    
    # Check basic structure
    if ! echo "$body" | jq -e '.status' >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠ Missing 'status' field${NC}"
        ((WARNINGS++))
    fi
    
    echo "$body"
    ((PASS++))
    return 0
}

# ============================================================================
print_header "ARIADNE ADVANCED DECISION SUITE - COMPREHENSIVE TEST"
# ============================================================================

echo -e "\n${BLUE}Step 1: Populating test data...${NC}"
python3 scripts/populate_ariadne_advanced_tests.py || {
    echo -e "${RED}✗ Failed to populate test data${NC}"
    exit 1
}

sleep 2
echo -e "${GREEN}✓ Test data ready${NC}"

# ============================================================================
print_header "PHASE A: IMPACT SIMULATION"
# ============================================================================

print_subheader "Test 1: Impact with Default Parameters"
response=$(test_endpoint \
    "Impact (TSLA, depth=3, exponential)" \
    "GET" \
    "/v1/kg/decision/impact?ticker=TSLA&max_depth=3&decay=exponential" \
    "" \
    "200")

check_field "$response" ".source" "Source"
check_field "$response" ".impacts" "Impacts array"
check_field "$response" ".count" "Count"
check_field "$response" ".summary.max_impact" "Max impact"
check_field "$response" ".summary.avg_impact" "Avg impact"

# Validate impact scores are between 0 and 1
impact_scores=$(echo "$response" | jq -r '.impacts[].impact_score // empty')
if [ -n "$impact_scores" ]; then
    while IFS= read -r score; do
        if (( $(echo "$score > 1 || $score < 0" | bc -l) )); then
            echo -e "  ${RED}✗ Impact score out of range: $score${NC}"
            ((WARNINGS++))
        fi
    done <<< "$impact_scores"
fi

print_subheader "Test 2: Impact with Linear Decay"
response=$(test_endpoint \
    "Impact (NVDA, linear decay)" \
    "GET" \
    "/v1/kg/decision/impact?ticker=NVDA&decay=linear&max_depth=4" \
    "" \
    "200")

check_field "$response" ".parameters.decay" "Decay type"

print_subheader "Test 3: Impact with Confidence Filter"
response=$(test_endpoint \
    "Impact (min_confidence=0.7)" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&min_confidence=0.7&max_depth=3" \
    "" \
    "200")

check_field "$response" ".parameters.min_confidence" "Min confidence filter"

print_subheader "Test 4: Impact with Relationship Filter"
response=$(test_endpoint \
    "Impact (rel_filter=SUPPLIES_TO)" \
    "GET" \
    "/v1/kg/decision/impact?ticker=SUPPLIER_A&rel_filter=SUPPLIES_TO&max_depth=3" \
    "" \
    "200")

check_field "$response" ".parameters.relationship_filter" "Relationship filter"

# ============================================================================
print_header "PHASE A: OPPORTUNITY SCORING"
# ============================================================================

print_subheader "Test 5: Opportunities with Default Weights"
response=$(test_endpoint \
    "Opportunities (Company label)" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company" \
    "" \
    "200")

check_field "$response" ".label" "Label"
check_field "$response" ".weights.gap" "Weight: gap"
check_field "$response" ".weights.centrality" "Weight: centrality"
check_field "$response" ".weights.anomaly" "Weight: anomaly"
check_field "$response" ".opportunities" "Opportunities array"

# Validate weights sum to ~1.0
total_weight=$(echo "$response" | jq '.weights | .gap + .centrality + .anomaly')
if (( $(echo "$total_weight < 0.99 || $total_weight > 1.01" | bc -l) )); then
    echo -e "  ${YELLOW}⚠ Weights don't sum to 1.0: $total_weight${NC}"
    ((WARNINGS++))
fi

print_subheader "Test 6: Opportunities with Custom Weights"
response=$(test_endpoint \
    "Opportunities (custom: gap=0.6)" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company&w_gap=0.6&w_centrality=0.2&w_anomaly=0.2" \
    "" \
    "200")

check_field "$response" ".weights.gap" "Gap weight (should be 0.6)"
gap_weight=$(echo "$response" | jq '.weights.gap')
if (( $(echo "$gap_weight != 0.6" | bc -l) )); then
    echo -e "  ${YELLOW}⚠ Gap weight mismatch: expected 0.6, got $gap_weight${NC}"
    ((WARNINGS++))
fi

print_subheader "Test 7: Opportunities Scoring Details"
response=$(test_endpoint \
    "Opportunities with details" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company&limit=10" \
    "" \
    "200")

# Check that opportunities are properly sorted
first_score=$(echo "$response" | jq '.opportunities[0].opportunity_score // 0')
second_score=$(echo "$response" | jq '.opportunities[1].opportunity_score // 0')

if (( $(echo "$first_score < $second_score" | bc -l) )); then
    echo -e "  ${YELLOW}⚠ Opportunities not sorted descending: $first_score < $second_score${NC}"
    ((WARNINGS++))
fi

# Validate factor components
first_factors=$(echo "$response" | jq '.opportunities[0].factors // {}')
check_field "$first_factors" ".gap_severity" "Gap severity factor"
check_field "$first_factors" ".centrality" "Centrality factor"
check_field "$first_factors" ".anomaly" "Anomaly factor"

# ============================================================================
print_header "PHASE C: CONFIDENCE PROPAGATION"
# ============================================================================

print_subheader "Test 8: Confidence Propagation (Product Mode)"
response=$(test_endpoint \
    "Confidence propagation (product mode)" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=TSLA&to_label=Company&mode=product" \
    "" \
    "200")

check_field "$response" ".source" "Source"
check_field "$response" ".target_label" "Target label"
check_field "$response" ".parameters.aggregation_mode" "Aggregation mode"
check_field "$response" ".propagations" "Propagations array"
check_field "$response" ".summary.max_confidence" "Max confidence"
check_field "$response" ".summary.min_confidence" "Min confidence"
check_field "$response" ".summary.avg_confidence" "Avg confidence"

# Validate confidence values are 0-1
conf_values=$(echo "$response" | jq -r '.propagations[].confidence // empty')
if [ -n "$conf_values" ]; then
    while IFS= read -r conf; do
        if (( $(echo "$conf > 1 || $conf < 0" | bc -l) )); then
            echo -e "  ${RED}✗ Confidence out of range: $conf${NC}"
            ((WARNINGS++))
        fi
    done <<< "$conf_values"
fi

print_subheader "Test 9: Confidence Propagation (Min Mode)"
response=$(test_endpoint \
    "Confidence propagation (min mode)" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=NVDA&mode=min&max_depth=3" \
    "" \
    "200")

check_field "$response" ".parameters.aggregation_mode" "Aggregation mode (should be min)"

print_subheader "Test 10: Confidence Propagation (Avg Mode)"
response=$(test_endpoint \
    "Confidence propagation (avg mode)" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&mode=avg&max_depth=4" \
    "" \
    "200")

check_field "$response" ".parameters.aggregation_mode" "Aggregation mode (should be avg)"

# ============================================================================
print_header "PHASE B: DEDUPLICATION"
# ============================================================================

print_subheader "Test 11: Dedup Plan (Discovery)"
response=$(test_endpoint \
    "Dedup plan discovery" \
    "GET" \
    "/v1/kg/admin/deduplicate/plan?label=Company&threshold=0.85&limit=10" \
    "" \
    "200")

check_field "$response" ".label" "Label"
check_field "$response" ".threshold" "Threshold"
check_field "$response" ".duplicates" "Duplicates array"

# Check duplicate structure
if echo "$response" | jq -e '.duplicates[0]' >/dev/null 2>&1; then
    first_dup=$(echo "$response" | jq '.duplicates[0]')
    check_field "$first_dup" ".node1.id" "Node1 ID"
    check_field "$first_dup" ".node2.id" "Node2 ID"
    check_field "$first_dup" ".similarity" "Similarity score"
    check_field "$first_dup" ".property_differences" "Property differences"
    check_field "$first_dup" ".recommended_strategy" "Recommended strategy"
fi

print_subheader "Test 12: Dedup Plan with Different Thresholds"
response_strict=$(test_endpoint \
    "Dedup plan (strict threshold=0.95)" \
    "GET" \
    "/v1/kg/admin/deduplicate/plan?threshold=0.95&limit=20" \
    "" \
    "200")

response_loose=$(test_endpoint \
    "Dedup plan (loose threshold=0.7)" \
    "GET" \
    "/v1/kg/admin/deduplicate/plan?threshold=0.7&limit=20" \
    "" \
    "200")

count_strict=$(echo "$response_strict" | jq '.count')
count_loose=$(echo "$response_loose" | jq '.count')

if (( $(echo "$count_strict > $count_loose" | bc -l) )); then
    echo -e "  ${YELLOW}⚠ Loose threshold should find more duplicates: strict=$count_strict, loose=$count_loose${NC}"
    ((WARNINGS++))
fi

print_subheader "Test 13: Dedup Execute (Dry-Run)"
response=$(test_endpoint \
    "Dedup execute (dry-run mode)" \
    "POST" \
    "/v1/kg/admin/deduplicate/execute" \
    '{
        "source_id": "nonexistent1",
        "target_id": "nonexistent2",
        "strategy": "prefer_target",
        "dry_run": true
    }' \
    "404")

print_subheader "Test 14: Dedup Execute (Invalid Strategy)"
response=$(test_endpoint \
    "Dedup execute (invalid strategy validation)" \
    "POST" \
    "/v1/kg/admin/deduplicate/execute" \
    '{
        "source_id": "test1",
        "target_id": "test2",
        "strategy": "invalid_strategy",
        "dry_run": true
    }' \
    "422")

# ============================================================================
print_header "PHASE D: LEARNING FEEDBACK"
# ============================================================================

print_subheader "Test 15: Learning Feedback (Dry-Run Preview)"
response=$(test_endpoint \
    "Learning feedback (dry-run)" \
    "POST" \
    "/v1/kg/admin/learning/apply-feedback" \
    '{
        "label": "Company",
        "window_days": 30,
        "max_adjust": 0.2,
        "step": 0.05,
        "dry_run": true
    }' \
    "200")

check_field "$response" ".dry_run" "Dry-run flag (should be true)"
check_field "$response" ".learning_updates" "Learning updates array"
check_field "$response" ".summary.total_relations_to_update" "Total relations"
check_field "$response" ".summary.avg_confidence_increase" "Avg increase"

# Validate increases are positive and capped
updates=$(echo "$response" | jq '.learning_updates[]')
if [ -n "$updates" ]; then
    echo "$updates" | jq -r '.old_confidence as $old | .new_confidence as $new | ($new - $old)' | while read increase; do
        if (( $(echo "$increase < 0" | bc -l) )); then
            echo -e "  ${RED}✗ Negative confidence increase: $increase${NC}"
            ((WARNINGS++))
        fi
    done
fi

print_subheader "Test 16: Learning Feedback (Smaller Window)"
response=$(test_endpoint \
    "Learning feedback (7-day window)" \
    "POST" \
    "/v1/kg/admin/learning/apply-feedback" \
    '{
        "label": "Company",
        "window_days": 7,
        "max_adjust": 0.1,
        "step": 0.02,
        "dry_run": true
    }' \
    "200")

check_field "$response" ".parameters.window_days" "Window days"

print_subheader "Test 17: Learning History"
response=$(test_endpoint \
    "Learning history (nonexistent relation)" \
    "GET" \
    "/v1/kg/admin/learning/history?relation_id=nonexistent_rel" \
    "" \
    "404")

# ============================================================================
print_header "VALIDATION TESTS"
# ============================================================================

print_subheader "Test 18: Parameter Boundary Checks"

# Max depth too high
response=$(test_endpoint \
    "Impact: max_depth > 5 (should fail)" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&max_depth=10" \
    "" \
    "422")

# Weight out of range
response=$(test_endpoint \
    "Opportunities: negative weight (should fail)" \
    "GET" \
    "/v1/kg/decision/opportunities?w_gap=-0.1" \
    "" \
    "422")

print_subheader "Test 19: Missing Required Parameters"

response=$(test_endpoint \
    "Impact: no source (should fail)" \
    "GET" \
    "/v1/kg/decision/impact" \
    "" \
    "400")

print_subheader "Test 20: Invalid Enum Values"

response=$(test_endpoint \
    "Confidence: invalid aggregation mode (should fail)" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&mode=invalid_mode" \
    "" \
    "422")

response=$(test_endpoint \
    "Impact: invalid decay (should fail)" \
    "GET" \
    "/v1/kg/decision/impact?ticker=AAPL&decay=invalid_decay" \
    "" \
    "422")

# ============================================================================
print_header "CROSS-ENDPOINT CONSISTENCY TESTS"
# ============================================================================

print_subheader "Test 21: Consistency Check - Centrality & Opportunities"
response1=$(test_endpoint \
    "Get opportunities (checking centrality component)" \
    "GET" \
    "/v1/kg/decision/opportunities?label=Company&limit=5" \
    "" \
    "200")

# Extract top node from opportunities
top_node=$(echo "$response1" | jq -r '.opportunities[0].node_id // empty')
if [ -n "$top_node" ]; then
    echo -e "  ${GREEN}✓${NC} Top opportunity node: $top_node"
fi

print_subheader "Test 22: Consistency Check - Multiple Endpoints on Same Data"
impact_response=$(test_endpoint \
    "Impact from TSLA" \
    "GET" \
    "/v1/kg/decision/impact?ticker=TSLA&max_depth=2" \
    "" \
    "200")

conf_response=$(test_endpoint \
    "Confidence from TSLA" \
    "GET" \
    "/v1/kg/analytics/confidence/propagate?from_ticker=TSLA&max_depth=2" \
    "" \
    "200")

# Both should find targets
impact_count=$(echo "$impact_response" | jq '.count')
conf_count=$(echo "$conf_response" | jq '.count')

echo -e "  Impact found: $impact_count targets"
echo -e "  Confidence found: $conf_count paths"

if [ "$impact_count" -eq 0 ] && [ "$conf_count" -eq 0 ]; then
    echo -e "  ${YELLOW}⚠ Neither endpoint found any targets - check if graph is populated${NC}"
    ((WARNINGS++))
fi

# ============================================================================
print_header "SUMMARY"
# ============================================================================

echo ""
echo -e "${GREEN}✓ PASSED:   $PASS${NC}"
echo -e "${RED}✗ FAILED:   $FAIL${NC}"
echo -e "${YELLOW}⚠ WARNINGS: $WARNINGS${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✅ ALL TESTS PASSED - NO ISSUES FOUND                         ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
        exit 0
    else
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  ⚠️  ALL TESTS PASSED BUT $WARNINGS WARNINGS FOUND             ║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
        exit 0
    fi
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ $FAIL TESTS FAILED                                        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
