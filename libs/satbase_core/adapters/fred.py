from __future__ import annotations

from datetime import datetime, date
from typing import Any, Iterable

from ..models.macro import MacroObs
from ..config.settings import load_settings
from .http import get_json, default_headers
from ..storage.stage import write_parquet


BASE = "https://api.stlouisfed.org/fred/series/observations"


def _normalize(series_id: str, obs: dict[str, Any]) -> MacroObs | None:
    v = obs.get("value")
    d = obs.get("date")
    if v in (".", None) or not d:
        return None
    y, m, dd = d.split("-")
    return MacroObs(series_id=series_id, date=date(int(y), int(m), int(dd)), value=float(v), source="fred")


def fetch(params: dict[str, Any]) -> dict[str, list[MacroObs]]:
    series: list[str] = params.get("series", [])
    s = load_settings()
    key = s.fred_api_key
    result: dict[str, list[MacroObs]] = {}
    for sid in series:
        data = get_json(BASE, params={"series_id": sid, "api_key": key, "file_type": "json"}, headers=default_headers(s.user_agent_email), timeout=s.http_timeout)
        obss = data.get("observations", [])
        out: list[MacroObs] = []
        for ob in obss:
            mo = _normalize(sid, ob)
            if mo:
                out.append(mo)
        result[sid] = out
    return result


def normalize(raw: dict[str, list[MacroObs]]) -> Iterable[MacroObs]:
    for obss in raw.values():
        for ob in obss:
            yield ob


def sink(models: Iterable[MacroObs], partition_dt: date) -> dict:
    rows = [m.model_dump() for m in models]
    if not rows:
        return {"path": None, "count": 0}
    p = write_parquet(load_settings().stage_dir, "fred", partition_dt, "macro_obs", rows)
    return {"path": str(p), "count": len(rows)}

