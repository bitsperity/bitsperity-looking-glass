# apps/manifold_api/routers/workspaces.py
"""Workspace management endpoints - primary organization unit."""
from fastapi import APIRouter, HTTPException, Depends
from libs.manifold_core.storage.qdrant_store import QdrantStore
from libs.manifold_core.embeddings.provider import EmbeddingProvider
from apps.manifold_api.dependencies import get_qdrant_store, get_embedding_provider_dep
from datetime import datetime
from uuid import uuid4
from collections import defaultdict
from typing import Dict, List, Any, Set

router = APIRouter(prefix="/v1/memory", tags=["workspaces"])


@router.get("/workspaces")
def list_workspaces(
    limit: int = 100,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get list of all distinct workspaces with thought counts."""
    try:
        # Scroll all thoughts and group by workspace_id
        all_points = store.scroll(limit=10000)
        
        workspaces: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "types": defaultdict(int)})
        
        for point in all_points:
            payload = point.payload
            workspace_id = payload.get("workspace_id")
            if workspace_id:
                workspaces[workspace_id]["count"] += 1
                thought_type = payload.get("type", "unknown")
                workspaces[workspace_id]["types"][thought_type] += 1
        
        # Format response
        workspaces_list = [
            {
                "workspace_id": wid,
                "count": data["count"],
                "types": dict(data["types"]),
                "created_at": None  # TODO: track workspace creation
            }
            for wid, data in sorted(workspaces.items())
        ]
        
        return {
            "status": "ok",
            "workspaces_count": len(workspaces_list),
            "workspaces": workspaces_list[:limit]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing workspaces: {str(e)}")


@router.get("/workspace/{workspace_id}/thoughts")
def get_workspace_thoughts(
    workspace_id: str,
    limit: int = 1000,
    include_content: bool = True,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get all thoughts in a workspace."""
    try:
        thoughts_points = store.scroll(
            payload_filter={"must": [{"key": "workspace_id", "match": {"value": workspace_id}}]},
            limit=limit
        )
        
        thoughts = [p.payload for p in thoughts_points]
        
        # Optionally strip content for cheaper retrieval
        if not include_content:
            for thought in thoughts:
                for key in ["content", "epistemology", "links"]:
                    thought.pop(key, None)
        
        return {
            "status": "ok",
            "workspace_id": workspace_id,
            "count": len(thoughts),
            "thoughts": thoughts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching workspace thoughts: {str(e)}")


@router.get("/workspace/{workspace_id}/graph")
def get_workspace_graph(
    workspace_id: str,
    limit: int = 500,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get nodes and edges graph for a workspace (related_thoughts + parent-child)."""
    try:
        # Fetch all thoughts in workspace
        points = store.scroll(
            payload_filter={"must": [{"key": "workspace_id", "match": {"value": workspace_id}}]},
            limit=limit
        )
        
        nodes: List[Dict[str, Any]] = []
        id_set: Set[str] = set()
        
        for p in points:
            payload = p.payload
            nid = str(getattr(p, "id", payload.get("id", "")))
            if not nid:
                continue
            id_set.add(nid)
            payload_out = dict(payload)
            if "id" not in payload_out:
                payload_out["id"] = nid
            nodes.append({"id": nid, "payload": payload_out})
        
        # Build edges: related_thoughts + parent-child
        edges: List[Dict[str, Any]] = []
        for n in nodes:
            nid = n["id"]
            links = n["payload"].get("links", {}) or {}
            
            # Related thoughts edges
            for rid in links.get("related_thoughts", []) or []:
                if str(rid) in id_set:
                    edges.append({"from": nid, "to": str(rid), "type": "related", "weight": 1.0})
            
            # Typed relations
            for r in links.get("relations", []) or []:
                rid = str(r.get("related_id"))
                if rid in id_set:
                    edges.append({
                        "from": nid,
                        "to": rid,
                        "type": r.get("type", "related"),
                        "weight": float(r.get("weight", 1.0)),
                    })
            
            # Parent-child edges
            parent_id = n["payload"].get("parent_id")
            if parent_id and str(parent_id) in id_set:
                edges.append({"from": str(parent_id), "to": nid, "type": "section-of", "weight": 1.0})
        
        # Cap edges
        if len(edges) > 5000:
            edges = edges[:5000]
        
        return {
            "status": "ok",
            "workspace_id": workspace_id,
            "nodes": nodes,
            "edges": edges
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error building workspace graph: {str(e)}")


@router.get("/workspace/{workspace_id}/summary")
def get_workspace_summary(
    workspace_id: str,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get or find the summary thought for a workspace (type='summary' in workspace)."""
    try:
        summary_points = store.scroll(
            payload_filter={
                "must": [
                    {"key": "workspace_id", "match": {"value": workspace_id}},
                    {"key": "type", "match": {"value": "summary"}}
                ]
            },
            limit=1
        )
        
        if summary_points:
            return {
                "status": "ok",
                "workspace_id": workspace_id,
                "summary": summary_points[0].payload
            }
        else:
            return {
                "status": "ok",
                "workspace_id": workspace_id,
                "summary": None,
                "message": "No summary thought found for this workspace"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching workspace summary: {str(e)}")


@router.post("/workspace/{workspace_id}/summary")
def upsert_workspace_summary(
    workspace_id: str,
    body: dict,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Create or update workspace summary thought."""
    try:
        title = body.get("title", f"Workspace Summary: {workspace_id}")
        summary_text = body.get("summary", "")
        content = body.get("content", summary_text)
        
        # Check if summary already exists
        summary_points = store.scroll(
            payload_filter={
                "must": [
                    {"key": "workspace_id", "match": {"value": workspace_id}},
                    {"key": "type", "match": {"value": "summary"}}
                ]
            },
            limit=1
        )
        
        if summary_points:
            # Update existing
            summary_thought = summary_points[0].payload
            thought_id = summary_points[0].id
            summary_thought.update({
                "title": title,
                "summary": summary_text,
                "content": content,
                "updated_at": datetime.utcnow().isoformat() + "Z",
            })
        else:
            # Create new
            thought_id = str(uuid4())
            summary_thought = {
                "id": thought_id,
                "type": "summary",
                "status": "active",
                "title": title,
                "summary": summary_text,
                "content": content,
                "workspace_id": workspace_id,
                "confidence_level": "high",
                "confidence_score": 1.0,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.utcnow().isoformat() + "Z",
                "version": 1,
            }
        
        # Embed vectors
        vectors = {
            "text": embedder.embed(content),
            "title": embedder.embed(title),
            "summary": embedder.embed(summary_text),
        }
        
        store.upsert_point(str(thought_id), summary_thought, vectors)
        
        return {
            "status": "ok",
            "workspace_id": workspace_id,
            "thought_id": str(thought_id),
            "title": title,
            "message": "Summary created/updated"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error upserting workspace summary: {str(e)}")


