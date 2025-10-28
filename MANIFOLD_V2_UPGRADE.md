# Manifold Backend Upgrade v2

## Overview

Manifold v2 ist eine saubere, SOLID-optimierte Implementierung für agentisches Gedächtnismanagement. **Keine Rückwärtskompatibilität notwendig** – alles ist fresh.

### Key Features

1. **Multi-Vector Embeddings**: 3 Named Vectors (text, title, summary) für token-effizientes Retrieval
2. **Sessions/Workspaces**: Kontextgebundene Gedankenarbeit
3. **Parent-Child Trees**: Chunking langer Inhalte ohne Monolithe
4. **Light Versioning**: Snapshots bei Updates zur Verlaufsverfolgung
5. **Duplicate Warnings**: Detection ohne Auto-Löschung (Agent entscheidet)
6. **2-Phase Retrieval**: Cheap Discovery (Summary-only) → Selective Deep-Dive

---

## New Data Model

### ThoughtEnvelope (v2)

```python
class ThoughtEnvelope(BaseModel):
    # ... existing fields ...
    
    # Session/Workspace/Tree
    session_id?: string          # Group related thoughts
    workspace_id?: string        # Workspace isolation
    parent_id?: string          # For chunking
    ordinal?: number            # Order within parent
    section?: string            # Section title (e.g. "Revenue Analysis")
    
    # Content
    summary?: string            # 1-3 sentences, agent-maintained
    
    # Versioning
    versions?: List[VersionSnapshot]  # Append-only history
```

### VersionSnapshot

```python
class VersionSnapshot(BaseModel):
    version: int
    at: datetime
    by?: string
    changes?: dict  # e.g. {"title": "old -> new", "status": "active -> validated"}
```

---

## New APIs

### 🔥 Core Thought CRUD (Enhanced)

#### `POST /v1/memory/thought` - Create with Multi-Vectors

```bash
POST /v1/memory/thought
{
  "title": "Tesla Valuation Analysis",
  "content": "Full 5000-char analysis...",
  "summary": "Tesla likely overvalued at 80x P/E",  # NEW: auto-embedded as vector
  "type": "analysis",
  "session_id": "tesla-valuation-q4-2025",        # NEW: session context
  "tickers": ["TSLA"],
  "confidence_score": 0.85
}

# Response
{
  "status": "created",
  "thought_id": "uuid-abc-123"
}
```

#### `GET /v1/memory/thought/{id}/children` - Tree Navigation

```bash
GET /v1/memory/thought/parent-id/children

# Response: all children sorted by ordinal
{
  "status": "ok",
  "parent_id": "parent-id",
  "children_count": 3,
  "children": [
    {
      "id": "child-1",
      "ordinal": 0,
      "section": "Revenue Model",
      "content": "..."
    },
    ...
  ]
}
```

#### `GET /v1/memory/thought/{id}/tree` - Full Tree View

```bash
GET /v1/memory/thought/parent-id/tree

# Response: parent → this → children + related
{
  "status": "ok",
  "root": { "id": "...", "payload": {...} },
  "parent": { "id": "...", "payload": {...} },
  "children": [...],
  "related": [...]
}
```

#### `PATCH /v1/memory/thought/{id}` - Versioned Updates

```bash
PATCH /v1/memory/thought/thought-id
{
  "title": "Updated Title",
  "status": "validated"
}

# Response: version bumped, snapshot recorded
{
  "status": "updated"
}

# GET the thought → versions field contains snapshot of version 1
```

---

### 🔎 Enhanced Search (2-Phase)

#### Phase 1: Cheap Discovery (Summary-Vector)

```bash
POST /v1/memory/search
{
  "query": "Tesla margin trends",
  "vector_type": "summary",        # NEW: text|title|summary (default: summary)
  "include_content": false,        # NEW: strip heavy fields
  "limit": 50
}

# Response: lightweight results (~50 tokens each)
{
  "status": "ok",
  "count": 45,
  "results": [
    {
      "id": "thought-id",
      "score": 0.89,
      "thought": {
        "id": "thought-id",
        "title": "Q3 margin compression",
        "summary": "Tesla gross margins fell to 17.8%...",
        "type": "analysis",
        "tickers": ["TSLA"],
        "confidence_score": 0.85,
        "created_at": "2025-10-27T..."
      }
    }
  ]
}
```

