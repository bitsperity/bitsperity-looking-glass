from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Dict, List

from ..config.settings import load_settings


@dataclass(frozen=True)
class WatchItem:
    symbol: str


def load_watchlist_symbols() -> list[str]:
    s = load_settings()
    path = s.stage_dir.parent / "control" / "watchlist.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text())
    except Exception:
        return []
    items = data.get("items", [])
    out: list[str] = []
    for it in items:
        sym = (it.get("symbol") or "").strip().upper()
        if sym:
            out.append(sym)
    return sorted(set(out))


def load_synonyms_map() -> Dict[str, List[str]]:
    """Load optional synonyms mapping from control/synonyms.json.
    Format: {"NVDA": ["NVIDIA", "Nvidia"], "TSM": ["TSMC", "Taiwan Semiconductor"], ...}
    """
    s = load_settings()
    path = s.stage_dir.parent / "control" / "synonyms.json"
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
        out: Dict[str, List[str]] = {}
        for sym, arr in data.items():
            if not isinstance(arr, list):
                continue
            out[sym.strip().upper()] = [str(x) for x in arr if isinstance(x, str) and x.strip()]
        return out
    except Exception:
        return {}


def match_text_to_symbols(text: str, symbols: Iterable[str]) -> list[str]:
    if not text:
        return []
    t = text.lower()
    syn_map = load_synonyms_map()
    hits: list[str] = []
    for sym in symbols:
        token = sym.lower()
        matched = False
        if token and token in t:
            matched = True
        if not matched:
            for alias in syn_map.get(sym, []):
                if alias and alias.lower() in t:
                    matched = True
                    break
        if matched:
            hits.append(sym)
    # dedupe preserve order
    seen = set()
    uniq: list[str] = []
    for h in hits:
        if h in seen:
            continue
        seen.add(h)
        uniq.append(h)
    return uniq


