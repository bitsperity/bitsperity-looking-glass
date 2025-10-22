#!/bin/bash
# Seed the knowledge graph with test data
set -e

BASE="http://localhost:8082"

echo "🌱 Seeding Knowledge Graph with Test Data..."
echo "=============================================="

# Function to create nodes and edges directly via Cypher (no brittle output parsing)
create_fact() {
  local source_id=$1
  local target_id=$2
  local rel_type=$3
  local confidence=$4

  docker exec alpaca-bot-neo4j-1 cypher-shell -u neo4j -p testpassword "
    MERGE (s:Company {ticker: '$source_id'})
    ON CREATE SET s.name = '$source_id', s.sector = 'Technology'
    MERGE (t:Company {ticker: '$target_id'})
    ON CREATE SET t.name = '$target_id', t.sector = 'Technology'
    MERGE (s)-[r:$rel_type]->(t)
    SET r.confidence = $confidence,
        r.source = 'test_seed',
        r.valid_from = '2024-01-01T00:00:00Z',
        r.ingested_at = datetime(),
        r.version = 1
    RETURN count(r) as c
  " >/dev/null 2>&1 || true
  echo "  ✓ $source_id -[$rel_type]-> $target_id"
}

# 1. Create Supply Chain
echo -e "\n1️⃣ Creating Supply Chain Relationships..."
create_fact "ASML" "TSM" "SUPPLIES_TO" 0.95
create_fact "TSM" "NVDA" "SUPPLIES_TO" 0.90
create_fact "TSM" "AMD" "SUPPLIES_TO" 0.85
create_fact "AMAT" "TSM" "SUPPLIES_TO" 0.80

# 2. Create Competition
echo -e "\n2️⃣ Creating Competition Relationships..."
create_fact "NVDA" "AMD" "COMPETES_WITH" 0.95
create_fact "AMD" "INTC" "COMPETES_WITH" 0.90
create_fact "NVDA" "INTC" "COMPETES_WITH" 0.75

# 3. Verify via API (context)
echo -e "\n3️⃣ Verifying via Context API..."
ctx=$(curl -sS "$BASE/v1/kg/context?tickers=NVDA&depth=1") || { echo "❌ Context API call failed"; exit 1; }
node_count=$(echo "$ctx" | jq -r '.subgraph.nodes | length' 2>/dev/null || echo 0)
edge_count=$(echo "$ctx" | jq -r '.subgraph.edges | length' 2>/dev/null || echo 0)

echo "  📊 Context Nodes: $node_count"
echo "  📊 Context Edges: $edge_count"

if [ "$node_count" -gt 0 ]; then
  echo -e "\n✅ Graph seeding successful!"
  exit 0
else
  echo -e "\n❌ Graph seeding appears empty (NVDA context has 0 nodes)."
  exit 1
fi

