# apps/manifold_api/routers/relations.py
"""Thought-to-thought relations endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from libs.manifold_core.storage.qdrant_store import QdrantStore
from apps.manifold_api.dependencies import get_qdrant_store
from typing import Literal, Dict, Any, List, Set
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/v1/memory/thought", tags=["relations"])


class BatchLinkRelation(BaseModel):
    """Single relation in batch request."""
    related_id: str
    relation_type: Literal["supports", "contradicts", "followup", "duplicate", "related"] = "related"
    weight: float = 1.0
    description: str | None = None  # Optional explanation of why this relation exists


class BatchLinkRequest(BaseModel):
    """Batch link multiple relations."""
    relations: List[BatchLinkRelation]


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
    description = body.get("description")  # Optional explanation of the relation
    
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

    # Maintain typed relations with timestamp
    now = datetime.utcnow().isoformat() + "Z"
    typed: List[Dict[str, Any]] = links.get("relations", [])
    if not any(r.get("related_id") == related_id for r in typed):
        relation_dict = {
            "related_id": related_id,
            "type": relation_type,
            "weight": float(weight),
            "created_at": now,
        }
        if description:
            relation_dict["description"] = description
        typed.append(relation_dict)
    links["relations"] = typed
    source["links"] = links
    
    # Update source's updated_at timestamp
    source["updated_at"] = now
    
    # Update
    store.upsert_point(thought_id, source, vectors={})
    
    return {"status": "linked", "created_at": now}


@router.post("/{thought_id}/related/batch")
def batch_link_related(
    thought_id: str,
    body: BatchLinkRequest,
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Link multiple relations at once."""
    # Fetch source
    source = store.get_by_id(thought_id)
    if not source:
        raise HTTPException(404, f"Thought {thought_id} not found")
    
    # Initialize links if needed
    links = source.get("links", {})
    related = links.get("related_thoughts", [])
    typed: List[Dict[str, Any]] = links.get("relations", [])
    
    now = datetime.utcnow().isoformat() + "Z"
    results = []
    linked_count = 0
    skipped_count = 0
    
    # Process each relation
    for relation in body.relations:
        related_id = relation.related_id
        relation_type = relation.relation_type
        weight = relation.weight
        description = relation.description  # Optional explanation
        
        # Check if already linked
        already_in_related = related_id in related
        already_typed = any(r.get("related_id") == related_id for r in typed)
        
        if already_in_related and already_typed:
            skipped_count += 1
            results.append({
                "related_id": related_id,
                "status": "skipped",
                "reason": "already_linked"
            })
            continue
        
        # Add to related_thoughts if not present
        if not already_in_related:
            related.append(related_id)
        
        # Add to typed relations if not present
        if not already_typed:
            relation_dict = {
                "related_id": related_id,
                "type": relation_type,
                "weight": float(weight),
                "created_at": now,
            }
            if description:
                relation_dict["description"] = description
            typed.append(relation_dict)
            linked_count += 1
            result = {
                "related_id": related_id,
                "status": "linked",
                "relation_type": relation_type,
                "weight": weight,
                "created_at": now
            }
            if description:
                result["description"] = description
            results.append(result)
        else:
            # Update existing typed relation
            for r in typed:
                if r.get("related_id") == related_id:
                    r["type"] = relation_type
                    r["weight"] = float(weight)
                    if description:
                        r["description"] = description
                    r["updated_at"] = now
                    linked_count += 1
                    result = {
                        "related_id": related_id,
                        "status": "updated",
                        "relation_type": relation_type,
                        "weight": weight,
                        "updated_at": now
                    }
                    if description:
                        result["description"] = description
                    results.append(result)
                    break
    
    # Update source
    links["related_thoughts"] = related
    links["relations"] = typed
    source["links"] = links
    source["updated_at"] = now
    
    # Update in store
    store.upsert_point(thought_id, source, vectors={})
    
    return {
        "status": "ok",
        "thought_id": thought_id,
        "linked_count": linked_count,
        "skipped_count": skipped_count,
        "total_relations": len(body.relations),
        "results": results,
        "created_at": now
    }


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
        rel_dict = {
            "from_id": thought_id,
            "to_id": r.get("related_id"),
            "relation_type": r.get("type", "related"),
            "weight": r.get("weight", 1.0),
        }
        if r.get("description"):
            rel_dict["description"] = r.get("description")
        typed_outgoing.append(rel_dict)
    
    # Find incoming links (scan all thoughts that link to this one)
    # CRITICAL: Only scan active thoughts (exclude deleted)
    incoming = []
    typed_incoming = []
    all_thoughts = store.scroll(
        payload_filter={"must": [{"key": "status", "match": {"value": "active"}}]},
        limit=10000
    )
    for point in all_thoughts:
        # Double-check: skip deleted (shouldn't happen with filter, but be safe)
        if point.payload.get("status") == "deleted":
            continue
        related_ids = point.payload.get("links", {}).get("related_thoughts", [])
        if thought_id in related_ids:
            incoming.append({"from_id": point.id, "to_id": thought_id, "relation_type": "related"})
        # typed incoming
        for r in point.payload.get("links", {}).get("relations", []) or []:
            if r.get("related_id") == thought_id:
                rel_dict = {
                    "from_id": point.id,
                    "to_id": thought_id,
                    "relation_type": r.get("type", "related"),
                    "weight": r.get("weight", 1.0),
                }
                if r.get("description"):
                    rel_dict["description"] = r.get("description")
                typed_incoming.append(rel_dict)
    
    # Get full thought objects
    related_ids: Set[str] = set(outgoing_ids)
    related_ids.update([inc["from_id"] for inc in incoming])
    related_ids.update([e["to_id"] for e in typed_outgoing if e.get("to_id")])
    related_ids.update([e["from_id"] for e in typed_incoming if e.get("from_id")])
    
    thoughts = []
    for rid in related_ids:
        thought = store.get_by_id(rid)
        if thought:
            # CRITICAL: Skip deleted thoughts (shouldn't be in workflows)
            if thought.get("status") == "deleted":
                continue
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
                    edge_dict = {"from": nid, "to": rid, "type": r.get("type","related"), "weight": r.get("weight",1.0)}
                    if r.get("description"):
                        edge_dict["description"] = r.get("description")
                    edges.append(edge_dict)
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
    # CRITICAL: Only get active children (exclude deleted)
    children_filter = {
        "must": [
            {"key": "parent_id", "match": {"value": thought_id}},
            {"key": "status", "match": {"value": "active"}}
        ]
    }
    children_points = store.scroll(payload_filter=children_filter, limit=100)
    
    children = []
    for p in children_points:
        # Double-check: skip deleted (shouldn't happen with filter, but be safe)
        if p.payload.get("status") == "deleted":
            continue
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
            # CRITICAL: Skip deleted thoughts (shouldn't be in workflows)
            if thought.get("status") == "deleted":
                continue
            related.append({"id": rid, "payload": thought})
    
    result["related"] = related
    
    return result


