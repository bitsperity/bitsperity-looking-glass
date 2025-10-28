# Ariadne Advanced Decision Suite

## Overview

The Ariadne Advanced Decision Suite extends the knowledge graph with sophisticated decision-support features:
- **Impact Simulation**: Propagate changes through the graph and measure impact
- **Opportunity Scoring**: Rank nodes by discovery potential (gaps + centrality + anomalies)
- **Confidence Propagation**: Calculate transitive confidence across paths
- **Safe Deduplication**: Detect and merge duplicate nodes with audit trails
- **Learning Feedback**: Automatically adjust confidence based on observation patterns

---

## Phase A: Impact Simulation

### Impact Simulation: `GET /v1/kg/decision/impact`

Simulates how changes to one node propagate through relationships to affect other nodes.

#### Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `ticker` | string | - | - | Company ticker (use one of ticker or node_id) |
| `node_id` | string | - | - | Alternative: element ID of starting node |
| `max_depth` | integer | 3 | 1-5 | Maximum propagation distance |
| `rel_filter` | string | null | - | Relationship filter (e.g., 'AFFECTS\|SUPPLIES_TO') |
| `decay` | string | exponential | linear, exponential | How impact decreases with distance |
| `min_confidence` | float | 0.0 | 0.0-1.0 | Filter low-confidence paths |
| `limit` | integer | 20 | 1-100 | Maximum results |

#### Decay Functions

- **exponential**: `impact = 1.0 * conf₁ * conf₂ * conf₃...` (multiplicative, steep decline)
- **linear**: `impact = 1.0 * (1 - (1 - conf₁) * 0.2) * ...` (gradual decline per hop)

#### Example Queries

```bash
# Find all companies affected by Tesla within 3 hops (exponential decay)
curl "http://localhost:8082/v1/kg/decision/impact?ticker=TSLA&max_depth=3&decay=exponential"

# Find suppliers impacted by Apple's supply chain issues (linear decay)
curl "http://localhost:8082/v1/kg/decision/impact?ticker=AAPL&max_depth=5&rel_filter=SUPPLIES_TO&decay=linear"

# Filter only high-confidence impacts (>0.7)
curl "http://localhost:8082/v1/kg/decision/impact?ticker=NVDA&min_confidence=0.7"
```

#### Response

```json
{
  "status": "success",
  "source": "TSLA",
  "impacts": [
    {
      "target_id": "node123",
      "target_name": "NVDA",
      "target_type": "Company",
      "impact_score": 0.576,
      "depth": 2,
      "path_summary": ["Company", "Company", "Company"]
    }
  ],
  "count": 3,
  "summary": {
    "max_impact": 0.576,
    "avg_impact": 0.425
  }
}
```

---

## Phase A: Opportunity Scoring

### Opportunity Scoring: `GET /v1/kg/decision/opportunities`

Ranks nodes by discovery opportunity combining:
- **Gap Severity**: Ratio of low-confidence relations (unresolved uncertainty)
- **Centrality**: Node importance in the network (degree centrality)
- **Anomaly**: Temporal degree changes (recent spikes in connections)

#### Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `label` | string | Company | - | Node label to analyze |
| `w_gap` | float | 0.3 | 0.0-1.0 | Gap factor weight |
| `w_centrality` | float | 0.4 | 0.0-1.0 | Centrality factor weight |
| `w_anomaly` | float | 0.3 | 0.0-1.0 | Anomaly factor weight |
| `limit` | integer | 15 | 1-50 | Top N opportunities |

#### Scoring Formula

```
opportunity_score = w_gap * gap_severity + w_centrality * norm_centrality + w_anomaly * norm_anomaly
```

#### Example Queries

```bash
# Default weighting: gaps 30%, centrality 40%, anomalies 30%
curl "http://localhost:8082/v1/kg/decision/opportunities"

# Prioritize gaps (suspicious low confidence)
curl "http://localhost:8082/v1/kg/decision/opportunities?w_gap=0.6&w_centrality=0.2&w_anomaly=0.2"

# Prioritize anomalies (unusual temporal patterns)
curl "http://localhost:8082/v1/kg/decision/opportunities?w_gap=0.2&w_centrality=0.3&w_anomaly=0.5"
```

