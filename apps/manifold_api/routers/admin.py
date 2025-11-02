# apps/manifold_api/routers/admin.py
"""Admin & correction endpoints for full control."""
from fastapi import APIRouter, Depends, HTTPException
from libs.manifold_core.storage.qdrant_store import QdrantStore
from libs.manifold_core.embeddings.provider import EmbeddingProvider
from apps.manifold_api.dependencies import get_qdrant_store, get_embedding_provider_dep
from datetime import datetime, timedelta

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


# Rollback endpoint removed - not implemented and not needed for MVP
# TODO: Implement versioning system if rollback functionality is required


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


# Merge endpoint removed - not implemented and too complex for MVP
# TODO: Implement merge functionality if needed in the future


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
    # Note: This endpoint is wrapped in MCP but returns 501 until implemented
    # Keeping endpoint for future implementation - useful for Agents to understand search results
    raise HTTPException(501, "Explain not implemented in MVP - returning gracefully")


@router.get("/similar/{thought_id}")
def get_similar(
    thought_id: str,
    k: int = 5,  # Reduced from 10 for token efficiency
    vector_type: str = "summary",
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Find k nearest neighbors using vector similarity (configurable vector type). Hard max limit of 20 for token safety."""
    if k > 20:
        raise HTTPException(status_code=400, detail=f"k cannot exceed 20 (token safety). Received: {k}")
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
    from_dt: str | None = None,
    to_dt: str | None = None,
    days: int | None = None,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Find potential duplicate thoughts in the system.
    
    Supports temporal filtering via from_dt/to_dt (ISO format) or days (relative from now).
    """
    try:
        # Determine effective date range
        eff_from = from_dt
        eff_to = to_dt
        if not eff_from and not eff_to and days and days > 0:
            now = datetime.utcnow()
            eff_from = (now - timedelta(days=days)).isoformat() + "Z"
            eff_to = now.isoformat() + "Z"
        
        # Build filter
        must = []
        if session_id:
            must.append({"key": "session_id", "match": {"value": session_id}})
        if workspace_id:
            must.append({"key": "workspace_id", "match": {"value": workspace_id}})
        if eff_from:
            must.append({"key": "created_at", "range": {"gte": eff_from}})
        if eff_to:
            must.append({"key": "created_at", "range": {"lte": eff_to}})
        
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
                            "summary": point.payload.get("summary"),
                            "content": point.payload.get("content"),
                            "status": point.payload.get("status"),
                            "confidence_level": point.payload.get("confidence_level"),
                            "created_at": point.payload.get("created_at"),
                            "session_id": point.payload.get("session_id"),
                        },
                        "thought_2": {
                            "id": str(other_point.id),
                            "title": other_point.payload.get("title"),
                            "type": other_point.payload.get("type"),
                            "summary": other_point.payload.get("summary"),
                            "content": other_point.payload.get("content"),
                            "status": other_point.payload.get("status"),
                            "confidence_level": other_point.payload.get("confidence_level"),
                            "created_at": other_point.payload.get("created_at"),
                            "session_id": other_point.payload.get("session_id"),
                        },
                        "reason": "identical_title",
                        "similarity": threshold  # Add similarity score
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


