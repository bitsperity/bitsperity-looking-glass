"""
Fetch missing bodies for news_docs and ensure 1:1 mapping by deleting docs with un-fetchable bodies.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import polars as pl

from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import partition_path, upsert_parquet_by_id, delete_by_ids
from libs.satbase_core.adapters.http import fetch_text_with_retry
from libs.satbase_core.utils.logging import log


def fetch_missing_bodies_job(max_articles: int = 200) -> dict[str, Any]:
    s = load_settings()
    stage = Path(s.stage_dir)

    today = date.today()

    # Iterate recent days (last 3 days) for speed
    days = [today - timedelta(days=d) for d in range(0, 3)]

    fetched = 0
    deleted = 0

    for d in days:
        # Load docs for sources
        for source in ["news_rss", "gdelt"]:
            docs_path = partition_path(stage, source, d) / "news_docs.parquet"
            if not docs_path.exists():
                continue
            try:
                df_docs = pl.read_parquet(docs_path)
            except Exception:
                continue

            if "id" not in df_docs.columns:
                continue

            # Load bodies
            bodies_path = partition_path(stage, "news_body", d) / "news_body.parquet"
            if bodies_path.exists():
                try:
                    df_bodies = pl.read_parquet(bodies_path)
                except Exception:
                    df_bodies = pl.DataFrame({"id": []})
            else:
                df_bodies = pl.DataFrame({"id": []})

            have_body = set(df_bodies["id"].to_list()) if df_bodies.height > 0 else set()

            missing_df = df_docs.filter(~pl.col("id").is_in(list(have_body)))
            if missing_df.height == 0:
                continue

            # Process up to max_articles per day across sources
            for row in missing_df.head(max_articles - fetched).to_dicts():
                if fetched >= max_articles:
                    break
                url = row.get("url")
                nid = row.get("id")
                if not url or not nid:
                    continue

                text = fetch_text_with_retry(url, max_retries=2, timeout=15)
                if text and len(text) > 100:
                    # Upsert body
                    upsert_parquet_by_id(stage, "news_body", d, "news_body", "id", [{
                        "id": nid,
                        "url": url,
                        "content_text": text,
                        "fetched_at": datetime.utcnow(),
                        "published_at": row.get("published_at") or datetime.utcnow()
                    }])
                    fetched += 1
                else:
                    # Delete doc (un-fetchable)
                    delete_by_ids(stage, source, d, "news_docs", "id", [nid])
                    deleted += 1

    status = {
        "status": "ok",
        "fetched": fetched,
        "deleted": deleted,
        "days_scanned": len(days)
    }

    log("fetch_missing_bodies_job", **status)
    return status
