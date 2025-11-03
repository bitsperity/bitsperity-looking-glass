# apps/manifold_api/routers/sessions.py
"""Session and Workspace management endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from libs.manifold_core.storage.qdrant_store import QdrantStore
from libs.manifold_core.embeddings.provider import EmbeddingProvider
from apps.manifold_api.dependencies import get_qdrant_store, get_embedding_provider_dep
from datetime import datetime
from uuid import uuid4
from collections import defaultdict
from typing import Dict, List, Any, Set

router = APIRouter(prefix="/v1/memory", tags=["sessions"])


@router.get("/sessions")
def list_sessions(
    workspace_id: str | None = None,
    limit: int = 100,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get list of all distinct sessions with thought counts.
    
    If workspace_id is provided, only returns sessions within that workspace.
    If workspace_id is None, returns all sessions (backward compatibility).
    """
    try:
        # Filter by workspace_id if provided
        if workspace_id:
            all_points = store.scroll(
                payload_filter={"must": [{"key": "workspace_id", "match": {"value": workspace_id}}]},
                limit=10000
            )
        else:
            all_points = store.scroll(limit=10000)
        
        sessions: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "types": defaultdict(int), "workspace_id": None})
        
        for point in all_points:
            payload = point.payload
            session_id = payload.get("session_id")
            if session_id:
                sessions[session_id]["count"] += 1
                thought_type = payload.get("type", "unknown")
                sessions[session_id]["types"][thought_type] += 1
                # Store workspace_id for each session
                if not sessions[session_id]["workspace_id"]:
                    sessions[session_id]["workspace_id"] = payload.get("workspace_id")
        
        # Format response
        sessions_list = [
            {
                "session_id": sid,
                "workspace_id": data["workspace_id"],
                "count": data["count"],
                "types": dict(data["types"]),
                "created_at": None  # TODO: track session creation
            }
            for sid, data in sorted(sessions.items())
        ]
        
        return {
            "status": "ok",
            "sessions_count": len(sessions_list),
            "sessions": sessions_list[:limit]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing sessions: {str(e)}")


@router.get("/session/{session_id}/thoughts")
def get_session_thoughts(
    session_id: str,
    workspace_id: str | None = None,
    limit: int = 20,  # Reduced from 1000 for token efficiency
    include_content: bool = False,  # Default False to save tokens
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get all thoughts in a session. Hard max limit of 100 for token safety.
    
    If workspace_id is provided, ensures session belongs to workspace.
    """
    if limit > 100:
        raise HTTPException(status_code=400, detail=f"limit cannot exceed 100 (token safety). Received: {limit}")
    try:
        # Build filter
        must_filters = [{"key": "session_id", "match": {"value": session_id}}]
        if workspace_id:
            must_filters.append({"key": "workspace_id", "match": {"value": workspace_id}})
        
        thoughts_points = store.scroll(
            payload_filter={"must": must_filters},
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
            "session_id": session_id,
            "count": len(thoughts),
            "thoughts": thoughts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session thoughts: {str(e)}")


@router.get("/session/{session_id}/graph")
def get_session_graph(
    session_id: str,
    workspace_id: str | None = None,
    limit: int = 50,  # Reduced from 500 for token efficiency
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get nodes and edges graph for a session (related_thoughts + parent-child). Hard max limit of 100 for token safety.
    
    If workspace_id is provided, ensures session belongs to workspace.
    """
    if limit > 100:
        raise HTTPException(status_code=400, detail=f"limit cannot exceed 100 (token safety). Received: {limit}")
    try:
        # Build filter
        must_filters = [{"key": "session_id", "match": {"value": session_id}}]
        if workspace_id:
            must_filters.append({"key": "workspace_id", "match": {"value": workspace_id}})
        
        # Fetch all thoughts in session
        points = store.scroll(
            payload_filter={"must": must_filters},
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
                    edge_dict = {
                        "from": nid,
                        "to": rid,
                        "type": r.get("type", "related"),
                        "weight": float(r.get("weight", 1.0)),
                    }
                    if r.get("description"):
                        edge_dict["description"] = r.get("description")
                    edges.append(edge_dict)
            
            # Parent-child edges
            parent_id = n["payload"].get("parent_id")
            if parent_id and str(parent_id) in id_set:
                edges.append({"from": str(parent_id), "to": nid, "type": "section-of", "weight": 1.0})
        
        # Cap edges
        if len(edges) > 5000:
            edges = edges[:5000]
        
        return {
            "status": "ok",
            "session_id": session_id,
            "nodes": nodes,
            "edges": edges
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error building session graph: {str(e)}")


@router.get("/session/{session_id}/summary")
def get_session_summary(
    session_id: str,
    workspace_id: str | None = None,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get or find the summary thought for a session (type='summary' in session).
    
    If workspace_id is provided, ensures session belongs to workspace.
    """
    try:
        must_filters = [
            {"key": "session_id", "match": {"value": session_id}},
            {"key": "type", "match": {"value": "summary"}}
        ]
        if workspace_id:
            must_filters.append({"key": "workspace_id", "match": {"value": workspace_id}})
        
        summary_points = store.scroll(
            payload_filter={"must": must_filters},
            limit=1
        )
        
        if summary_points:
            return {
                "status": "ok",
                "session_id": session_id,
                "summary": summary_points[0].payload
            }
        else:
            return {
                "status": "ok",
                "session_id": session_id,
                "summary": None,
                "message": "No summary thought found for this session"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session summary: {str(e)}")


@router.post("/session/{session_id}/summary")
def upsert_session_summary(
    session_id: str,
    body: dict,
    workspace_id: str | None = None,
    store: QdrantStore = Depends(get_qdrant_store),
    embedder: EmbeddingProvider = Depends(get_embedding_provider_dep),
):
    """Create or update session summary thought.
    
    workspace_id should be provided in body or as query parameter.
    If workspace_id is provided, ensures session belongs to workspace.
    """
    try:
        # Get workspace_id from body or query parameter
        final_workspace_id = body.get("workspace_id") or workspace_id
        
        title = body.get("title", f"Session Summary: {session_id}")
        summary_text = body.get("summary", "")
        content = body.get("content", summary_text)
        
        # Check if summary already exists
        must_filters = [
            {"key": "session_id", "match": {"value": session_id}},
            {"key": "type", "match": {"value": "summary"}}
        ]
        if final_workspace_id:
            must_filters.append({"key": "workspace_id", "match": {"value": final_workspace_id}})
        
        summary_points = store.scroll(
            payload_filter={"must": must_filters},
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
                "session_id": session_id,
                "workspace_id": final_workspace_id,  # Include workspace_id for session summary
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
            "session_id": session_id,
            "thought_id": str(thought_id),
            "title": title,
            "message": "Summary created/updated"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error upserting session summary: {str(e)}")
