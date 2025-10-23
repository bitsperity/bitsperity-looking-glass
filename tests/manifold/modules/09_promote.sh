#!/bin/bash
# Module 9: Promote & Sync with Ariadne

echo "=== Module 9: Promote & Sync ==="

# Test 1: Promote hypothesis to Ariadne KG
RESP=$(curl -sS -X POST "$BASE_URL/thought/$HYP2/promote" -H "Content-Type: application/json" -d '{
  "auto_mark": true,
  "relation_type": "RELATES_TO",
  "source_entity_id": "ASML",
  "target_entity_id": "TSM"
}')
test_json_field "Promote to KG - status" "$RESP" ".status" "ready"

# Test 2: Verify thought was marked as promoted
RESP=$(curl -sS "$BASE_URL/thought/$HYP2")
PROMOTED_FLAG=$(echo "$RESP" | jq -r '.flags.promoted_to_kg')
test_case "Thought marked as promoted" "true" "$PROMOTED_FLAG"

# Test 3: Sync validation status from Ariadne
RESP=$(curl -sS -X POST "$BASE_URL/sync/ariadne" -H "Content-Type: application/json" -d "{
  \"thought_id\": \"$HYP2\",
  \"status\": \"validated\",
  \"ariadne_fact_id\": \"fact_001\",
  \"ariadne_entity_ids\": [\"hyp_asml_001\"]
}")
test_json_field "Sync validation - status" "$RESP" ".status" "synced"
test_json_field "Sync validation - thought_id" "$RESP" ".thought_id" "$HYP2"

# Test 4: Verify sync updated the thought
RESP=$(curl -sS "$BASE_URL/thought/$HYP2")
ARIADNE_FACTS_COUNT=$(echo "$RESP" | jq -r '.links.ariadne_facts | length // 0')
TOTAL=$((TOTAL + 1))
if [ "$ARIADNE_FACTS_COUNT" -gt 0 ]; then
    echo "✅ Ariadne fact ID synced (count: $ARIADNE_FACTS_COUNT)"
    PASSED=$((PASSED + 1))
else
    echo "❌ Ariadne fact ID not synced"
    FAILED=$((FAILED + 1))
fi

echo ""

