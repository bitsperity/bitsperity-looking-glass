# Satbase News Pipeline - Architectural Issues & Remediation Plan

## Critical Issues Identified

### Issue 1: Inconsistent Deduplication Strategy

**Current State:**
```
news_docs.parquet:
  - Uses: write_parquet() - RECREATES file each time
  - Result: Old data LOST when new articles ingested
  - Deduplication: NONE

news_body.parquet:
  - Uses: upsert_parquet_by_id() - Merges with existing
  - Result: Articles keep accumulating
  - Deduplication: By ID (keep="last")
```

**Problem:** 
- Ingest "AI" (100 articles) → news_docs has 100, news_body has 100
- Ingest "Blockchain" (100 articles with same URLs/IDs) → news_docs has 100 NEW, news_body has 200
- **Result:** 100 docs, 200 bodies = 200% coverage!

### Issue 2: No Global Deduplication Index

**Current State:**
- Each topic ingestion creates its own records
- No cross-topic deduplication
- Same article (same URL, same ID) stored multiple times

**Problem:**
- Article about "AI and Blockchain" ingested twice:
  - Once during "AI" topic fetch
  - Once during "Blockchain" topic fetch
- No way to prevent duplicates across topics

### Issue 3: Weak Data Integrity

**Current State:**
- Date-partitioned storage (YYYY/MM/DD)
- No global unique constraints
- No referential integrity (news_docs.id vs news_body.id)

**Problem:**
- Can have orphaned bodies (body exists, no matching doc)
- Can have docs without bodies (inconsistent state)
- No cascading deletes

### Issue 4: News/Body Mismatch Not Caught

**Current State:**
```python
# news_google_rss.py - sink() function

# Writes news_docs
news_path = write_parquet(s.stage_dir, "news_rss", partition_dt, "news_docs", news_rows)

# Writes news_body  
body_path = upsert_parquet_by_id(s.stage_dir, "news_body", partition_dt, "news_body", "id", body_rows)

# Returns both paths, but NO validation that counts match!
return {
    "path": str(news_path),
    "body_path": str(body_path),
    "count": len(news_rows),  # News count
    "bodies": len(body_rows)   # Body count
}
```

**Problem:** Returns 100/100, but next fetch does 100/200 without any error!

---

## Solution: Professional Data Integrity Model

### Option A: Unified Storage with Guaranteed 1:1 (RECOMMENDED)

**Architecture:**
```
Single Table Per Date:
  data/stage/news/2025/10/26/articles.parquet
  
Schema:
  - id (PRIMARY KEY - sha1(url))
  - url (UNIQUE)
  - source (news_rss, gdelt, etc.)
  - title, text (metadata)
  - content_text (full article text - if available)
  - published_at
  - fetched_at (null if not fetched yet)
  - topics (list of strings)
  - tickers (list of strings)
  - status (enum: "metadata_only" | "with_text" | "failed")

Operations:
  - UPSERT by ID: Merge topics, keep best text, update status
  - NEVER lose rows: Always merge, never recreate
  - Deduplication: Atomic at storage layer
```

**Advantages:**
- ✅ No orphaned data
- ✅ 1:1 guaranteed by design
- ✅ Atomic operations
- ✅ Easy to query
- ✅ Simple integrity checks

### Option B: Separate Tables with Constraints (More Complex)

```
news_metadata.parquet (immutable)
  - id, url, title, text, published_at, topics, source

news_content.parquet (versioned)
  - id (FK to news_metadata), content_text, fetched_at, status
  - Can have multiple rows per ID (version history)
  - Latest version selected by fetched_at DESC

Operations:
  - news_metadata: WRITE ONLY (never update)
  - news_content: APPEND ONLY
  - Query: JOIN with max(fetched_at) per ID
```

**Advantages:**
- ✅ Audit trail of fetch attempts
- ✅ Can track retry history
- ✗ More complex queries
- ✗ Still need validation

---

## Immediate Fixes (Quick Win)

### 1. Fix news_docs Deduplication (CRITICAL)

**File:** `libs/satbase_core/adapters/news_google_rss.py`

```python
# BEFORE (WRONG):
news_path = write_parquet(s.stage_dir, "news_rss", partition_dt, "news_docs", news_rows)

# AFTER (CORRECT):
news_path = upsert_parquet_by_id(
    s.stage_dir, "news_rss", partition_dt, 
    "news_docs", "id", news_rows
)
```

### 2. Add Integrity Validation (CRITICAL)

**File:** `libs/satbase_core/adapters/news_google_rss.py` - Add to sink():

