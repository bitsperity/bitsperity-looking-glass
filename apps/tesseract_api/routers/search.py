from fastapi import APIRouter, HTTPException, Request, Body
from libs.tesseract_core.models.search import SearchRequest, SearchResponse, SearchResult
from libs.tesseract_core.embeddings.embedder import Embedder
from libs.tesseract_core.storage.vector_store import VectorStore
from libs.tesseract_core.storage.tesseract_db import TesseractDB
from qdrant_client.models import PointStruct
import httpx
import time
import gc
import re
import os
import uuid
from pathlib import Path
import asyncio

router = APIRouter()

# Initialize once at startup
embedder = None
vector_store = VectorStore()
tesseract_db = None

def get_embedder():
    global embedder
    if embedder is None:
        embedder = Embedder()  # Model/Device from env
    return embedder

def get_tesseract_db():
    global tesseract_db
    if tesseract_db is None:
        db_path = os.getenv("TESSERACT_SQLITE_PATH", "data/tesseract.db")
        tesseract_db = TesseractDB(db_path)
    return tesseract_db

@router.post("/tesseract/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    """Semantic search with filtering support"""
    # Ensure collection exists
    vector_store.ensure_collection()
    
    # Generate query embedding
    emb = get_embedder()
    query_embedding = emb.encode(request.query, normalize=True, is_query=True)[0]
    
    # Build Qdrant filter
    qdrant_filter = build_filter(request.filters) if request.filters else None
    
    # Search in Qdrant (get news_ids + scores + summaries only)
    qdrant_results = vector_store.search(
        query_vector=query_embedding.tolist(),
        limit=request.limit,
        query_filter=qdrant_filter
    )

    # Extract news_ids to bulk fetch from Satbase
    news_ids = [
        qdrant_result.payload.get("news_id") 
        for qdrant_result in qdrant_results 
        if qdrant_result.payload.get("news_id")
    ]
    
    # Build a mapping of news_id -> (qdrant_result with score)
    qdrant_results_by_id = {
        qdrant_result.payload.get("news_id"): qdrant_result
        for qdrant_result in qdrant_results
        if qdrant_result.payload.get("news_id")
    }
    
    # Fetch full article metadata from Satbase
    satbase_articles = {}
    if news_ids:
        try:
            satbase_url = os.getenv("TESSERACT_SATBASE_URL", "http://localhost:8080/v1/news/bulk")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    satbase_url,
                    json={"ids": news_ids, "include_body": False}
                )
                if response.status_code == 200:
                    data = response.json()
                    satbase_articles = {
                        article["id"]: article 
                        for article in data.get("items", [])
                    }
        except Exception as e:
            print(f"⚠️ Failed to fetch from Satbase bulk endpoint: {e}")
            # Continue anyway with partial data from Qdrant
    
    # Build results combining Qdrant scores with Satbase metadata
    results = []
    for news_id, qdrant_result in qdrant_results_by_id.items():
        satbase_article = satbase_articles.get(news_id, {})
        
        result = SearchResult(
            id=news_id or str(qdrant_result.id),
            score=qdrant_result.score,
            title=satbase_article.get("title", ""),
            text=satbase_article.get("description", ""),
            source=satbase_article.get("source_name", ""),
            source_name=satbase_article.get("source_name"),
            url=satbase_article.get("url", ""),
            published_at=satbase_article.get("published_at", ""),
            topics=satbase_article.get("topics", []),
            tickers=satbase_article.get("tickers", []),
            language=satbase_article.get("language"),
            body_available=bool(satbase_article.get("body_text")),
            news_id=news_id,
        )
        results.append(result)
    
    return SearchResponse(
        query=request.query,
        count=len(results),
        results=results
    )

def build_filter(filters: dict):
    """Build Qdrant filter from request filters"""
    must_conditions = []
    
    # Topics filter (array any-match)
    if filters.get("topics"):
        topics_list = filters["topics"] if isinstance(filters["topics"], list) else [filters["topics"]]
        must_conditions.append({
            "key": "topics",
            "match": {"any": topics_list}
        })
    
    # Tickers filter (array any-match)
    if filters.get("tickers"):
        tickers_list = filters["tickers"] if isinstance(filters["tickers"], list) else [filters["tickers"]]
        must_conditions.append({
            "key": "tickers",
            "match": {"any": tickers_list}
        })
    
    # Language filter (exact match)
    if filters.get("language"):
        must_conditions.append({
            "key": "language",
            "match": {"value": filters["language"]}
        })
    
    # Body available filter
    if "body_available" in filters:
        must_conditions.append({
            "key": "body_available",
            "match": {"value": bool(filters["body_available"])}
        })
    
    # Date range filter
    if filters.get("from") or filters.get("to"):
        range_filter = {}
        if filters.get("from"):
            range_filter["gte"] = filters["from"]
        if filters.get("to"):
            range_filter["lte"] = filters["to"]
        must_conditions.append({
            "key": "published_at",
            "range": range_filter
        })
    
    return {"must": must_conditions} if must_conditions else None

@router.get("/tesseract/similar/{news_id}")
async def find_similar(news_id: str, limit: int = 10):
    """Find similar articles by vector similarity (news_id is Satbase ID)"""
    try:
        vector_store.ensure_collection()
        
        # Convert news_id to Qdrant point ID (same logic as in embedding)
        if news_id.isdigit():
            point_id = int(news_id)
        else:
            # Convert SHA256 hash to UUID5
            try:
                import uuid
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, news_id))
            except Exception:
                # Fallback: use hash
                point_id = abs(hash(news_id)) % (2**63)
        
        # Retrieve source article
        source_points = vector_store.client.retrieve(
            collection_name=vector_store.collection_name,
            ids=[point_id],
            with_vectors=True,
            with_payload=True,
        )
        if not source_points:
            raise HTTPException(status_code=404, detail=f"Article {news_id} not found in vector store")
        
        source = source_points[0]
        
        # Search for similar
        results = vector_store.search(
            query_vector=source.vector,
            limit=limit + 1
        )
        
        # Exclude source article and convert back to news_id
        similar_results = []
        for r in results:
            result_news_id = r.payload.get("news_id")
            if result_news_id and result_news_id != news_id:
                similar_results.append({
                    "id": result_news_id,  # Return original news_id, not point_id
                    "score": r.score,
                    "text": r.payload.get("summary", ""),
                    "news_id": result_news_id
                })
        
        return {
            "source_article": {"id": news_id, **source.payload},
            "similar_articles": similar_results[:limit]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding similar articles: {str(e)}")

# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/embed-batch")
async def embed_batch(
    from_date: str = Body(...),
    to_date: str = Body(...),
    topics: str = Body(None),
    tickers: str = Body(None),
    language: str = Body(None),
    body_only: bool = Body(True),
    incremental: bool = Body(True)
):
    """
    Batch embed articles from Satbase into Tesseract.
    Request body (JSON):
    {
        "from_date": "2025-10-20",      (required, YYYY-MM-DD)
        "to_date": "2025-10-22",        (required, YYYY-MM-DD)
        "topics": "AI,Bitcoin",         (optional, comma-separated)
        "tickers": "AAPL,MSFT",        (optional, comma-separated)
        "language": "en",               (optional)
        "body_only": true,              (optional, default: true)
        "incremental": true             (optional, default: true)
    }
    Runs in background. Check /admin/embed-status for progress.
    """
    # Validate date format
    date_pattern = r'^\d{4}-\d{2}-\d{2}$'
    if not re.match(date_pattern, from_date) or not re.match(date_pattern, to_date):
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Ensure collection exists
    vector_store.ensure_collection()
    
    # Parse filters
    topics_list = [t.strip() for t in topics.split(",")] if topics else None
    tickers_list = [t.strip() for t in tickers.split(",")] if tickers else None
    
    job_id = str(uuid.uuid4())
    params = {
        "from_date": from_date,
        "to_date": to_date,
        "topics": topics_list,
        "tickers": tickers_list,
        "language": language,
        "body_only": body_only,
        "incremental": incremental,
    }
    
    db = get_tesseract_db()
    db.create_job(job_id, params)
    
    # Use asyncio.create_task for TRUE background execution
    # This doesn't block the API worker like BackgroundTasks does
    asyncio.create_task(run_batch_embedding(job_id, params))
    
    return {
        "status": "started",
        "job_id": job_id,
        "message": f"Batch embedding from {from_date} to {to_date} started in background",
        "check_progress": f"/v1/admin/embed-status?job_id={job_id}"
    }

@router.get("/admin/embed-status")
async def embed_status(job_id: str = None):
    """Get embedding status"""
    vector_store.ensure_collection()
    db = get_tesseract_db()
    
    try:
        collection_info = vector_store.client.get_collection(vector_store.collection_name)
        
        if job_id:
            job = db.get_job(job_id)
            if not job:
                return {"error": "Job not found", "job_id": job_id}
            
            return {
                "job_id": job_id,
                "status": job["status"],
                "processed": job["processed"],
                "total": job["total"],
                "percent": (job["processed"] / job["total"] * 100.0) if job["total"] else 0.0,
                "started_at": job["started_at"],
                "completed_at": job["completed_at"],
                "error": job["error"],
                "params": job.get("params"),
            }
        else:
            # Return overall stats
            return {
                "collection_name": vector_store.collection_name,
                "total_vectors": collection_info.points_count,
                "vector_size": collection_info.config.params.vectors.size,
                "total_embedded_articles": db.get_embedded_count(),
                "recent_jobs": db.list_jobs(limit=10),
            }
    except Exception as e:
        return {
            "error": str(e),
            "total_embedded_articles": db.get_embedded_count(),
        }

@router.post("/admin/init-collection")
async def init_collection():
    """Initialize or recreate Qdrant collection with versioning"""
    try:
        vector_store.ensure_collection()
        return {"status": "ok", "collection": vector_store.collection_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize collection: {str(e)}")

@router.post("/admin/collections/switch")
async def switch_collection(name: str):
    """Switch logical alias 'news_embeddings' to an existing collection name (zero-downtime)."""
    try:
        # Validate collection exists
        try:
            vector_store.get_collection(name=name)
        except Exception:
            raise HTTPException(status_code=404, detail=f"Collection '{name}' not found")
        
        # Delete old alias and create new one
        try:
            vector_store.delete_alias(alias="news_embeddings")
        except Exception:
            pass
        
        vector_store.create_alias(alias="news_embeddings", collection_name=name)
        vector_store.use_collection("news_embeddings")
        
        return {"status": "ok", "alias": "news_embeddings", "target": name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to switch collection: {str(e)}")

@router.get("/admin/collections")
async def list_collections():
    """List all Qdrant collections with metadata"""
    try:
        cols = vector_store.list_collections()
        
        collections_data = []
        for col in cols.collections:
            try:
                info = vector_store.get_collection(name=col.name)
                collections_data.append({
                    "name": col.name,
                    "points_count": info.points_count,
                    "vector_size": info.config.params.vectors.size,
                    "distance": "COSINE"
                })
            except Exception as e:
                collections_data.append({
                    "name": col.name,
                    "error": str(e)
                })
        
        current_alias_target = vector_store.collection_name
        
        return {
            "collections": collections_data,
            "active_alias": "news_embeddings",
            "active_target": current_alias_target
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list collections: {str(e)}")

@router.delete("/admin/collections/{collection_name}")
async def delete_collection(collection_name: str):
    """Delete a collection (with safety checks)"""
    try:
        if collection_name == vector_store.collection_name:
            raise HTTPException(status_code=400, detail=f"Cannot delete active collection '{collection_name}'. Switch to another collection first.")
        
        try:
            vector_store.get_collection(name=collection_name)
        except Exception:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")
        
        vector_store.delete_collection(name=collection_name)
        
        return {"status": "deleted", "collection": collection_name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete collection: {str(e)}")

# ==================== BACKGROUND TASKS ====================

def extract_text_from_article(article: dict, max_length: int = 8000) -> str:
    """Extract text for embedding: title + description + body (if available)"""
    # Build text from available parts for best semantic representation
    parts = []
    
    if article.get("title"):
        parts.append(article.get("title"))
    
    if article.get("description"):
        parts.append(article.get("description"))
    
    if article.get("body_text"):
        parts.append(article.get("body_text"))
    
    text = "\n".join(parts) if parts else ""
    
    # Clean and limit to max_length
    text = text.strip()[:max_length]
    return text

async def run_batch_embedding(job_id: str, params: dict):
    """Background task to embed articles from Satbase"""
    print(f"🚀 Starting batch embedding job: {job_id}")
    print(f"   Params: {params}")
    
    db = get_tesseract_db()
    emb = get_embedder()
    
    try:
        # PHASE 1: FETCH ALL ARTICLES FROM SATBASE
        db.update_job_status(job_id, "fetching", processed=0, total=0)
        
        # Configure Satbase fetch
        satbase_url = os.getenv("TESSERACT_SATBASE_URL", "http://localhost:8080/v1/news")
        
        # Pagination setup
        page_size = 1000  # Back to original for better fetch performance
        offset = 0
        all_articles = []
        embedding_batch_size = 32 if emb.device == "cuda" else 16
        upsert_chunk_size = 256
        
        print(f"📥 PHASE 1: Fetching from Satbase: {satbase_url}")
        
        async with httpx.AsyncClient(timeout=600.0) as client:
            while True:
                # Build Satbase params
                satbase_params = {
                    "from": params["from_date"],
                    "to": params["to_date"],
                    "limit": page_size,
                    "offset": offset,
                    "include_body": True,
                }
                
                # Optional filters
                if params.get("topics"):
                    satbase_params["topics"] = ",".join(params["topics"])
                if params.get("language"):
                    satbase_params["language"] = params["language"]
                
                # Only request body if body_only=true
                if params.get("body_only"):
                    satbase_params["body_available"] = True
                
                try:
                    print(f"📡 Fetching offset {offset}...")
                    response = await client.get(satbase_url, params=satbase_params)
                    
                    if response.status_code == 202:
                        # Fetch-on-miss: wait a bit and retry
                        print(f"⏳ Satbase still fetching (202), waiting 5s...")
                        await asyncio.sleep(5)
                        continue
                    
                    response.raise_for_status()
                    data = response.json()
                    articles = data.get("data", []) or data.get("items", [])
                    
                    if not articles:
                        print(f"✓ No more articles at offset {offset}")
                        break
                    
                    # Filter by incremental + body_only DURING fetch
                    if params.get("incremental"):
                        articles = db.get_articles_needing_embedding(articles)
                        print(f"   After incremental filter: {len(articles)} need embedding")
                    
                    if articles:
                        all_articles.extend(articles)
                        print(f"📄 Fetched {len(articles)} articles (total collected: {len(all_articles)})")
                    
                except asyncio.TimeoutError as e:
                    print(f"⏳ Timeout fetching from Satbase (timeout, will retry): {e}")
                    await asyncio.sleep(5)
                    continue
                except Exception as e:
                    print(f"❌ Satbase fetch failed: {type(e).__name__}: {e}")
                    raise
                
                offset += page_size
        
        # PHASE 2: EMBED ALL COLLECTED ARTICLES
        if not all_articles:
            print("❌ No articles to embed!")
            db.update_job_status(job_id, "done", processed=0, total=0)
            return
        
        print(f"\n✓ PHASE 1 COMPLETE: Fetched {len(all_articles)} articles")
        print(f"📌 PHASE 2: Starting embedding of {len(all_articles)} articles...")
        
        db.update_job_status(job_id, "running", processed=0, total=len(all_articles))
        
        total_embedded = 0
        upsert_accumulator = []
        
        for i in range(0, len(all_articles), embedding_batch_size):
            batch_articles = all_articles[i:i+embedding_batch_size]
            batch_texts = [
                f"{a.get('title', '')}. {extract_text_from_article(a)}"
                for a in batch_articles
            ]
            
            batch_embeddings = emb.encode(batch_texts, batch_size=embedding_batch_size, is_query=False)
            
            for article, emb_vec in zip(batch_articles, batch_embeddings):
                # Use Satbase article ID as Qdrant ID - convert to UUID for string IDs
                article_id = article["id"]
                if isinstance(article_id, int) or (isinstance(article_id, str) and article_id.isdigit()):
                    # If numeric, use as integer
                    point_id = int(article_id)
                else:
                    # If string (like SHA hex), convert to UUID for Qdrant
                    try:
                        import uuid
                        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(article_id)))
                    except Exception:
                        # Fallback: use absolute hash value as large integer
                        point_id = abs(hash(str(article_id))) % (2**63)
                
                upsert_accumulator.append(
                    PointStruct(
                        id=point_id,
                        vector=emb_vec.tolist(),
                        payload={
                            "news_id": article["id"],
                            "summary": extract_text_from_article(article),
                        },
                    )
                )
                
                # Mark as embedded
                db.mark_article_embedded(
                    article["id"],
                    article.get("published_at", ""),
                    article.get("title", ""),
                    extract_text_from_article(article)
                )
                
                total_embedded += 1
            
            # Update progress after EVERY embedding batch (more granular updates)
            db.update_job_status(job_id, "running", processed=total_embedded, total=len(all_articles))
            
            # Upsert chunk
            if len(upsert_accumulator) >= upsert_chunk_size:
                vector_store.upsert(upsert_accumulator, wait=True)
                print(f"✓ Upserted {len(upsert_accumulator)} vectors")
                upsert_accumulator.clear()
                
                # Memory hygiene
                if emb.device == "cuda":
                    try:
                        import torch
                        torch.cuda.synchronize()
                        torch.cuda.empty_cache()
                    except Exception:
                        pass
                gc.collect()
        
        # Flush remaining
        if upsert_accumulator:
            vector_store.upsert(upsert_accumulator, wait=True)
            print(f"✓ Upserted {len(upsert_accumulator)} vectors (final)")
        
        db.update_job_status(job_id, "done", processed=total_embedded, total=len(all_articles))
        db.complete_job(job_id)
        print(f"🎉 Successfully embedded {total_embedded} articles!")
        
    except Exception as e:
        error_msg = f"Batch embedding failed: {str(e)}"
        print(f"❌ {error_msg}")
        db.update_job_status(job_id, "error")
        db.complete_job(job_id, error=error_msg)
        raise


# ==================== FACTORY RESET ====================

@router.post("/admin/reset")
async def factory_reset():
    """Factory reset: Delete all SQLite tables and Qdrant collection"""
    try:
        print("🔄 Starting Tesseract factory reset...")
        
        # 1. Drop SQLite tables
        db = get_tesseract_db()
        print("  📊 Dropping SQLite tables...")
        db.drop_all_tables()
        print("  ✓ SQLite tables dropped")
        
        # 2. Delete ALL Qdrant collections (including old versioned ones)
        print("  🗑️ Deleting all Qdrant collections...")
        try:
            # Get all collections
            collections_resp = vector_store.client.get_collections()
            for collection in collections_resp.collections:
                try:
                    print(f"    Deleting collection: {collection.name}")
                    vector_store.client.delete_collection(collection.name)
                except Exception as e:
                    print(f"    ⚠️ Failed to delete {collection.name}: {e}")
            print("  ✓ All Qdrant collections deleted")
        except Exception as e:
            print(f"  ⚠️ Error listing collections: {e}")
        
        # 3. Delete alias if it exists
        print("  🔗 Deleting alias...")
        try:
            vector_store.delete_alias("news_embeddings")
            print("  ✓ Alias deleted")
        except Exception as e:
            print(f"  ⚠️ Alias not found or error: {e}")
        
        # 4. Reinitialize
        print("  🔧 Reinitializing...")
        db.init_db()
        vector_store.ensure_collection()
        print("  ✓ Tesseract reinitialized")
        
        return {
            "status": "ok",
            "message": "Tesseract factory reset complete",
            "details": {
                "sqlite_reset": True,
                "qdrant_collections_deleted": True,
                "alias_deleted": True,
                "reinitialized": True
            }
        }
    except Exception as e:
        print(f"❌ Factory reset failed: {e}")
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


