#!/usr/bin/env python3
"""
Populate Ariadne graph with rich test data for Advanced Decision Suite testing.
Creates realistic scenarios for Impact, Opportunities, Dedup, Confidence, Learning.
"""

from neo4j import GraphDatabase
import json
from datetime import datetime, timedelta
import random

NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "ariadne2025"

def clear_graph(driver):
    """Clear all nodes and relationships"""
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
        print("✓ Graph cleared")

def create_companies(driver):
    """Create 8 companies with various relationships"""
    companies = [
        {"ticker": "TSLA", "name": "Tesla Inc", "sector": "Automotive"},
        {"ticker": "NVDA", "name": "NVIDIA Corporation", "sector": "Semiconductors"},
        {"ticker": "AAPL", "name": "Apple Inc", "sector": "Electronics"},
        {"ticker": "MSFT", "name": "Microsoft Corporation", "sector": "Software"},
        {"ticker": "SIFY", "name": "Sify Inc", "sector": "Semiconductors"},  # Potential duplicate
        {"ticker": "INTEL", "name": "Intel Corporation", "sector": "Semiconductors"},
        {"ticker": "SUPPLIER_A", "name": "Advanced Semiconductor Supplier", "sector": "Manufacturing"},
        {"ticker": "SUPPLY_CHAIN_HUB", "name": "Global Supply Chain Hub", "sector": "Logistics"},
    ]
    
    with driver.session() as session:
        for c in companies:
            session.run(
                """
                CREATE (n:Company)
                SET n.ticker = $ticker,
                    n.name = $name,
                    n.sector = $sector,
                    n.created_at = datetime(),
                    n.updated_at = datetime(),
                    n.confidence_score = $conf_score
                """,
                {
                    "ticker": c["ticker"],
                    "name": c["name"],
                    "sector": c["sector"],
                    "conf_score": 0.85
                }
            )
        print(f"✓ Created {len(companies)} companies")

def create_events_and_observations(driver):
    """Create events and observations for learning feedback testing"""
    now = datetime.utcnow()
    
    events = [
        {"type": "SUPPLY_DISRUPTION", "description": "Chip shortage in Asia", "severity": 0.9},
        {"type": "EARNINGS", "description": "Q4 earnings beat", "severity": 0.7},
        {"type": "GEOPOLITICAL", "description": "Trade war escalation", "severity": 0.8},
        {"type": "PRODUCT_LAUNCH", "description": "New GPU lineup", "severity": 0.6},
        {"type": "SUPPLY_DISRUPTION", "description": "Secondary chip shortage", "severity": 0.85},
        {"type": "REGULATORY", "description": "Export restrictions", "severity": 0.75},
    ]
    
    observations = [
        {"ticker": "TSLA", "observation": "Lower Q4 delivery guidance", "date": (now - timedelta(days=5)).isoformat()},
        {"ticker": "NVDA", "observation": "Strong data center demand", "date": (now - timedelta(days=3)).isoformat()},
        {"ticker": "NVDA", "observation": "Export controls to China", "date": (now - timedelta(days=2)).isoformat()},
        {"ticker": "INTEL", "observation": "Fab utilization down", "date": (now - timedelta(days=1)).isoformat()},
        {"ticker": "AAPL", "observation": "Supplier concentration risk", "date": now.isoformat()},
        {"ticker": "SUPPLIER_A", "observation": "Production at 60% capacity", "date": (now - timedelta(days=4)).isoformat()},
        {"ticker": "SUPPLIER_A", "observation": "Production at 55% capacity", "date": (now - timedelta(days=2)).isoformat()},
        {"ticker": "SUPPLY_CHAIN_HUB", "observation": "Logistics delays worsening", "date": (now - timedelta(days=1)).isoformat()},
    ]
    
    with driver.session() as session:
        # Create events
        for i, e in enumerate(events):
            session.run(
                """
                CREATE (ev:Event)
                SET ev.event_id = $event_id,
                    ev.type = $type,
                    ev.description = $description,
                    ev.severity = $severity,
                    ev.occurred_at = datetime(),
                    ev.created_at = datetime()
                """,
                {
                    "event_id": f"event_{i}",
                    "type": e["type"],
                    "description": e["description"],
                    "severity": e["severity"]
                }
            )
        
        # Create observations
        for i, o in enumerate(observations):
            session.run(
                """
                MATCH (c:Company {ticker: $ticker})
                CREATE (obs:Observation)
                SET obs.observation_id = $obs_id,
                    obs.content = $observation,
                    obs.date = $date,
                    obs.created_at = datetime(),
                    obs.confidence = 0.7 + (rand() * 0.3)
                CREATE (c)-[:OBSERVED_IN]->(obs)
                """,
                {
                    "ticker": o["ticker"],
                    "obs_id": f"obs_{i}",
                    "observation": o["observation"],
                    "date": o["date"]
                }
            )
        
        print(f"✓ Created {len(events)} events and {len(observations)} observations")

