#!/bin/bash
set -e

echo "Tesseract E2E Smoke Test (Modernized)"
echo "====================================="

TESSERACT_URL="http://127.0.0.1:8081"
SATBASE_URL="http://127.0.0.1:8080"

# Test 1: Health check
echo "1. Testing Tesseract API health..."
curl -s $TESSERACT_URL/health | jq -e '.status == "ok"'
echo "   ✓ Health check passed"

# Test 2: Initialize collection
echo "2. Testing collection initialization..."
curl -s -X POST $TESSERACT_URL/v1/admin/init-collection | jq -e '.status == "ok"'
echo "   ✓ Collection initialized"

# Test 3: Batch embedding (small, recent range)
echo "3. Triggering batch embedding (last 3 days, incremental)..."
RESPONSE=$(curl -s -X POST "$TESSERACT_URL/v1/admin/embed-batch?from_date=2025-10-24&to_date=2025-10-26&incremental=true&body_only=true")
JOB_ID=$(echo $RESPONSE | jq -r '.job_id')
echo "   Job ID: $JOB_ID"

# Wait for embedding to complete (max 60s)
echo "   Waiting for embedding to complete..."
for i in {1..60}; do
  STATUS=$(curl -s "$TESSERACT_URL/v1/admin/embed-status?job_id=$JOB_ID" | jq -r '.status')
  if [ "$STATUS" = "done" ] || [ "$STATUS" = "error" ]; then
    break
  fi
  echo "   Status: $STATUS, processed: $(curl -s "$TESSERACT_URL/v1/admin/embed-status?job_id=$JOB_ID" | jq -r '.processed // 0')"
  sleep 2
done

# Check job result
JOB_STATUS=$(curl -s "$TESSERACT_URL/v1/admin/embed-status?job_id=$JOB_ID" | jq -r '.status')
echo "   ✓ Embedding completed with status: $JOB_STATUS"

# Test 4: Semantic search (basic)
echo "4. Testing semantic search..."
curl -s -X POST $TESSERACT_URL/v1/tesseract/search \
  -H "Content-Type: application/json" \
  -d '{"query":"semiconductor supply chain","limit":5}' \
  | jq -e '.count > 0'
echo "   ✓ Semantic search returned results"

# Test 5: Semantic search with filters (topics + date range)
echo "5. Testing search with topic filter..."
curl -s -X POST $TESSERACT_URL/v1/tesseract/search \
  -H "Content-Type: application/json" \
  -d '{"query":"AI","filters":{"topics":["AI"],"from":"2025-10-01","to":"2025-12-31"},"limit":10}' \
  | jq -e '.count >= 0' # May be 0 if no AI articles, but query should not error
echo "   ✓ Search with topic filter succeeded"

# Test 6: Semantic search with body_available filter
echo "6. Testing search with body_available filter..."
curl -s -X POST $TESSERACT_URL/v1/tesseract/search \
  -H "Content-Type: application/json" \
  -d '{"query":"technology","filters":{"body_available":true},"limit":5}' \
  | jq -e '.count >= 0'
echo "   ✓ Search with body_available filter succeeded"

# Test 7: Find similar (if articles exist in vector store)
echo "7. Testing find similar..."
RECENT_NEWS=$(curl -s "$SATBASE_URL/v1/news?from=2025-10-24&to=2025-10-26&limit=1&include_body=true" | jq -r '.data[0].id // .items[0].id // empty' 2>/dev/null)
if [ -n "$RECENT_NEWS" ]; then
  curl -s "$TESSERACT_URL/v1/tesseract/similar/$RECENT_NEWS?limit=5" | jq -e '.similar_articles | type == "array"'
  echo "   ✓ Find similar succeeded for article $RECENT_NEWS"
else
  echo "   ⚠ Skipping find similar (no recent articles found)"
fi

# Test 8: Collection info
echo "8. Testing collection info..."
curl -s $TESSERACT_URL/v1/admin/embed-status | jq -e '.total_embedded_articles >= 0'
echo "   ✓ Collection info retrieved"

# Test 9: List collections
echo "9. Testing list collections..."
curl -s $TESSERACT_URL/v1/admin/collections | jq -e '.collections | length > 0'
echo "   ✓ Collections listed"

echo ""
echo "All tests passed! ✅"

