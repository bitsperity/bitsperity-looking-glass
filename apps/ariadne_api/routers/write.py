"""
Write endpoints for adding facts, observations, and hypotheses
"""

from fastapi import APIRouter, Depends, HTTPException
from libs.ariadne_core.models import (
    FactRequest,
    FactResponse,
    ObservationRequest,
    ObservationResponse,
    HypothesisRequest,
    HypothesisResponse,
    Edge,
)
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store
from datetime import datetime
import uuid

router = APIRouter()


@router.post("/fact", response_model=FactResponse)
async def add_fact(
    request: FactRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Add or update a fact (edge) with provenance.
    Idempotent on (source, rel_type, target, time_window).
    """
    try:
        # First, ensure source and target nodes exist
        # Try to find existing nodes
        source_query = f"MATCH (s:{request.source_label}) WHERE id(s) = $id RETURN s"
        target_query = f"MATCH (t:{request.target_label}) WHERE id(t) = $id RETURN t"
        
        source_exists = store.execute_read(source_query, {"id": int(request.source_id)})
        target_exists = store.execute_read(target_query, {"id": int(request.target_id)})
        
        if not source_exists:
            raise HTTPException(status_code=404, detail=f"Source node {request.source_id} not found")
        if not target_exists:
            raise HTTPException(status_code=404, detail=f"Target node {request.target_id} not found")
        
        # Prepare edge properties and enforce temporal metadata
        edge_props = request.properties.copy()
        edge_props.update({
            "source": request.source,
            "confidence": request.confidence,
            "ingested_at": datetime.utcnow().isoformat(),
        })
        if request.method:
            edge_props["method"] = request.method

        valid_from = request.valid_from or datetime.utcnow()
        valid_to = request.valid_to or None

        # Use temporal merge for consistency
        rel_dict = store.merge_edge_temporal(
            source_label=request.source_label,
            source_id=int(request.source_id),
            target_label=request.target_label,
            target_id=int(request.target_id),
            rel_type=request.rel_type,
            properties=edge_props,
            valid_from=valid_from,
            valid_to=valid_to
        )

        if not rel_dict:
            raise HTTPException(status_code=500, detail="Failed to create edge")

        edge = Edge(
            source_id=request.source_id,
            target_id=request.target_id,
            rel_type=request.rel_type,
            properties=rel_dict
        )
        
        return FactResponse(status="created", edge=edge)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add fact: {str(e)}")


@router.post("/observation", response_model=ObservationResponse)
async def add_observation(
    request: ObservationRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Record an agent observation/journal entry.
    Creates an Observation node and links to relevant entities.
    """
    try:
        # Create observation node
        obs_id = str(uuid.uuid4())
        
        create_query = """
            CREATE (o:Observation {
                id: $id,
                date: $date,
                content: $content,
                tags: $tags,
                confidence: $confidence,
                created_at: datetime()
            })
            RETURN o
        """
        
        result = store.execute_write(create_query, {
            "id": obs_id,
            "date": request.date.isoformat(),
            "content": request.content,
            "tags": request.tags,
            "confidence": request.confidence
        })
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create observation")
        
        obs_node = result["o"]
        obs_internal_id = obs_node.id
        
        # Link to related tickers
        linked_count = 0
        
        if request.related_tickers:
            link_ticker_query = """
                MATCH (o:Observation), (c:Company)
                WHERE id(o) = $obs_id AND c.ticker IN $tickers
                MERGE (o)-[r:OBSERVES]->(c)
                SET r.created_at = datetime()
                RETURN count(r) as count
            """
            
            ticker_result = store.execute_write(link_ticker_query, {
                "obs_id": obs_internal_id,
                "tickers": request.related_tickers
            })
            
            if ticker_result:
                linked_count += ticker_result.get("count", 0)
        
        # Link to related events
        if request.related_events:
            link_event_query = """
                MATCH (o:Observation), (e:Event)
                WHERE id(o) = $obs_id AND id(e) IN $event_ids
                MERGE (o)-[r:RELATES_TO]->(e)
                SET r.created_at = datetime()
                RETURN count(r) as count
            """
            
            event_result = store.execute_write(link_event_query, {
                "obs_id": obs_internal_id,
                "event_ids": [int(eid) for eid in request.related_events]
            })
            
            if event_result:
                linked_count += event_result.get("count", 0)
        
        return ObservationResponse(
            status="created",
            observation_id=obs_id,
            linked_entities=linked_count
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add observation: {str(e)}")


@router.post("/hypothesis", response_model=HypothesisResponse)
async def add_hypothesis(
    request: HypothesisRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Record a hypothesis edge between entities.
    Includes confidence and optional expiration.
    """
    try:
        # Verify source and target exist
        source_query = f"MATCH (s:{request.source_label}) WHERE elementId(s) = $id RETURN s"
        target_query = f"MATCH (t:{request.target_label}) WHERE elementId(t) = $id RETURN t"
        
        source_exists = store.execute_read(source_query, {"id": str(request.source_id)})
        target_exists = store.execute_read(target_query, {"id": str(request.target_id)})
        
        if not source_exists:
            raise HTTPException(status_code=404, detail=f"Source node {request.source_id} not found")
        if not target_exists:
            raise HTTPException(status_code=404, detail=f"Target node {request.target_id} not found")
        
        # Create Hypothesis node (align with validation/pattern pipeline)
        hyp_id = str(uuid.uuid4())

        create_h_node = """
            CREATE (h:Hypothesis {
                id: $id,
                statement: $statement,
                source_entity_id: $source_entity_id,
                target_entity_id: $target_entity_id,
                relation_type: $relation_type,
                confidence: $confidence,
                created_at: datetime(),
                created_by: $created_by,
                manifold_thought_id: $manifold_thought_id,
                status: 'active',
                evidence_count: 0,
                contradiction_count: 0,
                validation_threshold: 3
            })
            RETURN h
        """

        store.execute_write(create_h_node, {
            "id": hyp_id,
            "statement": request.hypothesis,
            "source_entity_id": str(request.source_id),
            "target_entity_id": str(request.target_id),
            "relation_type": request.properties.get("relation_type", "RELATED_TO"),
            "confidence": request.confidence,
            "created_by": request.properties.get("created_by", "agent-unknown"),
            "manifold_thought_id": request.properties.get("manifold_thought_id")
        })

        # Optionally link to source/target nodes for traceability
        link_query = f"""
            MATCH (s:{request.source_label}) WHERE elementId(s) = $sid
            MATCH (t:{request.target_label}) WHERE elementId(t) = $tid
            MATCH (h:Hypothesis {{id: $hid}})
            MERGE (s)-[:SUBJECT_OF]->(h)
            MERGE (h)-[:PERTAINS_TO]->(t)
        """
        store.execute_write(link_query, {"sid": str(request.source_id), "tid": str(request.target_id), "hid": hyp_id})

        return HypothesisResponse(status="created", hypothesis_id=hyp_id, manifold_thought_id=request.properties.get("manifold_thought_id"), evidence_count=0, contradiction_count=0, validation_pending=False)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add hypothesis: {str(e)}")

