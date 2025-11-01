"""
Scheduler control and monitoring API endpoints.
"""
from datetime import datetime
from typing import Any, List, Optional
from fastapi import APIRouter, Query, status
from fastapi.responses import JSONResponse

from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.scheduler_db import SchedulerDB


router = APIRouter()


def _get_db() -> SchedulerDB:
    """Get scheduler database instance."""
    s = load_settings()
    return SchedulerDB(s.stage_dir.parent / "scheduler.db")


@router.get("/scheduler/jobs")
def list_jobs(enabled_only: bool = Query(False, description="Only return enabled jobs")):
    """List all scheduler jobs with their configuration and status."""
    db = _get_db()
    jobs = db.list_jobs(enabled_only=enabled_only)
    
    return {
        "count": len(jobs),
        "jobs": jobs
    }


@router.get("/scheduler/jobs/{job_id}")
def get_job(job_id: str):
    """Get a specific job configuration and status."""
    db = _get_db()
    job = db.get_job(job_id)
    
    if not job:
        return JSONResponse(
            {"error": f"Job '{job_id}' not found"},
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    return job


@router.post("/scheduler/jobs/{job_id}/enable")
def enable_job(job_id: str):
    """Enable a job."""
    db = _get_db()
    
    if not db.get_job(job_id):
        return JSONResponse(
            {"error": f"Job '{job_id}' not found"},
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    success = db.update_job_enabled(job_id, enabled=True)
    
    if success:
        return {
            "status": "ok",
            "job_id": job_id,
            "enabled": True,
            "message": f"Job '{job_id}' enabled"
        }
    else:
        return JSONResponse(
            {"error": "Failed to enable job"},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/scheduler/jobs/{job_id}/disable")
def disable_job(job_id: str):
    """Disable a job."""
    db = _get_db()
    
    if not db.get_job(job_id):
        return JSONResponse(
            {"error": f"Job '{job_id}' not found"},
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    success = db.update_job_enabled(job_id, enabled=False)
    
    if success:
        return {
            "status": "ok",
            "job_id": job_id,
            "enabled": False,
            "message": f"Job '{job_id}' disabled"
        }
    else:
        return JSONResponse(
            {"error": "Failed to disable job"},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/scheduler/jobs/{job_id}/trigger")
async def trigger_job(job_id: str):
    """
    Manually trigger a job immediately.
    Executes the job function directly (bypasses scheduler timing).
    """
    db = _get_db()
    job = db.get_job(job_id)
    
    if not job:
        return JSONResponse(
            {"error": f"Job '{job_id}' not found"},
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    if not job['enabled']:
        return JSONResponse(
            {"error": f"Job '{job_id}' is disabled"},
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Map job_id to actual job function
    # Import job functions dynamically - jobs are in satbase_scheduler which is mounted as volume
    try:
        import sys
        import os
        from pathlib import Path
        
        # Load settings BEFORE changing directory to ensure absolute paths
        s = load_settings()
        # Ensure stage_dir is absolute
        if not s.stage_dir.is_absolute():
            s.stage_dir = Path("/app/data/stage").resolve()
        
        # Set environment variable to ensure child processes use absolute path
        os.environ["SATBASE_STAGE_DIR"] = str(s.stage_dir)
        
        # Try to find scheduler path - could be in /app/apps/satbase_scheduler or relative
        scheduler_paths = [
            Path("/app/apps/satbase_scheduler"),
            Path(__file__).parent.parent.parent / "satbase_scheduler",
            Path(__file__).parent.parent.parent.parent / "apps" / "satbase_scheduler"
        ]
        
        scheduler_path = None
        for path in scheduler_paths:
            if path.exists() and (path / "jobs").exists():
                scheduler_path = path.resolve()  # Make absolute
                break
        
        if not scheduler_path:
            return JSONResponse(
                {"error": "Scheduler jobs directory not found. Cannot execute job."},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Add scheduler path and ensure libs are accessible
        scheduler_str = str(scheduler_path)
        libs_path = Path("/app/libs").resolve()
        
        # Add paths if not already there
        if scheduler_str not in sys.path:
            sys.path.insert(0, scheduler_str)
        if str(libs_path) not in sys.path:
            sys.path.insert(0, str(libs_path))
        
        # Change to scheduler directory temporarily (for relative imports like "from job_wrapper import")
        old_cwd = os.getcwd()
        try:
            os.chdir(scheduler_path)
            
            if job_id == "topics_ingest":
                from jobs.topics import ingest_topics_job
                result = await ingest_topics_job()
            elif job_id == "watchlist_refresh":
                from jobs.watchlist import refresh_watchlist
                result = await refresh_watchlist()
            elif job_id == "fred_daily":
                from jobs.fred import refresh_fred_core
                result = await refresh_fred_core()
            elif job_id == "prices_watchlist":
                from jobs.prices import refresh_watchlist_prices
                result = await refresh_watchlist_prices()
            elif job_id == "prices_gaps":
                from jobs.prices import detect_price_gaps
                result = await detect_price_gaps()
            elif job_id == "prices_fill_gaps":
                from jobs.prices import fill_price_gaps
                result = await fill_price_gaps()
            elif job_id == "gaps_detect":
                from jobs.gaps import detect_gaps
                result = await detect_gaps()
            elif job_id == "gaps_fill":
                from jobs.gaps import fill_gaps
                result = await fill_gaps()
            else:
                return JSONResponse(
                    {"error": f"Manual trigger not yet implemented for job '{job_id}'"},
                    status_code=status.HTTP_501_NOT_IMPLEMENTED
                )
            
            return {
                "status": "completed",
                "job_id": job_id,
                "result": result,
                "message": f"Job '{job_id}' executed successfully"
            }
        finally:
            os.chdir(old_cwd)
            # Clean up sys.path (optional, but cleaner)
            if scheduler_str in sys.path:
                sys.path.remove(scheduler_str)
            if str(libs_path) in sys.path and str(libs_path) != "/app/libs":  # Don't remove if it was already there
                try:
                    sys.path.remove(str(libs_path))
                except ValueError:
                    pass
            
    except ImportError as e:
        return JSONResponse(
            {"error": f"Failed to import job function: {str(e)}"},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        import traceback
        return JSONResponse(
            {"error": f"Job execution failed: {str(e)}", "traceback": traceback.format_exc()},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/scheduler/jobs/{job_id}/executions")
def get_job_executions(
    job_id: str,
    limit: int = Query(50, ge=1, le=500),
    status_filter: Optional[str] = Query(None, description="Filter by status: success, error, running")
):
    """Get execution history for a job."""
    db = _get_db()
    
    if not db.get_job(job_id):
        return JSONResponse(
            {"error": f"Job '{job_id}' not found"},
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    executions = db.get_executions(job_id=job_id, limit=limit, status=status_filter)
    
    return {
        "job_id": job_id,
        "count": len(executions),
        "executions": executions
    }


@router.get("/scheduler/executions")
def list_all_executions(
    limit: int = Query(100, ge=1, le=500),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    job_id: Optional[str] = Query(None, description="Filter by job_id")
):
    """Get all execution history across all jobs."""
    db = _get_db()
    executions = db.get_executions(job_id=job_id, limit=limit, status=status_filter)
    
    return {
        "count": len(executions),
        "executions": executions
    }


@router.get("/scheduler/gaps")
def list_gaps(
    gap_type: Optional[str] = Query(None, description="Filter by type: news, prices, macro"),
    severity: Optional[str] = Query(None, description="Filter by severity: critical, high, medium, low"),
    filled: Optional[bool] = Query(None, description="Filter by filled status"),
    limit: int = Query(50, ge=1, le=500)
):
    """List detected data gaps."""
    db = _get_db()
    
    if filled is False:
        gaps = db.get_unfilled_gaps(gap_type=gap_type, severity=severity, limit=limit)
    else:
        # Get all gaps (would need additional method)
        gaps = db.get_unfilled_gaps(gap_type=gap_type, severity=severity, limit=limit)
        # Note: This only returns unfilled gaps. For all gaps, we'd need a new method.
    
    return {
        "count": len(gaps),
        "gaps": gaps
    }


@router.get("/scheduler/status")
def get_scheduler_status():
    """Get overall scheduler status and statistics."""
    db = _get_db()
    
    jobs = db.list_jobs()
    enabled_jobs = [j for j in jobs if j['enabled']]
    
    # Get recent executions
    recent_executions = db.get_executions(limit=100)
    
    # Calculate statistics
    stats = {
        "total_jobs": len(jobs),
        "enabled_jobs": len(enabled_jobs),
        "disabled_jobs": len(jobs) - len(enabled_jobs),
        "recent_executions": {
            "total": len(recent_executions),
            "success": len([e for e in recent_executions if e['status'] == 'success']),
            "error": len([e for e in recent_executions if e['status'] == 'error']),
            "running": len([e for e in recent_executions if e['status'] == 'running'])
        }
    }
    
    # Get unfilled gaps count
    gaps = db.get_unfilled_gaps(limit=1000)
    stats["unfilled_gaps"] = {
        "total": len(gaps),
        "by_type": {},
        "by_severity": {}
    }
    
    for gap in gaps:
        gap_type = gap['gap_type']
        severity = gap['severity']
        
        stats["unfilled_gaps"]["by_type"][gap_type] = stats["unfilled_gaps"]["by_type"].get(gap_type, 0) + 1
        stats["unfilled_gaps"]["by_severity"][severity] = stats["unfilled_gaps"]["by_severity"].get(severity, 0) + 1
    
    return {
        "status": "ok",
        "stats": stats,
        "timestamp": datetime.utcnow().isoformat()
    }

