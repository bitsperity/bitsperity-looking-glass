"""
Decision support endpoints for agent decision-making.
Provides risk scoring and evidence lineage tracing.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from libs.ariadne_core.storage import GraphStore
from libs.ariadne_core.utils.scoring import (
    normalize_weights, weighted_score, normalize_minmax, aggregate_confidence
)
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


@router.get("/impact")
async def get_impact_simulation(
    ticker: str | None = Query(None, description="Company ticker (use one of ticker or node_id)"),
    node_id: str | None = Query(None, description="Node ID (use one of ticker or node_id)"),
    max_depth: int = Query(3, ge=1, le=5, description="Maximum propagation depth"),
    rel_filter: str | None = Query(None, description="Relationship filter (e.g., 'AFFECTS|SUPPLIES_TO')"),
    decay: str = Query("exponential", regex="^(linear|exponential)$", description="Decay function"),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0, description="Minimum confidence threshold"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Simulate impact of a node or event on other nodes through the graph.
    
    Uses path expansion to find all nodes reachable within max_depth,
    calculating impact scores based on relationship confidence and decay.
    
    Query Parameters:
    - ticker: Company ticker (e.g., 'TSLA')
    - node_id: Alternative: node element ID
    - max_depth: How far to propagate (1-5)
    - rel_filter: Optional relationship types (e.g., 'AFFECTS|HARMS')
    - decay: 'linear' (gradual) or 'exponential' (steep decline)
    - min_confidence: Filter low-confidence paths
    - limit: Top N results
    
    Returns: List of impacted nodes with impact scores and path information
    """
    try:
        # Build match clause for finding source node
        if ticker:
            source_match = "MATCH (s:Company {ticker: $source_value})"
            source_param = ticker
        elif node_id:
            source_match = "MATCH (s) WHERE elementId(s) = $source_value"
            source_param = node_id
        else:
            raise HTTPException(status_code=400, detail="Either ticker or node_id required")
        
        # Build relationship filter
        rel_str = f"[:{rel_filter}]" if rel_filter else ""
        
        # Build decay calculation
        decay_calc = f"""
            CASE '{decay}'
            WHEN 'exponential' THEN
                reduce(c=1.0, r IN rels | c * coalesce(r.confidence, 1.0))
            WHEN 'linear' THEN
                reduce(c=1.0, r IN rels | c * (1.0 - (1.0 - coalesce(r.confidence, 1.0)) * 0.2))
            ELSE 1.0
            END
        """
        
        query = f"""
         {source_match}
         CALL apoc.path.expandConfig(s, {{
             relationshipFilter: {f"'{rel_filter}'" if rel_filter else "null"},
             maxLevel: {max_depth},
             bfs: true,
             uniqueness: 'NODE_GLOBAL'
         }}) YIELD path
         
         WITH s, path, 
              nodes(path) as nodes_in_path,
              relationships(path) as rels
         
         // Extract target node (last in path)
         WITH s, path, nodes_in_path[-1] as target, rels
         WHERE target <> s
         
         // Calculate impact score using decay function
         WITH s, target, rels,
              {decay_calc} as impact_score,
              size(rels) as depth
         
         WHERE impact_score >= $min_confidence
         
         // Build path snippet
         WITH {{
             target_id: elementId(target),
             target_name: coalesce(target.name, target.title, target.content, 'Unknown'),
             target_type: labels(target)[0],
             impact_score: round(impact_score, 3),
             depth: depth
         }} as result
         
         ORDER BY result.impact_score DESC
         LIMIT $limit
         RETURN result
         """
        
        results = store.execute_read(query, {
            "source_value": source_param,
            "min_confidence": min_confidence,
            "limit": limit
        })
        
        if not results:
            return {
                "status": "success",
                "source": ticker or node_id,
                "impacts": [],
                "count": 0,
                "message": "No impact found within specified depth"
            }
        
        impacts = [r["result"] for r in results]
        
        return {
            "status": "success",
            "source": ticker or node_id,
            "parameters": {
                "max_depth": max_depth,
                "decay": decay,
                "min_confidence": min_confidence,
                "relationship_filter": rel_filter or "all"
            },
            "impacts": impacts,
            "count": len(impacts),
            "summary": {
                "max_impact": max(i["impact_score"] for i in impacts) if impacts else 0.0,
                "avg_impact": round(sum(i["impact_score"] for i in impacts) / len(impacts), 3) if impacts else 0.0
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impact simulation failed: {str(e)}")


@router.get("/opportunities")
async def get_opportunities(
    label: str = Query("Company", description="Node label to analyze (e.g., Company)"),
    w_gap: float = Query(0.3, ge=0.0, le=1.0, description="Gap factor weight"),
    w_centrality: float = Query(0.4, ge=0.0, le=1.0, description="Centrality factor weight"),
    w_anomaly: float = Query(0.3, ge=0.0, le=1.0, description="Anomaly factor weight"),
    limit: int = Query(15, ge=1, le=50, description="Top N opportunities"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Score nodes by opportunity: combining gaps, centrality, and anomalies.
    
    Opportunity Score = w_gap * gap_severity + w_centrality * norm_centrality + w_anomaly * norm_anomaly
    
    High opportunity nodes are:
    - Hub nodes with low confidence (gaps)
    - High centrality / influence
    - Showing temporal anomalies
    
    Returns: Ranked opportunities with component scores and rationale
    """
    try:
        # Normalize weights
        weights = normalize_weights({
            "gap": w_gap,
            "centrality": w_centrality,
            "anomaly": w_anomaly
        })
        
        # Query: Calculate gaps (low confidence relations)
        gap_query = f"""
        MATCH (n:{label})
        OPTIONAL MATCH (n)-[r]->()
        WITH n,
             count(DISTINCT r) as total_rels,
             sum(CASE WHEN coalesce(r.confidence, 1.0) < 0.5 THEN 1 ELSE 0 END) as low_conf_rels
        
        WITH n,
             low_conf_rels,
             CASE WHEN total_rels > 0 THEN low_conf_rels * 1.0 / total_rels ELSE 0 END as gap_ratio,
             total_rels
        
        WHERE total_rels > 0
        RETURN {{
            node_id: elementId(n),
            node_name: coalesce(n.name, n.ticker, 'Unknown'),
            node_type: '{label}',
            gap_ratio: gap_ratio,
            total_relations: total_rels,
            low_conf_count: low_conf_rels
        }} as gap_data
        """
        
        gap_results = store.execute_read(gap_query, {})
        
        if not gap_results:
            return {
                "status": "success",
                "label": label,
                "opportunities": [],
                "count": 0,
                "message": f"No nodes with gaps found for label {label}"
            }
        
        # Extract gap scores
        gap_data = {r["gap_data"]["node_id"]: r["gap_data"] for r in gap_results}
        gap_scores = {nid: d["gap_ratio"] for nid, d in gap_data.items()}
        
        # Query: Centrality scores
        centrality_query = f"""
        CALL gds.pageRank.stream('{{graph_name}}')
        YIELD nodeId, score
        WITH gds.util.asNode(nodeId) as n, score
        WHERE '{label}' IN labels(n)
        RETURN elementId(n) as node_id, score as centrality_score
        """
        
        # Since we can't rely on GDS graph existing, we calculate degree directly
        degree_query = f"""
        MATCH (n:{label})
        OPTIONAL MATCH (n)-[r]->()
        WITH n, count(DISTINCT r) as degree
        RETURN elementId(n) as node_id, degree as centrality_score
        """
        
        centrality_results = store.execute_read(degree_query, {})
        centrality_data = {r["node_id"]: r["centrality_score"] for r in centrality_results}
        
        # Query: Anomaly detection (high degree or temporal spike)
        anomaly_query = f"""
        MATCH (n:{label})
        OPTIONAL MATCH (n)-[r]->()
        WITH n, count(DISTINCT r) as current_degree
        
        OPTIONAL MATCH (n)-[r_old]->()
        WHERE coalesce(r_old.updated_at, '') < coalesce(r_old.created_at, '')
        WITH n, current_degree, count(DISTINCT r_old) as old_degree
        
        WITH n,
             current_degree,
             coalesce(old_degree, 0) as old_degree,
             CASE WHEN old_degree > 0 THEN (current_degree - old_degree) * 1.0 / old_degree ELSE 0 END as growth
        
        RETURN {{
            node_id: elementId(n),
            degree: current_degree,
            growth_rate: abs(growth)
        }} as anomaly_data
        """
        
        anomaly_results = store.execute_read(anomaly_query, {})
        anomaly_data = {r["anomaly_data"]["node_id"]: r["anomaly_data"] for r in anomaly_results}
        anomaly_scores = {nid: d.get("growth_rate", 0) for nid, d in anomaly_data.items()}
        
        # Combine scores for each node
        opportunities = []
        for node_id in gap_data.keys():
            gap_score = gap_scores.get(node_id, 0)
            centrality_raw = centrality_data.get(node_id, 0)
            anomaly_raw = anomaly_scores.get(node_id, 0)
            
            # Normalize centrality and anomaly to 0-1 range
            all_centrality = list(centrality_data.values())
            all_anomaly = list(anomaly_scores.values())
            
            centrality_norm = (centrality_raw / max(all_centrality)) if all_centrality and max(all_centrality) > 0 else 0
            anomaly_norm = min(anomaly_raw / 2.0, 1.0) if anomaly_raw > 0 else 0  # Cap at 100% growth
            
            # Weighted opportunity score
            opportunity_score = weighted_score(
                {
                    "gap": gap_score,
                    "centrality": centrality_norm,
                    "anomaly": anomaly_norm
                },
                weights
            )
            
            opportunities.append({
                "node_id": node_id,
                "node_name": gap_data[node_id]["node_name"],
                "opportunity_score": round(opportunity_score, 3),
                "factors": {
                    "gap_severity": round(gap_score, 3),
                    "centrality": round(centrality_norm, 3),
                    "anomaly": round(anomaly_norm, 3)
                },
                "rationale": [
                    f"Gap severity: {round(gap_score*100, 1)}% low-confidence relations ({gap_data[node_id]['low_conf_count']}/{gap_data[node_id]['total_relations']})",
                    f"Centrality: degree {centrality_raw}",
                    f"Anomaly: {round(anomaly_norm*100, 1)}% degree growth"
                ]
            })
        
        # Sort by opportunity score
        opportunities.sort(key=lambda x: x["opportunity_score"], reverse=True)
        
        return {
            "status": "success",
            "label": label,
            "weights": {
                "gap": weights["gap"],
                "centrality": weights["centrality"],
                "anomaly": weights["anomaly"]
            },
            "opportunities": opportunities[:limit],
            "count": len(opportunities[:limit]),
            "summary": {
                "total_analyzed": len(gap_data),
                "top_score": opportunities[0]["opportunity_score"] if opportunities else 0,
                "avg_score": round(sum(o["opportunity_score"] for o in opportunities) / len(opportunities), 3) if opportunities else 0
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Opportunity scoring failed: {str(e)}")