#### Response

```json
{
  "status": "success",
  "label": "Company",
  "weights": {
    "gap": 0.3,
    "centrality": 0.4,
    "anomaly": 0.3
  },
  "opportunities": [
    {
      "node_id": "node456",
      "node_name": "SEMICONDUCTOR_SUPPLY",
      "opportunity_score": 0.685,
      "factors": {
        "gap_severity": 0.75,
        "centrality": 0.82,
        "anomaly": 0.45
      },
      "rationale": [
        "Gap severity: 75% low-confidence relations (6/8)",
        "Centrality: degree 12",
        "Anomaly: 45% degree growth"
      ]
    }
  ],
  "count": 5,
  "summary": {
    "total_analyzed": 45,
    "top_score": 0.685,
    "avg_score": 0.421
  }
}
```

---

## Phase C: Confidence Propagation

### Confidence Propagation: `GET /v1/kg/analytics/confidence/propagate`

Calculates transitive confidence from a source node to targets via all paths.

#### Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `from_ticker` | string | - | - | Source company ticker |
| `from_id` | string | - | - | Alternative: source node ID |
| `to_label` | string | Company | - | Target node label filter |
| `max_depth` | integer | 5 | 1-10 | Maximum path depth |
| `mode` | string | product | product, min, avg | Aggregation method |
| `min_confidence` | float | 0.0 | 0.0-1.0 | Filter low-confidence paths |
| `limit` | integer | 20 | 1-100 | Maximum results |

#### Aggregation Methods

- **product**: `conf = c₁ * c₂ * c₃...` (most conservative, multiplicative decline)
- **min**: `conf = min(c₁, c₂, c₃...)` (very conservative, bottleneck method)
- **avg**: `conf = (c₁ + c₂ + c₃...) / n` (balanced)

#### Example Queries

```bash
# Product mode (most conservative): TSLA -> (0.9) -> NVDA -> (0.8) -> AI-TECH = 0.72
curl "http://localhost:8082/v1/kg/analytics/confidence/propagate?from_ticker=TSLA&to_label=Company&mode=product"

# Min mode (bottleneck): only as confident as weakest link
curl "http://localhost:8082/v1/kg/analytics/confidence/propagate?from_ticker=AAPL&mode=min&max_depth=3"

# Average mode (balanced): more forgiving
curl "http://localhost:8082/v1/kg/analytics/confidence/propagate?from_ticker=MSFT&mode=avg"
```

#### Response

```json
{
  "status": "success",
  "source": "TSLA",
  "target_label": "Company",
  "propagations": [
    {
      "target_id": "node789",
      "target_name": "NVDA",
      "target_type": "Company",
      "confidence": 0.72,
      "depth": 2
    }
  ],
  "count": 12,
  "summary": {
    "max_confidence": 0.85,
    "min_confidence": 0.45,
    "avg_confidence": 0.68,
    "avg_depth": 2.3
  }
}
```

---

## Phase B: Safe Deduplication

### Dedup Plan: `GET /v1/kg/admin/deduplicate/plan`

Detects potential duplicate nodes and previews merge strategy.

#### Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `label` | string | Company | - | Node label to analyze |
| `threshold` | float | 0.85 | 0.0-1.0 | Similarity threshold (Jaccard) |
| `limit` | integer | 20 | 1-100 | Maximum duplicate pairs |

#### Example Queries

```bash
# Find potential company duplicates (85% structural similarity)
curl "http://localhost:8082/v1/kg/admin/deduplicate/plan?label=Company&threshold=0.85"

# Strict deduplication (95% similarity)
curl "http://localhost:8082/v1/kg/admin/deduplicate/plan?threshold=0.95"

# Loose deduplication (70% similarity)
curl "http://localhost:8082/v1/kg/admin/deduplicate/plan?threshold=0.7"
```

#### Response

