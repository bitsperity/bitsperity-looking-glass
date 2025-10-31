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


@router.get("/admin/search-history")
async def get_search_history(
    limit: int = 50,
    query_filter: str = None,
    days: int = None
):
    """Get search history with optional filters"""
    try:
        db = get_tesseract_db()
        history = db.get_search_history(
            limit=limit,
            query_filter=query_filter,
            days=days
        )
        return {
            "history": history,
            "count": len(history),
            "filters": {
                "limit": limit,
                "query_filter": query_filter,
                "days": days
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get search history: {e}")

@router.get("/admin/search-stats")
async def get_search_stats(days: int = 30):
    """Get search statistics"""
    try:
        db = get_tesseract_db()
        stats = db.get_search_stats(days=days)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get search stats: {e}")

@router.delete("/admin/vectors/{news_id}/{vector_type}")
async def delete_vector_type(news_id: str, vector_type: str):
    """Delete vectors for a news_id of a specific type (title|summary|body)."""
    try:
        vector_store.ensure_collection()
        q_filter = {
            "must": [
                {"key": "news_id", "match": {"value": news_id}},
                {"key": "vector_type", "match": {"value": vector_type}},
            ]
        }
        result = vector_store.delete_by_filter(q_filter)
        return {"status": "ok", "deleted": True, "detail": str(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete vectors: {e}")

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
    
    # Multi-vector: search across all types and deduplicate by news_id (max score)
    raw_results = vector_store.search(
        query_vector=query_embedding.tolist(),
        limit=max(100, request.limit * 5),  # fetch more, then dedupe
        query_filter=qdrant_filter
    )

    # Deduplicate: keep best score per news_id
    best_by_news: dict[str, any] = {}
    for r in raw_results:
        nid = r.payload.get("news_id")
        if not nid:
            continue
        prev = best_by_news.get(nid)
        if prev is None or r.score > prev.score:
            best_by_news[nid] = r

    qdrant_results = list(best_by_news.values())[: request.limit]

    # Extract news_ids to bulk fetch from Satbase
    news_ids = [r.payload.get("news_id") for r in qdrant_results if r.payload.get("news_id")]
    
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
    
    response = SearchResponse(
        query=request.query,
        count=len(results),
        results=results
    )
    
    # Log search asynchronously (non-blocking)
    try:
        db = get_tesseract_db()
        # Use asyncio.create_task for non-blocking logging
        asyncio.create_task(
            asyncio.to_thread(
                db.log_search,
                request.query,
                request.filters,
                len(results)
            )
        )
    except Exception as e:
        # Don't fail search if logging fails
        print(f"⚠️ Failed to log search: {e}")
    
    return response

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

    # Vector type filter (optional)
    if filters.get("vector_type"):
        must_conditions.append({
            "key": "vector_type",
            "match": {"value": filters["vector_type"]}
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

@router.get("/admin/similarity/{news_id}")
async def vector_internal_similarity(news_id: str):
    """Return cosine similarities between stored vectors for an article.
    Computes body↔title and body↔summary on the fly from Qdrant vectors.
    """
    try:
        vector_store.ensure_collection()
        # Scroll to get all vectors for news_id
        points, _ = vector_store.scroll(
            query_filter={"must": [{"key": "news_id", "match": {"value": news_id}}]},
            limit=10,
            with_payload=True,
            with_vectors=True,
        )

        by_type = {p.payload.get("vector_type"): p for p in points if p.vector is not None}
        body = by_type.get("body")
        title = by_type.get("title")
        summary = by_type.get("summary")

        def dot(a, b):
            # Vectors are normalized, dot == cosine
            return float(sum(x * y for x, y in zip(a, b)))

        sim_title_body = dot(title.vector, body.vector) if body and title else None
        sim_summary_body = dot(summary.vector, body.vector) if body and summary else None

        return {
            "news_id": news_id,
            "available": {
                "title": bool(title),
                "summary": bool(summary),
                "body": bool(body),
            },
            "similarity": {
                "title_body": sim_title_body,
                "summary_body": sim_summary_body,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute internal similarity: {e}")

@router.get("/tesseract/similar/{news_id}")
async def find_similar(news_id: str, limit: int = 10, vector_type: str | None = None):
    """Find similar articles by vector similarity (news_id is Satbase ID)
    
    Multi-vector mode: Retrieves all vectors for the given news_id,
    uses body vector (or summary if no body) for similarity search,
    and deduplicates results by news_id.
    """
    try:
        vector_store.ensure_collection()
        
        # Find all vectors for this news_id (title/summary/body)
        source_vectors, _ = vector_store.scroll(
            query_filter={"must": [{"key": "news_id", "match": {"value": news_id}}]},
            limit=10,  # max 3 expected
            with_payload=True,
            with_vectors=True
        )
        
        if not source_vectors:
            raise HTTPException(status_code=404, detail=f"Article {news_id} not found in vector store")
        
        # Select best vector for similarity: prefer summary > body > title (matches früheres Verhalten)
        source_vector = None
        vector_priority = {"summary": 3, "body": 2, "title": 1}
        best_priority = 0
        
        for vec in source_vectors:
            vtype = vec.payload.get("vector_type", "summary")
            priority = vector_priority.get(vtype, 0)
            if priority > best_priority:
                best_priority = priority
                source_vector = vec
        
        if not source_vector or not source_vector.vector:
            raise HTTPException(status_code=500, detail=f"No valid vector found for article {news_id}")
        
        # Search for similar (constrain by vector type)
        # Default: use the same type as the chosen source vector (summary/body/title)
        chosen_type = source_vector.payload.get("vector_type", "summary")
        q_filter = {"must": [{"key": "vector_type", "match": {"value": vector_type or chosen_type}}]}
        
        raw_results = vector_store.search(
            query_vector=source_vector.vector,
            limit=max(100, limit * 5),  # fetch more, then dedupe
            query_filter=q_filter
        )
        
        # Deduplicate by news_id, exclude source, keep best score
        seen_ids = {news_id}  # exclude source
        similar_results = []
        
        for r in raw_results:
            result_news_id = r.payload.get("news_id")
            if result_news_id and result_news_id not in seen_ids:
                seen_ids.add(result_news_id)
                similar_results.append({
                    "id": result_news_id,
                    "score": r.score,
                    "text": "",  # summary will be fetched from Satbase by frontend
                    "news_id": result_news_id
                })
                if len(similar_results) >= limit:
                    break
        
        return {
            "source_article": {
                "id": news_id,
                "news_id": news_id,
                "vector_type": source_vector.payload.get("vector_type")
            },
            "similar_articles": similar_results
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
            # Multi-vector: build title/summary/body vectors
            titles = [a.get('title', '') or '' for a in batch_articles]
            summaries = [a.get('description', '') or '' for a in batch_articles]
            bodies = [a.get('body_text', '') or '' for a in batch_articles]

            title_vecs = emb.encode(titles, batch_size=embedding_batch_size, is_query=False)
            summary_vecs = emb.encode(summaries, batch_size=embedding_batch_size, is_query=False)
            body_vecs = emb.encode(bodies, batch_size=embedding_batch_size, is_query=False)

            for idx, article in enumerate(batch_articles):
                # Use Satbase article ID as Qdrant ID - convert to UUID for string IDs
                article_id = article["id"]
                is_numeric = isinstance(article_id, int) or (isinstance(article_id, str) and article_id.isdigit())
                
                # Helper: deterministic point ID per vector_type
                def pid(vector_type: str):
                    if is_numeric:
                        # Integer IDs: multiply by 10 and add suffix
                        base = int(article_id)
                        suffix_map = {"title": 1, "summary": 2, "body": 3}
                        return base * 10 + suffix_map[vector_type]
                    else:
                        # String IDs: create UUID5 from news_id + vector_type
                        unique_str = f"{article_id}:{vector_type}"
                        return str(uuid.uuid5(uuid.NAMESPACE_DNS, unique_str))

                # Title vector
                upsert_accumulator.append(PointStruct(
                    id=pid("title"),
                    vector=title_vecs[idx].tolist(),
                    payload={"news_id": article["id"], "vector_type": "title"},
                ))
                # Summary vector
                upsert_accumulator.append(PointStruct(
                    id=pid("summary"),
                    vector=summary_vecs[idx].tolist(),
                    payload={"news_id": article["id"], "vector_type": "summary"},
                ))
                # Body vector (only if available)
                if bodies[idx]:
                    upsert_accumulator.append(PointStruct(
                        id=pid("body"),
                        vector=body_vecs[idx].tolist(),
                        payload={"news_id": article["id"], "vector_type": "body"},
                    ))
                
                # Mark as embedded
                db.mark_article_embedded(
                    article["id"],
                    article.get("published_at", ""),
                    article.get("title", ""),
                    article.get("body_text", "") or article.get("description", "")
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


