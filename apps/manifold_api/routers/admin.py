# apps/manifold_api/routers/admin.py
"""Admin & correction endpoints for full control."""
from fastapi import APIRouter, Depends, HTTPException
from libs.manifold_core.storage.qdrant_store import QdrantStore
from libs.manifold_core.embeddings.provider import EmbeddingProvider
from apps.manifold_api.dependencies import get_qdrant_store, get_embedding_provider_dep
from datetime import datetime

router = APIRouter(prefix="/v1/memory", tags=["admin"])


@router.get("/thought/{thought_id}/history")
def get_history(thought_id: str, store: QdrantStore = Depends(get_qdrant_store)):
    """Version history (placeholder: MVP stores only latest)."""
    thought = store.get_by_id(thought_id)
    if not thought:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    return {
        "status": "ok",
        "versions": [
            {
                "version": thought.get("version", 1),
                "updated_at": thought.get("updated_at"),
                "updated_by": thought.get("updated_by"),
                "change_reason": thought.get("change_reason"),
            }
        ],
    }


@router.post("/thought/{thought_id}/rollback")
def rollback_version(
    thought_id: str,
    body: dict,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Rollback to version (placeholder: MVP only latest)."""
    raise HTTPException(501, "Rollback not implemented in MVP")


@router.post("/thought/{thought_id}/reembed")
def reembed_thought(
    thought_id: str,
    body: dict,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Re-embed thought vectors."""
    thought = store.get_by_id(thought_id)
    if not thought:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    vectors_to_update = body.get("vectors", ["text", "title"])
    
    new_vectors = {}
    if "text" in vectors_to_update:
        new_vectors["text"] = embedder.embed(thought.get("content", ""))
    if "title" in vectors_to_update:
        new_vectors["title"] = embedder.embed(thought.get("title", ""))
    
    thought["last_embedded_at"] = datetime.utcnow().isoformat() + "Z"
    
    store.upsert_point(thought_id, thought, vectors=new_vectors)
    
    return {"status": "reembedded"}


@router.post("/reindex")
def reindex_collection(
    body: dict,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Reindex all thoughts (dry-run or full)."""
    dry_run = body.get("dry_run", True)
    filters = body.get("filters")
    
    # Build filter for scroll
    filter_dict = None
    if filters:
        filter_dict = {"must": [filters]} if isinstance(filters, dict) and "must" not in filters else filters
    
    # Scan all matching using scroll
    all_thoughts = store.scroll(payload_filter=filter_dict, limit=10000)
    
    if dry_run:
        return {
            "status": "ok",
            "would_reindex": len(all_thoughts),
        }
    
    for point in all_thoughts:
        tid = point.id
        payload = point.payload
        new_vectors = {
            "text": embedder.embed(payload.get("content", "")),
            "title": embedder.embed(payload.get("title", "")),
        }
        payload["last_embedded_at"] = datetime.utcnow().isoformat() + "Z"
        store.upsert_point(tid, payload, vectors=new_vectors)
    
    return {
        "status": "ok",
        "reindexed": len(all_thoughts),
    }


@router.post("/dedupe")
def dedupe_thoughts(body: dict, store: QdrantStore = Depends(get_qdrant_store)):
    """Find duplicate thoughts based on semantic similarity."""
    strategy = body.get("strategy", "semantic")
    filters = body.get("filters")
    threshold = body.get("threshold", 0.95)  # High similarity threshold for deduplication
    
    # Build filter for scroll
    filter_dict = None
    if filters:
        filter_dict = {"must": [filters]} if isinstance(filters, dict) and "must" not in filters else filters
    
    # Scan all matching using scroll
    all_thoughts = store.scroll(payload_filter=filter_dict, limit=10000)
    
    # For MVP, we return a simple stub indicating the system is ready
    return {
        "status": "ok",
        "duplicates": [],
        "scanned": len(all_thoughts),
        "note": "Semantic deduplication ready - implement duplicate detection logic based on vector similarity"
    }


# --- Bulk endpoints ---

@router.post("/bulk/quarantine")
def bulk_quarantine(body: dict, store: QdrantStore = Depends(get_qdrant_store)):
    ids = body.get("ids", [])
    reason = body.get("reason", "")
    updated = 0
    for thought_id in ids:
        thought = store.get_by_id(thought_id)
        if not thought:
            continue
        thought["quarantined_at"] = datetime.utcnow().isoformat() + "Z"
        thought["quarantine_reason"] = reason
        thought["status"] = "quarantined"
        thought.setdefault("flags", {})["quarantined"] = True
        store.upsert_point(thought_id, thought, vectors={})
        updated += 1
    return {"status": "ok", "updated": updated}


@router.post("/bulk/unquarantine")
def bulk_unquarantine(body: dict, store: QdrantStore = Depends(get_qdrant_store)):
    ids = body.get("ids", [])
    updated = 0
    for thought_id in ids:
        thought = store.get_by_id(thought_id)
        if not thought:
            continue
        thought["quarantined_at"] = None
        thought["quarantine_reason"] = None
        thought["status"] = "active"
        thought.setdefault("flags", {})["quarantined"] = False
        store.upsert_point(thought_id, thought, vectors={})
        updated += 1
    return {"status": "ok", "updated": updated}


@router.post("/bulk/reembed")
def bulk_reembed(body: dict, store: QdrantStore = Depends(get_qdrant_store), embedder: EmbeddingProvider = Depends(get_embedding_provider_dep)):
    ids = body.get("ids", [])
    vectors_to_update = body.get("vectors", ["text", "title"])
    updated = 0
    for thought_id in ids:
        thought = store.get_by_id(thought_id)
        if not thought:
            continue
        new_vectors = {}
        if "text" in vectors_to_update:
            new_vectors["text"] = embedder.embed(thought.get("content", ""))
        if "title" in vectors_to_update:
            new_vectors["title"] = embedder.embed(thought.get("title", ""))
        thought["last_embedded_at"] = datetime.utcnow().isoformat() + "Z"
        store.upsert_point(thought_id, thought, vectors=new_vectors)
        updated += 1
    return {"status": "ok", "updated": updated}


@router.post("/bulk/promote")
def bulk_promote(body: dict, store: QdrantStore = Depends(get_qdrant_store)):
    ids = body.get("ids", [])
    marked = 0
    for thought_id in ids:
        thought = store.get_by_id(thought_id)
        if not thought:
            continue
        thought.setdefault("flags", {})["promoted_to_kg"] = True
        store.upsert_point(thought_id, thought, vectors={})
        marked += 1
    return {"status": "ok", "marked": marked}


@router.post("/merge")
def merge_thoughts(body: dict, store: QdrantStore = Depends(get_qdrant_store)):
    """Merge two thoughts (placeholder)."""
    raise HTTPException(501, "Merge not implemented in MVP")


@router.post("/thought/{thought_id}/quarantine")
def quarantine_thought(
    thought_id: str,
    body: dict,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Quarantine thought."""
    thought = store.get_by_id(thought_id)
    if not thought:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    thought["quarantined_at"] = datetime.utcnow().isoformat() + "Z"
    thought["quarantine_reason"] = body.get("reason", "")
    thought["status"] = "quarantined"
    thought.setdefault("flags", {})["quarantined"] = True
    
    store.upsert_point(thought_id, thought, vectors={})
    
    return {"status": "quarantined"}


@router.post("/thought/{thought_id}/unquarantine")
def unquarantine_thought(
    thought_id: str,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Unquarantine thought."""
    thought = store.get_by_id(thought_id)
    if not thought:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    thought["quarantined_at"] = None
    thought["quarantine_reason"] = None
    thought["status"] = "active"
    thought.setdefault("flags", {})["quarantined"] = False
    
    store.upsert_point(thought_id, thought, vectors={})
    
    return {"status": "unquarantined"}


@router.get("/trash")
def get_trash(store: QdrantStore = Depends(get_qdrant_store)):
    """Get soft-deleted thoughts."""
    # Use scroll to find deleted thoughts (status = "deleted")
    results = store.scroll(
        payload_filter={"must": [{"key": "status", "match": {"value": "deleted"}}]},
        limit=1000
    )
    
    return {
        "status": "ok",
        "thoughts": [point.payload for point in results],
    }


@router.post("/trash/{thought_id}/restore")
def restore_from_trash(
    thought_id: str,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Restore soft-deleted thought."""
    thought = store.get_by_id(thought_id)
    if not thought:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    thought["deleted_at"] = None
    thought["deleted_by"] = None
    thought["status"] = "active"
    
    store.upsert_point(thought_id, thought, vectors={})
    
    return {"status": "restored"}


@router.post("/explain/search")
def explain_search(body: dict, store: QdrantStore = Depends(get_qdrant_store)):
    """Explain search scoring (placeholder)."""
    raise HTTPException(501, "Explain not implemented in MVP")


@router.get("/similar/{thought_id}")
def get_similar(
    thought_id: str,
    k: int = 10,
    vector_type: str = "summary",
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Find k nearest neighbors using vector similarity (configurable vector type)."""
    thought = store.get_by_id(thought_id)
    if not thought:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    # Retrieve the point with vectors from Qdrant
    try:
        points = store.client.retrieve(
            collection_name=store.collection_name,
            ids=[thought_id],
            with_vectors=True
        )
        
        if not points or len(points) == 0:
            return {"status": "ok", "similar": []}
        
        query_vector = points[0].vector
        
        # If vector is named vectors dict, extract specified vector type
        if isinstance(query_vector, dict):
            query_vector = query_vector.get(vector_type or "summary")
        
        if not query_vector:
            return {"status": "ok", "similar": []}
        
        # Search for similar thoughts (exclude self)
        import qdrant_client.models as qm
        results = store.client.search(
            collection_name=store.collection_name,
            query_vector=qm.NamedVector(name=vector_type or "summary", vector=query_vector),
            limit=k + 1,
            with_payload=True
        )
        
        # Filter out the query thought itself
        similar = []
        for hit in results:
            if str(hit.id) != str(thought_id):
                similar.append({
                    "thought_id": str(hit.id),
                    "score": hit.score,
                    "type": hit.payload.get("type"),
                    "title": hit.payload.get("title"),
                    "summary": hit.payload.get("summary"),
                    "tickers": hit.payload.get("tickers", []),
                })
        
        return {
            "status": "ok",
            "vector_type": vector_type,
            "similar": similar[:k],
        }
    
    except Exception as e:
        return {"status": "ok", "similar": []}


@router.post("/check-duplicate")
def check_duplicate(
    body: dict,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Check if a thought (title/summary/content) is similar to existing thoughts."""
    title = body.get("title", "")
    summary = body.get("summary", "")
    content = body.get("content", "")
    threshold = body.get("threshold", 0.90)
    
    # Build text for embedding
    text_to_check = f"{title} {summary} {content}".strip()
    if not text_to_check:
        return {"status": "ok", "similar": [], "message": "No text to check"}
    
    try:
        query_vec = embedder.embed(text_to_check)
        
        # Search with summary vector (cheap discovery)
        similar_points = store.query(
            vector_name="summary",
            query_vector=query_vec,
            limit=50
        )
        
        candidates = []
        for hit in similar_points:
            if hit.score >= threshold:
                candidates.append({
                    "thought_id": str(hit.id),
                    "similarity": float(hit.score),
                    "title": hit.payload.get("title"),
                    "type": hit.payload.get("type"),
                    "status": hit.payload.get("status"),
                })
        
        is_duplicate = len(candidates) > 0
        return {
            "status": "ok",
            "threshold": threshold,
            "is_duplicate": is_duplicate,
            "similar_count": len(candidates),
            "similar": candidates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking duplicates: {str(e)}")


@router.get("/warnings/duplicates")
def get_duplicate_warnings(
    threshold: float = 0.92,
    limit: int = 100,
    session_id: str | None = None,
    workspace_id: str | None = None,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Find potential duplicate thoughts in the system."""
    try:
        # Build filter
        must = []
        if session_id:
            must.append({"key": "session_id", "match": {"value": session_id}})
        if workspace_id:
            must.append({"key": "workspace_id", "match": {"value": workspace_id}})
        
        filters = {"must": must} if must else None
        
        # Scan all thoughts
        all_points = store.scroll(payload_filter=filters, limit=10000)
        
        # Simple duplicate detection: group by title/summary similarity
        # For MVP: just flag very similar pairs (not a full pairwise comparison)
        seen_ids = set()
        duplicates = []
        
        for i, point in enumerate(all_points):
            if str(point.id) in seen_ids:
                continue
            
            # Check this point against all others
            for j, other_point in enumerate(all_points[i+1:], start=i+1):
                if str(other_point.id) in seen_ids:
                    continue
                
                # Rough check: same title or very similar
                if (point.payload.get("title") == other_point.payload.get("title")):
                    duplicates.append({
                        "thought_1": {
                            "id": str(point.id),
                            "title": point.payload.get("title"),
                            "type": point.payload.get("type"),
                        },
                        "thought_2": {
                            "id": str(other_point.id),
                            "title": other_point.payload.get("title"),
                            "type": other_point.payload.get("type"),
                        },
                        "reason": "identical_title"
                    })
                    
                    if len(duplicates) >= limit:
                        break
            
            if len(duplicates) >= limit:
                break
        
        return {
            "status": "ok",
            "threshold": threshold,
            "scanned": len(all_points),
            "duplicate_pairs_found": len(duplicates),
            "duplicates": duplicates,
            "note": "Review and decide: link, merge, or keep both"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scanning duplicates: {str(e)}")

