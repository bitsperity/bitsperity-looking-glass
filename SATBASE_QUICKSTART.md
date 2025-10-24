# Satbase Quick Start: Von 0% auf 100%

## 🎯 Problem
- ❌ FRED Data: LEER
- ❌ Watchlist: Passive
- ❌ Topics: Passive
- ❌ Agent: Muss alles manuell triggern

## ✅ Lösung (30 Minuten)

### 1. FRED API Key Setup (5 min)

```bash
# 1. Get FREE API Key from FRED
#    https://fred.stlouisfed.org/docs/api/api_key.html

# 2. Add to config
vim libs/satbase_core/config/sources.yaml
```

Add:
```yaml
fred:
  api_key: YOUR_FRED_API_KEY_HERE
```

### 2. Populate Core Indicators (15 min)

```bash
# This will fetch 28 most important economic indicators
python3 scripts/populate_core_fred.py
```

**Was wird geholt:**
- GDP, Employment, Inflation
- Interest Rates, Money Supply
- VIX, Oil, Consumer Sentiment
- Manufacturing, Housing

**Danach**: Agent hat sofort alle Macro-Daten!

### 3. Test FRED via MCP (2 min)

```typescript
// In Cursor with Satbase MCP
await satbase.fredSearch({q: "GDP", limit: 5});
// ✅ Returns GDP, GDPC1, GDPPOT, ...

await satbase.fredObservations({
  series_id: "GDP",
  from: "2024-01-01",
  to: "2024-12-31"
});
// ✅ Returns actual quarterly GDP values!
```

### 4. Setup Watchlist (5 min)

```bash
# Add important tickers
curl -X POST http://localhost:8080/v1/watchlist \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["NVDA", "AMD", "AAPL", "MSFT", "GOOGL", "META", "AMZN", "TSLA"], "ttl_days": 365}'
```

### 5. Verify Coverage (3 min)

```bash
# Check what data exists
curl http://localhost:8080/v1/news?from=2025-10-01&to=2025-10-24&limit=1 | jq '.total'
# Should show thousands of articles

curl http://localhost:8080/v1/prices/daily/NVDA?from=2025-10-01&to=2025-10-24 | jq '.count'
# Should show ~20 days of data

curl http://localhost:8080/v1/macro/fred/series/GDP | jq '.items | length'
# Should show 100+ observations
```

---

## 🚀 Next: Automation

### Daily Refresh Script

Create `scripts/satbase_daily_refresh.sh`:

```bash
#!/bin/bash
# Run daily at 7:00 UTC via cron

WATCHLIST=$(curl -s http://localhost:8080/v1/watchlist | jq -r '.items[].symbol')

for ticker in $WATCHLIST; do
  echo "Refreshing $ticker..."
  
  # Fetch latest prices
  curl -X POST http://localhost:8080/v1/ingest/prices/daily \
    -H "Content-Type: application/json" \
    -d "{\"tickers\": [\"$ticker\"]}"
  
  # Fetch latest news
  curl -X POST http://localhost:8080/v1/ingest/news \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$ticker\", \"hours\": 24}"
done

echo "✅ Watchlist refreshed!"
```

Add to crontab:
```bash
0 7 * * * /home/sascha-laptop/alpaca-bot/scripts/satbase_daily_refresh.sh
```

---

## 📊 Verification Checklist

After setup, verify:

- [ ] `fred-search` findet Indicators
- [ ] `fred-observations` liefert echte Werte
- [ ] `list-news` zeigt Tausende Artikel
- [ ] `list-prices` liefert OHLCV Daten
- [ ] `get-watchlist` zeigt deine Tickers
- [ ] `get-topics` ist leer (noch)

**Wenn alle ✅ → Satbase ist READY!** 🎉

---

## 🔮 Future Enhancements

Nach diesem Quick Start:

### Week 1: Intelligence
- [ ] News Trending Endpoint
- [ ] Ticker Co-mention Analysis
- [ ] Sentiment Tracking

### Week 2: Autonomy
- [ ] Event Detection (Earnings, Fed)
- [ ] Alert System
- [ ] Smart Backfill

### Week 3: Integration
- [ ] Tesseract: Semantic News Search
- [ ] Manifold: Store Trading Insights
- [ ] Ariadne: Build Knowledge Graph

**End Goal**: Agent baut automatisch ein World Model! 🌍

---

## 💡 Pro Tips

1. **FRED ist KOSTENLOS**: Unbegrenzte API Calls
2. **News Bodies**: Für Deep Analysis `include_body=true` + `content_format=text`
3. **Watchlist TTL**: Setze auf 365 Tage für Core Holdings
4. **Job Monitoring**: Check `/v1/ingest/jobs` für Status

---

## 🆘 Troubleshooting

### "FRED returns empty"
→ Run `python3 scripts/populate_core_fred.py`

### "News are old"
→ Trigger backfill: `POST /v1/ingest/news/backfill`

### "Prices missing"
→ Add to watchlist: `POST /v1/watchlist`

### "Jobs stuck"
→ Cleanup: `POST /v1/ingest/jobs/cleanup`

---

**Ready? Los geht's!** 🚀

