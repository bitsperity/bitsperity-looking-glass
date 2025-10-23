#!/bin/bash
# Module 3: CRUD Operations

echo "=== Module 3: CRUD Operations ==="

# Test: GET thought by ID
RESP=$(curl -sS "$BASE_URL/thought/$OBS1")
test_json_field "GET thought - correct ID" "$RESP" ".id" "$OBS1"
test_json_field "GET thought - correct type" "$RESP" ".type" "observation"
test_json_field "GET thought - has status" "$RESP" ".status" "active"

# Test: PATCH thought (update confidence)
RESP=$(curl -sS -X PATCH "$BASE_URL/thought/$HYP1" -H "Content-Type: application/json" -d '{
  "confidence_score": 0.68,
  "content": "Updated: As AMD MI300X and Google TPU v5 gain share, NVIDIA will face pricing pressure. Recent MSFT Azure data suggests MI300X capturing 15-20% of new inference deployments."
}')
test_json_field "PATCH thought - updated" "$RESP" ".status" "updated"

# Verify update by fetching thought again
RESP=$(curl -sS "$BASE_URL/thought/$HYP1")
test_json_field "PATCH thought - confidence updated" "$RESP" ".confidence_score" "0.68"

# Test: DELETE thought (create temp & delete)
TEMP_ID=$(curl -sS -X POST "$BASE_URL/thought" -H "Content-Type: application/json" -d '{
  "type": "observation",
  "agent_id": "trader_1",
  "title": "Temp thought for deletion test",
  "content": "This will be deleted"
}' | jq -r '.thought_id')

RESP=$(curl -sS -X DELETE "$BASE_URL/thought/$TEMP_ID?soft=true")
test_json_field "DELETE thought - status" "$RESP" ".status" "deleted"

# Verify deletion (soft delete means status=deleted or inactive)
RESP=$(curl -sS "$BASE_URL/thought/$TEMP_ID")
DELETED_STATUS=$(echo "$RESP" | jq -r '.status // "not_found"')
TOTAL=$((TOTAL + 1))
if [ "$DELETED_STATUS" = "deleted" ] || [ "$DELETED_STATUS" = "inactive" ] || [ "$DELETED_STATUS" = "not_found" ]; then
    echo "✅ Thought deleted (status: $DELETED_STATUS)"
    PASSED=$((PASSED + 1))
else
    echo "❌ Thought not deleted (status: $DELETED_STATUS)"
    FAILED=$((FAILED + 1))
fi

echo ""

