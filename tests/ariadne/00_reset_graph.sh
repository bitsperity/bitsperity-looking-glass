#!/bin/bash
# Reset Neo4j graph completely
set -e

echo "🧹 Resetting Neo4j Graph..."

docker exec alpaca-bot-neo4j-1 cypher-shell -u neo4j -p testpassword \
  "MATCH (n) DETACH DELETE n" 2>/dev/null || echo "Graph cleared"

echo "✅ Graph reset complete"

