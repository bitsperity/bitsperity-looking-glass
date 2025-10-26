from pathlib import Path
from datetime import datetime
import polars as pl
from fastapi import APIRouter
from libs.satbase_core.config.settings import load_settings
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
    Get complete data coverage overview.
    
    Returns inventory of all available data: news, prices, macro indicators.
    
    Query Parameters:
    - cached (bool): Use cached data if available (default: true). Set to false to force refresh.
    
    Agents use this to understand what data they have access to.
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
    """Analyze news data coverage"""
    result = {
        "total_articles": 0,
        "date_range": {"from": None, "to": None},
        "sources": {},
        "tickers_mentioned": 0,
        "articles_with_bodies": 0
    }
    
    # Analyze GDELT news
    gdelt_dir = stage_dir / "gdelt"
    if gdelt_dir.exists():
        gdelt_stats = _scan_news_source(gdelt_dir)
        result["sources"]["gdelt"] = gdelt_stats
        result["total_articles"] += gdelt_stats["count"]
    
    # Analyze RSS news
    rss_dir = stage_dir / "news_rss"
    if rss_dir.exists():
        rss_stats = _scan_news_source(rss_dir)
        result["sources"]["rss"] = rss_stats
        result["total_articles"] += rss_stats["count"]
    
    # Calculate overall date range
    source_dates = []
    for source_stats in result["sources"].values():
        if source_stats.get("earliest"):
            source_dates.append(source_stats["earliest"])
        if source_stats.get("latest"):
            source_dates.append(source_stats["latest"])
    
    if source_dates:
        result["date_range"]["from"] = min(source_dates)
        result["date_range"]["to"] = max(source_dates)
    
    # Count unique tickers mentioned
    tickers_set = set()
    for source_name in ["gdelt", "news_rss"]:
        source_dir = stage_dir / source_name
        if source_dir.exists():
            for parquet_file in source_dir.rglob("*.parquet"):
                try:
                    df = pl.read_parquet(parquet_file)
                    if "tickers" in df.columns:
                        # Explode and collect unique tickers
                        unique_tickers = df.select("tickers").explode("tickers").unique()
                        for ticker in unique_tickers["tickers"].to_list():
                            if ticker:
                                tickers_set.add(ticker)
                except Exception:
                    continue
    
    result["tickers_mentioned"] = len(tickers_set)
    
    # Count articles with bodies
    body_dir = stage_dir / "news_body"
    if body_dir.exists():
        body_count = 0
        for parquet_file in body_dir.rglob("*.parquet"):
            try:
                df = pl.read_parquet(parquet_file)
                body_count += len(df)
            except Exception:
                continue
        result["articles_with_bodies"] = body_count
    
    return result


def _scan_news_source(source_dir: Path) -> dict:
    """Scan a news source directory and return stats"""
    stats = {
        "count": 0,
        "earliest": None,
        "latest": None
    }
    
    dates = []
    total_count = 0
    
    for parquet_file in source_dir.rglob("*.parquet"):
        try:
            df = pl.read_parquet(parquet_file)
            total_count += len(df)
            
            # Extract dates from file path (YYYY/MM/DD structure)
            parts = parquet_file.parts
            try:
                # Find year/month/day in path
                for i, part in enumerate(parts):
                    if part.isdigit() and len(part) == 4 and 2000 <= int(part) <= 2100:
                        year = int(part)
                        month = int(parts[i+1]) if i+1 < len(parts) and parts[i+1].isdigit() else 1
                        day = int(parts[i+2]) if i+2 < len(parts) and parts[i+2].isdigit() else 1
                        dates.append(f"{year:04d}-{month:02d}-{day:02d}")
                        break
            except Exception:
                pass
        except Exception:
            continue
    
    stats["count"] = total_count
    
    if dates:
        stats["earliest"] = min(dates)
        stats["latest"] = max(dates)
    
    return stats


def _analyze_prices_coverage(stage_dir: Path) -> dict:
    """Analyze prices data coverage"""
    result = {
        "tickers_available": [],
        "ticker_count": 0,
        "date_ranges": {}
    }
    
    # Check Stooq directory (index-based storage)
    stooq_dir = stage_dir / "stooq" / "prices_daily"
    if stooq_dir.exists():
        for parquet_file in stooq_dir.glob("*.parquet"):
            ticker = parquet_file.stem  # Filename without .parquet
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
    result = {
        "fred_series_available": [],
        "series_count": 0,
        "observations": {}
    }
    
    # Check FRED directory (index-based storage)
    fred_dir = stage_dir / "macro" / "fred"
    if fred_dir.exists():
        for parquet_file in fred_dir.glob("*.parquet"):
            series_id = parquet_file.stem  # Filename without .parquet
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

