from datetime import date
from fastapi import APIRouter, Query, status, BackgroundTasks
from fastapi.responses import JSONResponse
from pathlib import Path

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
    
    # If no bars: trigger background fetch (fetch_on_miss)
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
            # If no BTC data, fetch it
            if background_tasks:
                background_tasks.add_task(_fetch_ticker_background, "BTCUSD")
            return JSONResponse(
                {"status": "fetch_on_miss", "retry_after": sync_timeout_s},
                status_code=status.HTTP_202_ACCEPTED
            )
        
        # Create BTC lookup dict by date
        btc_dict = {bar['date']: bar['close'] for bar in btc_bars}
        
        # Convert bars to BTC
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


@router.get("/prices/status/{ticker}")
async def get_prices_status(ticker: str):
    """Get price data status for a ticker."""
    db = _get_prices_db()
    status_info = db.get_status(ticker)
    
    # Calculate missing days if we have data
    missing_days = []
    if status_info['latest_date']:
        try:
            from datetime import timedelta
            from_date = date.fromisoformat(status_info['latest_date']) - timedelta(days=30)
            to_date = date.fromisoformat(status_info['latest_date'])
            missing_days = db.get_missing_days(ticker, from_date, to_date)
        except:
            pass
    
    return {
        "ticker": ticker.upper(),
        "latest_date": status_info['latest_date'],
        "bar_count": status_info['bar_count'],
        "missing_days": missing_days,
        "source": status_info['source'],
        "source_fail_count": status_info['source_fail_count'],
        "invalid": status_info['invalid'],
        "invalid_reason": status_info['invalid_reason'],
    }


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
    """Get detailed company information for a ticker."""
    db = _get_prices_db()
    
    # Check cache in symbols_meta first
    cached = db.get_symbols_meta(ticker)
    if cached and cached.get('info'):
        return cached['info']
    
    # Fetch from yfinance
    try:
        t = yf.Ticker(ticker.upper())
        info = t.info
        
        if not info or "symbol" not in info:
            return {"error": f"No info found for ticker {ticker.upper()}"}
        
        result = {
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
        
        # Cache in DB
        db.update_symbols_meta(
            ticker,
            name=result['name'],
            exchange=result['exchange'],
            currency=result['currency'],
            country=result['country'],
            sector=result['sector'],
            industry=result['industry'],
            info=result
        )
        
        return result
    except Exception as e:
        return {"error": str(e)}


@router.get("/prices/fundamentals/{ticker}")
async def ticker_fundamentals(ticker: str):
    """Get key financial metrics for a ticker."""
    try:
        t = yf.Ticker(ticker.upper())
        info = t.info
        
        if not info or "symbol" not in info:
            return {"error": f"No fundamentals found for ticker {ticker.upper()}"}
        
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

