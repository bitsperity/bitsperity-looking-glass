from fastapi import APIRouter, BackgroundTasks, HTTPException
from libs.tesseract_core.models.search import SearchRequest, SearchResponse, SearchResult
from libs.tesseract_core.embeddings.embedder import Embedder
from libs.tesseract_core.storage.vector_store import VectorStore
from qdrant_client.models import PointStruct
import httpx
import uuid
import time
import gc
import re

router = APIRouter()

# Initialize once at startup (device from TESSERACT_DEVICE env var)
embedder = None
vector_store = VectorStore()

# Embedding progress state (simple in-memory telemetry)
EMBED_STATE = {
    "status": "idle",        # idle | running | done | error
    "processed": 0,
    "total": 0,
    "device": None,
    "started_at": None,
    "updated_at": None,
    "error": None,
}

def get_embedder():
    global embedder
    if embedder is None:
        embedder = Embedder()  # Device from env
    return embedder

@router.post("/tesseract/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    # Generate query embedding
    emb = get_embedder()
    query_embedding = emb.encode(request.query, normalize=True, is_query=True)[0]
    
    # Build Qdrant filter
    qdrant_filter = build_filter(request.filters) if request.filters else None
    
    # Search
    results = vector_store.search(
        query_vector=query_embedding.tolist(),
        limit=request.limit,
        query_filter=qdrant_filter
    )
    
    # Format response
    return SearchResponse(
        query=request.query,
        count=len(results),
        results=[
            SearchResult(
                id=r.id,
                score=r.score,
                **r.payload
            )
            for r in results
        ]
    )

def build_filter(filters: dict):
    must_conditions = []
    if filters.get("tickers"):
        must_conditions.append({
            "key": "tickers",
            "match": {"any": filters["tickers"]}
        })
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
    """Find similar articles to a given article by vector similarity"""
    try:
        source_points = vector_store.client.retrieve(
            collection_name=vector_store.collection_name,
            ids=[news_id],
            with_vectors=True,
            with_payload=True,
        )
        if not source_points:
            raise HTTPException(status_code=404, detail=f"Article {news_id} not found in vector store")
        source = source_points[0]
        
        results = vector_store.search(
            query_vector=source.vector,
            limit=limit + 1
        )
        
        # Exclude source article
        results = [r for r in results if r.id != news_id][:limit]
        
        return {
            "source_article": {"id": news_id, **source.payload},
            "similar_articles": [
                {"id": r.id, "score": r.score, **r.payload}
                for r in results
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding similar articles: {str(e)}")

# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/embed-batch")
async def embed_batch(background_tasks: BackgroundTasks, from_date: str = "2020-01-01", to_date: str = "2025-12-31"):
    """
    Batch embed all news articles from Satbase into Tesseract.
    Runs in background. Check /admin/embed-status for progress.
    """
    # Validate date format
    date_pattern = r'^\d{4}-\d{2}-\d{2}$'
    if not re.match(date_pattern, from_date) or not re.match(date_pattern, to_date):
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Check if already running
    if EMBED_STATE["status"] == "running":
        raise HTTPException(status_code=409, detail="Batch embedding already in progress")
    
    background_tasks.add_task(run_batch_embedding, from_date, to_date)
    return {
        "status": "started",
        "message": f"Batch embedding from {from_date} to {to_date} started in background",
        "check_progress": "/v1/admin/embed-status"
    }

@router.get("/admin/embed-status")
async def embed_status():
    """Get current embedding status and collection info"""
    try:
        collection_info = vector_store.client.get_collection(vector_store.collection_name)
        return {
            "collection_exists": True,
            "vector_count": collection_info.points_count,
            "vector_size": collection_info.config.params.vectors.size,
            "status": EMBED_STATE["status"],
            "processed": EMBED_STATE["processed"],
            "total": EMBED_STATE["total"],
            "percent": (EMBED_STATE["processed"] / EMBED_STATE["total"] * 100.0) if EMBED_STATE["total"] else 0.0,
            "device": EMBED_STATE["device"],
            "started_at": EMBED_STATE["started_at"],
            "updated_at": EMBED_STATE["updated_at"],
            "error": EMBED_STATE["error"],
        }
    except Exception as e:
        return {
            "collection_exists": False,
            "error": str(e),
            "status": "not_initialized",
            "processed": EMBED_STATE["processed"],
            "total": EMBED_STATE["total"],
            "percent": (EMBED_STATE["processed"] / EMBED_STATE["total"] * 100.0) if EMBED_STATE["total"] else 0.0,
            "device": EMBED_STATE["device"],
            "started_at": EMBED_STATE["started_at"],
            "updated_at": EMBED_STATE["updated_at"],
            "error": EMBED_STATE["error"],
        }

@router.post("/admin/init-collection")
async def init_collection():
    """Initialize or recreate Qdrant collection with versioning"""
    try:
        # Create new versioned collection
        target_name = f"news_embeddings_v{int(time.time())}"
        vector_store.create_collection(vector_size=1024, name=target_name)
        
        # Update alias to point to new collection (atomic switch for zero-downtime)
        try:
            vector_store.delete_alias(alias="news_embeddings")
        except Exception:
            pass  # Alias might not exist yet
        
        vector_store.create_alias(alias="news_embeddings", collection_name=target_name)
        vector_store.use_collection("news_embeddings")
        
        return {"status": "created", "collection": target_name, "alias": "news_embeddings"}
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
        
        # Delete old alias and create new one (atomic-ish)
        try:
            vector_store.delete_alias(alias="news_embeddings")
        except Exception:
            pass  # Alias might not exist
        
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
        
        # Enrich with metadata per collection
        collections_data = []
        for col in cols.collections:
            try:
                info = vector_store.get_collection(name=col.name)
                collections_data.append({
                    "name": col.name,
                    "points_count": info.points_count,
                    "vector_size": info.config.params.vectors.size,
                    "distance": info.config.params.vectors.distance.name if hasattr(info.config.params.vectors, 'distance') else "COSINE"
                })
            except Exception as e:
                collections_data.append({
                    "name": col.name,
                    "error": str(e)
                })
        
        # Check which collection the alias points to
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
        # Safety: Don't delete active collection
        if collection_name == vector_store.collection_name:
            raise HTTPException(status_code=400, detail=f"Cannot delete active collection '{collection_name}'. Switch to another collection first.")
        
        # Check if collection exists
        try:
            vector_store.get_collection(name=collection_name)
        except Exception:
            raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")
        
        # Delete it
        vector_store.delete_collection(name=collection_name)
        
        return {"status": "deleted", "collection": collection_name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete collection: {str(e)}")

# ==================== BACKGROUND TASKS ====================

async def run_batch_embedding(from_date: str, to_date: str):
    """Background task to embed all news articles"""
    print(f"🚀 Starting batch embedding: {from_date} → {to_date}")
    
    try:
        # 1. Initialize embedder (lazy)
        emb = get_embedder()
        print(f"✓ Embedder ready (device: {emb.device})")
        EMBED_STATE.update({
            "status": "running",
            "processed": 0,
            "total": 0,
            "device": emb.device,
            "started_at": int(time.time()),
            "updated_at": int(time.time()),
            "error": None,
        })
        
        # 2. Fetch all news with bodies from Satbase
        print("📥 Fetching news from Satbase...")
        satbase_url = "http://localhost:8080/v1/news"
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.get(satbase_url, params={
                "from": from_date,
                "to": to_date,
                "limit": 100000,
                "include_body": True,
                "has_body": True
            })
            news_items = response.json()["items"]
        
        total = len(news_items)
        EMBED_STATE["total"] = total
        EMBED_STATE["updated_at"] = int(time.time())
        print(f"✓ Fetched {total} articles")
        
        # 3. Stream embeddings + upserts with progress and memory hygiene
        print("🧠 Generating embeddings...")
        embedding_batch_size = 24 if emb.device == "cuda" else 16
        upsert_accumulator = []
        upsert_accumulator_target = 256

        for i in range(0, total, embedding_batch_size):
            batch_items = news_items[i:i+embedding_batch_size]
            batch_texts = [
                f"{it['title']}. {it['text']}. {it.get('content_text', '')[:1000]}"
                for it in batch_items
            ]
            batch_embeddings = emb.encode(batch_texts, batch_size=embedding_batch_size, is_query=False)

            for it, emb_vec in zip(batch_items, batch_embeddings):
                upsert_accumulator.append(
                    PointStruct(
                        id=str(uuid.uuid5(uuid.NAMESPACE_DNS, it["id"])) ,
                        vector=emb_vec.tolist(),
                        payload={
                            "news_id": it["id"],
                            "title": it["title"],
                            "text": it["text"],
                            "source": it["source"],
                            "url": it["url"],
                            "published_at": it["published_at"],
                            "tickers": it.get("tickers", []),
                        },
                    )
                )

            EMBED_STATE["processed"] = min(i + embedding_batch_size, total)
            EMBED_STATE["updated_at"] = int(time.time())
            progress_pct = (EMBED_STATE["processed"] / total * 100.0) if total else 0.0
            print(f"📊 Embedding progress: {EMBED_STATE['processed']}/{total} ({progress_pct:.1f}%)")

            if len(upsert_accumulator) >= upsert_accumulator_target:
                vector_store.upsert(upsert_accumulator, wait=True)
                print(f"✓ Upserted {len(upsert_accumulator)} vectors")
                upsert_accumulator.clear()
                # Try to keep memory stable
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

        EMBED_STATE["status"] = "done"
        EMBED_STATE["updated_at"] = int(time.time())
        print(f"🎉 Successfully embedded {total} news articles!")

        return {"status": "done", "processed": total, "total": total}
    
    except Exception as e:
        error_msg = f"Batch embedding failed: {str(e)}"
        print(f"❌ {error_msg}")
        EMBED_STATE.update({
            "status": "error",
            "error": error_msg,
            "updated_at": int(time.time())
        })
        raise


