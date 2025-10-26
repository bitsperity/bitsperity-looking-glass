from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Dict, List

from ..config.settings import load_settings
from ..storage.watchlist_db import WatchlistDB


@dataclass(frozen=True)
class WatchItem:
    symbol: str


def load_watchlist_symbols() -> list[str]:
    """Load active stock watchlist symbols from SQLite."""
    s = load_settings()
    db = WatchlistDB(s.stage_dir.parent / "control.db")
    return db.get_items_by_type('stock', only_active=True)


def load_synonyms_map() -> Dict[str, List[str]]:
    """
    Load ticker → [synonyms, aliases] mapping for entity linking.
    Currently static; future: read from DB or file.
    """
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


