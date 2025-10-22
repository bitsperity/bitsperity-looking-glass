#!/bin/bash
# Master test script - runs all Ariadne tests in order
set -e

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔════════════════════════════════════════╗"
echo "║   ARIADNE BACKEND FULL TEST SUITE     ║"
echo "╚════════════════════════════════════════╝"

# Step 0: Check if services are running
echo -e "\n0️⃣ Checking services..."
if ! curl -sS http://localhost:8082/health > /dev/null 2>&1; then
  echo "❌ Ariadne API is not running!"; exit 1
fi
echo "✅ Ariadne API is running"
if ! curl -sS http://localhost:8080/health > /dev/null 2>&1; then
  echo "❌ Satbase API is not running!"; exit 1
fi
echo "✅ Satbase API is running"

# Step 1: Reset Graph
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣ RESET GRAPH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/00_reset_graph.sh"

# Step 2: Seed Graph
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣ SEED GRAPH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/01_seed_graph.sh"

# Step 3: Test Read Endpoints
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣ TEST READ ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/02_test_read_endpoints.sh"

# Step 4: Test Satbase Integration
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣ TEST SATBASE INTEGRATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/03_test_satbase_integration.sh"

# Step 5: Test Write Endpoints
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣ TEST WRITE ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/04_test_write_endpoints.sh"

# Step 6: Test Validate Workflow
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣ TEST VALIDATE WORKFLOW"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/05_test_validate_workflow.sh"

# Step 7: Test Admin Endpoints
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣ TEST ADMIN ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/06_test_admin_endpoints.sh"

# Step 8: Test Read Extras
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣ TEST READ EXTRAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/07_test_read_extras.sh"

# Step 9: Test Admin Extras
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9️⃣ TEST ADMIN EXTRAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/08_test_admin_extras.sh"

# Step 10: Validate Read endpoints
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔟 TEST VALIDATE READ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$TEST_DIR/09_test_validate_read.sh"

# Final Summary
echo -e "\n╔════════════════════════════════════════╗"
echo "║           FINAL SUMMARY                ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📊 Graph State:"
curl -sS http://localhost:8082/v1/kg/admin/stats | jq '{nodes: .total_nodes, edges: .total_edges}'

echo "\n🎉 ALL TESTS COMPLETED"

