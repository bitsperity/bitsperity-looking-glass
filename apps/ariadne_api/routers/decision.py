"""
Decision support endpoints for agent decision-making.
Provides risk scoring and evidence lineage tracing.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store

router = APIRouter()


@router.get("/risk")
async def get_risk_score(
    ticker: str = Query(..., description="Company ticker symbol"),
    include_centrality: bool = Query(False, description="Include PageRank centrality factor"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Calculate risk score for a company.
    
    Factors:
    - Negative events (HARMS relations)
    - Dependency degree (how many depend on this node)
    - Low-confidence relation ratio
    - Optional: Centrality (PageRank)
    
    Agent use case: "What is the risk profile of this company?"
    """
    try:
        # Main query for risk factors
        query = """
        MATCH (n:Company {ticker: $ticker})
        
        // Factor 1: Negative events
        OPTIONAL MATCH (n)-[r:HARMS|AFFECTS]->()
        WHERE type(r) = 'HARMS' OR r.effect = 'negative'
        WITH n, count(r) as negative_rels
        
        // Factor 2: Dependency degree (who depends on this node)
        OPTIONAL MATCH (n)<-[:SUPPLIES_TO]-()
        WITH n, negative_rels, count(*) as dependents
        
        // Factor 3: Low confidence ratio
        OPTIONAL MATCH (n)-[r]->()
        WITH n, negative_rels, dependents,
             sum(CASE WHEN r.confidence < 0.5 THEN 1 ELSE 0 END) as low_conf_count,
             count(r) as total_rels_val
        
        WITH n, negative_rels, dependents,
             CASE WHEN total_rels_val > 0 THEN low_conf_count * 1.0 / total_rels_val ELSE 0 END as low_conf_ratio,
             total_rels_val
        
        RETURN {
          negative_events: coalesce(negative_rels, 0),
          dependents: coalesce(dependents, 0),
          low_confidence_ratio: low_conf_ratio,
          total_relations: total_rels_val
        } as risk_factors
        """
        
        results = store.execute_read(query, {"ticker": ticker})
        
        if not results:
            raise HTTPException(status_code=404, detail=f"Company {ticker} not found")
        
        factors = results[0]["risk_factors"]
        
        # Calculate risk score (weighted sum)
        # Scale factors to 0-10 range first
        negative_events_score = min(factors["negative_events"] / 5, 10)  # 5+ events = max
        dependents_score = min(factors["dependents"] / 10, 10)  # 10+ dependents = max
        low_conf_score = factors["low_confidence_ratio"] * 10  # Already 0-1
        
        # Weighted average: 30% negative events, 30% dependents, 40% low confidence
        raw_score = (
            (negative_events_score * 0.3) +
            (dependents_score * 0.3) +
            (low_conf_score * 0.4)
        )
        
        # Normalize to 0-100
        risk_score = min(raw_score * 10, 100)
        
        # Determine severity
        if risk_score >= 70:
            severity = "high"
        elif risk_score >= 40:
            severity = "medium"
        else:
            severity = "low"
        
        return {
            "status": "success",
            "ticker": ticker,
            "risk_score": round(risk_score, 1),
            "severity": severity,
            "factors": {
                "negative_events": factors["negative_events"],
                "dependents": factors["dependents"],
                "low_confidence_ratio": round(factors["low_confidence_ratio"], 3),
                "total_relations": factors["total_relations"]
            },
            "recommendation": {
                "high": "Close monitoring required - significant risk exposure",
                "medium": "Monitor closely - moderate risk exposure",
                "low": "Acceptable risk profile - continue normal monitoring"
            }[severity]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk score calculation failed: {str(e)}")


@router.get("/lineage")
async def get_lineage(
    ticker: str = Query(..., description="Company ticker symbol"),
    max_depth: int = Query(5, ge=1, le=10, description="Maximum path depth"),
    limit: int = Query(20, ge=1, le=100, description="Maximum lineage chains to return"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Trace evidence lineage for a company.
    
    Shows provenance of all facts: Company <- Hypothesis <- Observation <- News/Event
    
    Agent use case: "Where did this information come from? What's the evidence chain?"
    """
    try:
        # Find lineage paths - use fixed max_depth since parameters can't be used in range patterns
        # Build query with actual depth value
        if max_depth > 10:
            max_depth = 10
        
        query = f"""
        MATCH (n:Company {{ticker: $ticker}})
        
        // Find all incoming paths from evidence sources (hardcoded depth for Neo4j 5 compat)
        OPTIONAL MATCH path = (n)<-[:DERIVED_FROM|SUPPORTS|EVIDENCE*1..{max_depth}]-(source)
        WHERE source:News OR source:Observation OR source:Event OR source:Hypothesis
        
        WITH n, path, source, 
             [node IN nodes(path) | {{
               type: labels(node)[0],
               id: elementId(node),
               name: coalesce(node.name, node.title, 'Unknown'),
               confidence: coalesce(node.confidence, 1.0),
               date: coalesce(node.published_at, node.date, node.created_at)
             }}] as chain
        
        WHERE path IS NOT NULL
        
        WITH n, chain, source,
             // Calculate chain confidence using CASE instead of aggregate min()
             reduce(min_conf = 1.0, rel IN relationships(path) | 
               CASE WHEN coalesce(rel.confidence, 1.0) < min_conf 
               THEN coalesce(rel.confidence, 1.0)
               ELSE min_conf
             END
             ) as path_confidence
        
        RETURN {{
          path_length: size(chain),
          chain: chain,
          confidence: path_confidence
        }} as lineage
        ORDER BY lineage.confidence DESC, lineage.path_length DESC
        LIMIT $limit
        """
        
        results = store.execute_read(query, {
            "ticker": ticker,
            "limit": limit
        })
        
        if not results:
            return {
                "status": "success",
                "ticker": ticker,
                "lineage": [],
                "count": 0,
                "message": "No evidence lineage found"
            }
        
        lineages = [r["lineage"] for r in results]
        
        return {
            "status": "success",
            "ticker": ticker,
            "lineage": lineages,
            "count": len(lineages),
            "summary": {
                "total_chains": len(lineages),
                "avg_chain_length": round(sum(l["path_length"] for l in lineages) / len(lineages), 1) if lineages else 0,
                "avg_confidence": round(sum(l["confidence"] for l in lineages) / len(lineages), 3) if lineages else 0
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lineage tracing failed: {str(e)}")
