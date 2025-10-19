from __future__ import annotations

from typing import Any, Callable


AdapterFns = tuple[
    Callable[[dict[str, Any]], Any],  # fetch
    Callable[[Any], Any],             # normalize
    Callable[[Any, Any], dict],       # sink(partition_dt)
]


def registry() -> dict[str, AdapterFns]:
    from ..adapters import stooq, fred, btc_oracle
    from ..adapters import gdelt_doc_v2, news_google_rss, eod_yfinance
    from ..adapters import news_body_fetcher

    return {
        "gdelt_doc_v2": (gdelt_doc_v2.fetch, gdelt_doc_v2.normalize, gdelt_doc_v2.sink),
        "news_google_rss": (news_google_rss.fetch, news_google_rss.normalize, news_google_rss.sink),
        "stooq": (stooq.fetch, stooq.normalize, stooq.sink),
        "eod_yfinance": (eod_yfinance.fetch, eod_yfinance.normalize, eod_yfinance.sink),
        "fred": (fred.fetch, fred.normalize, fred.sink),
        "btc_oracle": (btc_oracle.fetch, btc_oracle.normalize, btc_oracle.sink),
        "news_body_fetcher": (news_body_fetcher.fetch, news_body_fetcher.normalize, news_body_fetcher.sink),
    }

