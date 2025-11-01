"""
Tesseract embedding jobs: auto-embed new articles.
"""
import os
from datetime import datetime, timedelta
from typing import Any
import httpx
from libs.satbase_core.config.settings import load_settings
from job_wrapper import wrap_job


@wrap_job("tesseract_embed_new", "Embed New Articles to Tesseract")
async def embed_new_articles() -> dict[str, Any]:
    """
    Automatically embed new articles from last hour into Tesseract.
    Uses incremental mode to only embed articles that aren't already embedded.
    This is GPU-efficient and power-saving.
    """
    s = load_settings()
    
    # Get Tesseract URL from env (default to localhost since scheduler uses network_mode: host)
    tesseract_url = os.getenv("TESSERACT_API_URL", "http://localhost:8081")
    
    # Calculate date range: last hour
    now = datetime.utcnow()
    to_date = now.date()
    from_date = (now - timedelta(hours=1)).date()
    
    # Create HTTP client for Tesseract API
    client = httpx.AsyncClient(timeout=300.0)  # 5 min timeout for batch operations
    
    try:
        # Call Tesseract embed-batch API with incremental=true
        response = await client.post(
            f"{tesseract_url}/v1/admin/embed-batch",
            json={
                "from_date": from_date.isoformat(),
                "to_date": to_date.isoformat(),
                "incremental": True,  # Only embed missing articles (GPU-efficient)
                "body_only": True  # Only embed articles with body text
            }
        )
        response.raise_for_status()
        result = response.json()
        
        return {
            "status": "ok",
            "job_id": result.get("job_id"),
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "message": f"Embedding job started: {result.get('job_id')}",
            "check_progress": f"{tesseract_url}/v1/admin/embed-status?job_id={result.get('job_id')}"
        }
    except httpx.HTTPStatusError as e:
        return {
            "status": "error",
            "error": f"Tesseract API error: {e.response.status_code} - {e.response.text[:200]}",
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat()
        }
    except httpx.RequestError as e:
        return {
            "status": "error",
            "error": f"Tesseract API unreachable: {str(e)}",
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat()
        }
    finally:
        await client.aclose()

