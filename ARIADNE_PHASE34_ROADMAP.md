# Ariadne Backend Upgrade: Phase 3+4 Roadmap

**Status**: Documented for Future Implementation  
**Trigger**: When Phase 1+2 analytics are actively used by agent and new discovery needs emerge

---

## PHASE 3: DISCOVERY & QUALITY

### 3.1 Discovery Router (`apps/ariadne_api/routers/discovery.py`)

#### Endpoint: `GET /v1/kg/contradictions`
**Purpose**: Find conflicting relationships that may indicate data quality issues or genuine contradictions

```cypher
MATCH (n1)-[r1:AFFECTS]->(n2), (n1)-[r2:HARMS]->(n2)
WHERE r1.effect = "positive" AND r2.effect = "negative"
RETURN n1, r1, n2, r2, "Conflicting effects" AS conflict_type
```

**Implementation**:
- Pattern-matching for contradictory relationship types
- Property-level conflicts (e.g., AFFECTS positive vs HARMS)
- Temporal conflicts (overlapping valid_from/valid_to)
- Returns: List of conflicts with confidence scores

#### Endpoint: `GET /v1/kg/gaps`
**Purpose**: Identify incomplete entities missing expected relationships

**Parameters**:
- `label`: Node label to check (e.g., "Company")
- `required_rels`: Comma-separated expected relationship types
- Example: `GET /v1/kg/gaps?label=Company&required_rels=SUPPLIES_TO,AFFECTED_BY`

**Implementation**:
- Query all nodes of label
- For each node, check for required relationships
- Calculate gap score (missing rels / expected rels)
- Returns: List of incomplete nodes with gap severity

#### Endpoint: `GET /v1/kg/anomalies`
**Purpose**: Detect unusual patterns (outliers, sudden changes, degree anomalies)

**Parameters**:
- `label`: Node label (Event, PriceEvent)
- `metric`: What to check (degree, velocity, value)
- `threshold`: Z-score threshold (default: 2.0)

**Implementation**:
- Calculate degree distribution for nodes
- Compute Z-scores
- Identify events with unusual temporal properties
- Flag price movements outside normal ranges
- Returns: Anomalous entities with anomaly score

### 3.2 Admin Extensions

#### Endpoint: `POST /v1/kg/dedupe/merge`
**Purpose**: Merge duplicate nodes while preserving relationship integrity

**Payload**:
```json
{
  "node_ids": ["id1", "id2", "id3"],
  "strategy": "merge_latest",
  "property_resolution": "combine"
}
```

**Implementation**:
```cypher
CALL apoc.refactor.mergeNodes($nodes, {
  properties: 'combine',
  mergeRels: true,
  skipProperties: ['id', 'created_at']
}) YIELD node
RETURN node
```

**Returns**: Merged node with consolidated properties and all relationships

#### Endpoint: `GET /v1/kg/audit/history`
**Purpose**: Retrieve change history for audit and provenance tracking

**Parameters**:
- `entity_id`: Node ID
- `start_date`: Optional start date
- `end_date`: Optional end date

**Implementation**:
- Read properties: `r.version`, `r.ingested_at`, `r.valid_from/valid_to`
- Optional: APOC audit with triggers (if enabled)
- Build version timeline
- Returns: Chronological change log

---

## PHASE 4: DECISION SUPPORT

### 4.1 Decision Router (`apps/ariadne_api/routers/decision.py`)

#### Endpoint: `POST /v1/kg/scenario/simulate`
**Purpose**: Impact propagation simulation - what happens if X changes?

**Payload**:
```json
{
  "trigger_node_id": "company_1",
  "trigger_event": "bankruptcy",
  "max_hops": 3,
  "decay_factor": 0.7,
  "relationship_filter": "SUPPLIES_TO|FUNDED_BY|ENABLES"
}
```

**Implementation**:
1. Start from trigger_node
2. Traverse relationships up to max_hops
3. Apply decay factor: impact_score = base_impact × (decay_factor ^ hops)
4. Aggregate impacts on target nodes
5. Rank by total impact
6. Returns: Impact ranking with propagation paths

**Example Output**:
```json
{
  "status": "success",
  "scenario": "bankruptcy",
  "affected_entities": [
    {
      "id": "supplier_1",
      "name": "Supply Chain Partner",
      "impact_score": 0.85,
      "paths": [
        ["bankruptcy_node", "supplies", "affected_node"],
        ["bankruptcy_node", "funded_by", "dependent", "supplies", "affected_node"]
      ]
    }
  ]
}
```

#### Endpoint: `GET /v1/kg/risk`
**Purpose**: Calculate risk scores based on multiple factors

**Parameters**:
- `entity_id`: Node ID
- `time_horizon`: "short_term" | "medium_term" | "long_term"

**Risk Scoring Formula**:
```
Risk = (centrality × 0.4) + 
        (negative_events × 0.3) + 
        (dependency_degree × 0.2) + 
        (volatility × 0.1)
```

**Implementation**:
- Centrality: PageRank score
- Negative events: Count of recent adverse relationships/events
- Dependency degree: Number of entities depending on this one
- Volatility: temporal variance (from properties)
- Returns: Risk score, contributing factors, mitigation suggestions

#### Endpoint: `GET /v1/kg/opportunities`
**Purpose**: Identify high-value opportunities (combinations of factors)

**Scoring Formula**:
```
Opportunity = (probability × 0.4) + 
              (impact × 0.35) + 
              (novelty × 0.15) + 
              (urgency × 0.1)
```

**Implementation**:
- Probability: Prediction confidence from link prediction or pattern frequency
- Impact: How many nodes affected, centrality of affected nodes
- Novelty: How recent the pattern (younger = more novel)
- Urgency: Time-based decay (decays with age)
- Returns: Ranked opportunities with action recommendations

#### Endpoint: `GET /v1/kg/lineage`
**Purpose**: Trace provenance and evidence for a decision

**Parameters**:
- `entity_id`: Node ID
- `direction`: "upstream" | "downstream" | "bidirectional"

**Implementation**:
```cypher
MATCH path = (start) <--[*]-- (source:Observation|Fact)
WHERE id(start) = $entity_id
RETURN path
ORDER BY length(path) ASC
```

**Returns**: Evidence tree with sources, transformation, and current state

---

## Integration Points

### Required for Phase 3+4
- All Phase 1+2 endpoints operational
- Graph populated with sufficient data (>100 nodes recommended)
- Relationship properties include: `effect`, `confidence`, `ingested_at`
- Node properties include: `created_at`, `updated_at`, temporal markers

### Performance Considerations
- Scenario simulation: Cache GDS graphs for repeated queries
- Anomaly detection: Pre-compute Z-scores periodically
- Link prediction: Limit to single-hop neighborhoods for large graphs
- Dedupe: Transaction-based for atomicity

### Next Generation Features (Future)
- Multi-scenario comparison
- Counterfactual analysis ("what if we had done X differently?")
- Causal inference (beyond correlation)
- Automated hypothesis generation
- Real-time alert triggers

---

## Success Criteria

After Phase 3+4, the agent will be able to:
1. **Understand Data Quality**: Spot contradictions, gaps, anomalies
2. **Make Decisions**: Simulate impacts, quantify risks, identify opportunities
3. **Explain Reasoning**: Trace lineage, show contributing factors
4. **Iterate**: Merge duplicates, maintain audit trail
5. **Discover**: Autonomous pattern recognition and anomaly detection

This unlocks full autonomous decision-making capability for the trading/investment agent.
