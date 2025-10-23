# libs/manifold_core/scoring.py
"""Ranking & boosts for Manifold search."""
from typing import Any
from datetime import datetime, timezone
import numpy as np


def compute_final_score(
    base_sim: float,
    created_at: str,
    thought_type: str,
    tickers: list[str],
    boosts: dict[str, Any] | None = None,
) -> float:
    """
    Final score = 0.6*base_sim + 0.2*recency + 0.1*type + 0.1*ticker
    Clamp [0,1].
    """
    recency = _recency_score(created_at)
    type_score = _type_score(thought_type, boosts)
    ticker_score = _ticker_score(tickers, boosts)
    
    final = 0.6 * base_sim + 0.2 * recency + 0.1 * type_score + 0.1 * ticker_score
    return max(0.0, min(1.0, final))


def _recency_score(created_at_str: str) -> float:
    """Exponential decay from now; half-life ~30 days."""
    try:
        created = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        # Ensure timezone-aware
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
    except:
        return 0.5
    now = datetime.now(timezone.utc)
    delta_days = (now - created).total_seconds() / 86400.0
    # exp(-0.02*days) => half-life ~34.6 days
    return float(np.exp(-0.02 * max(0, delta_days)))


def _type_score(thought_type: str, boosts: dict[str, Any] | None) -> float:
    """Type boost if configured."""
    if not boosts or "type" not in boosts:
        return 0.5
    type_map = boosts["type"]
    return type_map.get(thought_type, 0.5)


def _ticker_score(tickers: list[str], boosts: dict[str, Any] | None) -> float:
    """Ticker boost: if any ticker in boost list, return max."""
    if not boosts or "tickers" not in boosts or not tickers:
        return 0.5
    ticker_map = boosts["tickers"]
    scores = [ticker_map.get(t, 0.5) for t in tickers]
    return max(scores) if scores else 0.5


def apply_mmr(
    candidates: list[dict],
    lambda_param: float = 0.5,
    k: int = 10,
) -> list[dict]:
    """
    Maximal Marginal Relevance: diversify top-k.
    candidates: list of {id, score, thought}
    """
    if not candidates or k <= 0:
        return candidates
    
    # Simple greedy MMR: pick highest score, then penalize similar docs
    selected = []
    remaining = list(candidates)
    
    while len(selected) < k and remaining:
        if not selected:
            # pick highest score first
            best_idx = max(range(len(remaining)), key=lambda i: remaining[i]["score"])
            selected.append(remaining.pop(best_idx))
        else:
            # MMR: lambda*score - (1-lambda)*max_sim_to_selected
            # For simplicity, assume max_sim_to_selected ~= 0.9 if same ticker else 0.3
            scores_mmr = []
            for cand in remaining:
                sim_to_selected = max(
                    _pseudo_similarity(cand, s) for s in selected
                )
                mmr = lambda_param * cand["score"] - (1 - lambda_param) * sim_to_selected
                scores_mmr.append(mmr)
            best_idx = max(range(len(remaining)), key=lambda i: scores_mmr[i])
            selected.append(remaining.pop(best_idx))
    
    return selected


def _pseudo_similarity(a: dict, b: dict) -> float:
    """Naive similarity: share tickers => 0.9, else 0.3."""
    a_tickers = set(a.get("thought", {}).get("tickers", []))
    b_tickers = set(b.get("thought", {}).get("tickers", []))
    if a_tickers & b_tickers:
        return 0.9
    return 0.3