```json
{
  "status": "success",
  "label": "Company",
  "duplicates": [
    {
      "node1": {
        "id": "id_a",
        "name": "Tesla Inc",
        "type": "Company"
      },
      "node2": {
        "id": "id_b",
        "name": "Tesla Motors",
        "type": "Company"
      },
      "similarity": 0.92,
      "property_differences": {
        "founded_year": {
          "node1": 2003,
          "node2": null
        }
      },
      "recommended_strategy": "prefer_target"
    }
  ],
  "count": 3
}
```

### Dedup Execute: `POST /v1/kg/admin/deduplicate/execute`

Executes merge of two nodes with configurable strategy.

#### Request Body

```json
{
  "source_id": "element_id_of_source_node",
  "target_id": "element_id_of_target_node",
  "strategy": "prefer_target",
  "dry_run": true
}
```

#### Strategies

- **prefer_target**: Keep target, copy missing properties from source
- **prefer_source**: Keep source, overwrite target properties
- **merge_all_properties**: Merge all properties (target prevails on conflicts)

#### Example Queries

```bash
# Dry-run: preview what would happen
curl -X POST "http://localhost:8082/v1/kg/admin/deduplicate/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "id_a",
    "target_id": "id_b",
    "strategy": "prefer_target",
    "dry_run": true
  }'

# Execute: perform actual merge
curl -X POST "http://localhost:8082/v1/kg/admin/deduplicate/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "id_a",
    "target_id": "id_b",
    "strategy": "prefer_target",
    "dry_run": false
  }'
```

#### Response (Dry-Run)

```json
{
  "status": "success",
  "dry_run": true,
  "action": "merge",
  "plan": {
    "source": {
      "name": "Tesla Motors",
      "incoming_rels": 5,
      "outgoing_rels": 12
    },
    "target": {
      "name": "Tesla Inc",
      "incoming_rels": 3,
      "outgoing_rels": 8
    },
    "operations": [
      "Copy missing properties from source to target",
      "Rewire 5 incoming relationships to target",
      "Rewire 12 outgoing relationships to target",
      "Set source.merged_into = target.id (audit trail)",
      "Delete source node"
    ]
  },
  "message": "Dry-run mode: no changes made. Set dry_run=false to execute."
}
```

---

## Phase D: Learning Feedback

### Learning Feedback: `POST /v1/kg/admin/learning/apply-feedback`

Automatically adjusts relationship confidences based on observation patterns.

#### Request Body

```json
{
  "label": "Company",
  "window_days": 30,
  "max_adjust": 0.2,
  "step": 0.05,
  "dry_run": true
}
```

#### Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `label` | string | Company | - | Node label to analyze |
| `window_days` | integer | 30 | 1-365 | Time window for counting occurrences |
| `max_adjust` | float | 0.2 | 0.0-0.5 | Max confidence increase per run |
| `step` | float | 0.05 | 0.01-0.1 | Confidence increase per occurrence |
| `dry_run` | boolean | true | true, false | Preview or execute |

#### Logic

```
confidence_adjustment = min(occurrence_count * step, max_adjust)
new_confidence = min(old_confidence + adjustment, 1.0)
```

#### Example Queries

```bash
# Dry-run: preview which relations would improve
curl -X POST "http://localhost:8082/v1/kg/admin/learning/apply-feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Company",
    "window_days": 30,
    "max_adjust": 0.2,
    "step": 0.05,
    "dry_run": true
  }'

# Execute: actually update confidence scores
curl -X POST "http://localhost:8082/v1/kg/admin/learning/apply-feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Company",
    "window_days": 30,
    "dry_run": false
  }'
```

#### Response (Dry-Run)

```json
{
  "status": "success",
  "dry_run": true,
  "learning_updates": [
    {
      "relation_id": "rel123",
      "source_name": "TSLA",
      "target_name": "NVDA",
      "rel_type": "SUPPLIES_TO",
      "old_confidence": 0.65,
      "new_confidence": 0.80,
      "occurrences": 3
    }
  ],
  "count": 5,
  "summary": {
    "total_relations_to_update": 5,
    "avg_confidence_increase": 0.125,
    "min_increase": 0.05,
    "max_increase": 0.2
  }
}
```

