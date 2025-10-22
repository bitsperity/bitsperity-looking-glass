"""
Health and stats endpoints
"""

from fastapi import APIRouter, Depends
from libs.ariadne_core.models import HealthResponse, StatsResponse
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health(store: GraphStore = Depends(get_graph_store)):
    """Health check endpoint"""
    connected = store.verify_connection()
    
    node_count = None
    edge_count = None
    
    if connected:
        try:
            stats = store.get_stats()
            node_count = stats["total_nodes"]
            edge_count = stats["total_edges"]
        except Exception:
            pass
    
    return HealthResponse(
        status="ok" if connected else "degraded",
        service="ariadne",
        neo4j_connected=connected,
        node_count=node_count,
        edge_count=edge_count
    )


@router.get("/v1/kg/stats", response_model=StatsResponse)
async def get_stats(store: GraphStore = Depends(get_graph_store)):
    """Get database statistics"""
    stats = store.get_stats()
    
    return StatsResponse(
        nodes_by_label=stats["nodes_by_label"],
        edges_by_type=stats["edges_by_type"],
        total_nodes=stats["total_nodes"],
        total_edges=stats["total_edges"],
        last_updated=stats["last_updated"]
    )

