from __future__ import annotations

import os
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        stage_dir_env = os.getenv("SATBASE_STAGE_DIR", "data/stage")
        stage_dir_path = Path(stage_dir_env)
        # Ensure absolute path - resolve relative to /app if not absolute
        if not stage_dir_path.is_absolute():
            # In Docker, default to /app/data/stage
            if Path("/app/data/stage").exists():
                stage_dir_path = Path("/app/data/stage")
            else:
                # Fallback: resolve relative to current working directory
                stage_dir_path = Path.cwd() / stage_dir_env
                stage_dir_path = stage_dir_path.resolve()
        self.stage_dir = stage_dir_path
        self.http_timeout = float(os.getenv("HTTP_TIMEOUT_SECONDS", "20"))
        self.fred_api_key = os.getenv("FRED_API_KEY", "")
        self.user_agent_email = os.getenv("USER_AGENT_EMAIL", "")
        self.api_url = os.getenv("SATBASE_API_URL", "http://localhost:8080")


def load_settings() -> Settings:
    return Settings()

