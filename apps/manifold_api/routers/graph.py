# apps/manifold_api/routers/graph.py
"""Global graph endpoints for birdview visualization."""
from fastapi import APIRouter, Depends
from typing import Dict, Any, List, Optional
from libs.manifold_core.storage.qdrant_store import QdrantStore
from apps.manifold_api.dependencies import get_qdrant_store

router = APIRouter(prefix="/v1/memory", tags=["graph"])


@router.get("/graph")
def get_graph(
    limit: int = 500,
    type: Optional[str] = None,
    status: Optional[str] = None,
    tickers: Optional[str] = None,
    session_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Return nodes and edges for a global birdview graph.

    Filters are optional; edges are derived from links.related_thoughts, links.relations, and parent-child.
    """
    must = []
    if type:
        must.append({"key": "type", "match": {"value": type}})
    if status:
        must.append({"key": "status", "match": {"value": status}})
    if tickers:
        for t in tickers.split(","):
            must.append({"key": "tickers", "match": {"value": t}})
    if session_id:
        must.append({"key": "session_id", "match": {"value": session_id}})
    if workspace_id:
        must.append({"key": "workspace_id", "match": {"value": workspace_id}})
    
    filters = {"must": must} if must else None

    points = store.scroll(payload_filter=filters, limit=limit)
    nodes: List[Dict[str, Any]] = []
    id_set = set()
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

    # Build edges: related_thoughts + typed relations + parent-child
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

    # Cap edges to a reasonable number for the UI
    if len(edges) > 5000:
        edges = edges[:5000]

    return {"status": "ok", "nodes": nodes, "edges": edges}


