#!/usr/bin/env python3
"""
Ariadne Demo Graph Creator

Erstellt einen umfassenden, realistischen Knowledge Graph der ALLE Ariadne-Features demonstriert:

Szenario: "The AI Semiconductor Supply Chain Crisis & Recovery (2023-2025)"

## Was wird demonstriert:

### 1. Temporal Graph (Vergangenheit & Gegenwart)
- Events mit valid_from/valid_to
- Zeitliche Entwicklung von Beziehungen
- Historische Pattern-Erkennung

### 2. Supply Chain Network
- Company → SUPPLIES_TO → Company Beziehungen
- Multi-Hop Dependencies
- Impact Propagation Analysis

### 3. Market Events & Reactions
- Geopolitische Events (Taiwan, Export Controls)
- Technische Events (neue Produkte, Durchbrüche)
- Price Events (Breakouts, Crashes)

### 4. Hypothesis Workflow
- Hypothesen über zukünftige Entwicklungen
- Evidence-Sammlung
- Validation → Pattern Extraction

### 5. Correlations
- CORRELATES_WITH zwischen Stocks
- Sector-based clustering
- Community Detection

### 6. Regimes
- Bull/Bear Market Phases
- Volatility Regimes
- Regime Transitions

### 7. Observations
- Agent-generated insights
- News-based observations
- Technical signal observations

Das Ergebnis: Ein "anfassbarer" Graph der zeigt wie Ariadne komplexe,
temporale, multi-dimensionale Beziehungen modelliert und analysiert.
"""

import os
import asyncio
from datetime import datetime, timedelta
from neo4j import GraphDatabase

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")


