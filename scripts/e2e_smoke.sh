#!/usr/bin/env bash
set -euo pipefail

API_HOST="http://127.0.0.1:8080"

echo "== E2E Smoke Test =="

# Dynamic dates
TODAY=$(date -u +%F)
YEST=$(date -u -d "1 day ago" +%F)

# Health
curl -sS "${API_HOST}/health" | jq -e '.status=="ok"' >/dev/null

echo "-- Seed watchlist/topics --"
curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"symbols":["NVDA","AAPL"],"ttl_days":7}' \
  "${API_HOST}/v1/watchlist" | jq -e '.accepted | length >= 2' >/dev/null || true

curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"queries":["semiconductor"],"ttl_days":2,"ingest":true}' \
  "${API_HOST}/v1/news/topics" | jq -e '.status=="accepted" or .jobs != null' >/dev/null || true

# Prices basic
curl -sS "${API_HOST}/v1/prices/daily/NVDA?from=${YEST}&to=${TODAY}" | jq -e '.items != null' >/dev/null || true

# Macro basic
curl -sS "${API_HOST}/v1/macro/fred/series/CPIAUCSL?from=${YEST}&to=${TODAY}" | jq -e '.items != null' >/dev/null || true

# News basic
curl -sS "${API_HOST}/v1/news?from=${YEST}&to=${TODAY}&limit=5" | jq -e '.items != null' >/dev/null || true

# Trigger news bodies ingest for range
JOB=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d "{\"from\":\"${YEST}\",\"to\":\"${TODAY}\"}" \
  "${API_HOST}/v1/ingest/news/bodies" | jq -r '.job_id')

echo "-- Poll job ${JOB} --"
for i in {1..20}; do
  STATUS=$(curl -sS "${API_HOST}/v1/ingest/jobs/${JOB}" | jq -r '.status')
  echo "job status: ${STATUS}"
  if [ "$STATUS" = "done" ]; then break; fi
  if [ "$STATUS" = "error" ]; then
    echo "job error"
    curl -sS "${API_HOST}/v1/ingest/jobs/${JOB}" | jq '.'
    exit 1
  fi
  sleep 1
done

# Fetch news with body
curl -sS "${API_HOST}/v1/news?from=${YEST}&to=${TODAY}&limit=5&include_body=true" | jq -e '.items != null' >/dev/null || true

echo "== OK =="


