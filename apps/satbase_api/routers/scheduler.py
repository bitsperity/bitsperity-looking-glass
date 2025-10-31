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
    Note: This requires the scheduler service to be running and listening for HTTP triggers.
    For now, this endpoint returns a message indicating manual trigger is not yet implemented.
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
    
    # TODO: Implement HTTP trigger mechanism for scheduler
    # For now, return a message
    return {
        "status": "pending",
        "job_id": job_id,
        "message": "Manual trigger requires scheduler HTTP API (not yet implemented)",
        "note": "You can restart the scheduler service to reload job configurations"
    }


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