### Learning History: `GET /v1/kg/admin/learning/history`

Retrieve confidence adjustment history for audit and transparency.

#### Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `relation_id` | string | - | - | Element ID of relationship |
| `limit` | integer | 10 | 1-50 | Maximum history entries |

#### Example Query

```bash
curl "http://localhost:8082/v1/kg/admin/learning/history?relation_id=rel123&limit=20"
```

#### Response

```json
{
  "status": "success",
  "relation": {
    "id": "rel123",
    "source": "TSLA",
    "target": "NVDA",
    "type": "SUPPLIES_TO",
    "current_confidence": 0.85,
    "last_adjusted": "2025-01-28T12:30:00Z"
  },
  "adjustments": [
    {
      "timestamp": "2025-01-28T12:30:00Z",
      "old_value": 0.75,
      "new_value": 0.80,
      "reason": "learning_feedback",
      "occurrences": 3
    }
  ],
  "count": 2
}
```

---

## Error Handling

All endpoints implement comprehensive error handling:

### 400 Bad Request
- Missing required parameters (e.g., `ticker` and `node_id` both absent)

### 404 Not Found
- Source/target node does not exist
- Relation not found in history

### 422 Unprocessable Entity
- Parameter out of range (e.g., `max_depth=10` when max is 5)
- Invalid parameter value (e.g., `decay=invalid`)
- Invalid request body (e.g., missing required fields)

### 500 Internal Server Error
- Cypher query execution failure
- Neo4j connection error
- Transaction rollback failure

---

## Performance Considerations

### Scaling

- **Graph Size**: Tested on graphs with 1k-10k nodes
- **Impact Simulation**: `max_depth=5` scans ~5k potential paths
- **Opportunities**: ~100ms for 100-node graph
- **Dedup**: GDS NodeSimilarity O(n²) for node similarity

### Optimization Tips

1. **Use `min_confidence`**: Filter low-confidence paths early
2. **Limit `max_depth`**: Keep to 3-4 for large graphs
3. **Use `rel_filter`**: Restrict to specific relationship types
4. **Batch Dedup**: Process duplicates in batches of 100

---

## Use Cases

### 1. Supply Chain Risk Assessment
```bash
# Find companies impacted by supplier disruption
curl "http://localhost:8082/v1/kg/decision/impact?ticker=SUPPLIER_A&rel_filter=SUPPLIES_TO&max_depth=5"
```

### 2. Anomaly Investigation
```bash
# Find nodes worth investigating (gaps + anomalies)
curl "http://localhost:8082/v1/kg/decision/opportunities?w_gap=0.4&w_anomaly=0.4"
```

### 3. Data Quality Improvement
```bash
# Find and merge duplicate companies
curl "http://localhost:8082/v1/kg/admin/deduplicate/plan?threshold=0.85"
```

### 4. Confidence Bootstrapping
```bash
# Learn from observed patterns to improve confidence
curl -X POST "http://localhost:8082/v1/kg/admin/learning/apply-feedback" \
  -H "Content-Type: application/json" \
  -d '{"window_days": 30, "dry_run": false}'
```

---

## Integration with Scheduler

Optional: Set up nightly learning feedback via scheduler:

```python
# apps/satbase_scheduler/jobs/learning_feedback.py
SCHEDULE_INTERVAL = "0 2 * * *"  # 2 AM daily

async def learning_feedback_job():
    await apply_learning_feedback(
        label="Company",
        window_days=7,
        max_adjust=0.15,
        step=0.03,
        dry_run=False
    )
```

---

## Testing

Run comprehensive test suites:

```bash
# Tier-1: Functional tests (30 cases)
bash scripts/test_ariadne_advanced_tier1.sh

# Error handling tests (20 cases)
bash scripts/test_ariadne_error.sh
```

Expected results: 50 passing tests, 0 failures
