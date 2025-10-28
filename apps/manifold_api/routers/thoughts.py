# apps/manifold_api/routers/thoughts.py
"""CRUD endpoints for thoughts."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from libs.manifold_core.models.envelope import ThoughtEnvelope, VersionSnapshot
from libs.manifold_core.models.responses import CreateResponse, UpdateResponse, DeleteResponse
from libs.manifold_core.embeddings.provider import EmbeddingProvider
from libs.manifold_core.storage.qdrant_store import QdrantStore
from apps.manifold_api.dependencies import get_qdrant_store, get_embedding_provider_dep
from datetime import datetime
from uuid import uuid4
import hashlib
import json


router = APIRouter(prefix="/v1/memory", tags=["thoughts"])


@router.post("/thought", response_model=CreateResponse)
def create_thought(
    thought: ThoughtEnvelope,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Create a new thought with multi-vector embeddings."""
    if not thought.id:
        thought.id = str(uuid4())
    
    # Set timestamps
    now = datetime.utcnow().isoformat() + "Z"
    thought.created_at = now
    thought.updated_at = now
    
    # Embed all vectors: text, title, summary
    vectors = {
        "text": embedder.embed(thought.content or ""),
        "title": embedder.embed(thought.title or ""),
    }
    
    # Summary vector: use thought.summary if provided, else fallback to title or content[:280]
    summary_text = thought.summary or thought.title or (thought.content[:280] if thought.content else "")
    vectors["summary"] = embedder.embed(summary_text)
    
    payload = thought.model_dump()
    store.upsert_point(thought.id, payload, vectors)
    
    return CreateResponse(status="created", thought_id=thought.id)


@router.get("/thought/{tid}")
def get_thought(
    tid: str,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get thought by ID."""
    payload = store.get_by_id(tid)
    if not payload:
        raise HTTPException(status_code=404, detail="Thought not found")
    return payload


@router.get("/thought/{tid}/children")
def get_thought_children(
    tid: str,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get all child thoughts (parent_id == tid), sorted by ordinal."""
    try:
        # Query for all children
        children_points = store.scroll(
            payload_filter={"must": [{"key": "parent_id", "match": {"value": tid}}]},
            limit=1000
        )
        
        # Sort by ordinal
        children = [p.payload for p in children_points]
        children.sort(key=lambda x: x.get("ordinal", 0))
        
        return {
            "status": "ok",
            "parent_id": tid,
            "children_count": len(children),
            "children": children
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching children: {str(e)}")


@router.patch("/thought/{tid}", response_model=UpdateResponse)
def patch_thought(
    tid: str,
    patch: dict,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Update thought (partial) with light versioning."""
    current = store.get_by_id(tid)
    if not current:
        raise HTTPException(status_code=404, detail="Thought not found")
    
    # Create version snapshot BEFORE update
    old_version = current.get("version", 1)
    changes = {}
    for key in patch.keys():
        if key in current:
            changes[key] = f"{current[key]} -> {patch[key]}"
        else:
            changes[key] = f"NEW: {patch[key]}"
    
    version_snap = VersionSnapshot(
        version=old_version,
        at=datetime.utcnow(),
        changes=changes if changes else None
    )
    
    # Merge patch
    current.update(patch)
    current["updated_at"] = datetime.utcnow().isoformat() + "Z"
    current["version"] = old_version + 1
    
    # Append to versions list
    if "versions" not in current:
        current["versions"] = []
    current["versions"].append(version_snap.model_dump())
    
    # Re-embed if content/title/summary changed
    vectors = {}
    if "content" in patch:
        vectors["text"] = embedder.embed(current.get("content", ""))
    if "title" in patch:
        vectors["title"] = embedder.embed(current.get("title", ""))
    if "summary" in patch:
        vectors["summary"] = embedder.embed(current.get("summary", ""))
    
    # If no summary provided but content changed, update summary vector too
    if "content" in patch and "summary" not in patch:
        summary_text = current.get("summary") or current.get("title") or (current.get("content", "")[:280])
        vectors["summary"] = embedder.embed(summary_text)
    
    store.upsert_point(tid, current, vectors)
    
    return UpdateResponse(status="updated")


@router.delete("/thought/{tid}", response_model=DeleteResponse)
def delete_thought(
    tid: str,
    soft: bool = True,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Delete thought (soft or hard)."""
    if soft:
        current = store.get_by_id(tid)
        if not current:
            raise HTTPException(status_code=404, detail="Thought not found")
        current["deleted_at"] = datetime.utcnow().isoformat() + "Z"
        current["status"] = "deleted"
        store.upsert_point(tid, current, {})
    else:
        store.delete_point(tid)
    
    return DeleteResponse(status="deleted")