@router.get("/with-relation-type/{relation_type}")
def get_thoughts_with_relation_type(
    relation_type: Literal["supports", "contradicts", "followup", "duplicate", "related"],
    limit: int = 20,  # Reduced from 100 for token efficiency
    include_thoughts: bool = True,
    include_content: bool = False,  # Default False to save tokens (only applies if include_thoughts=True)
    from_dt: str | None = None,
    to_dt: str | None = None,
    days: int | None = None,
    session_id: str | None = None,
    workspace_id: str | None = None,
    mcp: bool = False,  # If True, apply token safety limits (MCP/Agent calls)
    store: QdrantStore = Depends(get_qdrant_store),
):
    """Get all thoughts that have at least one relation of the specified type. Hard max limit of 100 for token safety (only if mcp=true).
    
    Returns pairs of thoughts connected by the specified relation type.
    If include_thoughts=True (default), returns full thought objects instead of just IDs.
    
    Supports temporal filtering via from_dt/to_dt (ISO format) or days (relative from now).
    Filters apply to the source thought's created_at timestamp.
    """
    # Cap limit for MCP calls (token safety), frontend can use higher limits
    if mcp and limit > 100:
        limit = 100
    from datetime import datetime, timedelta
    
    # Determine effective date range
    eff_from = from_dt
    eff_to = to_dt
    if not eff_from and not eff_to and days and days > 0:
        now = datetime.utcnow()
        eff_from = (now - timedelta(days=days)).isoformat() + "Z"
        eff_to = now.isoformat() + "Z"
    
    # Build filter
    # CRITICAL: Exclude deleted thoughts from discovery workflows
    must = []
    must.append({"key": "status", "match": {"value": "active"}})  # Only active thoughts
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
    pairs = []
    thought_cache = {}  # Cache thoughts to avoid multiple lookups
    
    for point in all_thoughts:
        # Double-check: skip deleted (shouldn't happen with filter, but be safe)
        if point.payload.get("status") == "deleted":
            continue
        thought_id = str(point.id)
        if thought_id not in thought_cache:
            thought_cache[thought_id] = point.payload
        
        links = point.payload.get("links", {})
        relations = links.get("relations", []) or []
        
        for r in relations:
            if r.get("type") == relation_type:
                related_id = r.get("related_id")
                if related_id:
                    # Cache related thought if not already cached
                    if related_id not in thought_cache:
                        related_thought = store.get_by_id(related_id)
                        if related_thought:
                            # CRITICAL: Skip deleted thoughts (shouldn't be in workflows)
                            if related_thought.get("status") == "deleted":
                                continue
                            thought_cache[related_id] = related_thought
                        else:
                            continue
                    
                    # Double-check related thought is not deleted
                    if related_id in thought_cache and thought_cache[related_id].get("status") == "deleted":
                        continue
                    
                    pair = {
                        "from_id": thought_id,
                        "to_id": related_id,
                        "relation_type": relation_type,
                        "weight": r.get("weight", 1.0),
                        "created_at": r.get("created_at"),
                    }
                    if r.get("description"):
                        pair["description"] = r.get("description")
                    
                    # Include full thoughts if requested
                    if include_thoughts:
                        from_thought = thought_cache.get(thought_id, {})
                        to_thought = thought_cache.get(related_id, {})
                        
                        # Strip content if include_content=False
                        if not include_content:
                            def _prune_thought(thought: dict) -> dict:
                                """Keep only essential fields for relation-type queries."""
                                return {
                                    "id": thought.get("id"),
                                    "title": thought.get("title"),
                                    "summary": thought.get("summary"),
                                    "type": thought.get("type"),
                                    "tags": thought.get("tags", []),
                                    "tickers": thought.get("tickers", []),
                                    "confidence_score": thought.get("confidence_score"),
                                    "created_at": thought.get("created_at"),
                                    "status": thought.get("status"),
                                }
                            from_thought = _prune_thought(from_thought) if from_thought else {}
                            to_thought = _prune_thought(to_thought) if to_thought else {}
                        
                        pair["from_thought"] = from_thought
                        pair["to_thought"] = to_thought
                    
                    pairs.append(pair)
    
    # Deduplicate (bidirectional relations might appear twice)
    seen = set()
    unique_pairs = []
    for pair in pairs:
        key = tuple(sorted([pair["from_id"], pair["to_id"]]))
        if key not in seen:
            seen.add(key)
            unique_pairs.append(pair)
    
    return {
        "status": "ok",
        "relation_type": relation_type,
        "count": len(unique_pairs),
        "pairs": unique_pairs
    }

