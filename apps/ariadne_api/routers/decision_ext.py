"""
Extended decision support endpoints.
Provides confidence propagation across graph paths.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from libs.ariadne_core.storage import GraphStore
from libs.ariadne_core.utils.scoring import aggregate_confidence
from apps.ariadne_api.main import get_graph_store

router = APIRouter()


@router.get("/confidence/propagate")
async def propagate_confidence(
    from_ticker: str | None = Query(None, description="Source company ticker"),
    from_id: str | None = Query(None, description="Source node ID"),
    to_label: str = Query("Company", description="Target node label (e.g., Company)"),
    max_depth: int = Query(5, ge=1, le=10, description="Maximum path depth"),
    mode: str = Query("product", regex="^(product|min|avg)$", description="Aggregation mode"),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0, description="Minimum confidence threshold"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Calculate transitive confidence from a source node to target nodes.
    
    Propagates confidence values along paths, with different aggregation methods:
    - product: Multiply all confidences (most conservative, multiplicative decline)
    - min: Take minimum confidence on path (very conservative)
    - avg: Average all confidences (balanced)
    
    Use case: "How confident am I in this connection through this node?"
    
    Example: TSLA (0.9) -> NVDA (0.8) -> AI-Tech (?) = 0.72 (product) or 0.8 (min)
    """
    try:
        # Build source match
        if from_ticker:
            source_match = "MATCH (source:Company {ticker: $source_value})"
            source_param = from_ticker
        elif from_id:
            source_match = "MATCH (source) WHERE elementId(source) = $source_value"
            source_param = from_id
        else:
            raise HTTPException(status_code=400, detail="Either from_ticker or from_id required")
        
        # Build aggregation logic (Cypher reduce)
        agg_logic = {
            "product": "reduce(conf = 1.0, rel IN rels | conf * coalesce(rel.confidence, 1.0))",
            "min": "reduce(conf = 1.0, rel IN rels | CASE WHEN coalesce(rel.confidence, 1.0) < conf THEN coalesce(rel.confidence, 1.0) ELSE conf END)",
            "avg": "reduce(conf_sum = 0.0, rel IN rels | conf_sum + coalesce(rel.confidence, 1.0)) / length(rels)"
        }
        
        agg_expr = agg_logic[mode]
        
        # Query: Find all paths from source to target_label and aggregate confidence
        query = f"""
        {source_match}
        CALL apoc.path.expandConfig(source, {{
            relationshipFilter: '',
            maxLevel: {max_depth},
            bfs: true,
            uniqueness: 'NODE_GLOBAL'
        }}) YIELD path
        
        WITH source, path,
             nodes(path) as nodes_in_path,
             relationships(path) as rels,
             last(nodes(path)) as target
        
        WHERE target <> source AND ANY(label IN labels(target) WHERE label = '{to_label}')
        
        WITH source, target, rels,
             {agg_expr} as confidence_score,
             length(rels) as depth
        
        WHERE confidence_score >= $min_confidence
        
        RETURN {{
            target_id: elementId(target),
            target_name: coalesce(target.name, target.ticker, 'Unknown'),
            target_type: labels(target)[0],
            confidence: round(confidence_score, 3),
            depth: depth,
            source_name: coalesce(source.name, source.ticker, 'Unknown')
        }} as result
        
        ORDER BY result.confidence DESC
        LIMIT $limit
        """
        
        results = store.execute_read(query, {
            "source_value": source_param,
            "min_confidence": min_confidence,
            "limit": limit
        })
        
        if not results:
            return {
                "status": "success",
                "source": from_ticker or from_id,
                "target_label": to_label,
                "propagations": [],
                "count": 0,
                "message": "No confidence paths found"
            }
        
        propagations = [r["result"] for r in results]
        
        return {
            "status": "success",
            "source": from_ticker or from_id,
            "target_label": to_label,
            "parameters": {
                "max_depth": max_depth,
                "aggregation_mode": mode,
                "min_confidence": min_confidence
            },
            "propagations": propagations,
            "count": len(propagations),
            "summary": {
                "max_confidence": max(p["confidence"] for p in propagations) if propagations else 0.0,
                "min_confidence": min(p["confidence"] for p in propagations) if propagations else 0.0,
                "avg_confidence": round(sum(p["confidence"] for p in propagations) / len(propagations), 3) if propagations else 0.0,
                "avg_depth": round(sum(p["depth"] for p in propagations) / len(propagations), 1) if propagations else 0.0
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Confidence propagation failed: {str(e)}")
