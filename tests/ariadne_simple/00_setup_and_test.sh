#!/bin/bash
# Simple, complete Ariadne test - all in one file
set -e

BASE_ARIADNE="http://localhost:8082"
BASE_SATBASE="http://localhost:8080"

echo "╔════════════════════════════════════════╗"
echo "║   ARIADNE SIMPLE TEST SUITE           ║"
echo "╚════════════════════════════════════════╝"

# Check services
echo -e "\n✓ Checking services..."
curl -sf "$BASE_ARIADNE/health" > /dev/null || { echo "❌ Ariadne offline"; exit 1; }
curl -sf "$BASE_SATBASE/health" > /dev/null || { echo "❌ Satbase offline"; exit 1; }
echo "  Ariadne & Satbase: ONLINE"

# Reset graph
echo -e "\n✓ Resetting graph..."
docker exec -it alpaca-bot-neo4j-1 cypher-shell -u neo4j -p testpassword "MATCH (n) DETACH DELETE n" 2>&1 | grep -q "0 rows" || echo "  Graph cleared"

# Seed via direct Cypher
echo -e "\n✓ Seeding graph..."
docker exec -it alpaca-bot-neo4j-1 cypher-shell -u neo4j -p testpassword "
MERGE (nvda:Company {ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology'})
MERGE (amd:Company {ticker: 'AMD', name: 'AMD', sector: 'Technology'})
MERGE (tsm:Company {ticker: 'TSM', name: 'TSMC', sector: 'Technology'})
MERGE (nvda)-[:COMPETES_WITH {confidence: 0.95}]->(amd)
MERGE (tsm)-[:SUPPLIES_TO {confidence: 0.9}]->(nvda)
RETURN count(*)" 2>&1 | tail -1

# Test 1: Admin Stats
echo -e "\n━━━ TEST 1: Admin Stats"
stats=$(curl -sf "$BASE_ARIADNE/v1/kg/admin/stats")
nodes=$(echo "$stats" | jq -r '.total_nodes')
edges=$(echo "$stats" | jq -r '.total_edges')
echo "  Nodes: $nodes, Edges: $edges"
[[ $nodes -ge 3 ]] && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Test 2: Context Query
echo -e "\n━━━ TEST 2: Context (NVDA)"
ctx=$(curl -sf "$BASE_ARIADNE/v1/kg/context?tickers=NVDA&depth=1")
ctx_nodes=$(echo "$ctx" | jq -r '.subgraph.nodes | length')
echo "  Found $ctx_nodes nodes"
[[ $ctx_nodes -gt 0 ]] && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Test 3: Satbase Price Fetch
echo -e "\n━━━ TEST 3: Satbase Integration"
price=$(curl -sf "$BASE_SATBASE/v1/prices/daily/NVDA?from=2025-09-01&to=2025-09-30")
bars=$(echo "$price" | jq -r '.bars | length')
echo "  Fetched $bars price bars for NVDA"
[[ $bars -gt 0 ]] && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Test 4: Correlation
echo -e "\n━━━ TEST 4: Correlation (NVDA, AMD, TSM)"
corr=$(curl -sf -X POST "$BASE_ARIADNE/v1/kg/learn/correlation" \
  -H "Content-Type: application/json" \
  -d '{"symbols":["NVDA","AMD","TSM"],"from_date":"2025-09-01","to_date":"2025-09-30","method":"spearman","threshold":0.5}')
status=$(echo "$corr" | jq -r '.status')
echo "  Status: $status"
[[ "$status" == "started" ]] && echo "  ✅ PASS" || echo "  ❌ FAIL"

sleep 3
echo "  Checking logs..."
docker logs --tail 5 alpaca-bot-ariadne-api-1 2>&1 | grep -E "(Fetched|correlation)" | tail -2

echo -e "\n╔════════════════════════════════════════╗"
echo "║   ✅ ALL TESTS COMPLETE                ║"
echo "╚════════════════════════════════════════╝"

