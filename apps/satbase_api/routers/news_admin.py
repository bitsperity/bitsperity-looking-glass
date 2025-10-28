from datetime import datetime, timedelta, date
from pathlib import Path
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from libs.satbase_core.storage.news_db import NewsDB
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.utils.quality import calculate_quality_score
from libs.satbase_core.adapters.http import fetch_text_with_retry
import httpx

router = APIRouter()


@router.post("/admin/topics/list")
def list_topics_configured():
    """List all configured topics (topics with articles)."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    topics = db.get_all_topics()
    
    return {
        "topics": topics,
        "total_unique": len(topics),
        "total_articles": sum(t["count"] for t in topics)
    }


@router.post("/admin/news/cleanup-junk")
def cleanup_junk_bodies(
    tag_only: bool = False,
    dry_run: bool = False,
    max_items: int = 1000,
    min_similarity_title: float = 0.25,
    min_similarity_summary: float = 0.25,
    fallback_length_threshold: int = 120,
):
    """
    Scannt News und markiert Bodies als Junk, wenn semantische Ähnlichkeit (body↔title / body↔summary)
    UNTER Schwellwert liegt. Fallback: zu kurz / bekannte Fehlerphrasen.
    Entfernt Body, taggt `no_body_crawl`, löscht Body-Vektor in Tesseract.
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    tesseract_base = "http://localhost:8081"

    def fallback_is_junk(body: str | None) -> bool:
        if not body or len(body.strip()) < fallback_length_threshold:
            return True
        low = body.lower()
        for pat in ["access denied", "403", "404", "forbidden", "subscribe", "register"]:
            if pat in low:
                return True
        return False

    # Ensure migration (add no_body_crawl if missing)
    try:
        with db.conn() as conn:
            cols = conn.execute("PRAGMA table_info('news_articles')").fetchall()
            names = {c[1] for c in cols}
            if 'no_body_crawl' not in names:
                conn.execute("ALTER TABLE news_articles ADD COLUMN no_body_crawl BOOLEAN DEFAULT 0")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_no_body_crawl ON news_articles(no_body_crawl)")
    except Exception:
        pass

    checked = 0
    affected = 0
    tagged = 0
    deleted_vectors = 0
    affected_ids: list[str] = []

    with db.conn() as conn:
        rows = conn.execute(
            "SELECT id, url, title, description, body_text FROM news_articles ORDER BY fetched_at DESC LIMIT ?",
            (max_items,)
        ).fetchall()
        for row in rows:
            checked += 1
            article_id, url, title, description, body_text = row
            # 1) Fallback-Quickcheck
            if fallback_is_junk(body_text):
                affected += 1
                affected_ids.append(article_id)
                if not dry_run:
                    # Clear body and tag skip
                    db.clear_body_and_tag(article_id, tag_skip=True)
                    tagged += 1
                    if not tag_only:
                        # Delete body vector in Tesseract
                        try:
                            with httpx.Client(timeout=5.0) as client:
                                r = client.delete(f"{tesseract_base}/v1/admin/vectors/{article_id}/body")
                                if r.status_code == 200:
                                    deleted_vectors += 1
                        except Exception:
                            pass
                continue

            # 2) Semantische Prüfung via Tesseract-Vektoren
            try:
                with httpx.Client(timeout=5.0) as client:
                    sim = client.get(f"{tesseract_base}/v1/admin/similarity/{article_id}")
                    if sim.status_code == 200:
                        data = sim.json()
                        s_tb = data.get("similarity", {}).get("title_body")
                        s_sb = data.get("similarity", {}).get("summary_body")
                        body_present = data.get("available", {}).get("body")
                        # Wenn kein Body-Vektor existiert, Fallback-Regel anwenden
                        if not body_present:
                            if fallback_is_junk(body_text):
                                affected += 1
                                affected_ids.append(article_id)
                                if not dry_run:
                                    db.clear_body_and_tag(article_id, tag_skip=True)
                                    tagged += 1
                            continue
                        # Markiere Junk wenn beide Ähnlichkeiten unter den Schwellwerten liegen
                        cond_title = (s_tb is None) or (s_tb < min_similarity_title)
                        cond_summary = (s_sb is None) or (s_sb < min_similarity_summary)
                        if cond_title and cond_summary:
                            affected += 1
                            affected_ids.append(article_id)
                            if not dry_run:
                                db.clear_body_and_tag(article_id, tag_skip=True)
                                tagged += 1
                                if not tag_only:
                                    try:
                                        rr = client.delete(f"{tesseract_base}/v1/admin/vectors/{article_id}/body")
                                        if rr.status_code == 200:
                                            deleted_vectors += 1
                                    except Exception:
                                        pass
            except Exception:
                # Im Fehlerfall keine aggressive Löschung – lieber auslassen
                pass

    return {
        "checked": checked,
        "affected": affected,
        "tagged": tagged,
        "deleted_vectors": deleted_vectors,
        "dry_run": dry_run,
        "tag_only": tag_only,
        "ids": affected_ids[:50]  # sample
    }