def create_supply_chain_relationships(driver):
    """Create realistic supply chain relationships with varying confidence"""
    relationships = [
        # Primary supply chain (high confidence)
        {"from": "TSLA", "to": "NVDA", "type": "USES", "confidence": 0.95},
        {"from": "NVDA", "to": "INTEL", "type": "COMPETES_WITH", "confidence": 0.92},
        {"from": "INTEL", "to": "SUPPLIER_A", "type": "SUPPLIES_TO", "confidence": 0.88},
        {"from": "SUPPLIER_A", "to": "SUPPLY_CHAIN_HUB", "type": "DISTRIBUTES_TO", "confidence": 0.85},
        
        # Secondary relationships (medium confidence)
        {"from": "AAPL", "to": "NVDA", "type": "USES", "confidence": 0.75},
        {"from": "AAPL", "to": "INTEL", "type": "EVALUATES", "confidence": 0.65},
        {"from": "MSFT", "to": "NVDA", "type": "PARTNERSHIPS", "confidence": 0.72},
        {"from": "MSFT", "to": "SUPPLIER_A", "type": "INDIRECT_SUPPLIER", "confidence": 0.58},
        
        # Tertiary relationships (low confidence)
        {"from": "TSLA", "to": "AAPL", "type": "MARKET_COMPETITOR", "confidence": 0.45},
        {"from": "SIFY", "to": "INTEL", "type": "MARKET_COMPETITOR", "confidence": 0.42},
        {"from": "SUPPLY_CHAIN_HUB", "to": "AAPL", "type": "CUSTOMER", "confidence": 0.38},
        
        # Negative impact relationships (for risk scoring)
        {"from": "SUPPLIER_A", "to": "NVDA", "type": "HARMS", "confidence": 0.70},  # Supply issues
        {"from": "SUPPLY_CHAIN_HUB", "to": "INTEL", "type": "AFFECTS", "confidence": 0.65},
    ]
    
    with driver.session() as session:
        for rel in relationships:
            session.run(
                """
                MATCH (from:Company {ticker: $from})
                MATCH (to:Company {ticker: $to})
                CREATE (from)-[r:RELATES_TO]->(to)
                SET r.type = $rel_type,
                    r.confidence = $confidence,
                    r.created_at = datetime(),
                    r.updated_at = datetime(),
                    r.effect = CASE WHEN $rel_type IN ['HARMS', 'AFFECTS'] THEN 'negative' ELSE 'positive' END
                """,
                {
                    "from": rel["from"],
                    "to": rel["to"],
                    "rel_type": rel["type"],
                    "confidence": rel["confidence"]
                }
            )
        
        print(f"✓ Created {len(relationships)} relationships")

def create_hypotheses_and_patterns(driver):
    """Create hypotheses and patterns for richer data"""
    with driver.session() as session:
        # Create hypotheses
        hypotheses = [
            {
                "id": "hyp_1",
                "title": "Chip shortage will persist",
                "status": "pending",
                "confidence": 0.78
            },
            {
                "id": "hyp_2",
                "title": "NVIDIA revenue will exceed guidance",
                "status": "confirmed",
                "confidence": 0.92
            },
            {
                "id": "hyp_3",
                "title": "Intel will recover market share",
                "status": "pending",
                "confidence": 0.35
            }
        ]
        
        for h in hypotheses:
            session.run(
                """
                CREATE (hyp:Hypothesis)
                SET hyp.hypothesis_id = $id,
                    hyp.title = $title,
                    hyp.status = $status,
                    hyp.confidence = $confidence,
                    hyp.created_at = datetime()
                """,
                {
                    "id": h["id"],
                    "title": h["title"],
                    "status": h["status"],
                    "confidence": h["confidence"]
                }
            )
        
        print(f"✓ Created {len(hypotheses)} hypotheses")

