from __future__ import annotations

import os
from pathlib import Path

from .db_client import CoalesenceDB


def get_db() -> CoalesenceDB:
    """Get coalescence database instance."""
    db_path = os.getenv("COALESCENCE_DB_PATH", "data/logs/orchestration.db")
    # Convert relative path to absolute
    if not Path(db_path).is_absolute():
        db_path = Path(__file__).parent.parent.parent / db_path
    return CoalesenceDB(str(db_path))

