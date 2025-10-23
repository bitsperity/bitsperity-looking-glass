#!/bin/bash
# Module 1: Health & Configuration

echo "=== Module 1: Health & Configuration ==="

# Test 1: Health check
RESP=$(curl -sS "$BASE_URL/health")
test_json_field "Health status" "$RESP" ".status" "ok"
test_json_field "Qdrant connected" "$RESP" ".qdrant_connected" "true"

# Test 2: Config check
RESP=$(curl -sS "$BASE_URL/config")
test_json_field "Config status" "$RESP" ".status" "ok"
test_json_field "Collection name set" "$RESP" ".collection_name" "manifold_thoughts"

echo ""

