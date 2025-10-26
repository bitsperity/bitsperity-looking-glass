# Satbase News Pipeline - Complete Analysis & Refactoring Plan

## Current Architecture Problems

### PROBLEM 1: HTML Storage (Waste of Space & Processing)

**Current Flow:**
```
Google RSS Feed
    ↓
fetch() → entries metadata
    ↓
normalize() → NewsDoc (id, title, text, url, tickers, topics)
    ↓
sink() → Parquet (news_docs)
    ↓
[LATER - Separate Process] get_text(url) → HTML → parse HTML → text
    ↓
sink() → Parquet (news_body with content_html + content_text)
```

**Issues:**
1. **Duplicate Storage**: HTML stored in `content_html` field
2. **Unused Data**: HTML never read again (only text used)
3. **Space Waste**: HTML typically 10-50x larger than text
4. **Processing Waste**: Parse HTML to text (can fail with Cloudflare, 403, etc.)

**Solution:**
- Store ONLY `content_text` field (no HTML)
- Lighter, faster, more efficient

---

### PROBLEM 2: Separate Fetch Processes (N+1 Requests)

**Current Flow:**
```
Step 1: Fetch news metadata (async job)
  - Returns 100 articles in news_docs
  - Status: ✅ Done

Step 2: Later, separate background job fetches bodies
  - Fetches 100 URLs again
  - Parses HTML → text
  - Status: ✅ Done
  - BUT: Double network requests!
```

**Issues:**
1. **Two HTTP Requests Per Article**: URL fetched twice
2. **No Atomicity**: Metadata exists without body
3. **Error Orphaning**: Failed bodies still stored (with `content_text=None`)
4. **Race Conditions**: User can query article before body fetched

**Solution:**
- Combine into single fetch process
- Fetch metadata + text in one pass
- Either both succeed or neither is stored

---

### PROBLEM 3: Error Handling (Storing Broken Articles)

**Current Code (`news_body_fetcher.py` line 56, 114):**
```python
# Even if fetch fails, store with None values:
yield NewsBody(
    id=d.id, 
    url=d.url, 
    content_text=None,  # ← BROKEN - should not exist
    content_html=None,  # ← BROKEN - should not exist
    fetched_at=fetched, 
    published_at=pub_dt
)
```

**Issues:**
1. **Broken Articles Stored**: 403, 404, Cloudflare blocks → stored with empty content
2. **No Retry Logic**: Failed articles not re-attempted
3. **Quality Degradation**: Overview shows "0% content fetched" incorrectly
4. **Cluttered Storage**: Hundreds of empty entries

**Solution:**
- Don't store if text_content fetch fails
- Skip failed URLs entirely
- Retry mechanism for transient failures

---

### PROBLEM 4: Scheduler Non-Blocking Guarantee (UNCERTAIN)

**Current Setup (`satbase_scheduler/main.py`):**
```
APScheduler with ThreadPoolExecutor
├── Job: Refresh Watchlist (prices + news)
├── Job: Monitor Topics
├── Job: Refresh FRED
├── Job: Fetch Pending News Bodies (background)
└── Job: Ingest Topics
```

**Concerns:**
1. **Is news fetching blocking?** Uses `_start_thread()` - but is that safe?
2. **ThreadPoolExecutor limits?** Default 5 threads, but how many jobs?
3. **API saturation?** If multiple jobs hit same API simultaneously?
4. **Scheduler stuck?** Long-running job blocks others?

**Solution:**
- Audit `_start_thread()` implementation
- Use async/await instead of threads
- Add max concurrency limits
- Add request rate limiting
- Add timeout protection

---

## Refactoring Plan (5 Phases)

### PHASE 1: Model Refactoring
**File**: `libs/satbase_core/models/news.py`

```python
class NewsBody(BaseModel):
    id: str
    url: str
    content_text: str | None = None  # Only text, no HTML
    # content_html: REMOVED
    fetched_at: datetime
    published_at: datetime
    fetch_success: bool  # Explicit success flag
```

### PHASE 2: Unified Fetch Process
**Files**: 
- `libs/satbase_core/adapters/news_google_rss.py`
- `apps/satbase_api/routers/ingest.py`

**New Flow:**
```python
def fetch_with_bodies(query: str, topic: str = None) -> Iterable[NewsDoc]:
    """
    1. Fetch RSS metadata
    2. For each article, fetch URL → extract text
    3. Yield complete NewsDoc with text_content
    4. Skip if error or text extraction fails
    """
    entries = fetch_rss(query)
    for entry in entries:
        doc = normalize_metadata(entry, topic)
        text = fetch_text(entry.url)
        if text:  # Only yield if text successfully extracted
            doc.text_content = text
            yield doc
```

### PHASE 3: Error Handling
**File**: `libs/satbase_core/adapters/http.py`

```python
def fetch_text_with_retry(url: str, max_retries: int = 3) -> str | None:
    """
    Fetch URL → extract text with retry logic
    
    Retry on:
    - Connection timeout
    - 5xx errors
    
    Don't retry on:
    - 403 Forbidden
    - 404 Not Found
    - 410 Gone
    
    Return None if all retries exhausted
    """
```

### PHASE 4: Scheduler Audit
**Files**:
- `apps/satbase_scheduler/main.py`
- `apps/satbase_api/routers/ingest.py`

**Changes:**
- Replace `_start_thread()` with async tasks
- Add semaphore for max concurrency (5 concurrent requests)
- Add rate limiting (1 req/second global)
- Add timeouts (30s per request, 5m per job)
- Log all job starts/ends

### PHASE 5: Testing
**New Files**:
- `tests/satbase/test_news_pipeline.py`
- `tests/satbase/test_scheduler_blocking.py`

---

## Implementation Order

1. **Model** (Phase 1) - No breaking changes yet
2. **Fetch** (Phase 2) - New unified adapter
3. **Error Handling** (Phase 3) - Robust retry logic
4. **Scheduler** (Phase 4) - Non-blocking guarantees
5. **Testing** (Phase 5) - Validation

---

## Expected Outcomes

**Before:**
- 272K articles stored
- 0% with text content
- HTML stored unnecessarily
- Scheduler potentially blocking

**After:**
- ~270K articles stored (skipping failed fetches)
- 80-90% with text content (successful fetches)
- Only text stored (no HTML waste)
- Guaranteed non-blocking scheduler
- Clean, atomic transactions

---

## Quick Wins (Low Risk)

1. Stop storing `content_html` immediately (save space)
2. Add timeout to `get_text()` calls (prevent hanging)
3. Add logging to scheduler jobs (visibility)
4. Audit `_start_thread()` usage (safety check)

