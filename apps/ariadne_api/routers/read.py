"""
Read endpoints for querying the knowledge graph
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from libs.ariadne_core.models import (
    ContextResponse,
    ImpactResponse,
    TimelineResponse,
    SimilarEntitiesResponse,
    Node,
    Edge,
    Subgraph,
    Event,
    PriceEvent,
)
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store
from datetime import datetime
from typing import List

router = APIRouter()


@router.get("/context", response_model=ContextResponse)
async def get_context(
    topic: str | None = None,
    tickers: List[str] = Query(default=[]),
    as_of: datetime | None = None,
    depth: int = 2,
    limit: int = 200,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Get contextual subgraph for a topic or set of tickers.
    Returns nodes and edges with provenance.
    """
    if not topic and not tickers:
        raise HTTPException(status_code=400, detail="Either topic or tickers must be provided")

    # Normalize arbitrary Neo4j types (Date/DateTime) into JSONable values
    def _normalize(value):
        try:
            if value is None:
                return None
            if isinstance(value, (str, int, float, bool)):
                return value
            if isinstance(value, list):
                return [_normalize(v) for v in value]
            if isinstance(value, dict):
                return {k: _normalize(v) for k, v in value.items()}
            # Neo4j temporal types expose to_native()
            if hasattr(value, "to_native"):
                native = value.to_native()
                return native.isoformat() if hasattr(native, "isoformat") else native
            # Python datetime/date
            if hasattr(value, "isoformat"):
                return value.isoformat()
            return str(value)
        except Exception:
            return str(value)

    # Build time conditions for relationships if as_of provided
    r1_time_cond = ""
    r2_time_cond = ""
    if as_of:
        r1_time_cond = " WHERE ((r1.valid_from IS NULL OR r1.valid_from <= $as_of) AND (r1.valid_to IS NULL OR r1.valid_to >= $as_of))"
        r2_time_cond = " WHERE $depth >= 2 AND ((r2.valid_from IS NULL OR r2.valid_from <= $as_of) AND (r2.valid_to IS NULL OR r2.valid_to >= $as_of))"

    try:
        params: dict = {"limit": limit, "depth": depth}
        if as_of:
            params["as_of"] = as_of.isoformat()

        if tickers:
            params["tickers"] = tickers
            simple_query = (
                "MATCH (c:Company) WHERE c.ticker IN $tickers "
                "OPTIONAL MATCH (c)-[r1]-(n1)" + r1_time_cond + " "
                "OPTIONAL MATCH (n1)-[r2]-(n2)" + (r2_time_cond or " WHERE $depth >= 2") + " "
                "RETURN c, r1, n1, r2, n2 LIMIT $limit"
            )
        else:
            params["topic"] = topic.lower()
            simple_query = (
                "MATCH (n) "
                "WHERE ANY(prop IN ['sector', 'industry', 'name', 'description', 'ticker', 'title', 'type', 'category'] "
                "    WHERE prop IN keys(n) AND ("
                "        toLower(toString(n[prop])) CONTAINS $topic "
                "        OR toLower(replace(toString(n[prop]), '_', ' ')) CONTAINS replace($topic, '_', ' ') "
                "        OR toLower(replace(toString(n[prop]), ' ', '_')) CONTAINS replace($topic, ' ', '_')"
                "    )) "
                "OPTIONAL MATCH (n)-[r1]-(n1)" + r1_time_cond + " "
                "OPTIONAL MATCH (n1)-[r2]-(n2)" + (r2_time_cond or " WHERE $depth >= 2") + " "
                "RETURN n, r1, n1, r2, n2 LIMIT $limit"
            )

        results = store.execute_read(simple_query, params)

        # Extract unique nodes and edges
        nodes_dict: dict[str, Node] = {}
        edges_list: list[Edge] = []

        for record in results:
            for key, val in record.items():
                if val is None:
                    continue
                # Node
                if hasattr(val, "labels") and hasattr(val, "id"):
                    node_id = str(val.element_id)  # Use element_id for Neo4j 5.x compatibility
                    if node_id not in nodes_dict:
                        props = {k: _normalize(v) for k, v in dict(val).items()}
                        nodes_dict[node_id] = Node(
                            id=node_id,
                            label=list(val.labels)[0] if getattr(val, "labels", None) else "Unknown",
                            properties=props
                        )
                # Relationship
                elif hasattr(val, "type") and hasattr(val, "start_node") and hasattr(val, "end_node"):
                    props = {k: _normalize(v) for k, v in dict(val).items()}
                    edges_list.append(Edge(
                        source_id=str(val.start_node.element_id),
                        target_id=str(val.end_node.element_id),
                        rel_type=val.type,
                        properties=props
                    ))

        nodes = list(nodes_dict.values())

        query_str = topic if topic else f"tickers: {', '.join(tickers)}"
        summary = f"Found {len(nodes)} nodes and {len(edges_list)} edges for {query_str}"

        subgraph = Subgraph(nodes=nodes, edges=edges_list, summary=summary)

        return ContextResponse(
            query=query_str,
            subgraph=subgraph,
            as_of=as_of
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/impact", response_model=ImpactResponse)
async def get_impact(
    event_id: str | None = None,
    event_query: str | None = None,
    k: int = 10,
    as_of: datetime | None = None,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Rank entities impacted by an event.
    Uses edge weights and graph centrality.
    """
    # Normalizer für Neo4j Typen
    def _normalize(value):
        try:
            if value is None:
                return None
            if isinstance(value, (str, int, float, bool)):
                return value
            if isinstance(value, list):
                return [_normalize(v) for v in value]
            if isinstance(value, dict):
                return {k: _normalize(v) for k, v in value.items()}
            if hasattr(value, "to_native"):
                native = value.to_native()
                return native.isoformat() if hasattr(native, "isoformat") else native
            if hasattr(value, "isoformat"):
                return value.isoformat()
            return str(value)
        except Exception:
            return str(value)
    
    if not event_id and not event_query:
        raise HTTPException(status_code=400, detail="Either event_id or event_query must be provided")
    
    # Find the event
    if event_id:
        event_find_query = "MATCH (e:Event) WHERE id(e) = $event_id RETURN e"
        params = {"event_id": int(event_id)}
    else:
        event_find_query = "MATCH (e:Event) WHERE e.title CONTAINS $query RETURN e LIMIT 1"
        params = {"query": event_query}
    
    event_results = store.execute_read(event_find_query, params)
    
    if not event_results:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event_node = event_results[0]["e"]
    # Normalize event properties
    eprops = dict(event_node)
    occurred = eprops.get("occurred_at")
    try:
        if hasattr(occurred, "to_native"):
            occurred = occurred.to_native()
        elif hasattr(occurred, "isoformat"):
            occurred = occurred
        elif isinstance(occurred, str):
            occurred = datetime.fromisoformat(occurred.replace("Z", ""))
        else:
            occurred = datetime.utcnow()
    except Exception:
        occurred = datetime.utcnow()

    event_obj = Event(
        id=str(event_node.element_id),
        type=eprops.get("type", "unknown"),
        title=eprops.get("title", ""),
        occurred_at=occurred,
        description=eprops.get("description"),
        source=eprops.get("source"),
        confidence=eprops.get("confidence", 1.0)
    )
    # If as_of specified and event occurs after as_of, return empty impact
    if as_of and isinstance(as_of, datetime):
        try:
            if occurred and occurred > as_of:
                return ImpactResponse(event=event_obj, impacted_entities=[])
        except Exception:
            pass
    
    # Find impacted entities via AFFECTS and BENEFITS_FROM relationships
    impact_query = """
        MATCH (e:Event)-[r:AFFECTS|BENEFITS_FROM]->(target)
        WHERE elementId(e) = $event_element_id
        OPTIONAL MATCH (target)-[r2:AFFECTS|SUPPLIES_TO]-(indirect)
        WITH target, r,
             COALESCE(r.impact, r.confidence, 0.5) AS base,
             count(DISTINCT indirect) AS indirect_count
        WITH target, base, indirect_count, (base + 0.1 * indirect_count) AS score
        RETURN target, score AS impact, base AS confidence, indirect_count
        ORDER BY impact DESC, confidence DESC, indirect_count DESC
        LIMIT $k
    """
    
    impact_results = store.execute_read(impact_query, {
        "event_element_id": event_node.element_id,
        "k": k
    })
    
    impacted_entities = []
    for record in impact_results:
        target_node = record["target"]
        impacted_entities.append({
            "node": Node(
                id=str(target_node.element_id),
                label=list(target_node.labels)[0] if target_node.labels else "Unknown",
                properties={k: _normalize(v) for k, v in dict(target_node).items()}
            ),
            "impact": record.get("impact", 0.5),
            "paths": record.get("indirect_count", 0)
        })
    
    return ImpactResponse(
        event=event_obj,
        impacted_entities=impacted_entities
    )


@router.get("/timeline", response_model=TimelineResponse)
async def get_timeline(
    entity_id: str | None = None,
    ticker: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Get timeline of events and price events for an entity.
    """
    if not entity_id and not ticker:
        raise HTTPException(status_code=400, detail="Either entity_id or ticker must be provided")
    
    # Find the entity
    if ticker:
        entity_query = "MATCH (c:Company {ticker: $ticker}) RETURN c"
        params = {"ticker": ticker}
    else:
        entity_query = "MATCH (n) WHERE id(n) = $entity_id RETURN n"
        params = {"entity_id": int(entity_id)}
    
    entity_results = store.execute_read(entity_query, params)
    
    if not entity_results:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    entity_node = entity_results[0].get("c") or entity_results[0].get("n")
    # Normalizer for neo4j temporal/property values
    def _normalize(value):
        try:
            if value is None:
                return None
            if isinstance(value, (str, int, float, bool)):
                return value
            if isinstance(value, list):
                return [_normalize(v) for v in value]
            if isinstance(value, dict):
                return {k: _normalize(v) for k, v in value.items()}
            if hasattr(value, "to_native"):
                native = value.to_native()
                return native.isoformat() if hasattr(native, "isoformat") else native
            if hasattr(value, "isoformat"):
                return value.isoformat()
            return str(value)
        except Exception:
            return str(value)

    entity = Node(
        id=str(entity_node.element_id),
        label=list(entity_node.labels)[0] if entity_node.labels else "Unknown",
        properties={k: _normalize(v) for k, v in dict(entity_node).items()}
    )
    
    # Build time filter
    time_filter = ""
    if from_date:
        time_filter += " AND e.occurred_at >= datetime($from_date)"
        params["from_date"] = from_date.isoformat() if hasattr(from_date, "isoformat") else str(from_date)
    if to_date:
        time_filter += " AND e.occurred_at <= datetime($to_date)"
        params["to_date"] = to_date.isoformat() if hasattr(to_date, "isoformat") else str(to_date)
    
    # Get events
    events_query = f"""
        MATCH (entity)-[:MENTIONS|AFFECTS]-(e:Event)
        WHERE id(entity) = $entity_id {time_filter}
        RETURN e
        ORDER BY e.occurred_at DESC
    """
    params["entity_id"] = entity_node.id
    
    events_results = store.execute_read(events_query, params)

    def _to_dt(val):
        try:
            if hasattr(val, "to_native"):
                return val.to_native()
            if isinstance(val, str):
                return datetime.fromisoformat(val.replace("Z", ""))
            if hasattr(val, "isoformat"):
                return val
        except Exception:
            pass
        return datetime.utcnow()

    events = []
    for record in events_results:
        e_node = record["e"]
        e_props = dict(e_node)
        events.append(
            Event(
                id=str(e_node.element_id),
                type=e_props.get("type", "unknown"),
                title=e_props.get("title", ""),
                occurred_at=_to_dt(e_props.get("occurred_at")),
                description=e_props.get("description"),
                source=e_props.get("source"),
                confidence=e_props.get("confidence", 1.0)
            )
        )
    
    # Get price events
    price_events_time = time_filter.replace('e.occurred_at', 'pe.occurred_at')
    # Ensure datetime() in replaced filter as well
    price_events_time = price_events_time.replace('datetime($from_date)', 'datetime($from_date)')
    price_events_time = price_events_time.replace('datetime($to_date)', 'datetime($to_date)')
    price_events_query = f"""
        MATCH (i:Instrument)-[:PRICE_EVENT_OF]-(pe:PriceEvent)
        WHERE i.symbol = $symbol {price_events_time}
        RETURN pe
        ORDER BY pe.occurred_at DESC
    """
    params["symbol"] = entity.properties.get("ticker", "")
    
    price_events_results = store.execute_read(price_events_query, params)
    price_events = []
    for record in price_events_results:
        pe_node = record["pe"]
        pe_props = dict(pe_node)
        price_events.append(
            PriceEvent(
                id=str(pe_node.element_id),
                symbol=pe_props.get("symbol", ""),
                event_type=pe_props.get("event_type", "unknown"),
                occurred_at=_to_dt(pe_props.get("occurred_at")),
                properties={k: _normalize(v) for k, v in pe_props.items()},
                source=pe_props.get("source", "price_detector"),
                confidence=pe_props.get("confidence", 1.0)
            )
        )
    
    # Get relations that changed in time window
    relations_query = f"""
        MATCH (entity)-[r]-(other)
        WHERE id(entity) = $entity_id
        AND r.valid_from IS NOT NULL
        {time_filter.replace('e.occurred_at', 'r.valid_from')}
        RETURN r, other
        ORDER BY r.valid_from DESC
    """
    
    relations_results = store.execute_read(relations_query, params)
    relations = []
    for record in relations_results:
        rel = record["r"]
        relations.append(
            Edge(
                source_id=str(rel.start_node.element_id),
                target_id=str(rel.end_node.element_id),
                rel_type=rel.type,
                properties={k: _normalize(v) for k, v in dict(rel).items()}
            )
        )
    
    return TimelineResponse(
        entity=entity,
        events=events,
        price_events=price_events,
        relations=relations
    )


@router.get("/similar-entities", response_model=SimilarEntitiesResponse)
async def get_similar_entities(
    ticker: str,
    method: str = "weighted_jaccard",  # "weighted_jaccard" | "gds"
    limit: int = 10,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Ähnliche Unternehmen über gewichtete Nachbarschaft oder optional GDS NodeSimilarity.
    """
    # Normalizer für Neo4j Typen (z. B. DateTime)
    def _normalize(value):
        try:
            if value is None:
                return None
            if isinstance(value, (str, int, float, bool)):
                return value
            if isinstance(value, list):
                return [_normalize(v) for v in value]
            if isinstance(value, dict):
                return {k: _normalize(v) for k, v in value.items()}
            if hasattr(value, "to_native"):
                native = value.to_native()
                return native.isoformat() if hasattr(native, "isoformat") else native
            if hasattr(value, "isoformat"):
                return value.isoformat()
            return str(value)
        except Exception:
            return str(value)
    # Quelle finden
    source_query = "MATCH (c:Company {ticker: $ticker}) RETURN c"
    source_results = store.execute_read(source_query, {"ticker": ticker})
    if not source_results:
        raise HTTPException(status_code=404, detail="Company not found")

    source_node = source_results[0]["c"]
    source = Node(
        id=str(source_node.element_id),
        label="Company",
        properties={k: _normalize(v) for k, v in dict(source_node).items()}
    )

    # Optional: GDS NodeSimilarity
    if method.lower() == "gds":
        try:
            # Prüfe GDS
            gds_check = store.execute_read("RETURN gds.version() AS version", {})
            if gds_check:
                # Projektieren (nur Company-Kanten, sinnvoll gewichtet)
                try:
                    store.execute_write("CALL gds.graph.drop('similarity-graph')", {})
                except Exception:
                    pass

                project = """
                    CALL gds.graph.project(
                        'similarity-graph',
                        'Company',
                        {
                            COMPETES_WITH: {orientation: 'UNDIRECTED'},
                            SUPPLIES_TO: {orientation: 'UNDIRECTED'},
                            CORRELATED_WITH: {orientation: 'UNDIRECTED'}
                        }
                    )
                """
                store.execute_write(project, {})

                stream_query = (
                    "CALL gds.nodeSimilarity.stream('similarity-graph') "
                    "YIELD node1, node2, similarity "
                    "WITH gds.util.asNode(node1) AS n1, gds.util.asNode(node2) AS n2, similarity "
                    "WHERE n1.ticker = $ticker "
                    "RETURN n2 AS similar, similarity "
                    "ORDER BY similarity DESC LIMIT $limit"
                )
                gds_results = store.execute_read(stream_query, {"ticker": ticker, "limit": limit})

                similar = []
                for record in gds_results:
                    sim_node = record["similar"]
                    similar.append({
                        "node": Node(
                            id=str(sim_node.element_id),
                            label="Company",
                            properties={k: _normalize(v) for k, v in dict(sim_node).items()}
                        ),
                        "similarity": float(record.get("similarity", 0.0)),
                        "shared_relations": None
                    })

                # Aufräumen
                store.execute_write("CALL gds.graph.drop('similarity-graph')", {})

                return SimilarEntitiesResponse(source=source, similar=similar)
        except Exception:
            # Fallback auf weighted_jaccard
            pass

    # Gewichtete Jaccard-Ähnlichkeit über gemeinsame Nachbarn
    weight_map = {
        "COMPETES_WITH": 1.0,
        "SUPPLIES_TO": 1.6,
        "AFFECTS": 1.2,
        "CORRELATED_WITH": 1.8,
        "BENEFITS_FROM": 0.9,
        "MENTIONS": 0.2,
    }

    similarity_query = """
        MATCH (source:Company {ticker: $ticker})-[r1]-(shared)
        MATCH (similar:Company)-[r2]-(shared)
        WHERE source <> similar
        WITH similar,
             collect(type(r1)) as rel_types_source,
             collect(type(r2)) as rel_types_similar,
             count(DISTINCT shared) as shared_count
        RETURN similar, rel_types_source, rel_types_similar, shared_count
        ORDER BY shared_count DESC
        LIMIT $limit
    """
    results = store.execute_read(similarity_query, {"ticker": ticker, "limit": max(limit, 5)})

    def sum_weights(types: list[str]) -> float:
        return float(sum(weight_map.get(t, 0.5) for t in types))

    source_sector = source.properties.get("sector") if isinstance(source.properties, dict) else None
    similar = []
    for record in results:
        sim_node = record["similar"]
        rel_src = record.get("rel_types_source", [])
        rel_sim = record.get("rel_types_similar", [])
        w_src = sum_weights(rel_src)
        w_sim = sum_weights(rel_sim)
        w_overlap = min(w_src, w_sim)
        w_union = (w_src + w_sim - w_overlap) if (w_src + w_sim - w_overlap) > 0 else (w_src + w_sim + 1e-9)
        score = max(0.0, min(1.0, w_overlap / w_union))

        # Bonus für gleichen Sektor (nützliche Heuristik)
        try:
            sim_sector = dict(sim_node).get("sector")
            if source_sector and sim_sector and source_sector == sim_sector:
                score = min(1.0, score + 0.1)
        except Exception:
            pass

        similar.append({
            "node": Node(
                id=str(sim_node.element_id),
                label="Company",
                properties={k: _normalize(v) for k, v in dict(sim_node).items()}
            ),
            "similarity": float(score),
            "shared_relations": int(record.get("shared_count", 0))
        })

    # Sortiere erneut nach Score, trimm auf Limit
    similar.sort(key=lambda x: x["similarity"], reverse=True)
    similar = similar[:limit]

    return SimilarEntitiesResponse(source=source, similar=similar)


@router.get("/patterns")
async def search_patterns(
    category: str | None = None,
    min_confidence: float = 0.7,
    min_occurrences: int = 1,
    store: GraphStore = Depends(get_graph_store)
):
    """Search validated patterns by criteria"""
    try:
        where_clauses = []
        params = {}
        
        if category:
            where_clauses.append("p.category = $category")
            params["category"] = category
        
        where_clauses.append("p.confidence >= $min_confidence")
        params["min_confidence"] = min_confidence
        
        where_clauses.append("p.occurrences >= $min_occurrences")
        params["min_occurrences"] = min_occurrences
        
        where_clause = " AND ".join(where_clauses) if where_clauses else "true"
        
        query = f"""
            MATCH (p:Pattern)
            WHERE {where_clause}
            RETURN p
            ORDER BY COALESCE(p.confidence, 0) DESC, COALESCE(p.occurrences, 0) DESC
            LIMIT 50
        """
        
        results = store.execute_read(query, params)
        
        patterns = []
        for record in results:
            p_data = dict(record["p"])
            patterns.append({
                "id": p_data.get("id"),
                "name": p_data.get("name"),
                "description": p_data.get("description"),
                "category": p_data.get("category"),
                "confidence": p_data.get("confidence"),
                "validated_at": p_data.get("validated_at"),
                "validated_by": p_data.get("validated_by"),
                "occurrences": p_data.get("occurrences", 0),
                "success_rate": p_data.get("success_rate"),
                "manifold_source_id": p_data.get("manifold_source_id")
            })
        
        return {
            "status": "success",
            "count": len(patterns),
            "patterns": patterns
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search patterns: {str(e)}")


@router.get("/patterns/{pattern_id}/occurrences")
async def get_pattern_occurrences(
    pattern_id: str,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    store: GraphStore = Depends(get_graph_store)
):
    """Get historical occurrences of pattern with outcomes"""
    try:
        # Get pattern
        pattern_query = """
            MATCH (p:Pattern {id: $pattern_id})
            RETURN p
        """
        pattern_result = store.execute_read(pattern_query, {"pattern_id": pattern_id})
        
        if not pattern_result:
            raise HTTPException(status_code=404, detail=f"Pattern {pattern_id} not found")
        
        pattern_data = dict(pattern_result[0]["p"])
        
        # Get events where pattern was observed
        time_filter = ""
        params = {"pattern_id": pattern_id}
        
        if from_date:
            time_filter += " AND e.occurred_at >= $from_date"
            params["from_date"] = from_date.isoformat()
        
        if to_date:
            time_filter += " AND e.occurred_at <= $to_date"
            params["to_date"] = to_date.isoformat()
        
        occurrences_query = f"""
            MATCH (p:Pattern {{id: $pattern_id}})-[:VALIDATES]->(e:Event)
            WHERE true {time_filter}
            RETURN e
            ORDER BY e.occurred_at DESC
            LIMIT 100
        """
        
        occurrence_results = store.execute_read(occurrences_query, params)
        
        occurrences = [
            {
                "event_id": dict(res["e"]).get("id"),
                "title": dict(res["e"]).get("title"),
                "occurred_at": dict(res["e"]).get("occurred_at"),
                "outcome": dict(res["e"]).get("outcome")
            }
            for res in occurrence_results
        ]
        
        return {
            "pattern": pattern_data,
            "occurrences": occurrences,
            "count": len(occurrences)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pattern occurrences: {str(e)}")


@router.get("/regimes/current")
async def get_current_regime(
    store: GraphStore = Depends(get_graph_store)
):
    """Get current market regime(s)"""
    try:
        query = """
            MATCH (r:Regime)
            WHERE r.end_date IS NULL OR r.end_date >= date()
            RETURN r
            ORDER BY r.start_date DESC
            LIMIT 5
        """
        
        results = store.execute_read(query, {})
        
        regimes = []
        for record in results:
            r_data = dict(record["r"])
            regimes.append({
                "id": r_data.get("id"),
                "name": r_data.get("name"),
                "type": r_data.get("type"),
                "characteristics": r_data.get("characteristics", []),
                "start_date": r_data.get("start_date"),
                "end_date": r_data.get("end_date"),
                "confidence": r_data.get("confidence")
            })
        
        return {
            "status": "success",
            "count": len(regimes),
            "regimes": regimes
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get current regime: {str(e)}")


@router.get("/regimes/similar")
async def find_similar_regimes(
    characteristics: List[str] = Query(default=[]),
    limit: int = 5,
    store: GraphStore = Depends(get_graph_store)
):
    """Find historical regimes with similar characteristics"""
    try:
        if not characteristics:
            raise HTTPException(status_code=400, detail="At least one characteristic must be provided")
        
        query = """
            MATCH (r:Regime)
            WHERE ANY(char IN $characteristics WHERE char IN r.characteristics)
            WITH r, SIZE([char IN $characteristics WHERE char IN r.characteristics]) AS match_count
            RETURN r, match_count
            ORDER BY match_count DESC, r.confidence DESC
            LIMIT $limit
        """
        
        results = store.execute_read(query, {
            "characteristics": characteristics,
            "limit": limit
        })
        
        similar_regimes = []
        for record in results:
            r_data = dict(record["r"])
            similar_regimes.append({
                "id": r_data.get("id"),
                "name": r_data.get("name"),
                "type": r_data.get("type"),
                "characteristics": r_data.get("characteristics", []),
                "start_date": r_data.get("start_date"),
                "end_date": r_data.get("end_date"),
                "confidence": r_data.get("confidence"),
                "match_count": record["match_count"]
            })
        
        return {
            "status": "success",
            "query_characteristics": characteristics,
            "count": len(similar_regimes),
            "regimes": similar_regimes
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find similar regimes: {str(e)}")


# ==============================================================================
# PHASE 1: FUNDAMENT - Search, Path, Time-Slice Endpoints
# ==============================================================================

@router.get("/search")
async def search_nodes(
    text: str = Query(..., min_length=1, description="Suchtext"),
    labels: str | None = Query(None, description="Komma-separierte Node-Labels (z.B. 'Company,Event')"),
    limit: int = Query(10, ge=1, le=100),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Freie Textsuche über alle Nodes via Fulltext-Index.
    
    Args:
        text: Suchtext
        labels: Optional Filter auf bestimmte Node-Labels
        limit: Max. Anzahl Ergebnisse
    
    Returns:
        Liste von Nodes mit Score
    """
    try:
        query = """
            CALL db.index.fulltext.queryNodes('nodeFulltext', $text)
            YIELD node, score
            RETURN node, score
            ORDER BY score DESC
            LIMIT $limit
        """
        
        results = store.execute_read(query, {
            "text": text,
            "limit": limit
        })
        
        nodes = []
        for record in results:
            node = dict(record["node"])
            nodes.append({
                "id": node.get("id"),
                "label": record["node"].labels[0] if record["node"].labels else "Unknown",
                "name": node.get("name") or node.get("title"),
                "score": record["score"],
                "properties": node
            })
        
        return {
            "status": "success",
            "query": text,
            "count": len(nodes),
            "results": nodes
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/path")
async def find_path(
    from_id: str = Query(..., description="Start Node ID"),
    to_id: str = Query(..., description="End Node ID"),
    max_hops: int = Query(5, ge=1, le=20),
    algo: str = Query("shortest", regex="^(shortest|ksp)$"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Finde Pfade zwischen zwei Nodes mittels APOC.
    
    Args:
        from_id: Start Node
        to_id: End Node
        max_hops: Max. Hop-Länge
        algo: 'shortest' oder 'ksp' (k-shortest paths)
    
    Returns:
        Liste von Pfaden mit Nodes und Edges
    """
    try:
        # APOC path expansion mit flexiblem Filter
        query = """
            MATCH (start), (end)
            WHERE id(start) = $from_id AND id(end) = $to_id
            CALL apoc.path.expandConfig(start, {
                relationshipFilter: '',
                minLevel: 1,
                maxLevel: $max_hops,
                bfs: true,
                uniqueness: 'NODE_GLOBAL'
            }) YIELD path
            WHERE end IN nodes(path)
            RETURN path
            LIMIT 10
        """
        
        results = store.execute_read(query, {
            "from_id": int(from_id) if from_id.isdigit() else from_id,
            "to_id": int(to_id) if to_id.isdigit() else to_id,
            "max_hops": max_hops
        })
        
        paths = []
        for record in results:
            path = record["path"]
            nodes = [dict(n) for n in path.nodes]
            edges = [{"type": r.type, "properties": dict(r)} for r in path.relationships]
            paths.append({
                "length": len(path),
                "nodes": nodes,
                "edges": edges
            })
        
        return {
            "status": "success",
            "from": from_id,
            "to": to_id,
            "path_count": len(paths),
            "paths": paths
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Path finding failed: {str(e)}")


@router.get("/time-slice")
async def get_time_slice(
    as_of: str = Query(..., description="ISO datetime (z.B. '2025-01-15T12:00:00')"),
    topic: str | None = Query(None),
    tickers: str | None = Query(None, description="Komma-separierte Tickers"),
    limit: int = Query(100, ge=1, le=1000),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Hole Graph-Snapshot zu einem bestimmten Zeitpunkt via valid_from/valid_to.
    
    Args:
        as_of: ISO datetime für Snapshot
        topic: Optional Topic-Filter
        tickers: Optional Ticker-Filter (komma-separiert)
        limit: Max. Kanten im Snapshot
    
    Returns:
        Subgraph zum Zeitpunkt (Nodes und Edges im valid time window)
    """
    try:
        # Parse datetime
        datetime.fromisoformat(as_of)
        
        query = """
            MATCH (source)-[r]->(target)
            WHERE (r.valid_from IS NULL OR r.valid_from <= $as_of)
              AND (r.valid_to IS NULL OR r.valid_to >= $as_of)
            RETURN source, r, target
            LIMIT $limit
        """
        
        results = store.execute_read(query, {
            "as_of": as_of,
            "limit": limit
        })
        
        nodes = {}
        edges = []
        
        for record in results:
            source = dict(record["source"])
            target = dict(record["target"])
            rel = dict(record["r"])
            
            # Deduplicate nodes by ID
            sid = source.get("id", str(id(record["source"])))
            tid = target.get("id", str(id(record["target"])))
            
            nodes[sid] = source
            nodes[tid] = target
            edges.append({
                "type": record["r"].type,
                "source": sid,
                "target": tid,
                "properties": rel
            })
        
        return {
            "status": "success",
            "as_of": as_of,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "nodes": list(nodes.values()),
            "edges": edges
        }
    
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO format: YYYY-MM-DDTHH:MM:SS")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Time-slice query failed: {str(e)}")