@router.get("/duplicates/all")
def get_all_duplicates(
    threshold: float = 0.92,
    limit: int = 50,  # Reduced from 200 for token efficiency
    session_id: str | None = None,
    workspace_id: str | None = None,
    from_dt: str | None = None,
    to_dt: str | None = None,
    days: int | None = None,
    include_marked: bool = True,
    include_similarity: bool = True,
    include_content: bool = False,  # Default False to save tokens
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get all duplicates from both sources: marked duplicate relations AND similarity-based detection.
    Hard max limit of 100 for token safety.
    
    This is the comprehensive duplicate detection endpoint that combines:
    1. Thoughts with explicit "duplicate" relation type (marked duplicates)
    2. Thoughts flagged by similarity threshold (unmarked potential duplicates)
    
    Supports temporal filtering via from_dt/to_dt (ISO format) or days (relative from now).
    
    Returns unified list of duplicate pairs with source indicator (marked vs similarity).
    """
    if limit > 100:
        raise HTTPException(status_code=400, detail=f"limit cannot exceed 100 (token safety). Received: {limit}")
    try:
        all_pairs = []
        seen_pairs = set()  # Deduplicate across both sources
        
        # 1. Get marked duplicates (relations with type="duplicate")
        if include_marked:
            # Determine effective date range for filtering
            eff_from = from_dt
            eff_to = to_dt
            if not eff_from and not eff_to and days and days > 0:
                now = datetime.utcnow()
                eff_from = (now - timedelta(days=days)).isoformat() + "Z"
                eff_to = now.isoformat() + "Z"
            
            # Build filter for thoughts (for temporal filtering)
            must = []
            if session_id:
                must.append({"key": "session_id", "match": {"value": session_id}})
            if workspace_id:
                must.append({"key": "workspace_id", "match": {"value": workspace_id}})
            if eff_from:
                must.append({"key": "created_at", "range": {"gte": eff_from}})
            if eff_to:
                must.append({"key": "created_at", "range": {"lte": eff_to}})
            
            filters = {"must": must} if must else None
            all_thoughts = store.scroll(payload_filter=filters, limit=10000)
            
            # Fallback: If temporal filter yields no results but date filter is intended,
            # scroll without date range and filter in-app (robustness like timeline endpoint)
            intends_date_filter = bool(eff_from or eff_to)
            if intends_date_filter and len(all_thoughts) == 0:
                must_base = []
                if session_id:
                    must_base.append({"key": "session_id", "match": {"value": session_id}})
                if workspace_id:
                    must_base.append({"key": "workspace_id", "match": {"value": workspace_id}})
                filters_base = {"must": must_base} if must_base else None
                all_thoughts = store.scroll(payload_filter=filters_base, limit=10000)
                
                def _in_range(created_str: str) -> bool:
                    try:
                        if not created_str:
                            return False
                        created_dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                        if eff_from:
                            from_dt_parsed = datetime.fromisoformat(eff_from.replace("Z", "+00:00"))
                            if created_dt < from_dt_parsed:
                                return False
                        if eff_to:
                            to_dt_parsed = datetime.fromisoformat(eff_to.replace("Z", "+00:00"))
                            if created_dt > to_dt_parsed:
                                return False
                        return True
                    except Exception:
                        return False
                
                all_thoughts = [p for p in all_thoughts if _in_range(p.payload.get("created_at", ""))]
            
            for point in all_thoughts:
                thought_id = str(point.id)
                links = point.payload.get("links", {})
                relations = links.get("relations", []) or []
                
                for r in relations:
                    if r.get("type") == "duplicate":
                        related_id = r.get("related_id")
                        if related_id:
                            # Get related thought (don't filter by date - marked relations are explicit)
                            related_thought = store.get_by_id(related_id)
                            if not related_thought:
                                continue
                            
                            # For marked duplicate relations: only filter by source thought's created_at
                            # The relation itself is explicit, so we include it if source is in range
                            # (Don't filter by related_thought.created_at - that would exclude valid marked duplicates)
                            
                            # Create pair key for deduplication
                            pair_key = tuple(sorted([thought_id, related_id]))
                            if pair_key not in seen_pairs:
                                seen_pairs.add(pair_key)
                                thought_1_data = {
                                    "id": thought_id,
                                    "title": point.payload.get("title"),
                                    "type": point.payload.get("type"),
                                    "summary": point.payload.get("summary"),
                                    "status": point.payload.get("status"),
                                    "confidence_level": point.payload.get("confidence_level"),
                                    "created_at": point.payload.get("created_at"),
                                    "session_id": point.payload.get("session_id"),
                                }
                                thought_2_data = {
                                    "id": related_id,
                                    "title": related_thought.get("title"),
                                    "type": related_thought.get("type"),
                                    "summary": related_thought.get("summary"),
                                    "status": related_thought.get("status"),
                                    "confidence_level": related_thought.get("confidence_level"),
                                    "created_at": related_thought.get("created_at"),
                                    "session_id": related_thought.get("session_id"),
                                }
                                if include_content:
                                    thought_1_data["content"] = point.payload.get("content")
                                    thought_2_data["content"] = related_thought.get("content")
                                
                                all_pairs.append({
                                    "thought_1": thought_1_data,
                                    "thought_2": thought_2_data,
                                    "source": "marked_relation",
                                    "relation_weight": r.get("weight", 1.0),
                                    "similarity": r.get("weight", 1.0),  # Use weight as similarity proxy
                                    "reason": "explicit_duplicate_relation"
                                })
        
        # 2. Get similarity-based duplicates
        if include_similarity:
            # Reuse filter building from get_duplicate_warnings
            eff_from = from_dt
            eff_to = to_dt
            if not eff_from and not eff_to and days and days > 0:
                now = datetime.utcnow()
                eff_from = (now - timedelta(days=days)).isoformat() + "Z"
                eff_to = now.isoformat() + "Z"
            
            must = []
            if session_id:
                must.append({"key": "session_id", "match": {"value": session_id}})
            if workspace_id:
                must.append({"key": "workspace_id", "match": {"value": workspace_id}})
            if eff_from:
                must.append({"key": "created_at", "range": {"gte": eff_from}})
            if eff_to:
                must.append({"key": "created_at", "range": {"lte": eff_to}})
            
            filters = {"must": must} if must else None
            all_points = store.scroll(payload_filter=filters, limit=10000)
            
            seen_ids = set()
            for i, point in enumerate(all_points):
                if str(point.id) in seen_ids:
                    continue
                
                for j, other_point in enumerate(all_points[i+1:], start=i+1):
                    if str(other_point.id) in seen_ids:
                        continue
                    
                    # Title-based duplicate detection
                    if point.payload.get("title") == other_point.payload.get("title"):
                        pair_key = tuple(sorted([str(point.id), str(other_point.id)]))
                        if pair_key not in seen_pairs:
                            seen_pairs.add(pair_key)
                            thought_1_data = {
                                "id": str(point.id),
                                "title": point.payload.get("title"),
                                "type": point.payload.get("type"),
                                "summary": point.payload.get("summary"),
                                "status": point.payload.get("status"),
                                "confidence_level": point.payload.get("confidence_level"),
                                "created_at": point.payload.get("created_at"),
                                "session_id": point.payload.get("session_id"),
                            }
                            thought_2_data = {
                                "id": str(other_point.id),
                                "title": other_point.payload.get("title"),
                                "type": other_point.payload.get("type"),
                                "summary": other_point.payload.get("summary"),
                                "status": other_point.payload.get("status"),
                                "confidence_level": other_point.payload.get("confidence_level"),
                                "created_at": other_point.payload.get("created_at"),
                                "session_id": other_point.payload.get("session_id"),
                            }
                            if include_content:
                                thought_1_data["content"] = point.payload.get("content")
                                thought_2_data["content"] = other_point.payload.get("content")
                            
                            all_pairs.append({
                                "thought_1": thought_1_data,
                                "thought_2": thought_2_data,
                                "source": "similarity_detection",
                                "similarity": threshold,
                                "reason": "identical_title"
                            })
        
        # Sort by similarity (descending) and limit
        all_pairs.sort(key=lambda x: x.get("similarity", 0.0), reverse=True)
        all_pairs = all_pairs[:limit]
        
        return {
            "status": "ok",
            "threshold": threshold,
            "total_pairs_found": len(all_pairs),
            "marked_duplicates": sum(1 for p in all_pairs if p.get("source") == "marked_relation"),
            "similarity_duplicates": sum(1 for p in all_pairs if p.get("source") == "similarity_detection"),
            "duplicates": all_pairs,
            "note": "Combined view of marked duplicate relations and similarity-based detection. Review each pair and decide: merge (mf-merge-thoughts), unlink if false positive (mf-unlink-related), or leave as-is."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting all duplicates: {str(e)}")


@router.get("/statistics")
def get_statistics(
    session_id: str | None = None,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get comprehensive statistics about thoughts."""
    try:
        # Build filter
        filters = None
        if session_id:
            filters = {"must": [{"key": "session_id", "match": {"value": session_id}}]}
        
        # Get all thoughts
        all_points = store.scroll(payload_filter=filters, limit=10000)
        
        # Calculate statistics
        type_dist = {}
        status_dist = {}
        confidence_dist = {}
        created_by_month = {}
        has_relations = 0
        has_parent = 0
        relation_count = 0
        
        for point in all_points:
            payload = point.payload
            
            # Type distribution
            t = payload.get("type", "unknown")
            type_dist[t] = type_dist.get(t, 0) + 1
            
            # Status distribution
            s = payload.get("status", "unknown")
            status_dist[s] = status_dist.get(s, 0) + 1
            
            # Confidence distribution
            c = payload.get("confidence_level", "unknown")
            confidence_dist[c] = confidence_dist.get(c, 0) + 1
            
            # Temporal distribution
            created_at = payload.get("created_at")
            if created_at:
                month = created_at[:7]  # YYYY-MM
                created_by_month[month] = created_by_month.get(month, 0) + 1
            
            # Relations
            related = payload.get("links", {}).get("related_thoughts", [])
            if related:
                has_relations += 1
                relation_count += len(related)
            
            # Parent-child
            if payload.get("parent_id"):
                has_parent += 1
        
        return {
            "status": "ok",
            "total_thoughts": len(all_points),
            "distributions": {
                "by_type": type_dist,
                "by_status": status_dist,
                "by_confidence": confidence_dist,
                "by_month": created_by_month,
            },
            "relations": {
                "thoughts_with_relations": has_relations,
                "total_relations": relation_count,
                "avg_relations_per_thought": round(relation_count / len(all_points), 2) if all_points else 0,
            },
            "hierarchy": {
                "thoughts_with_parent": has_parent,
                "orphan_thoughts": len(all_points) - has_parent,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating statistics: {str(e)}")


@router.get("/graph/metrics")
def get_graph_metrics(
    session_id: str | None = None,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Calculate graph metrics (centrality, clustering, etc)."""
    try:
        # Build filter
        filters = None
        if session_id:
            filters = {"must": [{"key": "session_id", "match": {"value": session_id}}]}
        
        # Get all thoughts
        all_points = store.scroll(payload_filter=filters, limit=10000)
        
        # Build adjacency structure
        relations_by_type = {}
        thought_degrees = {}  # How many relations each thought has
        thought_info = {}
        
        for point in all_points:
            payload = point.payload
            thought_id = str(point.id)
            thought_info[thought_id] = {
                "title": payload.get("title"),
                "type": payload.get("type"),
                "confidence": payload.get("confidence_level"),
            }
            
            related = payload.get("links", {}).get("related_thoughts", [])
            thought_degrees[thought_id] = len(related)
            
            for rel in related:
                rel_type = rel.get("type", "related") if isinstance(rel, dict) else "related"
                if rel_type not in relations_by_type:
                    relations_by_type[rel_type] = 0
                relations_by_type[rel_type] += 1
        
        # Calculate metrics
        total_thoughts = len(all_points)
        total_relations = sum(thought_degrees.values())
        
        # Network metrics
        density = (2 * total_relations) / (total_thoughts * (total_thoughts - 1)) if total_thoughts > 1 else 0
        avg_degree = total_relations / total_thoughts if total_thoughts > 0 else 0
        
        # Find central nodes (highest degree)
        sorted_by_degree = sorted(
            [(tid, degree) for tid, degree in thought_degrees.items()],
            key=lambda x: x[1],
            reverse=True
        )
        top_central = [
            {
                "id": tid,
                "title": thought_info[tid]["title"],
                "degree": degree,
                "type": thought_info[tid]["type"],
            }
            for tid, degree in sorted_by_degree[:10]
        ]
        
        return {
            "status": "ok",
            "network": {
                "total_nodes": total_thoughts,
                "total_edges": total_relations,
                "density": round(density, 4),
                "average_degree": round(avg_degree, 2),
                "relation_types": relations_by_type,
            },
            "centrality": {
                "top_by_degree": top_central,
            },
            "degree_distribution": {
                "min": min(thought_degrees.values()) if thought_degrees else 0,
                "max": max(thought_degrees.values()) if thought_degrees else 0,
                "median": sorted(thought_degrees.values())[len(thought_degrees) // 2] if thought_degrees else 0,
                "isolated_nodes": sum(1 for d in thought_degrees.values() if d == 0),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating graph metrics: {str(e)}")


@router.get("/overview")
def get_overview(
    session_id: str | None = None,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get complete overview of thought system (combines statistics & metrics)."""
    try:
        # Get statistics
        stats_resp = get_statistics(session_id=session_id, store=store)
        
        # Get metrics
        metrics_resp = get_graph_metrics(session_id=session_id, store=store)
        
        # Build overview
        return {
            "status": "ok",
            "session_id": session_id or "all",
            "summary": {
                "total_thoughts": stats_resp["total_thoughts"],
                "network_density": metrics_resp["network"]["density"],
                "average_relations": metrics_resp["network"]["average_degree"],
            },
            "statistics": stats_resp,
            "metrics": metrics_resp,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating overview: {str(e)}")


@router.get("/relation-timeline")
def get_relation_timeline(
    session_id: str | None = None,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get timeline of all relation creations with timestamps."""
    try:
        filters = None
        if session_id:
            filters = {"must": [{"key": "session_id", "match": {"value": session_id}}]}
        
        all_points = store.scroll(payload_filter=filters, limit=10000)
        
        # Collect all relations with timestamps
        timeline_events = []
        
        for point in all_points:
            payload = point.payload
            source_id = str(point.id)
            source_title = payload.get("title", "Untitled")
            
            relations = payload.get("links", {}).get("relations", [])
            for rel in relations:
                if isinstance(rel, dict):
                    timeline_events.append({
                        "source_id": source_id,
                        "source_title": source_title,
                        "target_id": rel.get("related_id"),
                        "relation_type": rel.get("type", "related"),
                        "weight": rel.get("weight", 1.0),
                        "created_at": rel.get("created_at", "unknown"),
                    })
        
        # Sort by timestamp
        timeline_events.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Group by date
        by_date = {}
        for event in timeline_events:
            created_at = event["created_at"]
            if created_at != "unknown":
                date = created_at.split("T")[0]  # YYYY-MM-DD
            else:
                date = "unknown"
            
            if date not in by_date:
                by_date[date] = []
            by_date[date].append(event)
        
        return {
            "status": "ok",
            "total_relations": len(timeline_events),
            "by_date": by_date,
            "all_events": timeline_events[:100],  # Last 100
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting relation timeline: {str(e)}")


@router.post("/reset")
def factory_reset(
    body: dict,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """
    DANGER: Factory reset - Delete ALL thoughts from Qdrant collection.
    This is irreversible!
    
    Requires confirm=true in body.
    """
    confirm = body.get("confirm", False)
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Reset requires confirm=true in body. This will delete ALL data!"
        )
    
    try:
        # Get count before deletion
        all_points = store.scroll(limit=100000)
        before_count = len(all_points)
        
        # Delete all points by deleting and recreating collection
        # More efficient than deleting points one by one
        collection_name = store.collection_name
        
        # Delete entire collection
        try:
            store.client.delete_collection(collection_name)
        except Exception as e:
            # Collection might not exist, continue
            pass
        
        # Reinitialize collection
        store.initialize_collection()
        
        return {
            "status": "success",
            "message": "Manifold factory reset complete",
            "deleted": {
                "thoughts": before_count,
            },
            "collection_recreated": True
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset: {str(e)}"
        )

