#!/bin/bash
# Module 10: Admin & Advanced Operations

echo "=== Module 10: Admin & Advanced Operations ==="

# Test 1: Get thought history
RESP=$(curl -sS "$BASE_URL/thought/$HYP1/history")
test_count "Thought history - versions" "$RESP" ".versions | length" "1"

# Test 2: Reembed thought
RESP=$(curl -sS -X POST "$BASE_URL/thought/$OBS1/reembed" -H "Content-Type: application/json" -d '{
  "vectors": ["text", "title"],
  "force": true
}')
test_json_field "Reembed thought - status" "$RESP" ".status" "reembedded"

# Test 3: Find similar thoughts (should find multiple HBM/memory-related thoughts)
RESP=$(curl -sS "$BASE_URL/similar/$HYP4")
SIMILAR_COUNT=$(echo "$RESP" | jq -r '.similar | length // 0')
test_count "Similar thoughts - HBM hypothesis" "$RESP" ".similar | length" "1"

# Test 4: Quarantine thought
RESP=$(curl -sS -X POST "$BASE_URL/thought/$Q1/quarantine" -H "Content-Type: application/json" -d '{
  "reason": "Low quality question - needs refinement"
}')
test_json_field "Quarantine thought - status" "$RESP" ".status" "quarantined"

# Verify quarantine
RESP=$(curl -sS "$BASE_URL/thought/$Q1")
QUARANTINED=$(echo "$RESP" | jq -r '.flags.quarantined // false')
test_case "Thought quarantined" "true" "$QUARANTINED"

# Test 5: Unquarantine thought
RESP=$(curl -sS -X POST "$BASE_URL/thought/$Q1/unquarantine")
test_json_field "Unquarantine thought - status" "$RESP" ".status" "unquarantined"

# Verify unquarantine
RESP=$(curl -sS "$BASE_URL/thought/$Q1")
UNQUARANTINED=$(echo "$RESP" | jq -r '.flags.quarantined // false')
test_case "Thought unquarantined" "false" "$UNQUARANTINED"

# Test 6: Get trash (deleted thoughts)
RESP=$(curl -sS "$BASE_URL/trash")
test_count "Trash - deleted thoughts" "$RESP" ".thoughts | length" "1"

# Test 7: Reindex with filters
RESP=$(curl -sS -X POST "$BASE_URL/reindex" -H "Content-Type: application/json" -d '{
  "filters": {},
  "vectors": ["text"],
  "dry_run": true
}')
test_json_field "Reindex (dry run) - status" "$RESP" ".status" "ok"
test_count "Reindex - thoughts to reindex" "$RESP" ".would_reindex" "1"

# Test 8: Dedupe check
RESP=$(curl -sS -X POST "$BASE_URL/dedupe" -H "Content-Type: application/json" -d '{
  "filters": {},
  "strategy": "semantic"
}')
test_json_field "Dedupe check - status" "$RESP" ".status" "ok"

echo ""

