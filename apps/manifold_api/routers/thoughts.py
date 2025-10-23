# apps/manifold_api/routers/thoughts.py
"""CRUD endpoints for thoughts."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from libs.manifold_core.models.envelope import ThoughtEnvelope
from libs.manifold_core.models.responses import CreateResponse, UpdateResponse, DeleteResponse
from libs.manifold_core.embeddings.provider import EmbeddingProvider
from libs.manifold_core.storage.qdrant_store import QdrantStore
from apps.manifold_api.dependencies import get_qdrant_store, get_embedding_provider_dep
from datetime import datetime
from uuid import uuid4


router = APIRouter(prefix="/v1/memory", tags=["thoughts"])


@router.post("/thought", response_model=CreateResponse)
def create_thought(
    thought: ThoughtEnvelope,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Create a new thought."""
    if not thought.id:
        thought.id = str(uuid4())
    
    # Set timestamps
    now = datetime.utcnow().isoformat() + "Z"
    thought.created_at = now
    thought.updated_at = now
    
    # Embed
    vectors = {
        "text": embedder.embed(thought.content or ""),
        "title": embedder.embed(thought.title or ""),
    }
    
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


@router.patch("/thought/{tid}", response_model=UpdateResponse)
def patch_thought(
    tid: str,
    patch: dict,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Update thought (partial)."""
    current = store.get_by_id(tid)
    if not current:
        raise HTTPException(status_code=404, detail="Thought not found")
    
    # Merge patch
    current.update(patch)
    current["updated_at"] = datetime.utcnow().isoformat() + "Z"
    current["version"] = current.get("version", 1) + 1
    
    # Re-embed if content/title changed
    vectors = {}
    if "content" in patch:
        vectors["text"] = embedder.embed(current.get("content", ""))
    if "title" in patch:
        vectors["title"] = embedder.embed(current.get("title", ""))
    
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
