"""
Job wrapper for automatic logging and state tracking.
"""
import asyncio
import time
from datetime import datetime
from typing import Any, Callable, Dict, Optional

from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.scheduler_db import SchedulerDB
from scheduler_logging import log_job_start, log_job_success, log_job_error


def wrap_job(job_id: str, job_name: str):
    """
    Decorator to wrap async job functions with automatic logging and state tracking.
    
    Usage:
        @wrap_job("watchlist_refresh", "Refresh Watchlist")
        async def refresh_watchlist():
            # job code here
            return {"status": "ok", "items": 5}
    """
    def decorator(func: Callable) -> Callable:
        async def wrapper(*args, **kwargs) -> Any:
            execution_id: Optional[int] = None
            start_time = time.time()
            
            try:
                # Initialize DB connection
                s = load_settings()
                db = SchedulerDB(s.stage_dir.parent / "scheduler.db")
                
                # Create execution record
                execution_id = db.create_execution(job_id, datetime.utcnow())
                
                # Log start
                log_job_start(job_id, job_name)
                
                # Execute job
                result = await func(*args, **kwargs)
                
                # Calculate duration
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Extract result summary
                result_summary: Dict[str, Any] = {}
                if isinstance(result, dict):
                    result_summary = {
                        k: v for k, v in result.items()
                        if k not in ['status', 'error', 'timestamp']
                    }
                    if 'status' in result:
                        result_summary['status'] = result['status']
                
                # Update execution record
                db.complete_execution(
                    execution_id,
                    status='success',
                    duration_ms=duration_ms,
                    result_summary=result_summary
                )
                
                # Update job last run
                db.update_job_last_run(
                    job_id,
                    status='success',
                    duration_ms=duration_ms
                )
                
                # Log success
                log_job_success(job_id, job_name, duration_ms, result_summary)
                
                return result
                
            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                error_msg = str(e)
                
                try:
                    s = load_settings()
                    db = SchedulerDB(s.stage_dir.parent / "scheduler.db")
                    
                    # Update execution record
                    if execution_id:
                        db.complete_execution(
                            execution_id,
                            status='error',
                            duration_ms=duration_ms,
                            error_message=error_msg
                        )
                    
                    # Update job last run
                    db.update_job_last_run(
                        job_id,
                        status='error',
                        duration_ms=duration_ms,
                        error=error_msg
                    )
                except Exception as db_error:
                    # Don't fail if DB update fails
                    pass
                
                # Log error
                log_job_error(job_id, job_name, error_msg, duration_ms)
                
                # Re-raise to let scheduler handle it
                raise
        
        return wrapper
    return decorator

