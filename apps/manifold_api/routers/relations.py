# apps/manifold_api/routers/relations.py
"""Thought-to-thought relations endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from libs.manifold_core.storage.qdrant_store import QdrantStore
from apps.manifold_api.dependencies import get_qdrant_store
from typing import Literal, Dict, Any, List, Set

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
    relation_type: Literal["supports","contradicts","followup","duplicate","related"] = body.get("relation_type", "related")
    weight = body.get("weight", 1.0)
    
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

    # Maintain typed relations
    typed: List[Dict[str, Any]] = links.get("relations", [])
    if not any(r.get("related_id") == related_id for r in typed):
        typed.append({
            "related_id": related_id,
            "type": relation_type,
            "weight": float(weight),
        })
    links["relations"] = typed
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
    # Remove from typed list as well
    typed: List[Dict[str, Any]] = links.get("relations", [])
    typed = [r for r in typed if r.get("related_id") != related_id]
    links["relations"] = typed
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
    # Typed outgoing
    typed_outgoing = []
    for r in source.get("links", {}).get("relations", []) or []:
        typed_outgoing.append({
            "from_id": thought_id,
            "to_id": r.get("related_id"),
            "relation_type": r.get("type", "related"),
            "weight": r.get("weight", 1.0),
        })
    
    # Find incoming links (scan all thoughts that link to this one)
    incoming = []
    typed_incoming = []
    all_thoughts = store.scroll(limit=10000)
    for point in all_thoughts:
        related_ids = point.payload.get("links", {}).get("related_thoughts", [])
        if thought_id in related_ids:
            incoming.append({"from_id": point.id, "to_id": thought_id, "relation_type": "related"})
        # typed incoming
        for r in point.payload.get("links", {}).get("relations", []) or []:
            if r.get("related_id") == thought_id:
                typed_incoming.append({
                    "from_id": point.id,
                    "to_id": thought_id,
                    "relation_type": r.get("type", "related"),
                    "weight": r.get("weight", 1.0),
                })
    
    # Get full thought objects
    related_ids: Set[str] = set(outgoing_ids)
    related_ids.update([inc["from_id"] for inc in incoming])
    related_ids.update([e["to_id"] for e in typed_outgoing if e.get("to_id")])
    related_ids.update([e["from_id"] for e in typed_incoming if e.get("from_id")])
    
    thoughts = []
    for rid in related_ids:
        thought = store.get_by_id(rid)
        if thought:
            # include id in payload for frontend convenience
            if "id" not in thought:
                try:
                    thought["id"] = rid
                except Exception:
                    pass
            thoughts.append(thought)
    
    # include id on source as well
    if "id" not in source:
        try:
            source["id"] = thought_id
        except Exception:
            pass

    return {
        "status": "ok",
        "thought": source,
        "thoughts": thoughts,
        "incoming": incoming,
        "outgoing": outgoing,
        "typed_incoming": typed_incoming,
        "typed_outgoing": typed_outgoing,
    }


@router.get("/{thought_id}/related/facets")
def get_related_facets(
    thought_id: str,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Facet counts among neighbors (type, status, tickers, sectors)."""
    rel = get_related(thought_id, store=store)  # type: ignore
    neighbor_ids = set()
    for e in rel["incoming"]:
        neighbor_ids.add(e["from_id"])
    for e in rel["outgoing"]:
        neighbor_ids.add(e["to_id"])
    for e in rel.get("typed_incoming", []):
        neighbor_ids.add(e["from_id"])
    for e in rel.get("typed_outgoing", []):
        neighbor_ids.add(e["to_id"])
    neighbors = []
    for nid in neighbor_ids:
        t = store.get_by_id(nid)
        if t:
            neighbors.append(t)
    def add_count(d: Dict[str,int], key: str):
        d[key] = d.get(key, 0) + 1
    facets = {"type": {}, "status": {}, "tickers": {}, "sectors": {}}
    for p in neighbors:
        add_count(facets["type"], p.get("type","unknown"))
        add_count(facets["status"], p.get("status","unknown"))
        for x in p.get("tickers", []) or []:
            add_count(facets["tickers"], x)
        for x in p.get("sectors", []) or []:
            add_count(facets["sectors"], x)
    # format
    formatted = {k: [{"value": kk, "count": vv} for kk, vv in v.items()] for k, v in facets.items()}
    return {"status": "ok", "facets": formatted}


@router.get("/{thought_id}/related/graph")
def get_related_graph(
    thought_id: str,
    depth: int = 1,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Return simple nodes/edges graph up to depth."""
    if depth < 1:
        depth = 1
    visited: Set[str] = set()
    frontier: Set[str] = {thought_id}
    nodes: Dict[str, Any] = {}
    edges: List[Dict[str, Any]] = []
    for _ in range(min(depth, 3)):
        next_frontier: Set[str] = set()
        for nid in list(frontier):
            if nid in visited:
                continue
            visited.add(nid)
            t = store.get_by_id(nid)
            if not t:
                continue
            nodes[nid] = t
            links = t.get("links", {})
            for rid in links.get("related_thoughts", []) or []:
                edges.append({"from": nid, "to": rid, "type": "related", "weight": 1.0})
                next_frontier.add(rid)
            for r in links.get("relations", []) or []:
                rid = r.get("related_id")
                if rid:
                    edges.append({"from": nid, "to": rid, "type": r.get("type","related"), "weight": r.get("weight",1.0)})
                    next_frontier.add(rid)
        frontier = next_frontier
    return {
        "status": "ok",
        "nodes": [{"id": k, "payload": v} for k, v in nodes.items()],
        "edges": edges,
    }


@router.get("/{thought_id}/tree")
def get_thought_tree(
    thought_id: str,
    depth: int = 2,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get hierarchical tree: parent → thought → children, plus related thoughts."""
    source = store.get_by_id(thought_id)
    if not source:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    result = {
        "status": "ok",
        "root": {"id": thought_id, "payload": source},
        "parent": None,
        "children": [],
        "related": [],
    }
    
    # Get parent (if exists)
    parent_id = source.get("parent_id")
    if parent_id:
        parent = store.get_by_id(parent_id)
        if parent:
            result["parent"] = {"id": parent_id, "payload": parent}
    
    # Get children
    children_filter = {"must": [{"key": "parent_id", "match": {"value": thought_id}}]}
    children_points = store.scroll(payload_filter=children_filter, limit=100)
    
    children = []
    for p in children_points:
        children.append({
            "id": str(p.id),
            "payload": p.payload,
            "ordinal": p.payload.get("ordinal", 0)
        })
    
    children.sort(key=lambda x: x["ordinal"])
    result["children"] = children
    
    # Get related thoughts
    links = source.get("links", {})
    related_ids = links.get("related_thoughts", [])
    related = []
    for rid in related_ids:
        thought = store.get_by_id(rid)
        if thought:
            related.append({"id": rid, "payload": thought})
    
    result["related"] = related
    
    return result

