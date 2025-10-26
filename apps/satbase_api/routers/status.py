from pathlib import Path
from datetime import datetime
from fastapi import APIRouter
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.news_db import NewsDB
import time
from typing import Optional

router = APIRouter()

# In-memory cache with TTL
class CoverageCache:
    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        self.data: Optional[dict] = None
        self.timestamp: float = 0
    
    def get(self) -> Optional[dict]:
        """Get cached data if still valid"""
        if self.data is None:
            return None
        
        if time.time() - self.timestamp > self.ttl:
            self.data = None
            return None
        
        return self.data
    
    def set(self, data: dict):
        """Store data in cache"""
        self.data = data
        self.timestamp = time.time()
    
    def is_stale(self) -> bool:
        """Check if cache needs refresh"""
        return self.data is None or (time.time() - self.timestamp > self.ttl)

# Global cache instance
_coverage_cache = CoverageCache(ttl_seconds=300)  # 5 minutes

@router.get("/status/coverage")
def get_coverage(cached: bool = True):
    """
    Get complete data coverage overview using SQLite.
    
    Returns inventory of all available data: news, prices, macro indicators.
    """
    # Check cache first if requested
    if cached:
        cached_data = _coverage_cache.get()
        if cached_data is not None:
            return cached_data
    
    # Compute coverage
    s = load_settings()
    stage_dir = Path(s.stage_dir)
    
    coverage = {
        "news": _analyze_news_coverage(stage_dir),
        "prices": _analyze_prices_coverage(stage_dir),
        "macro": _analyze_macro_coverage(stage_dir),
        "_cached": False,
        "_timestamp": datetime.now().isoformat()
    }
    
    # Store in cache
    _coverage_cache.set(coverage)
    coverage["_cached"] = False
    
    return coverage


def _analyze_news_coverage(stage_dir: Path) -> dict:
    """Analyze news data coverage from SQLite"""
    db_path = stage_dir.parent / "news.db"
    
    result = {
        "total_articles": 0,
        "date_range": {"from": None, "to": None},
        "sources": {},
        "tickers_mentioned": 0,
        "articles_with_bodies": 0
    }
    
    # Check if database exists
    if not db_path.exists():
        return result
    
    db = NewsDB(db_path)
    stats = db.get_coverage_stats()
    
    result["total_articles"] = stats["total"]
    result["date_range"]["from"] = stats["earliest"]
    result["date_range"]["to"] = stats["latest"]
    result["sources"]["mediastack"] = {"count": stats["total"]}
    result["tickers_mentioned"] = stats["unique_tickers"]
    result["articles_with_bodies"] = stats["total"]  # All have bodies now!
    
    return result


def _analyze_prices_coverage(stage_dir: Path) -> dict:
    """Analyze prices data coverage"""
    import polars as pl
    
    result = {
        "tickers_available": [],
        "ticker_count": 0,
        "date_ranges": {}
    }
    
    # Check Stooq directory (ticker-based storage)
    stooq_dir = stage_dir / "stooq" / "prices_daily"
    if stooq_dir.exists():
        for parquet_file in stooq_dir.glob("*.parquet"):
            ticker = parquet_file.stem
            if ticker and not ticker.endswith(".invalid"):
                result["tickers_available"].append(ticker)
                
                # Get date range for this ticker
                try:
                    df = pl.read_parquet(parquet_file)
                    if len(df) > 0 and "date" in df.columns:
                        dates = df.select("date").sort("date")
                        min_date = str(dates["date"][0])
                        max_date = str(dates["date"][-1])
                        result["date_ranges"][ticker] = {
                            "from": min_date,
                            "to": max_date,
                            "days": len(df)
                        }
                except Exception:
                    pass
    
    result["tickers_available"].sort()
    result["ticker_count"] = len(result["tickers_available"])
    
    return result


def _analyze_macro_coverage(stage_dir: Path) -> dict:
    """Analyze macro data (FRED) coverage"""
    import polars as pl
    
    result = {
        "fred_series_available": [],
        "series_count": 0,
        "observations": {}
    }
    
    # Check FRED directory (ticker-based storage)
    fred_dir = stage_dir / "macro" / "fred"
    if fred_dir.exists():
        for parquet_file in fred_dir.glob("*.parquet"):
            series_id = parquet_file.stem
            if series_id:
                result["fred_series_available"].append(series_id)
                
                # Get observation stats for this series
                try:
                    df = pl.read_parquet(parquet_file)
                    if len(df) > 0 and "date" in df.columns:
                        dates = df.select("date").sort("date")
                        min_date = str(dates["date"][0])
                        max_date = str(dates["date"][-1])
                        result["observations"][series_id] = {
                            "count": len(df),
                            "from": min_date,
                            "to": max_date
                        }
                except Exception:
                    pass
    
    result["fred_series_available"].sort()
    result["series_count"] = len(result["fred_series_available"])
    
    return result

