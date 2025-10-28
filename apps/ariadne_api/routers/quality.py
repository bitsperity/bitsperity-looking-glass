"""
Quality endpoints for graph data discovery and validation.
Detects contradictions, gaps, anomalies, and duplicates in knowledge graph.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store
from typing import Optional
import math

router = APIRouter()


@router.get("/contradictions")
async def get_contradictions(
    store: GraphStore = Depends(get_graph_store)
):
    """
    Detect contradictions in the knowledge graph.
    
    Finds:
    - Opposite effect properties (positive vs negative)
    - Conflicting relation types (BENEFITS vs HARMS)
    
    Agent use case: "Show me contradictory statements about entity relationships"
    """
    try:
        query = """
        MATCH (a)-[r1]->(b), (a)-[r2]->(b)
        WHERE elementId(r1) < elementId(r2)
          AND (
            (r1.effect = 'positive' AND r2.effect = 'negative')
            OR (r1.effect = 'negative' AND r2.effect = 'positive')
            OR (type(r1) = 'BENEFITS' AND type(r2) = 'HARMS')
            OR (type(r1) = 'HARMS' AND type(r2) = 'BENEFITS')
          )
        WITH a, r1, r2, b, 
             labels(a)[0] as source_label,
             labels(b)[0] as target_label
        RETURN {
          source: {
            id: elementId(a),
            label: source_label,
            name: coalesce(a.name, a.title, a.ticker, 'Unknown')
          },
          target: {
            id: elementId(b),
            label: target_label,
            name: coalesce(b.name, b.title, b.ticker, 'Unknown')
          },
          relation_1: {
            type: type(r1),
            effect: coalesce(r1.effect, 'neutral'),
            confidence: coalesce(r1.confidence, 1.0)
          },
          relation_2: {
            type: type(r2),
            effect: coalesce(r2.effect, 'neutral'),
            confidence: coalesce(r2.confidence, 1.0)
          },
          conflict_type: CASE 
            WHEN r1.effect IS NOT NULL AND r2.effect IS NOT NULL THEN 'property_conflict'
            ELSE 'relation_type_conflict'
          END
        } as contradiction
        ORDER BY contradiction.relation_1.confidence DESC
        """
        
        results = store.execute_read(query, {})
        
        return {
            "status": "success",
            "contradictions": [r["contradiction"] for r in results],
            "count": len(results)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contradiction detection failed: {str(e)}")


@router.get("/gaps")
async def get_gaps(
    label: str = Query("Company", description="Node label to analyze"),
    min_relations: int = Query(10, ge=1, description="Minimum relations threshold"),
    low_confidence_threshold: float = Query(0.5, ge=0, le=1, description="Confidence threshold"),
    gap_threshold: float = Query(0.5, ge=0, le=1, description="Gap severity threshold"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Detect gaps in knowledge graph coverage.
    
    Finds nodes with:
    - High connectivity (important nodes)
    - High ratio of low-confidence relations (poor evidence quality)
    
    Agent use case: "Show me entities where I have weak evidence"
    """
    try:
        query = f"""
        MATCH (n:{label})-[r]->()
        WITH n, 
             count(r) as total_rels,
             sum(CASE WHEN r.confidence < $low_conf_threshold THEN 1 ELSE 0 END) as low_conf_rels
        WHERE total_rels > $min_rels
          AND (low_conf_rels * 1.0 / total_rels) > $gap_thresh
        WITH n, total_rels, low_conf_rels,
             (low_conf_rels * 1.0 / total_rels) as gap_severity
        RETURN {{
          node: {{
            id: elementId(n),
            label: labels(n)[0],
            name: coalesce(n.name, n.title, n.ticker, 'Unknown')
          }},
          total_relations: total_rels,
          low_confidence_relations: low_conf_rels,
          gap_severity: gap_severity,
          recommendation: CASE 
            WHEN gap_severity > 0.75 THEN 'Critical - Review all evidence immediately'
            WHEN gap_severity > 0.5 THEN 'Review and strengthen evidence for key relations'
            ELSE 'Monitor confidence levels'
          END
        }} as gap
        ORDER BY gap.gap_severity DESC
        """
        
        results = store.execute_read(query, {
            "low_conf_threshold": low_confidence_threshold,
            "min_rels": min_relations,
            "gap_thresh": gap_threshold
        })
        
        return {
            "status": "success",
            "gaps": [r["gap"] for r in results],
            "count": len(results),
            "parameters": {
                "label": label,
                "min_relations": min_relations,
                "low_confidence_threshold": low_confidence_threshold,
                "gap_threshold": gap_threshold
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap detection failed: {str(e)}")


@router.get("/anomalies")
async def get_anomalies(
    label: str = Query("Company", description="Node label to analyze"),
    z_threshold: float = Query(2.5, ge=1, description="Z-score threshold for statistical outliers"),
    growth_threshold: float = Query(0.3, ge=0, le=1, description="Growth rate threshold (30% = 0.3)"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Detect structural and temporal anomalies.
    
    Statistical anomalies: Nodes with abnormal degree (Z-score)
    Temporal anomalies: Sudden degree changes (growth_rate)
    
    Agent use case: "Show me unusual nodes or sudden activity spikes"
    """
    try:
        # Step 1: Get all nodes with degree using COUNT
        degree_query = f"""
        MATCH (n:{label})-[r]-()
        WITH n, count(DISTINCT r) as degree
        RETURN elementId(n) as node_id, n.name as name, n.ticker as ticker, n.title as title, degree
        """
        
        degree_results = store.execute_read(degree_query, {})
        
        if not degree_results:
            return {
                "status": "success",
                "anomalies": [],
                "count": 0
            }
        
        # Step 2: Calculate statistical metrics
        degrees = [r["degree"] for r in degree_results]
        avg_degree = sum(degrees) / len(degrees)
        
        # Calculate standard deviation
        variance = sum((d - avg_degree) ** 2 for d in degrees) / len(degrees)
        std_dev = math.sqrt(variance)
        
        anomalies = []
        
        # Step 3: Find statistical outliers
        for result in degree_results:
            if std_dev == 0:
                z_score = 0
            else:
                z_score = (result["degree"] - avg_degree) / std_dev
            
            if abs(z_score) > z_threshold:
                anomalies.append({
                    "node": {
                        "id": result["node_id"],
                        "label": label,
                        "name": result.get("name") or result.get("title") or result.get("ticker") or "Unknown"
                    },
                    "anomaly_type": "statistical",
                    "degree": result["degree"],
                    "avg_degree": round(avg_degree, 2),
                    "z_score": round(z_score, 2),
                    "severity": "high" if abs(z_score) > 3.5 else "medium"
                })
        
        # Step 4: Find temporal anomalies (degree changes)
        temporal_query = f"""
        MATCH (n:{label})
        WHERE n.degree_7d_ago IS NOT NULL
        MATCH (n)-[]-()
        WITH n, count(*) as current_degree, n.degree_7d_ago as degree_7d_ago
        WHERE degree_7d_ago > 0
        WITH n, current_degree, degree_7d_ago,
             (current_degree - degree_7d_ago) * 1.0 / degree_7d_ago as growth_rate
        WHERE abs(growth_rate) > $growth_thresh
        RETURN elementId(n) as node_id, n.name as name, n.ticker as ticker, n.title as title,
               current_degree, degree_7d_ago, growth_rate
        """
        
        temporal_results = store.execute_read(temporal_query, {"growth_thresh": growth_threshold})
        
        for result in temporal_results:
            anomalies.append({
                "node": {
                    "id": result["node_id"],
                    "label": label,
                    "name": result.get("name") or result.get("title") or result.get("ticker") or "Unknown"
                },
                "anomaly_type": "temporal",
                "current_degree": result["current_degree"],
                "degree_7d_ago": result["degree_7d_ago"],
                "growth_rate": round(result["growth_rate"], 2),
                "severity": "high" if abs(result["growth_rate"]) > 0.5 else "medium"
            })
        
        return {
            "status": "success",
            "anomalies": anomalies,
            "count": len(anomalies),
            "statistics": {
                "avg_degree": round(avg_degree, 2),
                "std_dev": round(std_dev, 2),
                "nodes_analyzed": len(degrees)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


@router.get("/duplicates")
async def get_duplicates(
    label: str = Query("Company", description="Node label to analyze"),
    similarity_threshold: float = Query(0.85, ge=0, le=1, description="Similarity threshold"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Detect potential duplicate nodes using GDS similarity.
    
    Uses Node Similarity algorithm to find structurally similar nodes.
    Detection only - no automatic merging (manual review required).
    
    Agent use case: "Find similar entities that might be duplicates"
    """
    try:
        # Check if we have nodes
        node_count_query = f"MATCH (n:{label}) RETURN count(n) as count"
        node_count_results = store.execute_read(node_count_query, {})
        node_count = node_count_results[0]["count"] if node_count_results else 0
        
        if node_count < 2:
            return {
                "status": "success",
                "duplicates": [],
                "count": 0,
                "message": f"Minimum 2 nodes required for similarity detection (found: {node_count})"
            }
        
        # Project GDS graph
        project_query = f"""
        CALL gds.graph.project(
            'dedup_graph_{label}',
            '{label}',
            '*',
            {{ undirectedRelationshipTypes: ['*'] }}
        )
        YIELD graphName, nodeCount, relationshipCount
        RETURN graphName, nodeCount, relationshipCount
        """
        
        try:
            store.execute_write(project_query, {})
        except Exception as e:
            # If project fails, try dropping first
            try:
                store.execute_write(f"CALL gds.graph.drop('dedup_graph_{label}')", {})
                store.execute_write(project_query, {})
            except Exception:
                pass
        
        # Run similarity
        similarity_query = f"""
        CALL gds.nodeSimilarity.stream('dedup_graph_{label}')
        YIELD node1, node2, similarity
        WHERE similarity > $threshold
        WITH gds.util.asNode(node1) as n1, gds.util.asNode(node2) as n2, similarity
        RETURN {{
          node_1: {{
            id: elementId(n1),
            label: labels(n1)[0],
            name: coalesce(n1.name, n1.title, 'Unknown'),
            ticker: coalesce(n1.ticker, null)
          }},
          node_2: {{
            id: elementId(n2),
            label: labels(n2)[0],
            name: coalesce(n2.name, n2.title, 'Unknown'),
            ticker: coalesce(n2.ticker, null)
          }},
          similarity: similarity,
          recommendation: CASE 
            WHEN similarity > 0.95 THEN 'Very likely duplicate - merge recommended'
            WHEN similarity > 0.90 THEN 'Probable duplicate - manual review suggested'
            ELSE 'Possible duplicate - inspect relations'
          END
        }} as duplicate
        ORDER BY duplicate.similarity DESC
        LIMIT $limit
        """
        
        results = store.execute_read(similarity_query, {
            "threshold": similarity_threshold,
            "limit": limit
        })
        
        duplicates = [r["duplicate"] for r in results] if results else []
        
        # Cleanup GDS graph
        try:
            store.execute_write(f"CALL gds.graph.drop('dedup_graph_{label}')", {})
        except Exception:
            pass
        
        return {
            "status": "success",
            "duplicates": duplicates,
            "count": len(duplicates),
            "parameters": {
                "label": label,
                "similarity_threshold": similarity_threshold
            }
        }
    
    except Exception as e:
        # Try to cleanup on error
        try:
            cleanup_query = f"CALL gds.graph.drop('dedup_graph_{label}')"
            store.execute_write(cleanup_query, {})
        except Exception:
            pass
        
        raise HTTPException(status_code=500, detail=f"Duplicate detection failed: {str(e)}")
