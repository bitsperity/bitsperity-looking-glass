#!/bin/bash
set -e

# Globale Test-Chain für Manifold
# Tests alle Endpoints mit komplexem, realistischem Szenario
# Validiert nicht nur Status-Codes, sondern auch Datenintegrität

BASE_URL="http://localhost:8083/v1/memory"
TOTAL=0
PASSED=0
FAILED=0

echo "=========================================="
echo "  MANIFOLD COMPREHENSIVE TEST SUITE"
echo "  Testing ALL endpoints with validation"
echo "=========================================="
echo ""

# Reset Qdrant collection before tests
echo "🔄 Resetting Qdrant collection..."
docker exec -it alpaca-bot-qdrant-1 curl -X DELETE "http://localhost:6333/collections/manifold_thoughts" 2>/dev/null || true
sleep 2
echo "✅ Collection reset complete"
echo ""

# Helper functions
test_case() {
    local name="$1"
    local expected="$2"
    local actual="$3"
    
    TOTAL=$((TOTAL + 1))
    
    if [ "$actual" = "$expected" ]; then
        echo "✅ $name"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo "❌ $name"
        echo "   Expected: $expected"
        echo "   Got: $actual"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

test_json_field() {
    local name="$1"
    local response="$2"
    local field="$3"
    local expected="$4"
    
    local actual=$(echo "$response" | jq -r "$field")
    test_case "$name" "$expected" "$actual"
}

test_count() {
    local name="$1"
    local response="$2"
    local field="$3"
    local min="$4"
    
    local actual=$(echo "$response" | jq "$field // 0")
    TOTAL=$((TOTAL + 1))
    
    if [ "$actual" != "null" ] && [ "$actual" -ge "$min" ]; then
        echo "✅ $name (count: $actual)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo "❌ $name"
        echo "   Expected: >= $min"
        echo "   Got: $actual"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "📋 Running test modules..."
echo ""

# Module 1: Health & Setup
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/01_health.sh

# Module 2: Seed Complex Scenario
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/02_seed.sh

# Module 3: CRUD Operations
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/03_crud.sh

# Module 4: Semantic Search
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/04_search.sh

# Module 5: Faceted Discovery
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/05_facets.sh

# Module 6: Timeline & Evolution
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/06_timeline.sh

# Module 7: Statistics
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/07_stats.sh

# Module 8: Relations
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/08_relations.sh

# Module 9: Promote & Sync
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/09_promote.sh

# Module 10: Admin & Advanced Operations  
source /home/sascha-laptop/alpaca-bot/tests/manifold/modules/10_admin.sh

echo ""
echo "=========================================="
echo "  TEST RESULTS"
echo "=========================================="
echo "Total:  $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED!"
    exit 0
else
    echo "⚠️  Some tests failed"
    exit 1
fi