```python
def sink(models: Iterable[NewsDoc], partition_dt: date, topic: str | None = None) -> dict:
    # ... existing code ...
    
    # VALIDATION: Ensure counts match
    if len(news_rows) != len(body_rows):
        raise ValueError(
            f"Data integrity error: {len(news_rows)} docs but {len(body_rows)} bodies. "
            "This indicates failed text extraction - articles will not be stored."
        )
    
    # VALIDATION: Ensure IDs match
    news_ids = set(r['id'] for r in news_rows)
    body_ids = set(r['id'] for r in body_rows)
    
    if news_ids != body_ids:
        raise ValueError(
            f"Data integrity error: ID mismatch between docs and bodies. "
            f"Missing in bodies: {news_ids - body_ids}"
        )
    
    # ... rest of sink ...
```

### 3. Add Atomic Transaction Wrapper (PROFESSIONAL)

**File:** `libs/satbase_core/storage/stage.py` - New function:

```python
def upsert_news_pair(base: Path, source: str, dt: date, 
                     docs: list[dict], bodies: list[dict]) -> dict:
    """
    Atomically upsert news_docs and news_body tables.
    
    Guarantees:
    - 1:1 correspondence between docs and bodies
    - Both succeed or both fail (no partial writes)
    - Deduplication across both tables
    
    Raises:
    - ValueError if doc/body mismatch detected
    """
    # Validation
    if len(docs) != len(bodies):
        raise ValueError(f"Count mismatch: {len(docs)} docs vs {len(bodies)} bodies")
    
    doc_ids = {d['id'] for d in docs}
    body_ids = {b['id'] for b in bodies}
    if doc_ids != body_ids:
        raise ValueError(f"ID mismatch: {doc_ids ^ body_ids}")
    
    try:
        # Upsert both atomically
        docs_path = upsert_parquet_by_id(base, source, dt, "news_docs", "id", docs)
        body_path = upsert_parquet_by_id(base, source, dt, "news_body", "id", bodies)
        
        return {
            "docs_path": str(docs_path),
            "bodies_path": str(body_path),
            "count": len(docs),
            "status": "success"
        }
    except Exception as e:
        # Log but don't write anything
        raise Exception(f"Failed to upsert news pair: {e}")
```

### 4. Add Audit Endpoint (TRANSPARENCY)

**File:** `apps/satbase_api/routers/news.py` - New endpoint:

```python
@router.get("/v1/news/integrity-check")
def check_integrity():
    """
    Verify data integrity across news_docs and news_body.
    
    Returns:
    - Total docs
    - Total bodies
    - Orphaned bodies (body exists, no matching doc)
    - Missing bodies (doc exists, no body)
    - Overall integrity percentage
    """
    s = load_settings()
    stage_dir = Path(s.stage_dir)
    
    # Load all docs
    all_docs = pl.scan_parquet(stage_dir / "news_rss" / "**" / "news_docs.parquet").collect()
    doc_ids = set(all_docs['id'].to_list())
    
    # Load all bodies
    all_bodies = pl.scan_parquet(stage_dir / "news_body" / "**" / "news_body.parquet").collect()
    body_ids = set(all_bodies['id'].to_list())
    
    orphaned = body_ids - doc_ids  # Bodies with no doc
    missing = doc_ids - body_ids    # Docs with no body
    
    total_docs = len(doc_ids)
    total_bodies = len(body_ids)
    
    integrity = (total_docs - len(missing)) / total_docs * 100 if total_docs > 0 else 100
    
    return {
        "total_docs": total_docs,
        "total_bodies": total_bodies,
        "orphaned_bodies": len(orphaned),
        "missing_bodies": len(missing),
        "integrity_percentage": integrity,
        "status": "OK" if integrity == 100 else "WARNING" if integrity > 80 else "CRITICAL"
    }
```

---

## Professional Standards Going Forward

### 1. Design Principle: Fail Fast
- Data integrity errors should be **exceptions**, not silent data corruption
- Every operation should validate invariants
- Tests should catch mismatches

### 2. Design Principle: Single Source of Truth
- One table per concept (not split across sources)
- Date-partitioned for scalability, NOT for hiding data
- Global unique constraints on IDs/URLs

### 3. Design Principle: Transparency
- Every operation logs what happened
- Audit endpoints to verify state
- Metrics dashboard for data quality

### 4. Design Principle: Testability
- Write tests that fail if 1:1 invariant is broken
- Test that duplicate ingestions are handled correctly
- Test cross-topic ingestion scenarios

---

## Next Steps

1. ✅ **Implement immediate fixes** (deduplication + validation)
2. ✅ **Add integrity check endpoint** (transparency)
3. ✅ **Add tests** for data invariants
4. 🔄 **Consider unified storage** (long-term architectural improvement)
5. 🔄 **Clear corrupted data** (delete and re-ingest cleanly)

---

## Current Status

**DATA PROBLEM:** 100 docs, 300 bodies = CORRUPTED

**ACTION REQUIRED:**
1. Fix code first (deduplication + validation)
2. Clear corrupted data
3. Re-ingest cleanly
4. Verify 1:1 invariant

**TIMELINE:** This should be fixed TODAY before any production use.
