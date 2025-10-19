from __future__ import annotations

from datetime import date
from pathlib import Path
import yaml

from ..config.settings import load_settings
from ..utils.logging import log
from .registry import registry


def main() -> None:
    s = load_settings()
    cfg_path = Path("libs/satbase_core/config/sources.yaml")
    if not cfg_path.exists():
        log("ingest_config_missing", path=str(cfg_path))
        return
    cfg = yaml.safe_load(cfg_path.read_text())
    today = date.today()
    reg = registry()
    for src, enabled in ((k, v.get("enabled", True)) for k, v in cfg.items()):
        if not enabled:
            continue
        params = cfg[src]
        fetch, normalize, sink = reg[src]
        log("ingest_start", source=src)
        try:
            raw = fetch(params)
            models = normalize(raw)
            info = sink(models, today)
            log("ingest_done", source=src, **info)
        except Exception as e:
            log("ingest_error", source=src, error=str(e.__class__.__name__), message=str(e))
            # nicht crashen: nächste Quelle weiter
            continue
    log("ingest_finish")


if __name__ == "__main__":
    main()