#### Phase 2: Selective Deep Dive

```bash
# Agent reads summaries, picks top 5, fetches full content
GET /v1/memory/thought/{id}  # Full content

POST /v1/memory/search
{
  "query": "...",
  "include_content": true,  # Full content
  "limit": 5
}
```

**Token Savings**: ~90% in Phase 1 (50 summaries × 50 tokens = 2.5k vs 50 full × 500 tokens = 25k)

---

### 📋 Sessions Management

#### `GET /v1/memory/sessions` - List All Sessions

```bash
GET /v1/memory/sessions?limit=100

{
  "status": "ok",
  "sessions_count": 7,
  "sessions": [
    {
      "session_id": "tesla-valuation-q4-2025",
      "count": 12,
      "types": {"analysis": 8, "observation": 4}
    },
    ...
  ]
}
```

#### `GET /v1/memory/session/{session_id}/thoughts` - Session Thoughts

```bash
GET /v1/memory/session/tesla-q4/thoughts?include_content=false

{
  "status": "ok",
  "session_id": "tesla-q4",
  "count": 12,
  "thoughts": [...]
}
```

#### `GET /v1/memory/session/{session_id}/graph` - Session Graph

```bash
GET /v1/memory/session/tesla-q4/graph

{
  "status": "ok",
  "session_id": "tesla-q4",
  "nodes": [...],
  "edges": [...]  # includes parent-child edges (type="section-of")
}
```

#### `POST/GET /v1/memory/session/{session_id}/summary` - Session Summary

```bash
# Create/update
POST /v1/memory/session/tesla-q4/summary
{
  "title": "Q4 Tesla Analysis - Summary",
  "summary": "Key findings: margins compressed, revenue strong",
  "content": "Detailed summary..."
}

# Get
GET /v1/memory/session/tesla-q4/summary

{
  "status": "ok",
  "summary": {
    "id": "summary-thought-id",
    "type": "summary",
    "title": "Q4 Tesla Analysis - Summary",
    "summary": "...",
    "content": "...",
    "session_id": "tesla-q4"
  }
}
```

---

### ⚠️ Duplicate Warnings (Detection Only)

#### `POST /v1/memory/check-duplicate` - Check Before Create

```bash
POST /v1/memory/check-duplicate
{
  "title": "Tesla valuation concerns",
  "summary": "Tesla overvalued",
  "content": "Analysis suggests...",
  "threshold": 0.90
}

{
  "status": "ok",
  "threshold": 0.90,
  "similar_count": 2,
  "similar": [
    {
      "thought_id": "existing-1",
      "similarity": 0.94,
      "title": "Tesla Valuation",
      "type": "analysis"
    }
  ]
}

# Agent decides: create anyway, merge, or link
```

#### `GET /v1/memory/warnings/duplicates` - Scan All

```bash
GET /v1/memory/warnings/duplicates?threshold=0.92&session_id=tesla-q4&limit=100

{
  "status": "ok",
  "scanned": 150,
  "duplicate_pairs_found": 3,
  "duplicates": [
    {
      "thought_1": {"id": "...", "title": "..."},
      "thought_2": {"id": "...", "title": "..."},
      "reason": "identical_title"
    }
  ],
  "note": "Review and decide: link, merge, or keep both"
}

# Agent workflow:
# 1. Get warnings
# 2. For each pair: POST /v1/memory/thought/{id1}/related (link)
#    OR soft-delete one: DELETE /v1/memory/thought/{id2}?soft=true
```

---

### 🎨 Enhanced Graph

#### `GET /v1/memory/graph?session_id=...&workspace_id=...`