def create_duplicate_scenarios(driver):
    """Create potential duplicates for dedup testing"""
    with driver.session() as session:
        # Create a near-duplicate of SIFY
        session.run(
            """
            CREATE (n:Company)
            SET n.ticker = "SIFY_DUPLICATE",
                n.name = "Sify Technologies Inc",
                n.sector = "Semiconductors",
                n.created_at = datetime(),
                n.updated_at = datetime(),
                n.confidence_score = 0.85
            """
        )
        
        # Create a duplicate of SUPPLIER_A with slightly different name
        session.run(
            """
            CREATE (n:Company)
            SET n.ticker = "SUPPLIER_A_ALT",
                n.name = "Advanced Semiconductor Manufacturing",
                n.sector = "Manufacturing",
                n.created_at = datetime(),
                n.updated_at = datetime(),
                n.confidence_score = 0.85
            """
        )
        
        print("✓ Created duplicate scenarios")

def create_gap_and_anomaly_scenarios(driver):
    """Create scenarios with gaps and anomalies for opportunity scoring"""
    with driver.session() as session:
        # Add low-confidence relationships to NVDA to create gaps
        session.run(
            """
            MATCH (n:Company {ticker: "NVDA"})
            MATCH (m:Company {ticker: "AAPL"})
            CREATE (n)-[r:UNCERTAIN_RELATION]->(m)
            SET r.confidence = 0.35,
                r.created_at = datetime(),
                r.updated_at = datetime()
            """
        )
        
        session.run(
            """
            MATCH (n:Company {ticker: "NVDA"})
            MATCH (m:Company {ticker: "MSFT"})
            CREATE (n)-[r:UNCERTAIN_RELATION]->(m)
            SET r.confidence = 0.42,
                r.created_at = datetime(),
                r.updated_at = datetime()
            """
        )
        
        # Create temporal spike scenario for SUPPLY_CHAIN_HUB
        now = datetime.utcnow()
        for i in range(5):
            session.run(
                """
                MATCH (n:Company {ticker: "SUPPLY_CHAIN_HUB"})
                MATCH (m:Company {ticker: $partner})
                CREATE (n)-[r:SPIKE_RELATION {idx: $idx}]->(m)
                SET r.confidence = 0.6,
                    r.created_at = $created_at,
                    r.updated_at = $created_at
                """,
                {
                    "partner": ["TSLA", "NVDA", "INTEL", "AAPL", "MSFT"][i],
                    "idx": i,
                    "created_at": (now - timedelta(days=30-i*10)).isoformat()
                }
            )
        
        print("✓ Created gap and anomaly scenarios")

def create_learning_scenario(driver):
    """Create repeated pattern for learning feedback testing"""
    with driver.session() as session:
        now = datetime.utcnow()
        
        # Create multiple observations for the same relation
        for i in range(5):
            session.run(
                """
                MATCH (c:Company {ticker: "TSLA"})
                CREATE (obs:Observation)
                SET obs.observation_id = $obs_id,
                    obs.content = "Supply chain impact continuing",
                    obs.date = $date,
                    obs.created_at = $date,
                    obs.confidence = 0.7
                CREATE (c)-[:OBSERVED_IN]->(obs)
                """,
                {
                    "obs_id": f"pattern_obs_{i}",
                    "date": (now - timedelta(days=7-i*1)).isoformat()
                }
            )
        
        print("✓ Created learning scenario with repeated patterns")

def verify_graph(driver):
    """Verify graph structure"""
    with driver.session() as session:
        results = session.run("""
            MATCH (n) RETURN labels(n)[0] as label, count(*) as count
            UNION ALL
            MATCH ()-[r]->() RETURN type(r) as label, count(*) as count
        """)
        
        print("\n✓ Graph Statistics:")
        for record in results:
            print(f"  {record['label']}: {record['count']}")

def main():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        print("\n" + "="*60)
        print("POPULATING ARIADNE GRAPH WITH TEST DATA")
        print("="*60 + "\n")
        
        clear_graph(driver)
        create_companies(driver)
        create_events_and_observations(driver)
        create_supply_chain_relationships(driver)
        create_hypotheses_and_patterns(driver)
        create_duplicate_scenarios(driver)
        create_gap_and_anomaly_scenarios(driver)
        create_learning_scenario(driver)
        
        print()
        verify_graph(driver)
        
        print("\n" + "="*60)
        print("✓ TEST DATA POPULATION COMPLETE")
        print("="*60 + "\n")
        
    finally:
        driver.close()

if __name__ == "__main__":
    main()
