# Ariadne Advanced Decision Suite - Comprehensive Test Guide

## Overview

This guide walks you through running the **exhaustive test suite** for all 7 Advanced Decision Suite endpoints. The test suite includes:

- **Rich test data** with 10+ companies, 13+ relationships, events, observations, hypotheses
- **22 detailed test scenarios** covering all phases (A, B, C, D)
- **Cross-endpoint consistency checks** for data integrity
- **Boundary & validation tests** for robustness
- **Detailed JSON validation** for each response
- **Issue detection** for unstimmigkeiten und Fehler

---

## Prerequisites

1. **Neo4j running** on `bolt://localhost:7687` with password `ariadne2025`
2. **Ariadne API running** on `http://localhost:8082`
3. **Python 3** with `neo4j` library installed
4. **Bash** with `curl`, `jq`, and standard tools

---

## Test Architecture

```
┌─────────────────────────────────────────────┐
│   populate_ariadne_advanced_tests.py        │  Create test data
│  (10 companies, 13 rels, events, etc)       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│   test_ariadne_comprehensive.sh             │  Run tests
│  (22 scenarios, validation, checks)         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │  Generate report    │
        │  with all issues    │
        └─────────────────────┘
```

---

## Quick Start (3 Steps)

### Step 1: Run Comprehensive Test

```bash
chmod +x scripts/test_ariadne_comprehensive.sh
bash scripts/test_ariadne_comprehensive.sh
```

This will:
1. Populate test data automatically
2. Run all 22 test scenarios
3. Validate every response
4. Report pass/fail/warnings

### Step 2: Examine Output

Look for:
- **✅ All tests passed** = Everything working perfectly
- **⚠️ Warnings found** = Minor issues (see details)
- **❌ Tests failed** = Critical issues (investigate immediately)

### Step 3: Fix Issues (if any)

See "Common Issues & Fixes" section below

---

## Test Scenarios

### Phase A: Impact Simulation (Tests 1-4)

| Test | Scenario | Validates |
|------|----------|-----------|
| 1 | Default params (TSLA, exponential) | Basic functionality, score ranges |
| 2 | Linear decay | Decay type correctness |
| 3 | Confidence filtering | Min-confidence threshold |
| 4 | Relationship filtering | Rel-type filtering |

**Key Validations:**
- Impact scores are 0-1 range
- Decay parameter respected
- Filtering applied correctly
- Summary stats calculated

### Phase A: Opportunity Scoring (Tests 5-7)

| Test | Scenario | Validates |
|------|----------|-----------|
| 5 | Default weights | Weight normalization |
| 6 | Custom weights | Custom weight application |
| 7 | Scoring details | Sort order, factor breakdown |

**Key Validations:**
- Weights sum to 1.0
- Scores sorted descending
- All factors present
- Rationale provided

### Phase C: Confidence Propagation (Tests 8-10)

| Test | Scenario | Validates |
|------|----------|-----------|
| 8 | Product mode | Multiplicative aggregation |
| 9 | Min mode | Bottleneck aggregation |
| 10 | Avg mode | Average aggregation |

**Key Validations:**
- Confidence 0-1 range
- Aggregation mode applied
- Summary statistics correct
- All target paths found

### Phase B: Deduplication (Tests 11-14)

| Test | Scenario | Validates |
|------|----------|-----------|
| 11 | Plan discovery | Duplicate detection |
| 12 | Threshold comparison | Threshold effect |
| 13 | Dry-run execution | 404 on invalid nodes |
| 14 | Invalid strategy | 422 validation |

**Key Validations:**
- Duplicates properly detected
- Similarity scores reasonable
- Property diffs shown
- Strategy validation working

### Phase D: Learning Feedback (Tests 15-17)

| Test | Scenario | Validates |
|------|----------|-----------|
| 15 | Dry-run preview | Learning updates shown |
| 16 | Window variation | Time-window respected |
| 17 | History lookup | Audit trail tracking |

**Key Validations:**
- Increases are positive
- Increases capped correctly
- Window applied
- History retrievable

### Validation Tests (Tests 18-20)

