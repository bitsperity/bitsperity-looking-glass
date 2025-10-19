#!/usr/bin/env bash
set -euo pipefail

API="http://localhost:8080"
FROM_DATE="$(date -d 'yesterday' +%F 2>/dev/null || date -v-1d +%F 2>/dev/null || date +%F)"
TO_DATE="$(date +%F)"

echo "[e2e] start api"
docker compose up -d --force-recreate satbase-api >/dev/null
sleep 4
curl -fsS "$API/health" >/dev/null

echo "[e2e] seed watchlist"
curl -fsS -X POST -H 'Content-Type: application/json' \
  -d '{"symbols":["NVDA","AAPL","TSM"],"ingest":false}' \
  "$API/v1/watchlist" >/dev/null || true

echo "[e2e] topics ingest"
TOPICS='{"queries":["NVDA","NVIDIA","TSM","Taiwan Semiconductor"],"ingest":true,"hours":12}'
TRESP="$(curl -fsS -X POST -H 'Content-Type: application/json' -d "$TOPICS" "$API/v1/news/topics")"
echo "$TRESP" | jq -r '.job_ids[]' >/tmp/e2e_news_jobs.txt || true
if [ -s /tmp/e2e_news_jobs.txt ]; then
  while read -r J; do
    for _ in $(seq 1 30); do
      S="$(curl -fsS "$API/v1/ingest/jobs/$J" | jq -r .status)"
      if [ "$S" = "done" ] || [ "$S" = "error" ]; then break; fi
      sleep 2
    done
  done </tmp/e2e_news_jobs.txt
fi

echo "[e2e] prices ingest"
PRESP="$(curl -fsS -X POST -H 'Content-Type: application/json' -d '{"tickers":["NVDA","AAPL","TSM","BTCUSD"]}' "$API/v1/ingest/prices/daily")"
PJ="$(echo "$PRESP" | jq -r .job_id)"
for _ in $(seq 1 20); do
  S="$(curl -fsS "$API/v1/ingest/jobs/$PJ" | jq -r .status)"
  if [ "$S" = "done" ] || [ "$S" = "error" ]; then break; fi
  sleep 2
done

echo "[e2e] macro ingest"
MRESP="$(curl -fsS -X POST -H 'Content-Type: application/json' -d '{"series":["CPIAUCSL","UNRATE","FEDFUNDS"]}' "$API/v1/ingest/macro/fred")"
MJ="$(echo "$MRESP" | jq -r .job_id)"
for _ in $(seq 1 20); do
  S="$(curl -fsS "$API/v1/ingest/jobs/$MJ" | jq -r .status)"
  if [ "$S" = "done" ] || [ "$S" = "error" ]; then break; fi
  sleep 2
done

echo "[e2e] check 202 on ingest endpoints"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{"tickers":["NVDA"]}' "$API/v1/ingest/prices/daily"); echo prices_ingest_status=$code; [ "$code" = "202" ]
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{"series":["UNRATE"]}' "$API/v1/ingest/macro/fred"); echo macro_ingest_status=$code; [ "$code" = "202" ]
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{"query":"NVDA"}' "$API/v1/ingest/news"); echo news_ingest_status=$code; [ "$code" = "202" ]

echo "--- NEWS (general) ---"
curl -fsS "$API/v1/news?from=$FROM_DATE&to=$TO_DATE&limit=3" | jq '{count: (.items|length), sample: (.items[0]//null)|{source,title,tickers}}'

echo "--- NEWS (tickers=NVDA,TSM) ---"
curl -fsS "$API/v1/news?from=$FROM_DATE&to=$TO_DATE&tickers=NVDA,TSM&limit=5" | jq '{count: (.items|length), first: (.items[0]//null)|{source,title,tickers}}'

echo "--- PRICES single (USD) ---"
curl -fsS "$API/v1/prices/daily/NVDA?from=$FROM_DATE&to=$TO_DATE" | jq '.ticker, (.bars|length)'

echo "--- PRICES single (BTC view) ---"
curl -fsS "$API/v1/prices/daily/NVDA?from=$FROM_DATE&to=$TO_DATE&btc_view=true" | jq '.btc_view, (.bars|length)'

echo "--- PRICES multi (USD) ---"
curl -fsS "$API/v1/prices/daily?tickers=NVDA,AAPL&from=$FROM_DATE&to=$TO_DATE" | jq '.tickers, (.series.NVDA|length), (.series.AAPL|length)'

echo "--- PRICES multi (BTC view) ---"
curl -fsS "$API/v1/prices/daily?tickers=NVDA,AAPL&from=$FROM_DATE&to=$TO_DATE&btc_view=true" | jq '.btc_view, (.series.NVDA|length), (.series.AAPL|length)'

echo "--- CONVERT ---"
curl -fsS "$API/v1/convert/usd-to-btc?value=100000&on=$TO_DATE"; echo
curl -fsS "$API/v1/convert/btc-to-usd?value=1.5&on=$TO_DATE"; echo

echo "--- MACRO ---"
curl -fsS "$API/v1/macro/fred/series/UNRATE?from=2024-01-01&to=$TO_DATE" | jq '.series_id, (.items|length)'

echo "--- FETCH-ON-MISS (prices) ---"
code=$(curl -s -o /tmp/miss_prices.json -w "%{http_code}" "$API/v1/prices/daily/FAKE?from=$FROM_DATE&to=$TO_DATE"); echo prices_miss_status=$code; cat /tmp/miss_prices.json | jq -r .status | grep -q fetch_on_miss

echo "--- FETCH-ON-MISS (macro) ---"
code=$(curl -s -o /tmp/miss_macro.json -w "%{http_code}" "$API/v1/macro/fred/series/FAKE_SERIES?from=2024-01-01&to=$TO_DATE"); echo macro_miss_status=$code; cat /tmp/miss_macro.json | jq -r .status | grep -q fetch_on_miss

echo "--- WATCHLIST roundtrip ---"
curl -fsS "$API/v1/watchlist" | jq '.count'
curl -fsS -X POST -H 'Content-Type: application/json' -d '{"symbols":["MSFT"],"ingest":false}' "$API/v1/watchlist" | jq '.added[0].symbol'
curl -fsS -X DELETE "$API/v1/watchlist/MSFT" | jq '.removed'

echo "--- TOPICS roundtrip ---"
curl -fsS "$API/v1/news/topics" | jq '.count'
curl -fsS -X POST -H 'Content-Type: application/json' -d '{"queries":["NVIDIA"],"ingest":false}' "$API/v1/news/topics" | jq '.added[0].query'
curl -fsS -X DELETE "$API/v1/news/topics/NVIDIA" | jq '.removed'

echo "[e2e] done"


