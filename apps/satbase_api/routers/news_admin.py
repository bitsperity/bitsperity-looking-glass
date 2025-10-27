from datetime import datetime, timedelta, date
from pathlib import Path
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from libs.satbase_core.storage.news_db import NewsDB
from libs.satbase_core.config.settings import load_settings

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
