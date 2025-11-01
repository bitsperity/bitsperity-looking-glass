from datetime import date
from fastapi import APIRouter, Query, status, BackgroundTasks, Body
from fastapi.responses import JSONResponse
from pathlib import Path
from typing import List
from pydantic import BaseModel

from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.prices_db import PricesDB
from libs.satbase_core.ingest.registry import registry
import yfinance as yf


router = APIRouter()


def _get_prices_db() -> PricesDB:
    """Get PricesDB instance."""
    s = load_settings()
    db_path = Path(s.stage_dir).parent / "prices.db"
    return PricesDB(db_path)


async def _fetch_ticker_background(ticker: str):
    """Background task: fetch ticker data from stooq/yfinance."""
    try:
        reg = registry()
        fetch, normalize, sink = reg["stooq"]
        
        params = {"tickers": [ticker.upper()]}
        raw = fetch(params)
        models = list(normalize(raw))
        
        if models:
            sink(models, date.today())
    except:
        # If stooq fails, try yfinance
        try:
            fetch, normalize, sink = reg["eod_yfinance"]
            params = {"tickers": [ticker.upper()]}
            raw = fetch(params)
            models = list(normalize(raw))
            
            if models:
                sink(models, date.today())
        except:
            pass


def _fetch_ticker_sync(db: PricesDB, ticker: str, from_date, to_date, timeout_s: int = 5) -> list:
    """Fetch ticker data synchronously from stooq/yfinance."""
    import time
    
    start_time = time.time()
    
    try:
        reg = registry()
        
        # Try stooq first (faster, but limited historical)
        try:
            fetch, normalize, sink = reg["stooq"]
            params = {"tickers": [ticker.upper()]}
            raw = fetch(params)
            models = list(normalize(raw))
            
            if models:
                sink(models, date.today())
                # Query bars after saving
                bars = db.query_bars(ticker, from_date, to_date)
                if bars:
                    return bars
            
            # Check timeout
            if time.time() - start_time > timeout_s:
                return []
        except Exception:
            pass  # Fallback to yfinance
        
        # Fallback to yfinance (more reliable, supports historical)
        try:
            fetch, normalize, sink = reg["eod_yfinance"]
            params = {"tickers": [ticker.upper()]}
            raw = fetch(params)
            models = list(normalize(raw))
            
            if models:
                sink(models, date.today())
                # Query bars after saving - filter by requested date range
                bars = db.query_bars(ticker, from_date, to_date)
                if bars:
                    return bars
        except Exception:
            pass
        
        return []
    except Exception as e:
        print(f"Failed to fetch {ticker} synchronously: {e}")
        return []


def _fetch_btcusd_sync(db: PricesDB, from_date, to_date) -> list:
    """Fetch BTCUSD data synchronously using yfinance (most reliable for crypto)."""
    try:
        reg = registry()
        fetch, normalize, sink = reg["eod_yfinance"]
        
        params = {"tickers": ["BTCUSD"]}
        raw = fetch(params)
        models = list(normalize(raw))
        
        if models:
            sink(models, date.today())
            bars = db.query_bars("BTCUSD", from_date, to_date)
            if bars:
                return bars
        
        return []
    except Exception as e:
        print(f"Failed to fetch BTCUSD synchronously: {e}")
        return []


# ========== SPECIFIC ROUTES (must be before generic {ticker} route) ==========

@router.get("/prices/search")
async def search_tickers(q: str, limit: int = 10):
    """Search for stocks by ticker or company name using Yahoo Finance."""
    if not q or len(q) < 1:
        return {"query": q, "count": 0, "results": []}
    
    try:
        search_results = yf.Search(q, max_results=limit, news_count=0)
        quotes = search_results.quotes
        
        results = []
        for quote in quotes:
            symbol = quote.get("symbol", "")
            # Normalize yfinance symbols: BTC-USD → BTCUSD, etc
            symbol = symbol.replace("-", "").replace("=", "")
            
            results.append({
                "symbol": symbol,
                "name": quote.get("shortname") or quote.get("longname", ""),
                "exchange": quote.get("exchDisp", ""),
                "type": quote.get("quoteType", ""),
                "sector": quote.get("sector", ""),
            })
        

    except Exception as e:
        return {"query": q, "count": 0, "results": [], "error": str(e)}