| Test | Type | Validates |
|------|------|-----------|
| 18 | Boundary checks | Parameter ranges enforced |
| 19 | Required params | 400 on missing required |
| 20 | Enum validation | 422 on invalid enum |

### Cross-Endpoint Consistency (Tests 21-22)

| Test | Scenario | Validates |
|------|----------|-----------|
| 21 | Node consistency | Same nodes across endpoints |
| 22 | Data alignment | Target counts reasonable |

---

## Test Data Created

```
Companies (10):
  TSLA, NVDA, AAPL, MSFT, SIFY, INTEL, SUPPLIER_A, SUPPLY_CHAIN_HUB
  SIFY_DUPLICATE, SUPPLIER_A_ALT

Relationships (13+):
  High confidence: TSLA→NVDA (0.95), NVDA→INTEL (0.92)
  Medium confidence: AAPL→NVDA (0.75), MSFT→NVDA (0.72)
  Low confidence: TSLA→AAPL (0.45), SUPPLY_CHAIN_HUB→AAPL (0.38)
  Negative impact: SUPPLIER_A→NVDA (HARMS, 0.70)

Events (6):
  SUPPLY_DISRUPTION, EARNINGS, GEOPOLITICAL, PRODUCT_LAUNCH, REGULATORY

Observations (8+):
  Multiple observations for TSLA, NVDA, INTEL, AAPL, SUPPLIER_A

Hypotheses (3):
  Chip shortage persistence, NVIDIA revenue, Intel recovery

Duplicates (2):
  SIFY ≈ SIFY_DUPLICATE
  SUPPLIER_A ≈ SUPPLIER_A_ALT

Gaps (created):
  NVDA has low-confidence relations to AAPL (0.35), MSFT (0.42)

Anomalies (created):
  SUPPLY_CHAIN_HUB has temporal spike (5 new relations)

Learning patterns (created):
  5 repeated TSLA observations across time window
```

---

## Output Format

### Successful Test Run

```
╔════════════════════════════════════════════════════════════════╗
║  ARIADNE ADVANCED DECISION SUITE - COMPREHENSIVE TEST          ║
╚════════════════════════════════════════════════════════════════╝

Step 1: Populating test data...
✓ Graph cleared
✓ Created 10 companies
✓ Created 6 events and 8 observations
✓ Created 13 relationships
✓ Created 3 hypotheses
✓ Created duplicate scenarios
✓ Created gap and anomaly scenarios
✓ Created learning scenario with repeated patterns

✓ Graph Statistics:
  Company: 10
  Event: 6
  Observation: 8
  Hypothesis: 3
  RELATES_TO: 13
  OBSERVED_IN: 13
  ...

────── PHASE A: IMPACT SIMULATION ──────

🧪 Test: Impact (TSLA, depth=3, exponential)
  Endpoint: GET /v1/kg/decision/impact?ticker=TSLA...
  ✓ HTTP 200
  ✓ Source: TSLA
  ✓ Impacts array: [...]
  ✓ Count: 7
  ✓ Max impact: 0.576
  ✓ Avg impact: 0.425

[... more tests ...]

╔════════════════════════════════════════════════════════════════╗
║  ✅ ALL TESTS PASSED - NO ISSUES FOUND                         ║
╚════════════════════════════════════════════════════════════════╝

✓ PASSED:   22
✗ FAILED:   0
⚠ WARNINGS: 0
```

### Test Run with Warnings

```
⚠ PASSED:   21
✗ FAILED:   0
⚠ WARNINGS: 3

  ⚠ Weights don't sum to 1.0: 1.15
  ⚠ Opportunities not sorted descending: 0.68 < 0.72
  ⚠ Gap weight mismatch: expected 0.6, got 0.58
```

---

## Common Issues & Fixes

### Issue 1: "Graph is empty" or "No impacts found"

**Symptom:** All endpoints return count=0

**Cause:** Test data not populated

**Fix:**
```bash
python3 scripts/populate_ariadne_advanced_tests.py
```

### Issue 2: "Weights don't sum to 1.0"

