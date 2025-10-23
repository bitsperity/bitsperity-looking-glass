# apps/manifold_api/routers/promote.py
"""Promote thoughts to Ariadne KG and sync status."""
from fastapi import APIRouter, Depends, HTTPException
from libs.manifold_core.models.requests import ThoughtPromoteRequest, AriadneSyncRequest
from libs.manifold_core.models.responses import ThoughtPromoteResponse, AriadneSyncResponse
from libs.manifold_core.storage.qdrant_store import QdrantStore
from apps.manifold_api.dependencies import get_qdrant_store

router = APIRouter(prefix="/v1/memory", tags=["promote"])


@router.post("/thought/{thought_id}/promote", response_model=ThoughtPromoteResponse)
def promote_thought(
    thought_id: str,
    request: ThoughtPromoteRequest,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """
    Prepare thought for promotion to Ariadne KG.
    Returns payload ready for Ariadne ingestion.
    """
    thought = store.get_by_id(thought_id)
    if not thought:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    # Build KG payload
    kg_payload = {
        "thought_id": thought_id,
        "type": thought.get("type"),
        "title": thought.get("title"),
        "content": thought.get("content"),
        "tickers": thought.get("tickers", []),
        "confidence_score": thought.get("confidence_score"),
        "created_at": thought.get("created_at"),
        "epistemology": thought.get("epistemology", {}),
    }
    
    # Mark as promoted (if auto-promote)
    if request.auto_mark:
        thought.setdefault("flags", {})["promoted_to_kg"] = True
        store.upsert_point(thought_id, thought, vectors={})
    
    return ThoughtPromoteResponse(
        status="ready",
        kg_payload=kg_payload,
    )


@router.post("/sync/ariadne", response_model=AriadneSyncResponse)
def sync_ariadne_status(
    request: AriadneSyncRequest,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """
    Sync back from Ariadne: mark thought as promoted and link fact/entity IDs.
    """
    thought = store.get_by_id(request.thought_id)
    if not thought:
        raise HTTPException(404, f"Thought {request.thought_id} not found")
    
    # Update flags and links
    thought.setdefault("flags", {})["promoted_to_kg"] = True
    
    links = thought.get("links", {})
    if request.ariadne_fact_id:
        links.setdefault("ariadne_facts", []).append(request.ariadne_fact_id)
    if request.ariadne_entity_ids:
        links.setdefault("ariadne_entities", []).extend(request.ariadne_entity_ids)
    thought["links"] = links
    
    # Update status if provided
    if request.status:
        thought["status"] = request.status
    
    store.upsert_point(request.thought_id, thought, vectors={})
    
    return AriadneSyncResponse(
        status="synced",
        thought_id=request.thought_id,
    )

