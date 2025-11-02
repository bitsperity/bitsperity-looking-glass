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


@router.post("/thought/{target_id}/merge/{source_id}")
def merge_thoughts(
    target_id: str,
    source_id: str,
    body: dict = {},
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Merge source thought into target thought.
    
    Transfers:
    - All relations (outgoing and incoming) from source to target
    - Metadata (tags, tickers, sectors)
    - Optionally merges content
    
    Then soft-deletes source thought.
    """
    target = store.get_by_id(target_id)
    source = store.get_by_id(source_id)
    
    if not target:
        raise HTTPException(404, f"Target thought {target_id} not found")
    if not source:
        raise HTTPException(404, f"Source thought {source_id} not found")
    if target_id == source_id:
        raise HTTPException(400, "Cannot merge thought with itself")
    
    now = datetime.utcnow().isoformat() + "Z"
    merge_strategy = body.get("strategy", "keep_target")  # "keep_target", "merge_content", "keep_source"
    
    # 1. Transfer outgoing relations from source to target
    target_links = target.get("links", {})
    target_related = target_links.get("related_thoughts", [])
    target_relations = target_links.get("relations", []) or []
    
    source_links = source.get("links", {})
    source_related = source_links.get("related_thoughts", [])
    source_relations = source_links.get("relations", []) or []
    
    # Remove any relations from target to source (especially "duplicate" relations)
    # This prevents self-referential relations after merge
    if source_id in target_related:
        target_related.remove(source_id)
    
    # Remove typed relations from target to source
    target_relations = [r for r in target_relations if r.get("related_id") != source_id]
    
    # Add source's outgoing relations to target (skip if target already links to them)
    for related_id in source_related:
        if related_id != target_id and related_id not in target_related:
            target_related.append(related_id)
    
    # Add source's typed relations to target
    for rel in source_relations:
        related_id = rel.get("related_id")
        if related_id != target_id and not any(r.get("related_id") == related_id for r in target_relations):
            target_relations.append(rel)
    
    # 2. Transfer incoming relations (from other thoughts pointing to source)
    # We need to update all thoughts that link to source to link to target instead
    all_thoughts = store.scroll(limit=10000)
    incoming_updated = 0
    
    for point in all_thoughts:
        if str(point.id) == target_id or str(point.id) == source_id:
            continue
        
        other_links = point.payload.get("links", {})
        other_related = other_links.get("related_thoughts", [])
        other_relations = other_links.get("relations", []) or []
        updated = False
        
        # Update related_thoughts: replace source_id with target_id
        if source_id in other_related:
            other_related.remove(source_id)
            if target_id not in other_related:
                other_related.append(target_id)
            updated = True
        
        # Update typed relations: replace source_id with target_id
        for rel in other_relations:
            if rel.get("related_id") == source_id:
                rel["related_id"] = target_id
                updated = True
        
        if updated:
            other_links["related_thoughts"] = other_related
            other_links["relations"] = other_relations
            point.payload["links"] = other_links
            point.payload["updated_at"] = now
            store.upsert_point(str(point.id), point.payload, vectors={})
            incoming_updated += 1
    
    # 3. Transfer metadata (tags, tickers, sectors)
    target_tags = set(target.get("tags", []) or [])
    source_tags = set(source.get("tags", []) or [])
    target["tags"] = list(target_tags.union(source_tags))
    
    target_tickers = set(target.get("tickers", []) or [])
    source_tickers = set(source.get("tickers", []) or [])
    target["tickers"] = list(target_tickers.union(source_tickers))
    
    target_sectors = set(target.get("sectors", []) or [])
    source_sectors = set(source.get("sectors", []) or [])
    target["sectors"] = list(target_sectors.union(source_sectors))
    
    # 4. Merge content based on strategy
    if merge_strategy == "merge_content":
        # Combine content
        target_content = target.get("content", "") or ""
        source_content = source.get("content", "") or ""
        if source_content and source_content not in target_content:
            target["content"] = f"{target_content}\n\n---\n\n{source_content}".strip()
    elif merge_strategy == "keep_source":
        # Use source's content if it's better/longer
        if len(source.get("content", "") or "") > len(target.get("content", "") or ""):
            target["content"] = source.get("content")
            target["title"] = source.get("title", target.get("title"))
            target["summary"] = source.get("summary", target.get("summary"))
    
    # Update confidence_score to max of both
    target["confidence_score"] = max(
        target.get("confidence_score", 0.5),
        source.get("confidence_score", 0.5)
    )
    
    # 5. Update target with merged data
    target["links"] = {
        "related_thoughts": target_related,
        "relations": target_relations,
        "ariadne_entities": target_links.get("ariadne_entities", []),
        "ariadne_facts": target_links.get("ariadne_facts", []),
        "news_ids": target_links.get("news_ids", []) or [],
        "price_event_ids": target_links.get("price_event_ids", []) or []
    }
    target["updated_at"] = now
    target["version"] = (target.get("version", 1)) + 1
    
    # Re-embed if content/title/summary changed
    vectors = {}
    if merge_strategy in ["merge_content", "keep_source"]:
        vectors["text"] = embedder.embed(target.get("content", ""))
        vectors["title"] = embedder.embed(target.get("title", ""))
        summary_text = target.get("summary") or target.get("title") or (target.get("content", "")[:280])
        vectors["summary"] = embedder.embed(summary_text)
    
    store.upsert_point(target_id, target, vectors)
    
    # 6. Soft-delete source thought
    source["deleted_at"] = now
    source["status"] = "deleted"
    source["updated_at"] = now
    store.upsert_point(source_id, source, vectors={})
    
    return {
        "status": "merged",
        "target_id": target_id,
        "source_id": source_id,
        "relations_transferred": len(source_relations),
        "incoming_relations_updated": incoming_updated,
        "metadata_transferred": {
            "tags": len(target["tags"]),
            "tickers": len(target["tickers"]),
            "sectors": len(target["sectors"])
        },
        "strategy": merge_strategy,
        "created_at": now
    }


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