@router.post("/prices/ingest")
async def ingest_prices(
    payload: dict,
    background_tasks: BackgroundTasks
):
    """
    Trigger price ingestion for one or more tickers.
    
    Payload:
    - tickers: list of ticker symbols
    - period: lookback period (1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max) - default: 2y
    - interval: 1d for daily, 1wk for weekly
    """
    tickers = payload.get("tickers", [])
    if not tickers:
        return JSONResponse(
            {"error": "No tickers provided"},
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Enqueue background fetch for each ticker
    for ticker in tickers:
        background_tasks.add_task(_fetch_ticker_background, ticker)
    
    return {
        "status": "queued",
        "tickers": tickers,
        "message": f"Fetching {len(tickers)} tickers in background"
    }


@router.get("/prices/status/{ticker}")
async def get_prices_status(ticker: str):
    """Get price data status for a ticker."""
    db = _get_prices_db()
    status_info = db.get_status(ticker)
    
    # Calculate missing days if we have data
    if status_info['latest_date']:
        latest = date.fromisoformat(status_info['latest_date'])
        today = date.today()
        missing_days = (today - latest).days
    else:
        missing_days = None
    
    return {
        "ticker": ticker.upper(),
        "latest_date": status_info['latest_date'],
        "bar_count": status_info['bar_count'],
        "missing_days": missing_days,
        "source": status_info['source'],
        "invalid": status_info['invalid'],
        "invalid_reason": status_info.get('invalid_reason')
    }


@router.get("/prices/info/{ticker}")
async def get_prices_info(ticker: str):
    """Get detailed company information for a ticker."""
    try:
        ticker_obj = yf.Ticker(ticker.upper())
        info = ticker_obj.info
        
        return {
            "ticker": ticker.upper(),
            "name": info.get("longName") or info.get("shortName", ""),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "description": info.get("longBusinessSummary", ""),
            "website": info.get("website", ""),
            "employees": info.get("fullTimeEmployees"),
            "country": info.get("country", ""),
            "currency": info.get("currency", ""),
            "exchange": info.get("exchange", "")
        }
    except Exception as e:
        return JSONResponse(
            {"error": f"Failed to fetch info for {ticker}: {str(e)}"},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/prices/fundamentals/{ticker}")
async def get_prices_fundamentals(ticker: str):
    """Get key financial metrics for a ticker."""
    try:
        ticker_obj = yf.Ticker(ticker.upper())
        info = ticker_obj.info
        
        return {
            "ticker": ticker.upper(),
            "market_cap": info.get("marketCap"),
            "enterprise_value": info.get("enterpriseValue"),
            "pe_ratio": info.get("trailingPE") or info.get("forwardPE"),
            "peg_ratio": info.get("pegRatio"),
            "price_to_book": info.get("priceToBook"),
            "price_to_sales": info.get("priceToSalesTrailing12Months"),
            "dividend_yield": info.get("dividendYield"),
            "revenue": info.get("totalRevenue"),
            "profit_margin": info.get("profitMargins"),
            "eps": info.get("trailingEps") or info.get("forwardEps"),
            "beta": info.get("beta"),
            "52_week_high": info.get("fiftyTwoWeekHigh"),
            "52_week_low": info.get("fiftyTwoWeekLow"),
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice")
        }
    except Exception as e:
        return JSONResponse(
            {"error": f"Failed to fetch fundamentals for {ticker}: {str(e)}"},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/prices/admin/mark-invalid/{ticker}")
async def mark_invalid_ticker(ticker: str, reason: str = Query("", description="Reason for marking as invalid")):
    """Mark a ticker as invalid (admin operation)."""
    db = _get_prices_db()
    db.mark_invalid(ticker, reason or "Manually marked as invalid")
    
    return {"status": "ok", "ticker": ticker.upper(), "message": f"Ticker marked as invalid: {reason or 'No reason provided'}"}


@router.post("/prices/admin/unmark-invalid/{ticker}")
async def unmark_invalid_ticker(ticker: str):
    """Unmark a ticker as invalid (admin operation)."""
    db = _get_prices_db()
    db.unmark_invalid(ticker)

    return {"status": "ok", "ticker": ticker.upper(), "message": "Ticker unmarked as invalid"}


# ========== BULK PRICES ENDPOINT (before generic {ticker} route) ==========

class BulkPricesRequest(BaseModel):
    tickers: List[str]
    from_: str | None = None
    to: str | None = None
    sync_timeout_s: int = 10

@router.post("/prices/bulk")
async def get_prices_bulk(
    request: BulkPricesRequest = Body(...)
):
    """
    Get price bars for multiple tickers in one request.
    
    More efficient than calling list-prices multiple times.
    """
    db = _get_prices_db()
    
    from_date = date.fromisoformat(request.from_) if request.from_ else None
    to_date = date.fromisoformat(request.to) if request.to else None
    
    results = {}
    
    for ticker in request.tickers:
        ticker_upper = ticker.upper()
        
        # Validate ticker not in invalid list
        status_info = db.get_status(ticker_upper)
        if status_info['invalid']:
            results[ticker_upper] = {
                "error": f"Invalid ticker: {ticker_upper}",
                "reason": status_info['invalid_reason']
            }
            continue
        
        # Query bars
        bars = db.query_bars(ticker_upper, from_date, to_date)
        
        # If no bars: try synchronous fetch
        if not bars:
            bars = _fetch_ticker_sync(db, ticker_upper, from_date, to_date, timeout_s=min(request.sync_timeout_s, 10))
        
        results[ticker_upper] = {
            "ticker": ticker_upper,
            "bars": [bar.model_dump() if hasattr(bar, 'model_dump') else bar for bar in bars],
            "last_date": bars[0]['date'] if bars else None,
            "source": status_info['source'],
            "count": len(bars)
        }
    
    return {
        "tickers": list(results.keys()),
        "from": request.from_,
        "to": request.to,
        "results": results
    }


# ========== GENERIC {ticker} ROUTES (after specific routes) ==========

@router.get("/prices/{ticker}")
async def get_prices(
    ticker: str,
    from_: str | None = Query(None, alias="from"),
    to: str | None = None,
    btc_view: bool = False,
    sync_timeout_s: int = 3,
    background_tasks: BackgroundTasks = None
):
    """
    Get price bars for a ticker.
    
    Query params:
    - from: ISO date (YYYY-MM-DD)
    - to: ISO date (YYYY-MM-DD)
    - btc_view: Return values in BTC (default: false)
    - sync_timeout_s: Max seconds to wait for data fetch (default: 3, max: 30)
    """
    db = _get_prices_db()
    
    # Validate ticker not in invalid list
    status_info = db.get_status(ticker)
    if status_info['invalid']:
        return JSONResponse(
            {"error": f"Invalid ticker: {ticker.upper()}", "reason": status_info['invalid_reason']},
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # Query bars
    from_date = date.fromisoformat(from_) if from_ else None
    to_date = date.fromisoformat(to) if to else None
    
    bars = db.query_bars(ticker, from_date, to_date)
    
    # If no bars: try synchronous fetch first (fallback to background if timeout)
    if not bars:
        # Try synchronous fetch with timeout
        bars = _fetch_ticker_sync(db, ticker, from_date, to_date, timeout_s=min(sync_timeout_s, 10))
        
        # If still no bars after sync fetch, trigger background fetch
    if not bars:
        if background_tasks:
            background_tasks.add_task(_fetch_ticker_background, ticker)
        return JSONResponse(
            {"status": "fetch_on_miss", "retry_after": sync_timeout_s},
            status_code=status.HTTP_202_ACCEPTED
        )
    
    # Apply BTC view if requested
    if btc_view:
        btc_bars = db.query_bars("BTCUSD", from_date, to_date)
        if not btc_bars:
            # Fetch BTCUSD synchronously (crypto prices are reliable from yfinance)
            btc_bars = _fetch_btcusd_sync(db, from_date, to_date)
        
        # Convert bars to BTC
        if btc_bars:
            btc_dict = {bar['date']: bar['close'] for bar in btc_bars}
            
            converted = []
            for bar in bars:
                if bar['date'] in btc_dict:
                    btc_close = btc_dict[bar['date']]
                    converted.append({
                        'date': bar['date'],
                        'open': bar['open'] / btc_close,
                        'high': bar['high'] / btc_close,
                        'low': bar['low'] / btc_close,
                        'close': bar['close'] / btc_close,
                        'volume': bar['volume'],
                        'source': bar['source'],
                    })
            bars = converted
    
    return {
        "ticker": ticker.upper(),
        "bars": bars,
        "last_date": bars[0]['date'] if bars else None,
        "source": status_info['source'],
        "from": from_,
        "to": to,
        "btc_view": btc_view,
    }