**Symptom:** Weight normalization issue in Opportunities

**Cause:** Floating point precision or weight calculation bug

**Check:**
```bash
curl "http://localhost:8082/v1/kg/decision/opportunities?w_gap=0.3&w_centrality=0.4&w_anomaly=0.3" | jq '.weights'
```

**Expected:** `{"gap": 0.3, "centrality": 0.4, "anomaly": 0.3}` (sums to 1.0)

### Issue 3: "Confidence out of range: 1.5"

**Symptom:** Confidence values exceed 1.0

**Cause:** Capping logic not applied in Learning Feedback

**Check:**
```bash
curl -X POST "http://localhost:8082/v1/kg/admin/learning/apply-feedback" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}' | jq '.learning_updates[].new_confidence'
```

**Expected:** All values ≤ 1.0

### Issue 4: "Invalid JSON response"

**Symptom:** Endpoint returns malformed JSON

**Cause:** Server error or malformed request

**Fix:**
```bash
curl -v "http://localhost:8082/v1/kg/decision/impact?ticker=AAPL" 2>&1 | grep -A 20 "< HTTP"
```

Check server logs:
```bash
docker logs ariadne_api | tail -50
```

### Issue 5: "Missing 'status' field"

**Symptom:** Response doesn't have `.status`

**Cause:** Endpoint returning error without proper structure

**Check:** Response should always have `{"status": "success" | "error", ...}`

---

## Manual Testing (After Automated Tests Pass)

### 1. Test Edge Cases

```bash
# Empty source
curl "http://localhost:8082/v1/kg/decision/impact" \
  -w "\nHTTP: %{http_code}\n"

# Max depth exceeded
curl "http://localhost:8082/v1/kg/decision/impact?ticker=AAPL&max_depth=20" \
  -w "\nHTTP: %{http_code}\n"

# Negative weight
curl "http://localhost:8082/v1/kg/decision/opportunities?w_gap=-0.5" \
  -w "\nHTTP: %{http_code}\n"
```

### 2. Test with Real Data

If you have real data in your graph:

```bash
# List actual companies
curl "http://localhost:8082/v1/kg/search?text=company&limit=5" | jq '.results[].node_name'

# Test Impact with real ticker
curl "http://localhost:8082/v1/kg/decision/impact?ticker=REAL_TICKER" | jq '.count'

# Test Opportunities
curl "http://localhost:8082/v1/kg/decision/opportunities" | jq '.summary'
```

### 3. Check Server Health

```bash
# API health check
curl "http://localhost:8082/health" -w "\nHTTP: %{http_code}\n"

# Neo4j connection
curl "http://localhost:8082/v1/kg/admin/stats" | jq '.total_nodes'
```

---

## Performance Baseline

Expected response times for test data (10 companies, 13 relationships):

| Endpoint | Time | Notes |
|----------|------|-------|
| Impact | 50-150ms | Path expansion |
| Opportunities | 100-200ms | Multiple queries |
| Confidence | 60-150ms | Path aggregation |
| Dedup Plan | 200-500ms | GDS similarity or fallback |
| Learning | 100-300ms | Pattern counting |

If significantly slower, check:
- Neo4j CPU/memory
- Network latency
- Query plan (neo4j logs)

---

## Reporting Issues

If you find issues, include:

1. **Test output** (copy & paste full run)
2. **Specific test that failed**
3. **Expected vs actual result**
4. **Data state** (graph stats):
   ```bash
   curl "http://localhost:8082/v1/kg/admin/stats" | jq '.'
   ```
5. **Server logs**:
   ```bash
   docker logs ariadne_api | tail -100
   ```

---

## Next Steps

Once all tests pass:

1. **Deploy to staging** - Run tests again with staging data
2. **Load test** - Test with 100+ companies, 1000+ relationships
3. **Production validation** - Check with real market data
4. **Monitoring setup** - Add endpoint metrics/logging

---

**Test Suite Status**: Production Ready ✅  
**Last Updated**: 28. Januar 2025  
**Test Coverage**: 22 scenarios, 50+ validations