@router.get("/admin/news/schema")
def news_schema_info():
    """Expose current news_articles schema and important indexes for debugging."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    with db.conn() as conn:
        cols = conn.execute("PRAGMA table_info('news_articles')").fetchall()
        idxs = conn.execute("PRAGMA index_list('news_articles')").fetchall()
        return {
            "columns": [{"cid": c[0], "name": c[1], "type": c[2], "notnull": c[3], "dflt": c[4], "pk": c[5]} for c in cols],
            "indexes": [{"seq": i[0], "name": i[1], "unique": i[2]} for i in idxs]
        }


@router.delete("/admin/articles/batch")
def delete_articles_batch(
    topic: str | None = Query(None),
    before: str | None = Query(None, alias="before_date", description="YYYY-MM-DD"),
    article_ids: str | None = Query(None, description="Comma-separated IDs")
):
    """
    Delete articles by criteria.
    Options:
    - article_ids: Delete specific articles (CSV of IDs)
    - topic + before: Delete all articles with topic before date
    - topic: Delete all articles with this topic
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    deleted_count = 0
    
    if article_ids:
        # Delete specific articles
        ids = [id.strip() for id in article_ids.split(",") if id.strip()]
        deleted_count = db.delete_articles_batch(ids)
        
        # Log each deletion
        for article_id in ids:
            db.log_audit(
                action="deleted",
                article_id=article_id,
                details="manual_batch_delete"
            )
    
    elif topic:
        # Delete by topic
        before_date = None
        if before:
            try:
                before_date = date.fromisoformat(before)
            except ValueError:
                return JSONResponse(
                    {"error": f"Invalid date format: {before}. Use YYYY-MM-DD."},
                    status_code=400
                )
        deleted_count = db.delete_articles_by_topic(topic, before_date)
        
        # Log the batch operation
        db.log_audit(
            action="deleted_batch",
            topic=topic,
            details=f"topic_cleanup before_date={before_date}"
        )
    else:
        return JSONResponse(
            {"error": "Specify either article_ids or topic parameter"},
            status_code=400
        )
    
    return {
        "status": "success",
        "deleted_count": deleted_count,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/admin/articles/duplicates")
def get_duplicate_articles():
    """Find potential duplicate articles (same URL)."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    duplicates = db.get_duplicate_candidates()
    
    return {
        "total_duplicates": len(duplicates),
        "duplicates": duplicates,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/admin/audit")
def get_audit_log(
    article_id: str | None = Query(None),
    action: str | None = Query(None, description="ingested, deleted, tagged_topic"),
    days: int | None = Query(None, ge=1, le=365),
    limit: int = Query(1000, ge=1, le=10000)
):
    """
    Get audit trail of all operations.
    Filter by article_id, action, or time period.
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    logs = db.get_audit_log(
        article_id=article_id,
        action=action,
        days=days,
        limit=limit
    )
    
    return {
        "entries": logs,
        "total": len(logs),
        "filters": {
            "article_id": article_id,
            "action": action,
            "days": days,
            "limit": limit
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/admin/audit/stats")
def get_audit_stats(days: int = Query(30, ge=1, le=365)):
    """Get audit statistics (action counts by type)."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    stats = db.get_audit_stats(days=days)
    
    return {
        "stats": stats,
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# Job Management Endpoints
# ============================================================================

@router.get("/admin/jobs")
def list_jobs_admin(
    status: str | None = Query(None, description="queued, running, done, error"),
    job_type: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    List all jobs with optional filters.
    Perfect for frontend monitoring.
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    jobs = db.list_jobs(status=status, job_type=job_type, limit=limit)
    
    return {
        "jobs": jobs,
        "total": len(jobs),
        "filters": {"status": status, "job_type": job_type},
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/admin/jobs/stats")
def get_jobs_stats():
    """Get overall job statistics (success rate, avg duration, etc)."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    stats = db.get_job_stats()
    
    return {
        "stats": stats,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/admin/jobs/{job_id}")
def get_job_detail(job_id: str):
    """Get detailed information about a specific job including progress."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    job = db.get_job(job_id)
    
    if not job:
        return JSONResponse(
            {"error": f"Job {job_id} not found"},
            status_code=404
        )
    
    # Calculate progress percentage
    progress_pct = None
    if job["progress_total"] and job["progress_total"] > 0:
        progress_pct = round((job["progress_current"] or 0) / job["progress_total"] * 100, 1)
    
    return {
        "job": job,
        "progress_percent": progress_pct,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/admin/jobs/{job_id}/retry")
def retry_job(job_id: str):
    """Retry a failed job."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    job = db.get_job(job_id)
    
    if not job:
        return JSONResponse(
            {"error": f"Job {job_id} not found"},
            status_code=404
        )
    
    if job["status"] != "error":
        return JSONResponse(
            {"error": f"Cannot retry job with status '{job['status']}'"},
            status_code=400
        )
    
    # Create a new job with same payload
    new_job_id = str(uuid.uuid4()).replace("-", "")
    db.create_job(new_job_id, job["job_type"], payload=job["payload"])
    
    # Trigger based on job type
    if job["job_type"] == "news_backfill":
        import httpx
        try:
            payload = job["payload"]
            with httpx.Client(timeout=2) as client:
                client.post(
                    "http://localhost:8080/v1/ingest/news/backfill",
                    json=payload
                )
        except Exception as e:
            log("job_retry_error", original_job=job_id, new_job=new_job_id, error=str(e))
    
    return {
        "status": "success",
        "original_job": job_id,
        "new_job": new_job_id,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.delete("/admin/jobs/{job_id}")
def delete_job(job_id: str):
    """Delete/cleanup a job record."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    job = db.get_job(job_id)
    
    if not job:
        return JSONResponse(
            {"error": f"Job {job_id} not found"},
            status_code=404
        )
    
    # Only allow deletion of completed jobs
    if job["status"] not in ["done", "error"]:
        return JSONResponse(
            {"error": f"Cannot delete job with status '{job['status']}'"},
            status_code=400
        )
    
    with db.conn() as conn:
        conn.execute("DELETE FROM job_tracking WHERE job_id = ?", (job_id,))
    
    return {
        "status": "success",
        "deleted_job": job_id,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/admin/jobs/cleanup")
def cleanup_old_jobs(days: int = Query(30, ge=1, le=365)):
    """Delete old completed jobs (for maintenance)."""
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    with db.conn() as conn:
        result = conn.execute(
            "DELETE FROM job_tracking WHERE status IN ('done', 'error') AND completed_at < ?",
            (cutoff,)
        )
        deleted_count = result.rowcount
    
    return {
        "status": "success",
        "deleted_count": deleted_count,
        "before_date": cutoff.isoformat(),
        "timestamp": datetime.utcnow().isoformat()
    }


# Import uuid for retry function
import uuid
from libs.satbase_core.utils.logging import log


@router.post("/admin/news/reset-bodies")
def reset_all_bodies(
    clear_flag: bool = True
):
    """
    Reset ALL bodies: Set body_text=NULL, body_available=0, no_body_crawl=0.
    
    This allows re-crawling with the improved Trafilatura extraction.
    
    Parameters:
    - clear_flag: If True, also reset no_body_crawl flags (default: True)
    
    Returns: Count of affected articles
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    with db.conn() as conn:
        if clear_flag:
            # Reset body AND allow re-crawling
            result = conn.execute(
                "UPDATE news_articles SET body_text = NULL, body_available = 0, no_body_crawl = 0"
            )
        else:
            # Reset body but keep no_body_crawl flags intact
            result = conn.execute(
                "UPDATE news_articles SET body_text = NULL, body_available = 0"
            )
        
        affected_count = result.rowcount
    
    return {
        "status": "ok",
        "affected": affected_count,
        "clear_flag": clear_flag,
        "message": f"Reset {affected_count} article bodies. Re-crawling enabled: {clear_flag}"
    }


@router.post("/admin/news/refetch-bodies")
def refetch_missing_bodies(
    max_items: int = 100,
    dry_run: bool = False
):
    """
    Re-fetch bodies for articles that have no body AND are not tagged as no_body_crawl.
    
    Useful after reset-bodies to re-crawl with improved Trafilatura extraction.
    
    Parameters:
    - max_items: Max articles to process (default 100, prevents timeouts)
    - dry_run: Preview without fetching (shows which articles would be processed)
    
    Returns: Summary of fetched/failed articles
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    
    success_count = 0
    failed_count = 0
    skipped_count = 0
    sample_success = []
    sample_failed = []
    
    with db.conn() as conn:
        # Find articles without body that are not flagged
        rows = conn.execute("""
            SELECT id, url, title, body_text
            FROM news_articles
            WHERE (body_available = 0 OR body_text IS NULL)
              AND (no_body_crawl = 0 OR no_body_crawl IS NULL)
            ORDER BY fetched_at DESC
            LIMIT ?
        """, (max_items,)).fetchall()
        
        total_candidates = len(rows)
        
        if dry_run:
            return {
                "status": "dry_run",
                "total_candidates": total_candidates,
                "sample": [
                    {"id": r[0], "url": r[1], "title": r[2][:60]}
                    for r in rows[:10]
                ]
            }
        
        for row in rows:
            article_id, url, title, current_body = row
            
            # Skip if body already exists (edge case)
            if current_body and len(current_body.strip()) > 100:
                skipped_count += 1
                continue
            
            try:
                # Fetch body with Trafilatura (via fetch_text_with_retry)
                body_text = fetch_text_with_retry(
                    url,
                    max_retries=2,
                    timeout=20
                )
                
                if body_text and len(body_text.strip()) > 100:
                    # Success: Update database
                    conn.execute("""
                        UPDATE news_articles
                        SET body_text = ?, body_available = 1
                        WHERE id = ?
                    """, (body_text[:1000000], article_id))  # Cap at 1MB
                    
                    success_count += 1
                    
                    if len(sample_success) < 5:
                        sample_success.append({
                            "id": article_id,
                            "title": title[:60],
                            "body_length": len(body_text)
                        })
                else:
                    # Failed: No body or too short
                    failed_count += 1
                    
                    if len(sample_failed) < 5:
                        sample_failed.append({
                            "id": article_id,
                            "title": title[:60],
                            "reason": "no_content_or_too_short"
                        })
                    
            except Exception as e:
                failed_count += 1
                
                if len(sample_failed) < 5:
                    sample_failed.append({
                        "id": article_id,
                        "title": title[:60],
                        "error": str(e)[:100]
                    })
                
                log("refetch_body_error", article_id=article_id, error=str(e)[:100])
    
    return {
        "status": "ok",
        "total_candidates": len(rows),
        "success": success_count,
        "failed": failed_count,
        "skipped": skipped_count,
        "sample_success": sample_success,
        "sample_failed": sample_failed,
        "message": f"Successfully fetched {success_count} bodies, {failed_count} failed"
    }


@router.post("/admin/news/cleanup-quality")
def cleanup_low_quality_bodies(
    dry_run: bool = False,
    max_items: int = 1000,
    quality_threshold: float = 0.35
):
    """
    Scan news bodies using Quality Score heuristics (no ML).
    Remove low-quality bodies, tag to prevent re-crawling, delete Tesseract body vectors.
    
    Uses scientific metrics: link density, text density, paragraph count, stopword ratio,
    token diversity, boilerplate phrase matching, navigation keywords, repetition.
    
    Parameters:
    - dry_run: Preview without changes
    - max_items: Max articles to check (default 1000)
    - quality_threshold: Score threshold (0.0-1.0, default 0.35)
    
    Returns: Summary of affected articles
    """
    s = load_settings()
    db = NewsDB(s.stage_dir.parent / "news.db")
    tesseract_base = "http://localhost:8081"
    
    checked = 0
    affected = 0
    tagged = 0
    deleted_vectors = 0
    affected_ids: list[str] = []
    sample_results = []
    
    with db.conn() as conn:
        rows = conn.execute(
            "SELECT id, url, title, body_text FROM news_articles WHERE body_available = 1 ORDER BY fetched_at DESC LIMIT ?",
            (max_items,)
        ).fetchall()
        
        for row in rows:
            checked += 1
            article_id, url, title, body_text = row
            
            if not body_text or len(body_text.strip()) < 100:
                # Too short → auto-junk
                affected += 1
                affected_ids.append(article_id)
                sample_results.append({
                    "id": article_id,
                    "title": title[:60],
                    "verdict": "junk",
                    "reason": "too_short",
                    "score": 0.0
                })
                
                if not dry_run:
                    db.clear_body_and_tag(article_id, tag_skip=True)
                    tagged += 1
                    # Delete body vector in Tesseract
                    try:
                        with httpx.Client(timeout=5.0) as client:
                            r = client.delete(f"{tesseract_base}/v1/admin/vectors/{article_id}/body")
                            if r.status_code == 200:
                                deleted_vectors += 1
                    except Exception:
                        pass
                continue
            
            # Quality Score Analysis
            try:
                quality_result = calculate_quality_score(body_text)
                score = quality_result["score"]
                verdict = quality_result["verdict"]
                
                if score < quality_threshold:
                    affected += 1
                    affected_ids.append(article_id)
                    
                    # Sample first 10 for debugging
                    if len(sample_results) < 10:
                        sample_results.append({
                            "id": article_id,
                            "title": title[:60],
                            "score": score,
                            "verdict": verdict,
                            "metrics": quality_result["metrics"]
                        })
                    
                    if not dry_run:
                        db.clear_body_and_tag(article_id, tag_skip=True)
                        tagged += 1
                        # Delete body vector in Tesseract
                        try:
                            with httpx.Client(timeout=5.0) as client:
                                r = client.delete(f"{tesseract_base}/v1/admin/vectors/{article_id}/body")
                                if r.status_code == 200:
                                    deleted_vectors += 1
                        except Exception:
                            pass
                
            except Exception as e:
                # Scoring error → skip this article
                log("quality_score_error", article_id=article_id, error=str(e)[:100])
                continue
    
    return {
        "checked": checked,
        "affected": affected,
        "tagged": tagged,
        "deleted_vectors": deleted_vectors,
        "dry_run": dry_run,
        "quality_threshold": quality_threshold,
        "sample_results": sample_results,
        "ids": affected_ids[:50]  # First 50 IDs
    }
