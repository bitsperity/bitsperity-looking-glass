# apps/manifold_api/routers/relations.py
"""Thought-to-thought relations endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from libs.manifold_core.storage.qdrant_store import QdrantStore
from apps.manifold_api.dependencies import get_qdrant_store

router = APIRouter(prefix="/v1/memory/thought", tags=["relations"])


@router.post("/{thought_id}/related")
def link_related(
    thought_id: str,
    body: dict,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Link thought to related thought."""
    related_id = body.get("related_id")
    if not related_id:
        raise HTTPException(400, "related_id required")
    
    # Fetch source
    source = store.get_by_id(thought_id)
    if not source:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    # Add to links.related_thoughts
    links = source.get("links", {})
    related = links.get("related_thoughts", [])
    if related_id not in related:
        related.append(related_id)
    links["related_thoughts"] = related
    source["links"] = links
    
    # Update
    store.upsert_point(thought_id, source, vectors={})
    
    return {"status": "linked"}


@router.delete("/{thought_id}/related/{related_id}")
def unlink_related(
    thought_id: str,
    related_id: str,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Unlink related thought."""
    source = store.get_by_id(thought_id)
    if not source:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    links = source.get("links", {})
    related = links.get("related_thoughts", [])
    if related_id in related:
        related.remove(related_id)
    links["related_thoughts"] = related
    source["links"] = links
    
    store.upsert_point(thought_id, source, vectors={})
    
    return {"status": "unlinked"}


@router.get("/{thought_id}/related")
def get_related(
    thought_id: str,
    depth: int = 1,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get related thoughts up to depth."""
    source = store.get_by_id(thought_id)
    if not source:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    # Direct outgoing links from this thought
    outgoing_ids = source.get("links", {}).get("related_thoughts", [])
    outgoing = [{"from_id": thought_id, "to_id": rid, "relation_type": "related"} for rid in outgoing_ids]
    
    # Find incoming links (scan all thoughts that link to this one)
    incoming = []
    all_thoughts = store.scroll(limit=10000)
    for point in all_thoughts:
        related_ids = point.payload.get("links", {}).get("related_thoughts", [])
        if thought_id in related_ids:
            incoming.append({"from_id": point.id, "to_id": thought_id, "relation_type": "related"})
    
    # Get full thought objects
    related_ids = set(outgoing_ids)
    related_ids.update([inc["from_id"] for inc in incoming])
    
    thoughts = []
    for rid in related_ids:
        thought = store.get_by_id(rid)
        if thought:
            thoughts.append(thought)
    
    return {
        "status": "ok",
        "thoughts": thoughts,
        "incoming": incoming,
        "outgoing": outgoing,
    }

