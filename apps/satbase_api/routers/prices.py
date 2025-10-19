from datetime import date
import polars as pl
from fastapi import APIRouter, Query, status
from fastapi.responses import JSONResponse
from .ingest import enqueue_prices_daily
from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob
import yfinance as yf

router = APIRouter()

@router.get("/prices/daily/{ticker}")
def prices_daily(ticker: str, from_: str | None = Query(None, alias="from"), to: str | None = None, btc_view: bool = False):
    s = load_settings()
    
    # If no date range specified, load all available data
    use_date_filter = bool(from_ and to)
    if use_date_filter:
        dfrom = date.fromisoformat(from_)
        dto = date.fromisoformat(to)
    else:
        # Load last 10 years of data (effectively "all")
        dfrom = date(2015, 1, 1)
        dto = date.today()
    
    lf = scan_parquet_glob(s.stage_dir, "stooq", "prices_daily", dfrom, dto)
    l_t = lf.filter(pl.col("ticker") == ticker.upper())
    if btc_view:
        # Check if ticker has data
        df_t = l_t.unique(subset=["ticker","date"]).collect()
        if df_t.height == 0:
            job_id = enqueue_prices_daily([ticker, "BTCUSD"])
            return JSONResponse({"status": "fetch_on_miss", "job_id": job_id, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)
        
        # Check if BTCUSD has data for the date range
        l_btc = (
            lf.filter(pl.col("ticker") == "BTCUSD")
              .select(["date", "close"])  # EOD-Schlusskurs
              .rename({"close": "btc_close"})
        )
        df_btc = l_btc.collect()
        if df_btc.height == 0:
            job_id = enqueue_prices_daily(["BTCUSD"])
            return JSONResponse({"status": "fetch_on_miss", "job_id": job_id, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)
        
        # Now join and convert
        l_joined = l_t.join(l_btc, on="date", how="inner")
        lf_filtered = l_joined
        if use_date_filter:
            lf_filtered = lf_filtered.filter((pl.col("date") >= dfrom) & (pl.col("date") <= dto))
        df = (
            lf_filtered
            .with_columns([
                (pl.col("open") / pl.col("btc_close")).alias("open"),
                (pl.col("high") / pl.col("btc_close")).alias("high"),
                (pl.col("low") / pl.col("btc_close")).alias("low"),
                (pl.col("close") / pl.col("btc_close")).alias("close"),
            ])
            .drop(["btc_close"])  # Volume bleibt unverändert (Stückzahl)
            .unique(subset=["ticker","date"])  # Dedupe mehrfacher Tages-Scans
            .sort("date", descending=True)
            .collect()
        )
        records = df.to_dicts()
        return {"ticker": ticker.upper(), "from": from_, "to": to, "btc_view": True, "bars": records}
    else:
        lf_filtered = l_t
        if use_date_filter:
            lf_filtered = lf_filtered.filter((pl.col("date") >= dfrom) & (pl.col("date") <= dto))
        df = (
            lf_filtered
            .unique(subset=["ticker","date"])
            .sort("date", descending=True)
            .collect()
        )
        records = df.to_dicts()
        if len(records) == 0:
            job_id = enqueue_prices_daily([ticker])
            return JSONResponse({"status": "fetch_on_miss", "job_id": job_id, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)
        return {"ticker": ticker.upper(), "from": from_, "to": to, "btc_view": False, "bars": records}


@router.get("/prices/daily")
def prices_daily_multi(tickers: str, from_: str | None = Query(None, alias="from"), to: str | None = None, btc_view: bool = False):
    s = load_settings()
    if not from_ or not to:
        return {"tickers": [], "from": from_, "to": to, "btc_view": btc_view, "series": {}}
    dfrom = date.fromisoformat(from_)
    dto = date.fromisoformat(to)
    tick_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tick_list:
        return {"tickers": [], "from": from_, "to": to, "btc_view": btc_view, "series": {}}
    lf = scan_parquet_glob(s.stage_dir, "stooq", "prices_daily", dfrom, dto)
    l_all = lf.filter(pl.col("ticker").is_in(tick_list))
    if btc_view:
        l_btc = (
            lf.filter(pl.col("ticker") == "BTCUSD")
              .select(["date", "close"])  # EOD-Schlusskurs
              .rename({"close": "btc_close"})
        )
        l_joined = l_all.join(l_btc, on="date", how="inner")
        df = (
            l_joined
            .filter((pl.col("date") >= dfrom) & (pl.col("date") <= dto))  # Filter to requested date range
            .with_columns([
                (pl.col("open") / pl.col("btc_close")).alias("open"),
                (pl.col("high") / pl.col("btc_close")).alias("high"),
                (pl.col("low") / pl.col("btc_close")).alias("low"),
                (pl.col("close") / pl.col("btc_close")).alias("close"),
            ])
            .drop(["btc_close"])  # Volume bleibt unverändert
            .unique(subset=["ticker","date"])  # Dedupe
            .sort(["ticker","date"], descending=[False, True])
            .collect()
        )
    else:
        df = (
            l_all
            .filter((pl.col("date") >= dfrom) & (pl.col("date") <= dto))  # Filter to requested date range
            .unique(subset=["ticker","date"])  # Dedupe
            .sort(["ticker","date"], descending=[False, True])
            .collect()
        )
    out: dict[str, list[dict]] = {}
    for t in tick_list:
        out[t] = df.filter(pl.col("ticker") == t).to_dicts()
    # If every requested series is empty → enqueue fetch-on-miss
    if all(len(v) == 0 for v in out.values()):
        job_id = enqueue_prices_daily(tick_list)
        return JSONResponse({"status": "fetch_on_miss", "job_id": job_id, "retry_after": 2}, status_code=status.HTTP_202_ACCEPTED)
    return {"tickers": tick_list, "from": from_, "to": to, "btc_view": btc_view, "series": out}


@router.get("/prices/search")
async def search_tickers(q: str, limit: int = 10):
    """Search for stocks by ticker or company name using Yahoo Finance"""
    if not q or len(q) < 1:
        return {"query": q, "count": 0, "results": []}
    
    try:
        # Use yfinance search (via Ticker quotes search)
        import yfinance as yf
        
        # Search for tickers matching the query
        search_results = yf.Search(q, max_results=limit, news_count=0)
        quotes = search_results.quotes
        
        results = []
        for quote in quotes:
            results.append({
                "symbol": quote.get("symbol", ""),
                "name": quote.get("shortname") or quote.get("longname", ""),
                "exchange": quote.get("exchDisp", ""),
                "type": quote.get("quoteType", ""),
                "sector": quote.get("sector", ""),
            })
        
        return {"query": q, "count": len(results), "results": results}
    except Exception as e:
        return {"query": q, "count": 0, "results": [], "error": str(e)}


@router.get("/prices/info/{ticker}")
async def ticker_info(ticker: str):
    """Get detailed company information for a ticker"""
    try:
        t = yf.Ticker(ticker.upper())
        info = t.info
        
        if not info or "symbol" not in info:
            return {"error": f"No info found for ticker {ticker.upper()}"}
        
        # Extract relevant fields
        return {
            "symbol": info.get("symbol"),
            "name": info.get("longName") or info.get("shortName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "description": info.get("longBusinessSummary"),
            "website": info.get("website"),
            "country": info.get("country"),
            "currency": info.get("currency"),
            "exchange": info.get("exchange"),
            "market_cap": info.get("marketCap"),
            "enterprise_value": info.get("enterpriseValue"),
            "employees": info.get("fullTimeEmployees"),
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/prices/fundamentals/{ticker}")
async def ticker_fundamentals(ticker: str):
    """Get key financial metrics for a ticker"""
    try:
        t = yf.Ticker(ticker.upper())
        info = t.info
        
        if not info or "symbol" not in info:
            return {"error": f"No fundamentals found for ticker {ticker.upper()}"}
        
        # Extract financial metrics
        return {
            "symbol": info.get("symbol"),
            "current_price": info.get("currentPrice"),
            "previous_close": info.get("previousClose"),
            "day_high": info.get("dayHigh"),
            "day_low": info.get("dayLow"),
            "volume": info.get("volume"),
            "avg_volume": info.get("averageVolume"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "peg_ratio": info.get("pegRatio"),
            "price_to_book": info.get("priceToBook"),
            "eps": info.get("trailingEps"),
            "dividend_yield": info.get("dividendYield"),
            "beta": info.get("beta"),
            "52_week_high": info.get("fiftyTwoWeekHigh"),
            "52_week_low": info.get("fiftyTwoWeekLow"),
            "revenue": info.get("totalRevenue"),
            "revenue_per_share": info.get("revenuePerShare"),
            "profit_margin": info.get("profitMargins"),
            "operating_margin": info.get("operatingMargins"),
            "return_on_equity": info.get("returnOnEquity"),
            "return_on_assets": info.get("returnOnAssets"),
            "debt_to_equity": info.get("debtToEquity"),
            "recommendation": info.get("recommendationKey"),
            "target_price": info.get("targetMeanPrice"),
        }
    except Exception as e:
        return {"error": str(e)}

