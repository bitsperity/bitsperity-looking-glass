#!/bin/bash
# Populate Core FRED Indicators via Satbase API
#
# This script triggers ingestion for all 28 core FRED series
# by calling the Satbase ingest endpoint.

set -e

SATBASE_URL="${SATBASE_URL:-http://localhost:8080}"

# Core FRED series
SERIES=(
  # GDP & Growth
  "GDP" "GDPC1" "GDPPOT"
  # Employment
  "UNRATE" "PAYEMS" "ICSA"
  # Inflation
  "CPIAUCSL" "PCEPI" "CPILFESL"
  # Interest Rates
  "FEDFUNDS" "DGS10" "DGS2" "T10Y2Y" "MORTGAGE30US"
  # Money Supply
  "M1SL" "M2SL" "WALCL"
  # Markets & Sentiment
  "VIXCLS" "DEXUSEU" "DTWEXBGS"
  # Energy & Commodities
  "DCOILWTICO" "GASREGW"
  # Consumer & Retail
  "RSXFS" "UMCSENT" "PCE"
  # Manufacturing & Production
  "INDPRO" "MANEMP" "HOUST"
)

echo "======================================"
echo "FRED Core Indicators Population"
echo "======================================"
echo "Target: $SATBASE_URL"
echo "Series to ingest: ${#SERIES[@]}"
echo "--------------------------------------"

SUCCESS_COUNT=0
FAIL_COUNT=0

for series in "${SERIES[@]}"; do
  echo -n "Fetching $series... "
  
  # Trigger ingestion via API
  response=$(curl -s -X POST "$SATBASE_URL/v1/ingest/macro/fred" \
    -H "Content-Type: application/json" \
    -d "{\"series\": [\"$series\"]}")
  
  # Check if job_id is present (success)
  if echo "$response" | grep -q "job_id"; then
    job_id=$(echo "$response" | jq -r '.job_id' 2>/dev/null || echo "unknown")
    echo "✅ Queued (Job: $job_id)"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    
    # Give backend time to process
    sleep 0.5
  else
    echo "❌ Failed: $response"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo "--------------------------------------"
echo "✅ Successfully queued: $SUCCESS_COUNT/${#SERIES[@]}"
if [ $FAIL_COUNT -gt 0 ]; then
  echo "❌ Failed: $FAIL_COUNT/${#SERIES[@]}"
fi
echo "======================================"
echo ""
echo "ℹ️  Jobs are processing in background."
echo "Check status: curl $SATBASE_URL/v1/ingest/jobs"
echo ""
echo "Wait ~2 minutes, then test:"
echo "curl '$SATBASE_URL/v1/macro/fred/series/GDP' | jq '.items | length'"
echo "======================================"

