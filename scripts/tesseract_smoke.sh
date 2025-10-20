#!/bin/bash
set -e

echo "Tesseract E2E Smoke Test"
echo "========================"

# Test 1: Health check
echo "1. Testing Tesseract API health..."
curl -s http://127.0.0.1:8081/health | jq -e '.status == "ok"'

# Test 2: Semantic search
echo "2. Testing semantic search..."
curl -s -X POST http://127.0.0.1:8081/v1/tesseract/search \
  -H "Content-Type: application/json" \
  -d '{"query":"semiconductor supply chain","limit":5}' \
  | jq -e '.count > 0'

# Test 3: Find similar
echo "3. Testing find similar..."
NEWS_ID=$(curl -s "http://127.0.0.1:8080/v1/news?from=2025-10-01&to=2025-10-19&limit=1" | jq -r '.items[0].id')
curl -s http://127.0.0.1:8081/v1/tesseract/similar/$NEWS_ID | jq -e '.similar_articles | length > 0'

echo "All tests passed!"