class DemoGraphCreator:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def create_companies(self):
        """Create semiconductor supply chain companies."""
        print("Creating companies...")
        with self.driver.session() as session:
            companies = [
                # Design
                {"ticker": "NVDA", "name": "NVIDIA Corporation", "sector": "GPU Design", "country": "USA"},
                {"ticker": "AMD", "name": "Advanced Micro Devices", "sector": "GPU Design", "country": "USA"},
                {"ticker": "INTC", "name": "Intel Corporation", "sector": "CPU Design", "country": "USA"},
                {"ticker": "QCOM", "name": "Qualcomm", "sector": "Mobile SoC", "country": "USA"},
                
                # Foundries
                {"ticker": "TSM", "name": "TSMC", "sector": "Foundry", "country": "Taiwan"},
                {"ticker": "SMSN", "name": "Samsung Electronics", "sector": "Foundry", "country": "South Korea"},
                
                # Equipment
                {"ticker": "ASML", "name": "ASML Holding", "sector": "Lithography", "country": "Netherlands"},
                {"ticker": "LRCX", "name": "Lam Research", "sector": "Etch Equipment", "country": "USA"},
                {"ticker": "KLAC", "name": "KLA Corporation", "sector": "Inspection", "country": "USA"},
                {"ticker": "AMAT", "name": "Applied Materials", "sector": "Deposition", "country": "USA"},
                
                # Materials
                {"ticker": "MU", "name": "Micron Technology", "sector": "Memory", "country": "USA"},
                
                # Consumers
                {"ticker": "MSFT", "name": "Microsoft", "sector": "Cloud/AI", "country": "USA"},
                {"ticker": "GOOGL", "name": "Alphabet", "sector": "Cloud/AI", "country": "USA"},
                {"ticker": "META", "name": "Meta Platforms", "sector": "Social/AI", "country": "USA"},
                {"ticker": "AMZN", "name": "Amazon", "sector": "Cloud/AI", "country": "USA"},
            ]
            
            for company in companies:
                session.run("""
                    MERGE (c:Company {ticker: $ticker})
                    SET c.name = $name,
                        c.sector = $sector,
                        c.country = $country,
                        c.created_at = datetime()
                """, **company)
        
        print(f"✓ Created {len(companies)} companies")

    def create_supply_chain(self):
        """Create temporal supply chain relationships."""
        print("Creating supply chain...")
        with self.driver.session() as session:
            # Equipment → Foundries
            relations = [
                # Equipment supplies to foundries
                ("ASML", "TSM", "SUPPLIES_TO", "2020-01-01", None, 0.95, "EUV lithography systems"),
                ("ASML", "SMSN", "SUPPLIES_TO", "2020-01-01", None, 0.90, "EUV lithography systems"),
                ("LRCX", "TSM", "SUPPLIES_TO", "2019-01-01", None, 0.85, "Etch equipment"),
                ("KLAC", "TSM", "SUPPLIES_TO", "2019-01-01", None, 0.90, "Inspection tools"),
                ("AMAT", "TSM", "SUPPLIES_TO", "2019-01-01", None, 0.88, "Deposition equipment"),
                
                # Foundries supply to designers
                ("TSM", "NVDA", "SUPPLIES_TO", "2020-01-01", None, 0.98, "7nm/5nm/3nm fabrication"),
                ("TSM", "AMD", "SUPPLIES_TO", "2020-01-01", None, 0.95, "7nm/5nm fabrication"),
                ("TSM", "QCOM", "SUPPLIES_TO", "2019-01-01", None, 0.90, "Mobile SoC fabrication"),
                ("SMSN", "QCOM", "SUPPLIES_TO", "2020-01-01", None, 0.75, "Mobile SoC fabrication"),
                
                # Designers supply to cloud providers
                ("NVDA", "MSFT", "SUPPLIES_TO", "2021-01-01", None, 0.95, "H100/A100 GPUs for AI"),
                ("NVDA", "GOOGL", "SUPPLIES_TO", "2021-01-01", None, 0.95, "H100/A100 GPUs for AI"),
                ("NVDA", "META", "SUPPLIES_TO", "2022-01-01", None, 0.90, "H100 GPUs for AI"),
                ("NVDA", "AMZN", "SUPPLIES_TO", "2021-01-01", None, 0.92, "H100/A100 GPUs for AI"),
                ("AMD", "MSFT", "SUPPLIES_TO", "2022-01-01", None, 0.70, "MI300 GPUs for AI"),
                
                # Memory
                ("MU", "NVDA", "SUPPLIES_TO", "2020-01-01", None, 0.85, "HBM3 memory"),
                ("MU", "AMD", "SUPPLIES_TO", "2021-01-01", None, 0.80, "HBM3 memory"),
            ]
            
            for src, tgt, rel_type, valid_from, valid_to, conf, desc in relations:
                session.run("""
                    MATCH (a:Company {ticker: $src})
                    MATCH (b:Company {ticker: $tgt})
                    CREATE (a)-[r:SUPPLIES_TO]->(b)
                    SET r.valid_from = datetime($valid_from),
                        r.valid_to = CASE WHEN $valid_to IS NOT NULL THEN datetime($valid_to) ELSE NULL END,
                        r.confidence = $conf,
                        r.description = $desc,
                        r.created_at = datetime()
                """, src=src, tgt=tgt, valid_from=valid_from, valid_to=valid_to, conf=conf, desc=desc)
        
        print(f"✓ Created {len(relations)} supply chain relationships")

    def create_competition(self):
        """Create competition relationships."""
        print("Creating competition...")
        with self.driver.session() as session:
            competitions = [
                ("NVDA", "AMD", "AI GPU market", 0.95),
                ("TSM", "SMSN", "Advanced node foundry", 0.90),
                ("LRCX", "AMAT", "Etch equipment", 0.75),
                ("MSFT", "GOOGL", "Cloud AI services", 0.92),
                ("MSFT", "AMZN", "Cloud infrastructure", 0.90),
            ]
            
            for src, tgt, market, conf in competitions:
                session.run("""
                    MATCH (a:Company {ticker: $src})
                    MATCH (b:Company {ticker: $tgt})
                    CREATE (a)-[r:COMPETES_WITH]->(b)
                    SET r.market = $market,
                        r.confidence = $conf,
                        r.created_at = datetime()
                """, src=src, tgt=tgt, market=market, conf=conf)
        
        print(f"✓ Created {len(competitions)} competition relationships")

    def create_events(self):
        """Create major events affecting the supply chain."""
        print("Creating events...")
        with self.driver.session() as session:
            events = [
                {
                    "id": "us_export_controls_2023",
                    "type": "Geopolitical",
                    "title": "US Export Controls on Advanced AI Chips to China",
                    "description": "Biden administration expands restrictions on chip exports",
                    "occurred_at": "2023-10-17",
                    "severity": "high",
                    "region": "Global",
                },
                {
                    "id": "nvidia_h100_launch",
                    "type": "Product Launch",
                    "title": "NVIDIA H100 Tensor Core GPU Launch",
                    "description": "Next-gen AI accelerator with 4x performance boost",
                    "occurred_at": "2022-03-22",
                    "severity": "medium",
                    "region": "Global",
                },
                {
                    "id": "taiwan_earthquake_2024",
                    "type": "Natural Disaster",
                    "title": "Taiwan Earthquake Disrupts TSMC Production",
                    "description": "7.4 magnitude earthquake near Hualien affects fabs",
                    "occurred_at": "2024-04-03",
                    "severity": "medium",
                    "region": "Taiwan",
                },
                {
                    "id": "openai_gpt4_launch",
                    "type": "AI Breakthrough",
                    "title": "OpenAI Launches GPT-4",
                    "description": "Massive surge in AI compute demand",
                    "occurred_at": "2023-03-14",
                    "severity": "high",
                    "region": "Global",
                },
                {
                    "id": "chips_act_funding",
                    "type": "Policy",
                    "title": "US CHIPS Act Funding Announced",
                    "description": "$52B funding for domestic semiconductor manufacturing",
                    "occurred_at": "2023-08-09",
                    "severity": "medium",
                    "region": "USA",
                },
            ]
            
            for event in events:
                session.run("""
                    CREATE (e:Event {id: $id})
                    SET e.type = $type,
                        e.title = $title,
                        e.description = $description,
                        e.occurred_at = datetime($occurred_at),
                        e.severity = $severity,
                        e.region = $region,
                        e.created_at = datetime()
                """, **event)
        
        print(f"✓ Created {len(events)} events")

    def create_event_impacts(self):
        """Link events to affected companies."""
        print("Creating event impacts...")
        with self.driver.session() as session:
            impacts = [
                # Export controls
                ("us_export_controls_2023", "NVDA", "AFFECTS", 0.95, "Revenue loss from China market"),
                ("us_export_controls_2023", "AMD", "AFFECTS", 0.90, "Revenue loss from China market"),
                ("us_export_controls_2023", "INTC", "AFFECTS", 0.80, "China manufacturing restrictions"),
                
                # H100 launch
                ("nvidia_h100_launch", "NVDA", "BENEFITS_FROM", 0.98, "New revenue stream"),
                ("nvidia_h100_launch", "TSM", "BENEFITS_FROM", 0.85, "Increased orders"),
                ("nvidia_h100_launch", "AMD", "AFFECTS", 0.70, "Competitive pressure"),
                
                # Taiwan earthquake
                ("taiwan_earthquake_2024", "TSM", "AFFECTS", 0.90, "Production disruption"),
                ("taiwan_earthquake_2024", "NVDA", "AFFECTS", 0.75, "Supply chain delays"),
                ("taiwan_earthquake_2024", "AMD", "AFFECTS", 0.70, "Supply chain delays"),
                
                # GPT-4 launch → AI boom
                ("openai_gpt4_launch", "NVDA", "BENEFITS_FROM", 0.95, "Massive GPU demand surge"),
                ("openai_gpt4_launch", "MSFT", "BENEFITS_FROM", 0.90, "Azure AI growth"),
                ("openai_gpt4_launch", "GOOGL", "AFFECTS", 0.70, "Competitive AI pressure"),
                
                # CHIPS Act
                ("chips_act_funding", "INTC", "BENEFITS_FROM", 0.95, "US fab expansion funding"),
                ("chips_act_funding", "TSM", "BENEFITS_FROM", 0.85, "Arizona fab funding"),
            ]
            
            # Group by relationship type for efficient queries
            by_type = {}
            for event_id, ticker, rel_type, conf, desc in impacts:
                if rel_type not in by_type:
                    by_type[rel_type] = []
                by_type[rel_type].append((event_id, ticker, conf, desc))
            
            # Create relationships grouped by type
            for rel_type, items in by_type.items():
                for event_id, ticker, conf, desc in items:
                    if rel_type == "AFFECTS":
                        session.run("""
                            MATCH (e:Event {id: $event_id})
                            MATCH (c:Company {ticker: $ticker})
                            CREATE (e)-[r:AFFECTS]->(c)
                            SET r.confidence = $conf,
                                r.description = $desc,
                                r.created_at = datetime()
                        """, event_id=event_id, ticker=ticker, conf=conf, desc=desc)
                    elif rel_type == "BENEFITS_FROM":
                        session.run("""
                            MATCH (e:Event {id: $event_id})
                            MATCH (c:Company {ticker: $ticker})
                            CREATE (e)-[r:BENEFITS_FROM]->(c)
                            SET r.confidence = $conf,
                                r.description = $desc,
                                r.created_at = datetime()
                        """, event_id=event_id, ticker=ticker, conf=conf, desc=desc)
        
        print(f"✓ Created {len(impacts)} event impacts")

    def create_hypotheses(self):
        """Create hypotheses for validation workflow demo."""
        print("Creating hypotheses...")
        with self.driver.session() as session:
            hypotheses = [
                {
                    "id": "hyp_1",
                    "statement": "TSMC production disruptions significantly impact NVIDIA GPU availability within 2 months",
                    "source": "TSM",
                    "target": "NVDA",
                    "rel_type": "AFFECTS",
                    "confidence": 0.75,
                    "threshold": 3,
                },
                {
                    "id": "hyp_2",
                    "statement": "US export controls create opportunity for AMD to gain market share in non-China markets",
                    "source": "AMD",
                    "target": "NVDA",
                    "rel_type": "COMPETES_WITH",
                    "confidence": 0.70,
                    "threshold": 4,
                },
                {
                    "id": "hyp_3",
                    "statement": "ASML capacity constraints bottleneck entire AI semiconductor supply chain",
                    "source": "ASML",
                    "target": "TSM",
                    "rel_type": "SUPPLIES_TO",
                    "confidence": 0.80,
                    "threshold": 3,
                },
            ]
            
            for hyp in hypotheses:
                session.run("""
                    MATCH (src:Company {ticker: $source})
                    MATCH (tgt:Company {ticker: $target})
                    CREATE (h:Hypothesis {id: $id})
                    SET h.statement = $statement,
                        h.source_entity_id = elementId(src),
                        h.target_entity_id = elementId(tgt),
                        h.relation_type = $rel_type,
                        h.confidence = $confidence,
                        h.status = 'pending_validation',
                        h.validation_threshold = $threshold,
                        h.evidence_count = 0,
                        h.contradiction_count = 0,
                        h.created_at = datetime()
                    CREATE (h)-[:PROPOSED_RELATION]->(src)
                    CREATE (h)-[:PROPOSED_RELATION]->(tgt)
                """, **hyp)
        
        print(f"✓ Created {len(hypotheses)} hypotheses")

    def create_observations(self):
        """Create agent observations."""
        print("Creating observations...")
        with self.driver.session() as session:
            observations = [
                {
                    "id": "obs_1",
                    "content": "NVIDIA Q3 2024 earnings show 206% YoY revenue growth, primarily driven by datacenter AI demand",
                    "source": "earnings_analyzer_agent",
                    "ticker": "NVDA",
                    "observed_at": "2024-11-21",
                    "confidence": 0.95,
                },
                {
                    "id": "obs_2",
                    "content": "TSMC announces N3E yield improvements reaching 80%, enabling higher H200 production volumes",
                    "source": "supply_chain_agent",
                    "ticker": "TSM",
                    "observed_at": "2024-10-15",
                    "confidence": 0.90,
                },
                {
                    "id": "obs_3",
                    "content": "Microsoft Azure AI revenue run-rate exceeds $10B annually, driven by GPT-4 deployments",
                    "source": "earnings_analyzer_agent",
                    "ticker": "MSFT",
                    "observed_at": "2024-10-30",
                    "confidence": 0.92,
                },
            ]
            
            for obs in observations:
                session.run("""
                    CREATE (o:Observation {id: $id})
                    SET o.content = $content,
                        o.source = $source,
                        o.observed_at = datetime($observed_at),
                        o.confidence = $confidence,
                        o.created_at = datetime()
                    WITH o
                    MATCH (c:Company {ticker: $ticker})
                    CREATE (o)-[:OBSERVES]->(c)
                """, **obs)
        
        print(f"✓ Created {len(observations)} observations")

    def create_correlations(self):
        """Create price correlations."""
        print("Creating correlations...")
        with self.driver.session() as session:
            correlations = [
                ("NVDA", "AMD", 0.85, "spearman", "2024-01-01", "2024-12-01"),
                ("NVDA", "TSM", 0.78, "spearman", "2024-01-01", "2024-12-01"),
                ("AMD", "TSM", 0.72, "spearman", "2024-01-01", "2024-12-01"),
                ("ASML", "TSM", 0.80, "spearman", "2024-01-01", "2024-12-01"),
                ("MSFT", "GOOGL", 0.75, "spearman", "2024-01-01", "2024-12-01"),
            ]
            
            for src, tgt, corr, method, start, end in correlations:
                session.run("""
                    MATCH (a:Company {ticker: $src})
                    MATCH (b:Company {ticker: $tgt})
                    CREATE (a)-[r:CORRELATES_WITH]->(b)
                    SET r.correlation = $corr,
                        r.method = $method,
                        r.window_start = datetime($start),
                        r.window_end = datetime($end),
                        r.created_at = datetime()
                """, src=src, tgt=tgt, corr=corr, method=method, start=start, end=end)
        
        print(f"✓ Created {len(correlations)} correlations")

    def create_regimes(self):
        """Create market regimes."""
        print("Creating regimes...")
        with self.driver.session() as session:
            regimes = [
                {
                    "id": "bull_ai_boom_2023",
                    "name": "AI Bull Market 2023",
                    "characteristics": ["high_momentum", "ai_hype", "low_volatility"],
                    "start": "2023-01-01",
                    "end": "2023-12-31",
                    "avg_return": 0.45,
                },
                {
                    "id": "correction_export_controls",
                    "name": "Export Controls Correction",
                    "characteristics": ["regulatory_pressure", "geopolitical_risk", "high_volatility"],
                    "start": "2023-10-15",
                    "end": "2023-11-30",
                    "avg_return": -0.12,
                },
                {
                    "id": "recovery_2024",
                    "name": "Post-Correction Recovery 2024",
                    "characteristics": ["demand_recovery", "supply_normalization", "medium_volatility"],
                    "start": "2024-01-01",
                    "end": None,
                    "avg_return": 0.28,
                },
            ]
            
            for regime in regimes:
                session.run("""
                    CREATE (r:Regime {id: $id})
                    SET r.regime_name = $name,
                        r.characteristics = $characteristics,
                        r.start_date = datetime($start),
                        r.end_date = CASE WHEN $end IS NOT NULL THEN datetime($end) ELSE NULL END,
                        r.avg_return = $avg_return,
                        r.created_at = datetime()
                """, **regime)
        
        print(f"✓ Created {len(regimes)} regimes")

    def create_demo_pattern(self):
        """Create a validated pattern for demonstration."""
        print("Creating demo pattern...")
        with self.driver.session() as session:
            session.run("""
                CREATE (p:Pattern {id: 'supply_chain_disruption_pattern'})
                SET p.pattern_name = 'Taiwan Event → GPU Supply Shock',
                    p.description = 'When TSMC experiences production disruptions, NVIDIA GPU availability drops significantly within 6-8 weeks',
                    p.category = 'supply_chain',
                    p.confidence = 0.88,
                    p.occurrences = 3,
                    p.success_rate = 0.85,
                    p.validated_at = datetime(),
                    p.validated_by = 'system',
                    p.created_at = datetime()
            """)
        
        print("✓ Created demo pattern")

    def create_all(self):
        """Create entire demo graph."""
        print("\n=== Creating Ariadne Demo Graph ===\n")
        
        self.create_companies()
        self.create_supply_chain()
        self.create_competition()
        self.create_events()
        self.create_event_impacts()
        self.create_hypotheses()
        self.create_observations()
        self.create_correlations()
        self.create_regimes()
        self.create_demo_pattern()
        
        print("\n✅ Demo graph creation complete!")
        
        # Print summary
        with self.driver.session() as session:
            result = session.run("""
                MATCH (n)
                WITH labels(n) as labels, count(n) as count
                RETURN labels[0] as label, count
                ORDER BY count DESC
            """)
            
            print("\nGraph Summary:")
            for record in result:
                print(f"  {record['label']}: {record['count']}")
            
            result = session.run("""
                MATCH ()-[r]->()
                WITH type(r) as type, count(r) as count
                RETURN type, count
                ORDER BY count DESC
            """)
            
            print("\nRelationships:")
            for record in result:
                print(f"  {record['type']}: {record['count']}")


