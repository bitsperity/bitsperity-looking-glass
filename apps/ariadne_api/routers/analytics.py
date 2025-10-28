"""
Analytics endpoints for Graph Data Science queries via GDS
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store
from typing import List

router = APIRouter()


@router.get("/centrality")
async def get_centrality(
    algo: str = Query("pagerank", regex="^(pagerank|betweenness|closeness)$"),
    label: str | None = Query(None, description="Optional Node-Label Filter"),
    topk: int = Query(10, ge=1, le=100),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Berechne Centrality-Scores via GDS für Nodes.
    
    Args:
        algo: Centrality-Algorithmus (pagerank, betweenness, closeness)
        label: Optional Filter auf bestimmte Node-Labels
        topk: Top-k Nodes zurückgeben
    
    Returns:
        Ranking der wichtigsten Nodes
    """
    try:
        # GDS Graph projizieren
        graph_name = f"centrality_{algo}_{id(store)}"
        
        # Cleanup alte Projektionen
        cleanup_query = f"CALL gds.graph.drop($name) YIELD graphName"
        try:
            store.execute_read(cleanup_query, {"name": graph_name})
        except:
            pass
        
        # Neue Projektion
        label_filter = label if label else "*"
        project_query = f"""
            CALL gds.graph.project(
                $graph_name,
                '{label_filter}',
                '*'
            ) YIELD graphName, nodeCount
            RETURN graphName, nodeCount
        """
        
        proj_result = store.execute_read(project_query, {"graph_name": graph_name})
        if not proj_result:
            raise Exception("GDS graph projection failed")
        
        # Centrality-Berechnung
        if algo == "pagerank":
            algo_query = """
                CALL gds.pageRank.stream($graph_name)
                YIELD nodeId, score
                RETURN gds.util.asNode(nodeId) AS node, score
                ORDER BY score DESC
                LIMIT $topk
            """
        elif algo == "betweenness":
            algo_query = """
                CALL gds.betweenness.stream($graph_name)
                YIELD nodeId, score
                RETURN gds.util.asNode(nodeId) AS node, score
                ORDER BY score DESC
                LIMIT $topk
            """
        else:  # closeness
            algo_query = """
                CALL gds.closeness.stream($graph_name)
                YIELD nodeId, score
                RETURN gds.util.asNode(nodeId) AS node, score
                ORDER BY score DESC
                LIMIT $topk
            """
        
        results = store.execute_read(algo_query, {
            "graph_name": graph_name,
            "topk": topk
        })
        
        nodes = []
        for record in results:
            node = dict(record["node"])
            labels = list(record["node"].labels) if hasattr(record["node"], "labels") else []
            nodes.append({
                "id": node.get("id"),
                "name": node.get("name") or node.get("title"),
                "label": labels[0] if labels else "Unknown",
                "score": record["score"],
                "properties": node
            })
        
        # Cleanup
        try:
            store.execute_read("CALL gds.graph.drop($name) YIELD graphName", {"name": graph_name})
        except:
            pass
        
        return {
            "status": "success",
            "algorithm": algo,
            "count": len(nodes),
            "results": nodes
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Centrality calculation failed: {str(e)}")


@router.get("/communities")
async def get_communities(
    algo: str = Query("louvain", regex="^(louvain|leiden)$"),
    label: str | None = Query(None),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Berechne Community-Zuordnungen via GDS.
    
    Args:
        algo: Community-Algorithmus (louvain, leiden)
        label: Optional Node-Label Filter
    
    Returns:
        Community-Zuordnungen (node_id → community_id)
    """
    try:
        graph_name = f"communities_{algo}_{id(store)}"
        
        # Cleanup
        try:
            store.execute_read("CALL gds.graph.drop($name) YIELD graphName", {"name": graph_name})
        except:
            pass
        
        # Projektion
        label_filter = label if label else "*"
        project_query = f"""
            CALL gds.graph.project(
                $graph_name,
                '{label_filter}',
                '*'
            ) YIELD graphName, nodeCount
            RETURN graphName, nodeCount
        """
        
        proj_result = store.execute_read(project_query, {"graph_name": graph_name})
        if not proj_result:
            raise Exception("GDS graph projection failed")
        
        # Community-Detection
        if algo == "leiden":
            detect_query = """
                CALL gds.leiden.stream($graph_name)
                YIELD nodeId, communityId
                RETURN gds.util.asNode(nodeId) AS node, communityId
                ORDER BY communityId, nodeId
            """
        else:  # louvain
            detect_query = """
                CALL gds.louvain.stream($graph_name)
                YIELD nodeId, communityId
                RETURN gds.util.asNode(nodeId) AS node, communityId
                ORDER BY communityId, nodeId
            """
        
        results = store.execute_read(detect_query, {"graph_name": graph_name})
        
        communities = {}
        for record in results:
            node = dict(record["node"])
            labels = list(record["node"].labels) if hasattr(record["node"], "labels") else []
            comm_id = record["communityId"]
            if comm_id not in communities:
                communities[comm_id] = []
            communities[comm_id].append({
                "id": node.get("id"),
                "name": node.get("name") or node.get("title"),
                "label": labels[0] if labels else "Unknown"
            })
        
        # Cleanup
        try:
            store.execute_read("CALL gds.graph.drop($name) YIELD graphName", {"name": graph_name})
        except:
            pass
        
        return {
            "status": "success",
            "algorithm": algo,
            "community_count": len(communities),
            "communities": communities
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Community detection failed: {str(e)}")


@router.get("/similarity")
async def get_similarity(
    node_id: str = Query(..., description="Node ID"),
    method: str = Query("gds", regex="^(gds|weighted)$"),
    topk: int = Query(10, ge=1, le=50),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Finde ähnliche Nodes via Node Similarity.
    
    Args:
        node_id: Reference Node ID
        method: Similarity-Methode (gds=Jaccard, weighted=Edge Weights)
        topk: Top-k ähnliche Nodes
    
    Returns:
        Ranking ähnlicher Nodes
    """
    try:
        graph_name = f"similarity_{id(store)}"
        
        # Cleanup
        try:
            store.execute_read("CALL gds.graph.drop($name) YIELD graphName", {"name": graph_name})
        except:
            pass
        
        # Projektion
        project_query = f"""
            CALL gds.graph.project(
                $graph_name,
                '*',
                '*'
            ) YIELD graphName, nodeCount
            RETURN graphName, nodeCount
        """
        
        store.execute_read(project_query, {"graph_name": graph_name})
        
        # Node Similarity
        query = """
            CALL gds.nodeSimilarity.stream($graph_name)
            YIELD node1, node2, similarity
            WITH gds.util.asNode(node1) AS n1, gds.util.asNode(node2) AS n2, similarity
            WHERE id(n1) = $node_id OR id(n2) = $node_id
            WITH CASE WHEN id(n1) = $node_id THEN n2 ELSE n1 END AS similarNode, similarity
            RETURN similarNode, similarity
            ORDER BY similarity DESC
            LIMIT $topk
        """
        
        node_id_int = int(node_id) if node_id.isdigit() else node_id
        results = store.execute_read(query, {
            "graph_name": graph_name,
            "node_id": node_id_int,
            "topk": topk
        })
        
        similar = []
        for record in results:
            node = dict(record["similarNode"])
            labels = list(record["similarNode"].labels) if hasattr(record["similarNode"], "labels") else []
            similar.append({
                "id": node.get("id"),
                "name": node.get("name") or node.get("title"),
                "label": labels[0] if labels else "Unknown",
                "similarity_score": record["similarity"],
                "properties": node
            })
        
        # Cleanup
        try:
            store.execute_read("CALL gds.graph.drop($name) YIELD graphName", {"name": graph_name})
        except:
            pass
        
        return {
            "status": "success",
            "reference_node": node_id,
            "method": method,
            "count": len(similar),
            "results": similar
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similarity computation failed: {str(e)}")


@router.get("/link-prediction")
async def predict_links(
    node_id: str = Query(..., description="Node ID"),
    topk: int = Query(10, ge=1, le=50),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Vorhersage fehlender Kanten via GDS Link Prediction.
    
    Args:
        node_id: Node ID
        topk: Top-k wahrscheinliche Links
    
    Returns:
        Ranking wahrscheinlicher Links
    """
    try:
        graph_name = f"linkpred_{id(store)}"
        
        # Cleanup
        try:
            store.execute_read("CALL gds.graph.drop($name) YIELD graphName", {"name": graph_name})
        except:
            pass
        
        # Projektion
        project_query = f"""
            CALL gds.graph.project(
                $graph_name,
                '*',
                '*'
            ) YIELD graphName, nodeCount
            RETURN graphName, nodeCount
        """
        
        store.execute_read(project_query, {"graph_name": graph_name})
        
        # Link Prediction (AdamicAdar)
        query = """
            MATCH (n) WHERE id(n) = $node_id
            WITH n
            MATCH (n)-->(neighbor)
            WITH n, neighbor, count(*) AS common_neighbors
            MATCH (neighbor)-->(potential) 
            WHERE potential <> n AND NOT (n)-->(potential)
            RETURN potential, sum(1.0 / (1.0 + abs(common_neighbors))) AS score
            ORDER BY score DESC
            LIMIT $topk
        """
        
        node_id_int = int(node_id) if node_id.isdigit() else node_id
        results = store.execute_read(query, {
            "node_id": node_id_int,
            "topk": topk
        })
        
        predictions = []
        for record in results:
            node = dict(record["potential"])
            labels = list(record["potential"].labels) if hasattr(record["potential"], "labels") else []
            predictions.append({
                "id": node.get("id"),
                "name": node.get("name") or node.get("title"),
                "label": labels[0] if labels else "Unknown",
                "prediction_score": record["score"],
                "properties": node
            })
        
        # Cleanup
        try:
            store.execute_read("CALL gds.graph.drop($name) YIELD graphName", {"name": graph_name})
        except:
            pass
        
        return {
            "status": "success",
            "source_node": node_id,
            "count": len(predictions),
            "predictions": predictions
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Link prediction failed: {str(e)}")


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
            "avg": "reduce(conf_sum = 0.0, rel IN rels | conf_sum + coalesce(rel.confidence, 1.0)) / size(rels)"
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
             size(rels) as depth
        
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
