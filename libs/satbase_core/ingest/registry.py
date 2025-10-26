from __future__ import annotations

from typing import Any, Callable
from dataclasses import dataclass

from ..adapters.base import AdapterMetadata


AdapterFns = tuple[
    Callable[[dict[str, Any]], Any],  # fetch
    Callable[[Any], Any],             # normalize
    Callable[[Any, Any], dict],       # sink(partition_dt)
]


@dataclass
class AdapterEntry:
    """Complete adapter registration with metadata and functions"""
    metadata: AdapterMetadata
    fns: AdapterFns


def registry() -> dict[str, AdapterFns]:
    """Legacy registry function returning just functions for backwards compatibility"""
    full = registry_with_metadata()
    return {name: entry.fns for name, entry in full.items()}


def registry_with_metadata() -> dict[str, AdapterEntry]:
    """Registry with full adapter metadata and capabilities"""
    from ..adapters import stooq, fred, btc_oracle
    from ..adapters import gdelt_doc_v2, news_google_rss, eod_yfinance
    from ..adapters import news_body_fetcher, mediastack

    return {
        "gdelt_doc_v2": AdapterEntry(
            metadata=AdapterMetadata(
                name="gdelt_doc_v2",
                category="news",
                supports_historical=True,
                description="GDELT Document API v2 - supports historical queries with date ranges"
            ),
            fns=(gdelt_doc_v2.fetch, gdelt_doc_v2.normalize, gdelt_doc_v2.sink)
        ),
        "mediastack": AdapterEntry(
            metadata=AdapterMetadata(
                name="mediastack",
                category="news",
                supports_historical=True,
                description="Mediastack API - professional news aggregator with unlimited historical data (Standard plan+)"
            ),
            fns=(mediastack.fetch, mediastack.normalize, mediastack.sink)
        ),
        "news_google_rss": AdapterEntry(
            metadata=AdapterMetadata(
                name="news_google_rss",
                category="news",
                supports_historical=False,
                description="Google News RSS - only current news (last 24-48h)"
            ),
            fns=(news_google_rss.fetch, news_google_rss.normalize, news_google_rss.sink)
        ),
        "stooq": AdapterEntry(
            metadata=AdapterMetadata(
                name="stooq",
                category="prices",
                supports_historical=False,
                description="Stooq EOD prices - daily delta fetch"
            ),
            fns=(stooq.fetch, stooq.normalize, stooq.sink)
        ),
        "eod_yfinance": AdapterEntry(
            metadata=AdapterMetadata(
                name="eod_yfinance",
                category="prices",
                supports_historical=True,
                description="Yahoo Finance - supports historical price queries"
            ),
            fns=(eod_yfinance.fetch, eod_yfinance.normalize, eod_yfinance.sink)
        ),
        "fred": AdapterEntry(
            metadata=AdapterMetadata(
                name="fred",
                category="macro",
                supports_historical=True,
                description="FRED Economic Data - supports historical queries"
            ),
            fns=(fred.fetch, fred.normalize, fred.sink)
        ),
        "btc_oracle": AdapterEntry(
            metadata=AdapterMetadata(
                name="btc_oracle",
                category="crypto",
                supports_historical=True,
                description="Bitcoin on-chain metrics"
            ),
            fns=(btc_oracle.fetch, btc_oracle.normalize, btc_oracle.sink)
        ),
        "news_body_fetcher": AdapterEntry(
            metadata=AdapterMetadata(
                name="news_body_fetcher",
                category="news",
                supports_historical=False,
                description="Fetches full article bodies for existing news docs"
            ),
            fns=(news_body_fetcher.fetch, news_body_fetcher.normalize, news_body_fetcher.sink)
        ),
    }

