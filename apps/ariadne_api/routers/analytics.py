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