async def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║       ARIADNE DEMONSTRATION GRAPH CREATOR                    ║
║                                                              ║
║  Scenario: AI Semiconductor Supply Chain (2023-2025)        ║
║                                                              ║
║  This creates a comprehensive, realistic knowledge graph    ║
║  demonstrating ALL Ariadne capabilities:                    ║
║                                                              ║
║  ✓ Temporal relationships (past & present)                  ║
║  ✓ Supply chain networks & impact propagation               ║
║  ✓ Events & their effects                                   ║
║  ✓ Hypothesis validation workflow                           ║
║  ✓ Correlations & communities                               ║
║  ✓ Market regimes                                           ║
║  ✓ Agent observations                                       ║
║  ✓ Validated patterns                                       ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    creator = DemoGraphCreator(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    
    try:
        creator.create_all()
        
        print("\n" + "="*60)
        print("Next Steps:")
        print("="*60)
        print("1. Open Ariadne Frontend: http://localhost:3000/ariadne/dashboard")
        print("2. Try Context Graph with topic='AI' or tickers=['NVDA','TSM']")
        print("3. Check Timeline for NVDA to see events & impacts")
        print("4. View Hypotheses pending validation")
        print("5. Run Impact Analysis for 'us_export_controls_2023'")
        print("6. Explore Graph to see full supply chain")
        print("="*60)
        
    finally:
        creator.close()


if __name__ == "__main__":
    asyncio.run(main())