```bash
GET /v1/memory/graph?session_id=tesla-q4&limit=500

{
  "status": "ok",
  "nodes": [...],
  "edges": [
    {"from": "parent-id", "to": "child-id", "type": "section-of", "weight": 1.0},
    {"from": "thought-1", "to": "thought-2", "type": "related", "weight": 1.0},
    ...
  ]
}

# Edge types:
# - "related" (manual links)
# - "supports" / "contradicts" (typed relations)
# - "section-of" (parent-child)
```

---

## Migration Path

**Important**: No existing data to migrate (clean slate).

### Setup

1. **Initialize**: Qdrant collection created automatically on first request with 3 Named Vectors + new indexes
2. **Deploy**: Roll out v2 code
3. **Verify**: Run smoke tests (see `tests/manifold/test_v2_upgrade.py`)

---

## Agent Usage Patterns

### Pattern 1: Token-Efficient Retrieval

```python
# Phase 1: Cheap discovery
results_cheap = search(
    query="Tesla margins",
    vector_type="summary",
    include_content=False,
    limit=50
)

# Agent reads 50 summaries (~2.5k tokens), picks top 5
selected_ids = [r["id"] for r in results_cheap[:5]]

# Phase 2: Deep dive only for top
for thought_id in selected_ids:
    full = get_thought(thought_id)
    # Process full content
```

### Pattern 2: Session-Based Analysis

```python
# Create session for research thread
session_id = "tesla-q4-2025"

# Create hypothesis
hyp = create_thought(
    type="hypothesis",
    title="Tesla overvalued",
    content="...",
    session_id=session_id
)

# Add supporting observations
create_thought(
    type="observation",
    title="Q3 margin compression",
    content="...",
    parent_id=hyp.id,  # Link to parent
    ordinal=0,
    session_id=session_id
)

# Get session summary
summary = get_session_summary(session_id)
```

### Pattern 3: Duplicate Conflict Resolution

```python
# Create thought
new_thought = create_thought(...)

# Check for duplicates
warnings = check_duplicate(
    title=new_thought.title,
    summary=new_thought.summary,
    threshold=0.92
)

if warnings["similar_count"] > 0:
    # Option 1: Link as related
    link_related(
        new_thought.id,
        warnings["similar"][0]["thought_id"],
        relation_type="duplicate"
    )
    
    # Option 2: Soft-delete new (if truly duplicate)
    delete_thought(new_thought.id, soft=True)
```

### Pattern 4: Chunking Long Analysis

```python
# Create parent analysis
parent = create_thought(
    type="analysis",
    title="Deep Dive: Tesla Financial Analysis",
    content="Executive summary...",  # Keep short
    summary="..."
)

# Split into chunks
chunks = [
    {"section": "Revenue Model", "content": "..."},
    {"section": "Margin Analysis", "content": "..."},
    {"section": "Valuation", "content": "..."},
]

for i, chunk in enumerate(chunks):
    create_thought(
        type="analysis",
        title=f"Section: {chunk['section']}",
        content=chunk["content"],
        parent_id=parent.id,
        ordinal=i,
        section=chunk["section"]
    )
```

---

## Testing

### Run Smoke Tests

```bash
pytest tests/manifold/test_v2_upgrade.py -v

# Tests cover:
# - Multi-vector embedding (3 vectors per thought)
# - Vector type switching (search with summary/text/title)
# - Sessions (create, list, fetch thoughts, graph, summary)
# - Versioning (snapshots on update)
# - Duplicate warnings (check + scan)
# - Tree navigation (parent-child relationships)
# - Graph filters (session_id, workspace_id)
```

---

## Performance & Storage

- **Vector Storage**: 3 vectors/thought × 1024-dim float32 = ~12 KB/thought
- **Qdrant Memory**: ~12 GB for 1M thoughts
- **Search Latency**: <100ms (summary vector, 50 results)
- **Index Creation**: Auto on first request

---

## Future Extensions

- Automatic session summaries (Coalescence integration)
- Full-text search alongside semantic
- Scoring feedback loop (implicit signals)
- Time-aware decay/archiving
- Multi-agent read/write
- Backup/restore endpoints
