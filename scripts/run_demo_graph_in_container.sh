#!/bin/bash

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       ARIADNE DEMO GRAPH - CONTAINER EXECUTION              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Find the ariadne container
CONTAINER_NAME=$(docker ps --filter "name=ariadne" --format "{{.Names}}" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Error: No running Ariadne container found!"
    echo ""
    echo "Please start the Ariadne API first:"
    echo "  cd apps/ariadne_api"
    echo "  docker compose up -d"
    exit 1
fi

echo "✓ Found Ariadne container: $CONTAINER_NAME"
echo ""

# Copy the script to the container
echo "📋 Copying demo script to container..."
docker cp scripts/create_ariadne_demo_graph.py $CONTAINER_NAME:/tmp/create_demo_graph.py

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to copy script to container"
    exit 1
fi

echo "✓ Script copied successfully"
echo ""

# Execute the script in the container
echo "🚀 Executing demo graph creation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec $CONTAINER_NAME python /tmp/create_demo_graph.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error: Script execution failed"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Demo graph created successfully!"
echo ""
echo "Next Steps:"
echo "  → Open Frontend: http://localhost:3000/ariadne/dashboard"
echo "  → Try Context Graph: http://localhost:3000/ariadne/context?topic=AI"
echo "  → View Timeline: http://localhost:3000/ariadne/timeline?ticker=NVDA"
echo "  → Explore Graph: http://localhost:3000/ariadne/graph"
echo ""

