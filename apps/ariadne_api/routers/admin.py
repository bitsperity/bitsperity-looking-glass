"""
Admin endpoints for graph maintenance and error correction.
Enables agents to fix mistakes, delete incorrect data, and update properties.
"""

from fastapi import APIRouter, Depends, HTTPException
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store
from pydantic import BaseModel
from typing import Any, Dict

router = APIRouter()


@router.get("/v1/kg/admin/stats")
async def get_stats(store: GraphStore = Depends(get_graph_store)):
    """Get detailed graph statistics"""
    try:
        stats = store.get_stats()
        return {
            "status": "success",
            "total_nodes": stats["total_nodes"],
            "total_edges": stats["total_edges"],
            "nodes_by_label": stats["nodes_by_label"],
            "edges_by_type": stats["edges_by_type"],
            "last_updated": stats["last_updated"].isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


class NodeUpdateRequest(BaseModel):
    """Update node properties"""
    node_id: str  # Neo4j elementId
    properties: Dict[str, Any]


class EdgeUpdateRequest(BaseModel):
    """Update edge properties"""
    source_id: str
    target_id: str
    rel_type: str
    properties: Dict[str, Any]


class NodeDeleteRequest(BaseModel):
    """Delete node (and all connected edges)"""
    node_id: str
    force: bool = False  # If true, delete even if has connections


class EdgeDeleteRequest(BaseModel):
    """Delete specific edge"""
    source_id: str
    target_id: str
    rel_type: str
    version: int | None = None  # If provided, delete only this version


@router.patch("/v1/kg/admin/node")
async def update_node(
    request: NodeUpdateRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Update node properties.
    Agent use case: "Fix typo in company name" or "Update confidence"
    """
    try:
        # Check if node exists
        check_query = """
            MATCH (n)
            WHERE elementId(n) = $node_id
            RETURN n
        """
        result = store.execute_read(check_query, {"node_id": request.node_id})
        if not result:
            raise HTTPException(status_code=404, detail=f"Node {request.node_id} not found")
        
        # Update properties
        update_query = """
            MATCH (n)
            WHERE elementId(n) = $node_id
            SET n += $properties
            SET n.updated_at = datetime()
            RETURN n
        """
        updated = store.execute_write(update_query, {
            "node_id": request.node_id,
            "properties": request.properties
        })
        
        return {
            "status": "updated",
            "node_id": request.node_id,
            "updated_properties": list(request.properties.keys())
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update node: {str(e)}")


@router.patch("/v1/kg/admin/edge")
async def update_edge(
    request: EdgeUpdateRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Update edge properties.
    Agent use case: "Adjust confidence of relation" or "Update temporal bounds"
    """
    try:
        # Check if edge exists
        check_query = f"""
            MATCH (s)-[r:{request.rel_type}]->(t)
            WHERE elementId(s) = $source_id AND elementId(t) = $target_id
            RETURN r
            LIMIT 1
        """
        result = store.execute_read(check_query, {
            "source_id": request.source_id,
            "target_id": request.target_id
        })
        if not result:
            raise HTTPException(status_code=404, detail=f"Edge not found")
        
        # Update properties
        update_query = f"""
            MATCH (s)-[r:{request.rel_type}]->(t)
            WHERE elementId(s) = $source_id AND elementId(t) = $target_id
            SET r += $properties
            SET r.updated_at = datetime()
            RETURN r
        """
        store.execute_write(update_query, {
            "source_id": request.source_id,
            "target_id": request.target_id,
            "properties": request.properties
        })
        
        return {
            "status": "updated",
            "source_id": request.source_id,
            "target_id": request.target_id,
            "rel_type": request.rel_type,
            "updated_properties": list(request.properties.keys())
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update edge: {str(e)}")


@router.delete("/v1/kg/admin/node/{node_id}")
async def delete_node(
    node_id: str,
    force: bool = False,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Delete node from graph.
    Agent use case: "Remove incorrectly created entity"
    
    - If force=False: Fails if node has connections (safe mode)
    - If force=True: Deletes node and all connected edges
    """
    try:
        # Check if node exists
        check_query = """
            MATCH (n)
            WHERE elementId(n) = $node_id
            OPTIONAL MATCH (n)-[r]-()
            RETURN n, count(r) as edge_count
        """
        result = store.execute_read(check_query, {"node_id": node_id})
        if not result:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
        
        edge_count = result[0]["edge_count"]
        
        # Safety check
        if edge_count > 0 and not force:
            raise HTTPException(
                status_code=400,
                detail=f"Node has {edge_count} connections. Use force=true to delete anyway."
            )
        
        # Delete node (and edges if force=True via DETACH)
        delete_query = """
            MATCH (n)
            WHERE elementId(n) = $node_id
            DETACH DELETE n
        """
        store.execute_write(delete_query, {"node_id": node_id})
        
        return {
            "status": "deleted",
            "node_id": node_id,
            "edges_deleted": edge_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete node: {str(e)}")


@router.delete("/v1/kg/admin/edge")
async def delete_edge(
    request: EdgeDeleteRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Delete specific edge.
    Agent use case: "Remove incorrect relation between entities"
    
    - If version is provided: Delete only that version (temporal edges)
    - If version is None: Delete all edges of that type between nodes
    """
    try:
        if request.version is not None:
            # Delete specific version
            delete_query = f"""
                MATCH (s)-[r:{request.rel_type}]->(t)
                WHERE elementId(s) = $source_id 
                  AND elementId(t) = $target_id
                  AND r.version = $version
                DELETE r
                RETURN count(r) as deleted_count
            """
            result = store.execute_write(delete_query, {
                "source_id": request.source_id,
                "target_id": request.target_id,
                "version": request.version
            })
        else:
            # Delete all edges of this type
            delete_query = f"""
                MATCH (s)-[r:{request.rel_type}]->(t)
                WHERE elementId(s) = $source_id AND elementId(t) = $target_id
                DELETE r
                RETURN count(r) as deleted_count
            """
            result = store.execute_write(delete_query, {
                "source_id": request.source_id,
                "target_id": request.target_id
            })
        
        deleted_count = result.get("deleted_count", 0) if result else 0
        
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Edge not found")
        
        return {
            "status": "deleted",
            "source_id": request.source_id,
            "target_id": request.target_id,
            "rel_type": request.rel_type,
            "deleted_count": deleted_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete edge: {str(e)}")


@router.post("/v1/kg/admin/hypothesis/{hypothesis_id}/retract")
async def retract_hypothesis(
    hypothesis_id: str,
    reasoning: str,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Retract/withdraw a hypothesis before validation.
    Agent use case: "I was wrong, this hypothesis doesn't make sense"
    
    Sets status to 'retracted' instead of deleting (audit trail).
    """
    try:
        # Check if hypothesis exists and is active
        check_query = """
            MATCH (h:Hypothesis {id: $hypothesis_id})
            RETURN h.status as status
        """
        result = store.execute_read(check_query, {"hypothesis_id": hypothesis_id})
        if not result:
            raise HTTPException(status_code=404, detail=f"Hypothesis {hypothesis_id} not found")
        
        if result[0]["status"] in ["validated", "invalidated"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot retract hypothesis with status '{result[0]['status']}'"
            )
        
        # Set status to retracted
        retract_query = """
            MATCH (h:Hypothesis {id: $hypothesis_id})
            SET h.status = 'retracted',
                h.retracted_at = datetime(),
                h.retract_reasoning = $reasoning
            RETURN h
        """
        store.execute_write(retract_query, {
            "hypothesis_id": hypothesis_id,
            "reasoning": reasoning
        })
        
        return {
            "status": "retracted",
            "hypothesis_id": hypothesis_id,
            "reasoning": reasoning
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retract hypothesis: {str(e)}")


@router.delete("/v1/kg/admin/pattern/{pattern_id}")
async def delete_pattern(
    pattern_id: str,
    reasoning: str,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Delete a pattern that turned out to be invalid.
    Agent use case: "This pattern no longer holds, remove it"
    
    Deletes pattern node but keeps source hypothesis (audit trail).
    """
    try:
        # Check if pattern exists
        check_query = """
            MATCH (p:Pattern {id: $pattern_id})
            RETURN p
        """
        result = store.execute_read(check_query, {"pattern_id": pattern_id})
        if not result:
            raise HTTPException(status_code=404, detail=f"Pattern {pattern_id} not found")
        
        # Delete pattern (keep hypothesis)
        delete_query = """
            MATCH (p:Pattern {id: $pattern_id})
            DETACH DELETE p
        """
        store.execute_write(delete_query, {"pattern_id": pattern_id})
        
        # Log deletion (could store in separate log)
        print(f"🗑️ Pattern {pattern_id} deleted. Reason: {reasoning}")
        
        return {
            "status": "deleted",
            "pattern_id": pattern_id,
            "reasoning": reasoning
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete pattern: {str(e)}")


@router.post("/v1/kg/admin/cleanup/orphaned-nodes")
async def cleanup_orphaned_nodes(
    dry_run: bool = True,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Find and optionally delete orphaned nodes (nodes with no edges).
    Agent use case: "Clean up isolated entities that were created by mistake"
    
    - dry_run=True: Just count and return list
    - dry_run=False: Delete them
    """
    try:
        # Find orphaned nodes
        find_query = """
            MATCH (n)
            WHERE NOT (n)--()
            AND NOT n:Pattern  // Keep patterns even if orphaned
            AND NOT n:Regime   // Keep regimes even if orphaned
            RETURN elementId(n) as node_id, labels(n) as labels, n.name as name, n.ticker as ticker
            LIMIT 100
        """
        result = store.execute_read(find_query, {})
        
        orphaned_nodes = [
            {
                "node_id": r["node_id"],
                "labels": r["labels"],
                "name": r.get("name"),
                "ticker": r.get("ticker")
            }
            for r in result
        ]
        
        if not dry_run and orphaned_nodes:
            # Delete them
            node_ids = [n["node_id"] for n in orphaned_nodes]
            delete_query = """
                MATCH (n)
                WHERE elementId(n) IN $node_ids
                DELETE n
            """
            store.execute_write(delete_query, {"node_ids": node_ids})
        
        return {
            "status": "completed" if not dry_run else "dry_run",
            "orphaned_count": len(orphaned_nodes),
            "deleted": not dry_run,
            "nodes": orphaned_nodes[:10]  # Return first 10 as sample
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@router.get("/v1/kg/admin/stats/detailed")
async def get_detailed_stats(
    store: GraphStore = Depends(get_graph_store)
):
    """
    Detailed graph statistics for monitoring.
    Agent use case: "Show me graph health metrics"
    """
    try:
        # Node counts by label
        node_stats_query = """
            MATCH (n)
            RETURN labels(n)[0] as label, count(*) as count
            ORDER BY count DESC
        """
        node_stats = store.execute_read(node_stats_query, {})
        
        # Edge counts by type
        edge_stats_query = """
            MATCH ()-[r]->()
            RETURN type(r) as rel_type, count(*) as count
            ORDER BY count DESC
        """
        edge_stats = store.execute_read(edge_stats_query, {})
        
        # Temporal coverage
        temporal_query = """
            MATCH ()-[r]->()
            WHERE r.valid_from IS NOT NULL
            WITH count(r) as temporal_count
            MATCH ()-[r2]->()
            RETURN temporal_count, count(r2) as total_edges
        """
        temporal_result = store.execute_read(temporal_query, {})
        temporal_coverage = (
            temporal_result[0]["temporal_count"] / temporal_result[0]["total_edges"] * 100
            if temporal_result and temporal_result[0]["total_edges"] > 0
            else 0
        )
        
        # Average confidence
        confidence_query = """
            MATCH ()-[r]->()
            WHERE r.confidence IS NOT NULL
            RETURN avg(r.confidence) as avg_confidence, count(r) as confidence_count
        """
        confidence_result = store.execute_read(confidence_query, {})
        
        return {
            "status": "ok",
            "node_stats": [{"label": r["label"], "count": r["count"]} for r in node_stats],
            "edge_stats": [{"rel_type": r["rel_type"], "count": r["count"]} for r in edge_stats],
            "temporal_coverage_pct": round(temporal_coverage, 2),
            "avg_confidence": round(confidence_result[0]["avg_confidence"], 3) if confidence_result else None,
            "edges_with_confidence": confidence_result[0]["confidence_count"] if confidence_result else 0
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

