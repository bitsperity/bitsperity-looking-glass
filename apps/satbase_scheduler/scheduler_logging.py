"""
Structured logging for Satbase Scheduler.
Uses JSON format compatible with satbase_core logging.
"""
import json
import sys
from datetime import datetime
from typing import Any, Dict, Optional


def log(event: str, **fields) -> None:
    """
    Structured JSON logging for scheduler.
    
    Example:
        log("job_started", job_id="watchlist_refresh", job_name="Refresh Watchlist")
    """
    rec: Dict[str, Any] = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "event": event,
        "component": "scheduler"
    }
    rec.update(fields)
    sys.stdout.write(json.dumps(rec) + "\n")
    sys.stdout.flush()


def log_job_start(job_id: str, job_name: str, **extra: Any) -> None:
    """Log job start."""
    log("job_started", job_id=job_id, job_name=job_name, **extra)


def log_job_success(
    job_id: str,
    job_name: str,
    duration_ms: int,
    result_summary: Optional[Dict[str, Any]] = None,
    **extra: Any
) -> None:
    """Log job success."""
    log(
        "job_success",
        job_id=job_id,
        job_name=job_name,
        duration_ms=duration_ms,
        result_summary=result_summary or {},
        **extra
    )


def log_job_error(
    job_id: str,
    job_name: str,
    error: str,
    duration_ms: Optional[int] = None,
    **extra: Any
) -> None:
    """Log job error."""
    log(
        "job_error",
        job_id=job_id,
        job_name=job_name,
        error=error,
        duration_ms=duration_ms,
        **extra
    )


def log_scheduler_event(event: str, **fields: Any) -> None:
    """Log scheduler-level events."""
    log(f"scheduler_{event}", **fields)

