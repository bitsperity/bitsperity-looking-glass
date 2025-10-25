"""
News Body Fetching Endpoint

Handles individual news article body fetching for background processing.
This endpoint is designed to be non-blocking and queue-friendly.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from datetime import date, datetime
import polars as pl

from libs.satbase_core.config.settings import load_settings
from libs.satbase_core.storage.stage import scan_parquet_glob, write_parquet
from libs.satbase_core.adapters.http import get_text

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

router = APIRouter()


@router.post("/news/{news_id}/fetch-body")
async def fetch_news_body(news_id: str):
    """
    Fetch and store the body for a specific news article.
    
    This endpoint:
    1. Finds the article by ID
    2. Fetches the HTML/text body from the source URL
    3. Stores it in the news_body parquet files
    4. Returns success/failure
    
    Designed for background job processing - returns quickly even on failure.
    """
    s = load_settings()
    
    try:
        # Find the article in the last 365 days
        to_date = date.today()
        from_date = date.fromisoformat((datetime.now().date() - __import__('datetime').timedelta(days=365)).isoformat())
        
        # Search in both sources
        article = None
        for source in ["gdelt", "news_rss"]:
            try:
                lf = scan_parquet_glob(s.stage_dir, source, "news_docs", from_date, to_date)
                df = lf.collect()
                
                if df.height > 0 and "id" in df.columns:
                    matching = df.filter(pl.col("id") == news_id)
                    if matching.height > 0:
                        article = matching.to_dicts()[0]
                        break
            except Exception:
                continue
        
        if not article:
            raise HTTPException(status_code=404, detail=f"Article {news_id} not found")
        
        url = article.get("url")
        if not url:
            return JSONResponse(
                {"success": False, "id": news_id, "error": "No URL found for article"},
                status_code=400
            )
        
        # Fetch the body
        try:
            # Simple HTTP fetch
            html = get_text(url)
            
            if not html:
                return JSONResponse(
                    {"success": False, "id": news_id, "error": "Failed to fetch body - empty response"},
                    status_code=500
                )
            
            # Extract text from HTML if BeautifulSoup is available
            text = None
            if BeautifulSoup:
                try:
                    soup = BeautifulSoup(html, 'html.parser')
                    # Remove scripts and styles
                    for script in soup(["script", "style"]):
                        script.decompose()
                    text = soup.get_text(separator='\n', strip=True)
                except Exception:
                    text = None
            
            body_data = {
                "html": html[:500000] if html else None,  # Limit HTML size
                "text": text[:200000] if text else None   # Limit text size
            }
            
            if not body_data.get("text") and not body_data.get("html"):
                return JSONResponse(
                    {"success": False, "id": news_id, "error": "Failed to extract body content"},
                    status_code=500
                )
            
            # Prepare body record
            body_record = {
                "id": news_id,
                "content_text": body_data.get("text"),
                "content_html": body_data.get("html"),
                "fetched_at": datetime.utcnow().isoformat(),
                "published_at": article.get("published_at")
            }
            
            # Determine partition date from published_at
            published_at_str = article.get("published_at", "")
            if isinstance(published_at_str, str) and len(published_at_str) >= 10:
                partition_date = date.fromisoformat(published_at_str[:10])
            else:
                partition_date = date.today()
            
            # Write to parquet
            write_parquet(s.stage_dir, "news_body", partition_date, "news_body", [body_record])
            
            return {
                "success": True,
                "id": news_id,
                "url": url,
                "has_text": bool(body_data.get("text")),
                "has_html": bool(body_data.get("html")),
                "fetched_at": body_record["fetched_at"]
            }
            
        except Exception as e:
            return JSONResponse(
                {"success": False, "id": news_id, "error": f"Body fetch failed: {str(e)}"},
                status_code=500
            )
            
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            {"success": False, "id": news_id, "error": str(e)},
            status_code=500
        )


@router.get("/news/body-stats")
def get_body_stats(from_: str = None, to: str = None):
    """
    Get statistics about news body fetching status.
    
    Returns counts of:
    - Total articles
    - Articles with bodies
    - Articles without bodies
    - Success rate
    """
    s = load_settings()
    
    # Default to last 30 days
    if not to:
        to = date.today().isoformat()
    if not from_:
        from_ = (date.today() - __import__('datetime').timedelta(days=30)).isoformat()
    
    try:
        dfrom = date.fromisoformat(from_)
        dto = date.fromisoformat(to)
        
        total_articles = 0
        articles_with_body = 0
        
        try:
            # Count all articles - be robust with schema mismatches
            lf_g = scan_parquet_glob(s.stage_dir, "gdelt", "news_docs", dfrom, dto)
            lf_r = scan_parquet_glob(s.stage_dir, "news_rss", "news_docs", dfrom, dto)
            
            count_g = 0
            count_r = 0
            
            try:
                df_g = lf_g.select(["id"]).collect()
                if df_g.height > 0 and "id" in df_g.columns:
                    df_g = df_g.unique(subset=["id"])
                    count_g = df_g.height
            except:
                pass
            
            try:
                df_r = lf_r.select(["id"]).collect()
                if df_r.height > 0 and "id" in df_r.columns:
                    df_r = df_r.unique(subset=["id"])
                    count_r = df_r.height
            except:
                pass
            
            total_articles = count_g + count_r
        except:
            pass
        
        # Get articles with bodies - very simple approach
        try:
            lf_body = scan_parquet_glob(s.stage_dir, "news_body", "news_body", dfrom, dto)
            df_body = lf_body.select(["id"]).collect()
            
            if df_body.height > 0 and "id" in df_body.columns:
                articles_with_body = len(df_body["id"].unique())
        except:
            pass
        
        articles_without_body = max(0, total_articles - articles_with_body)
        success_rate = (articles_with_body / total_articles * 100) if total_articles > 0 else 0
        
        return {
            "period": {"from": from_, "to": to},
            "total_articles": total_articles,
            "articles_with_body": articles_with_body,
            "articles_without_body": articles_without_body,
            "success_rate": round(success_rate, 2),
            "coverage_percent": round(success_rate, 2),
            "status": "ok"
        }
        
    except Exception as e:
        # Return safe default on any error
        return {
            "period": {"from": from_, "to": to},
            "total_articles": 0,
            "articles_with_body": 0,
            "articles_without_body": 0,
            "success_rate": 0,
            "coverage_percent": 0,
            "status": "error",
            "error_message": str(e)
        }

