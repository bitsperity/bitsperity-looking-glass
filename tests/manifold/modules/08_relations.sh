#!/bin/bash
# Module 8: Thought Relations

echo "=== Module 8: Thought Relations ==="

# Test 1: Create relation (OBS1 supports HYP1)
RESP=$(curl -sS -X POST "$BASE_URL/thought/$OBS1/related" -H "Content-Type: application/json" -d "{
  \"related_id\": \"$HYP1\",
  \"relation_type\": \"supports\",
  \"weight\": 0.85
}")
test_json_field "Create relation - status" "$RESP" ".status" "linked"

# Test 2: Create another relation (OBS2 contradicts HYP1)
RESP=$(curl -sS -X POST "$BASE_URL/thought/$OBS2/related" -H "Content-Type: application/json" -d "{
  \"related_id\": \"$HYP1\",
  \"relation_type\": \"contradicts\",
  \"weight\": 0.62
}")
test_json_field "Create contradicting relation - status" "$RESP" ".status" "linked"

# Test 3: Create analysis -> decision relation
RESP=$(curl -sS -X POST "$BASE_URL/thought/$ANAL1/related" -H "Content-Type: application/json" -d "{
  \"related_id\": \"$DEC1\",
  \"relation_type\": \"followup\",
  \"weight\": 0.92
}")
test_json_field "Create followup relation - status" "$RESP" ".status" "linked"

# Test 4: Get related thoughts
RESP=$(curl -sS "$BASE_URL/thought/$HYP1/related")
test_count "Get related - incoming relations" "$RESP" ".incoming | length" "1"

# Test 5: Delete relation
RESP=$(curl -sS -X DELETE "$BASE_URL/thought/$OBS2/related/$HYP1")
test_json_field "Delete relation - status" "$RESP" ".status" "unlinked"

# Verify deletion
RESP=$(curl -sS "$BASE_URL/thought/$HYP1/related")
REMAINING=$(echo "$RESP" | jq '[.incoming[] | select(.from_id == "'$OBS2'")] | length')
test_case "Relation deleted" "0" "$REMAINING"

echo ""

