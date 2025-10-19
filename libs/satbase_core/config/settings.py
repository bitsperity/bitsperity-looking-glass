from __future__ import annotations

import os
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        self.stage_dir = Path(os.getenv("SATBASE_STAGE_DIR", "data/stage"))
        self.http_timeout = float(os.getenv("HTTP_TIMEOUT_SECONDS", "20"))
        self.fred_api_key = os.getenv("FRED_API_KEY", "")
        self.user_agent_email = os.getenv("USER_AGENT_EMAIL", "")


def load_settings() -> Settings:
    return Settings()

