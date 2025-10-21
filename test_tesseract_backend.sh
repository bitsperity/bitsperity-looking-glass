#!/bin/bash
set -e

TESS="http://127.0.0.1:8081"
echo "=================================="
echo "TESSERACT BACKEND TEST SUITE"
echo "=================================="
echo ""

# Health check
echo "1. Health Check"
curl -s "$TESS/health" | jq .
echo ""

# List collections (before init)
echo "2. List Collections (before init)"
curl -s "$TESS/v1/admin/collections" | jq .
echo ""

# Init collection
echo "3. Initialize Collection"
curl -s -X POST "$TESS/v1/admin/init-collection" | jq .
echo ""

# Check status
echo "4. Embed Status (after init)"
curl -s "$TESS/v1/admin/embed-status" | jq .
echo ""

# List collections (after init)
echo "5. List Collections (after init)"
curl -s "$TESS/v1/admin/collections" | jq .
echo ""

# Start batch embedding (small window for testing)
echo "6. Start Batch Embedding (2025-10-01 to 2025-10-21)"
curl -s -X POST "$TESS/v1/admin/embed-batch?from_date=2025-10-01&to_date=2025-10-21" | jq .
echo ""

# Wait a bit and check status
echo "7. Waiting 5s and checking progress..."
sleep 5
curl -s "$TESS/v1/admin/embed-status" | jq .
echo ""

# Wait for completion (max 60s)
echo "8. Monitoring embedding progress (max 60s)..."
for i in {1..12}; do
    STATUS=$(curl -s "$TESS/v1/admin/embed-status" | jq -r .status)
    if [ "$STATUS" = "done" ] || [ "$STATUS" = "error" ]; then
        echo "   Status: $STATUS"
        break
    fi
    PROGRESS=$(curl -s "$TESS/v1/admin/embed-status" | jq -r .percent)
    echo "   Progress: $PROGRESS%"
    sleep 5
done
echo ""

# Final status
echo "9. Final Embed Status"
curl -s "$TESS/v1/admin/embed-status" | jq .
echo ""

# Test search
echo "10. Semantic Search: 'NVIDIA AI chip supply'"
curl -s -X POST "$TESS/v1/tesseract/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"NVIDIA AI chip supply","limit":3}' | jq .
echo ""

# Get first result ID and test similar
echo "11. Find Similar Articles"
FIRST_ID=$(curl -s -X POST "$TESS/v1/tesseract/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"NVIDIA AI chip supply","limit":1}' | jq -r .results[0].id)
echo "   Source ID: $FIRST_ID"
curl -s "$TESS/v1/tesseract/similar/$FIRST_ID?limit=3" | jq .
echo ""

# Test multilingual search (German)
echo "12. Multilingual Search (DE): 'Halbleiter Lieferengpässe'"
curl -s -X POST "$TESS/v1/tesseract/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"Halbleiter Lieferengpässe","limit":3}' | jq .
echo ""

# Test multilingual search (Chinese)
echo "13. Multilingual Search (ZH): '芯片供应链'"
curl -s -X POST "$TESS/v1/tesseract/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"芯片供应链","limit":3}' | jq .
echo ""

# Test search with filters
echo "14. Search with Date Filter (last 7 days)"
TO_DATE=$(date +%Y-%m-%d)
FROM_DATE=$(date -d '7 days ago' +%Y-%m-%d)
curl -s -X POST "$TESS/v1/tesseract/search" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"semiconductor\",\"filters\":{\"from\":\"$FROM_DATE\",\"to\":\"$TO_DATE\"},\"limit\":3}" | jq .
echo ""

echo "=================================="
echo "TEST SUITE COMPLETE"
echo "=================================="

