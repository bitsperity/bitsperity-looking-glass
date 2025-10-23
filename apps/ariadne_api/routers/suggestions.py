"""
Suggestions Router
Provides autocomplete/dropdown data for frontend inputs
"""

from fastapi import APIRouter, Depends
from typing import List
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store

router = APIRouter(prefix="/v1/kg/suggestions", tags=["suggestions"])


@router.get("/tickers")
def get_ticker_suggestions(store: GraphStore = Depends(get_graph_store)) -> dict:
    """
    Get all unique tickers from Company nodes.
    Returns only tickers that actually exist in the graph.
    """
    query = """
    MATCH (c:Company)
    WHERE c.ticker IS NOT NULL
    RETURN DISTINCT c.ticker as ticker
    ORDER BY c.ticker
    """
    
    with store.driver.session() as session:
        result = session.run(query)
        tickers = [record["ticker"] for record in result]
    
    return {
        "status": "ok",
        "tickers": tickers,
        "count": len(tickers)
    }


@router.get("/topics")
def get_topic_suggestions(store: GraphStore = Depends(get_graph_store)) -> dict:
    """
    Get all unique topics/sectors/categories from the graph.
    Aggregates from:
    - Company.sector
    - Event.type
    - Concept nodes
    - Pattern.category
    """
    query = """
    // Get company sectors
    MATCH (c:Company)
    WHERE c.sector IS NOT NULL
    WITH collect(DISTINCT toLower(c.sector)) as sectors
    
    // Get event types
    MATCH (e:Event)
    WHERE e.type IS NOT NULL
    WITH sectors, collect(DISTINCT toLower(e.type)) as event_types
    
    // Get concept names
    OPTIONAL MATCH (co:Concept)
    WHERE co.name IS NOT NULL
    WITH sectors, event_types, collect(DISTINCT toLower(co.name)) as concepts
    
    // Get pattern categories
    OPTIONAL MATCH (p:Pattern)
    WHERE p.category IS NOT NULL
    WITH sectors, event_types, concepts, collect(DISTINCT toLower(p.category)) as categories
    
    // Combine all
    UNWIND (sectors + event_types + concepts + categories) as topic
    RETURN DISTINCT topic
    ORDER BY topic
    """
    
    with store.driver.session() as session:
        result = session.run(query)
        topics = [record["topic"] for record in result if record["topic"]]
    
    # Add generic fallbacks if empty
    if not topics:
        topics = ["technology", "finance", "industry"]
    
    return {
        "status": "ok",
        "topics": topics,
        "count": len(topics)
    }


@router.get("/event-types")
def get_event_type_suggestions(store: GraphStore = Depends(get_graph_store)) -> dict:
    """
    Get all unique event types from Event nodes.
    """
    query = """
    MATCH (e:Event)
    WHERE e.type IS NOT NULL
    RETURN DISTINCT e.type as event_type
    ORDER BY e.type
    """
    
    with store.driver.session() as session:
        result = session.run(query)
        event_types = [record["event_type"] for record in result]
    
    return {
        "status": "ok",
        "event_types": event_types,
        "count": len(event_types)
    }


@router.get("/sectors")
def get_sector_suggestions(store: GraphStore = Depends(get_graph_store)) -> dict:
    """
    Get all unique sectors from Company nodes.
    """
    query = """
    MATCH (c:Company)
    WHERE c.sector IS NOT NULL
    RETURN DISTINCT c.sector as sector, count(*) as company_count
    ORDER BY company_count DESC, c.sector
    """
    
    with store.driver.session() as session:
        result = session.run(query)
        sectors = [
            {"sector": record["sector"], "count": record["company_count"]}
            for record in result
        ]
    
    return {
        "status": "ok",
        "sectors": sectors,
        "count": len(sectors)
    }


@router.get("/relation-types")
def get_relation_type_suggestions(store: GraphStore = Depends(get_graph_store)) -> dict:
    """
    Get all unique relationship types in the graph.
    """
    query = """
    CALL db.relationshipTypes() YIELD relationshipType
    RETURN relationshipType
    ORDER BY relationshipType
    """
    
    with store.driver.session() as session:
        result = session.run(query)
        rel_types = [record["relationshipType"] for record in result]
    
    return {
        "status": "ok",
        "relation_types": rel_types,
        "count": len(rel_types)
    }


@router.get("/event-names")
def get_event_name_suggestions(store: GraphStore = Depends(get_graph_store)) -> dict:
    """
    Get all unique event titles/names from Event nodes.
    """
    query = """
    MATCH (e:Event)
    WHERE e.title IS NOT NULL
    RETURN DISTINCT e.title as event_name, e.type as event_type
    ORDER BY e.title
    """
    
    with store.driver.session() as session:
        result = session.run(query)
        events = [
            {"name": record["event_name"], "type": record["event_type"]}
            for record in result
        ]
    
    return {
        "status": "ok",
        "events": events,
        "count": len(events)
    }


@router.get("/company-names")
def get_company_name_suggestions(store: GraphStore = Depends(get_graph_store)) -> dict:
    """
    Get all company names and tickers.
    """
    query = """
    MATCH (c:Company)
    WHERE c.name IS NOT NULL
    RETURN c.name as name, c.ticker as ticker, c.sector as sector
    ORDER BY c.name
    """
    
    with store.driver.session() as session:
        result = session.run(query)
        companies = [
            {"name": record["name"], "ticker": record["ticker"], "sector": record["sector"]}
            for record in result
        ]
    
    return {
        "status": "ok",
        "companies": companies,
        "count": len(companies)
    }


@router.get("/pattern-categories")
def get_pattern_category_suggestions(store: GraphStore = Depends(get_graph_store)) -> dict:
    """
    Get all unique pattern categories.
    """
    query = """
    MATCH (p:Pattern)
    WHERE p.category IS NOT NULL
    RETURN DISTINCT p.category as category, count(*) as pattern_count
    ORDER BY pattern_count DESC, p.category
    """
    
    with store.driver.session() as session:
        result = session.run(query)
        categories = [record["category"] for record in result]
    
    return {
        "status": "ok",
        "categories": categories,
        "count": len(categories)
    }


@router.get("/regime-names")
def get_regime_name_suggestions(store: GraphStore = Depends(get_graph_store)) -> dict:
    """
    Get all regime names.
    """
    query = """
    MATCH (r:Regime)
    WHERE r.regime_name IS NOT NULL
    RETURN DISTINCT r.regime_name as regime_name
    ORDER BY r.regime_name
    """
    
    with store.driver.session() as session:
        result = session.run(query)
        regimes = [record["regime_name"] for record in result]
    
    return {
        "status": "ok",
        "regimes": regimes,
        "count": len(regimes)
    }

