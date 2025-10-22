#!/usr/bin/env python3
"""
Seed a test graph with companies, relationships, and events
"""

from libs.ariadne_core.storage import GraphStore
from datetime import datetime
import os

def seed_graph():
    store = GraphStore(
        uri="bolt://localhost:7687",
        user="neo4j",
        password=os.getenv("NEO4J_PASSWORD", "testpassword")
    )
    
    print("🌱 Seeding Knowledge Graph...")
    
    try:
        # 1. Create Company nodes
        print("\n1️⃣ Creating Company nodes...")
        companies = [
            {"id": "nvda_corp", "ticker": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology", "industry": "Semiconductors"},
            {"id": "tsm_corp", "ticker": "TSM", "name": "Taiwan Semiconductor", "sector": "Technology", "industry": "Semiconductors"},
            {"id": "asml_corp", "ticker": "ASML", "name": "ASML Holding", "sector": "Technology", "industry": "Semiconductor Equipment"},
            {"id": "amd_corp", "ticker": "AMD", "name": "Advanced Micro Devices", "sector": "Technology", "industry": "Semiconductors"},
            {"id": "intc_corp", "ticker": "INTC", "name": "Intel Corporation", "sector": "Technology", "industry": "Semiconductors"},
        ]
        
        for company in companies:
            node = store.merge_node("Company", company)
            print(f"  ✓ Created/Updated: {company['ticker']} - {company['name']}")
        
        # 2. Create supply chain relationships
        print("\n2️⃣ Creating supply chain relationships...")
        supply_chain = [
            ("asml_corp", "tsm_corp", "SUPPLIES_TO", {"confidence": 0.95, "product": "EUV lithography"}),
            ("tsm_corp", "nvda_corp", "SUPPLIES_TO", {"confidence": 0.9, "product": "chip fabrication"}),
            ("tsm_corp", "amd_corp", "SUPPLIES_TO", {"confidence": 0.85, "product": "chip fabrication"}),
        ]
        
        for source, target, rel_type, props in supply_chain:
            edge = store.merge_edge_temporal(
                source_label="Company",
                source_id=source,
                target_label="Company",
                target_id=target,
                rel_type=rel_type,
                properties=props,
                valid_from=datetime(2020, 1, 1)
            )
            print(f"  ✓ {source} -{rel_type}-> {target}")
        
        # 3. Create competition relationships
        print("\n3️⃣ Creating competition relationships...")
        competitions = [
            ("nvda_corp", "amd_corp", "COMPETES_WITH", {"confidence": 0.95, "market": "GPU"}),
            ("nvda_corp", "intc_corp", "COMPETES_WITH", {"confidence": 0.75, "market": "AI chips"}),
            ("amd_corp", "intc_corp", "COMPETES_WITH", {"confidence": 0.9, "market": "CPU"}),
        ]
        
        for source, target, rel_type, props in competitions:
            edge = store.merge_edge_temporal(
                source_label="Company",
                source_id=source,
                target_label="Company",
                target_id=target,
                rel_type=rel_type,
                properties=props,
                valid_from=datetime(2015, 1, 1)
            )
            print(f"  ✓ {source} -{rel_type}-> {target}")
        
        # 4. Create Events
        print("\n4️⃣ Creating Events...")
        events = [
            {
                "id": "export_control_2025",
                "type": "regulatory",
                "description": "US Export controls on advanced semiconductor equipment to China",
                "occurred_at": datetime(2025, 8, 15),
                "affects": [("asml_corp", 0.8), ("tsm_corp", 0.6)]
            },
            {
                "id": "ai_boom_2025",
                "type": "market",
                "description": "Accelerated AI adoption drives semiconductor demand",
                "occurred_at": datetime(2025, 3, 1),
                "affects": [("nvda_corp", 0.9), ("amd_corp", 0.7), ("tsm_corp", 0.8)]
            }
        ]
        
        for event in events:
            # Create Event node
            event_node = store.merge_node("Event", event["id"], {
                "type": event["type"],
                "description": event["description"],
                "occurred_at": event["occurred_at"].isoformat()
            })
            print(f"  ✓ Event: {event['description'][:50]}...")
            
            # Create AFFECTS relationships
            for entity_id, impact in event["affects"]:
                edge = store.merge_edge("Event", event["id"], "Company", entity_id, "AFFECTS", {
                    "confidence": impact,
                    "occurred_at": event["occurred_at"].isoformat()
                })
                print(f"    → Affects {entity_id} (impact: {impact})")
        
        # 5. Create a Hypothesis
        print("\n5️⃣ Creating Hypothesis...")
        hypothesis = store.merge_node("Hypothesis", "hyp_export_supply", {
            "statement": "Export controls will reduce TSMC capacity for NVIDIA chips",
            "source_entity_id": "asml_corp",
            "target_entity_id": "nvda_corp",
            "relation_type": "AFFECTS",
            "confidence": 0.65,
            "created_at": datetime(2025, 8, 20).isoformat(),
            "created_by": "agent_analyst",
            "manifold_thought_id": "thought_12345",
            "status": "active",
            "evidence_count": 0,
            "contradiction_count": 0,
            "validation_threshold": 3
        })
        print(f"  ✓ Hypothesis: Export controls impact hypothesis")
        
        # 6. Create a validated Pattern
        print("\n6️⃣ Creating Pattern...")
        pattern = store.merge_node("Pattern", "pattern_supply_shock", {
            "name": "Supply Chain Shock Propagation",
            "description": "Upstream supply disruptions propagate downstream with 0.6x impact decay",
            "category": "fundamental",
            "confidence": 0.82,
            "validated_at": datetime(2025, 1, 15).isoformat(),
            "validated_by": "agent_validator",
            "manifold_source_id": "thought_99999",
            "occurrences": 5,
            "success_rate": 0.78
        })
        print(f"  ✓ Pattern: Supply Chain Shock Propagation")
        
        # 7. Create a Market Regime
        print("\n7️⃣ Creating Market Regime...")
        regime = store.merge_node("Regime", "regime_ai_boom_q3_2025", {
            "name": "AI Boom Q3 2025",
            "type": "bull",
            "characteristics": ["high_volatility", "tech_outperformance", "ai_driven"],
            "start_date": datetime(2025, 7, 1).isoformat(),
            "end_date": None,  # Current regime
            "confidence": 0.88
        })
        print(f"  ✓ Regime: AI Boom Q3 2025")
        
        print("\n✅ Graph seeding complete!")
        print(f"\nSummary:")
        print(f"  - Companies: {len(companies)}")
        print(f"  - Supply Chain Edges: {len(supply_chain)}")
        print(f"  - Competition Edges: {len(competitions)}")
        print(f"  - Events: {len(events)}")
        print(f"  - Hypotheses: 1")
        print(f"  - Patterns: 1")
        print(f"  - Regimes: 1")
        
    finally:
        store.close()

if __name__ == "__main__":
    seed_graph()

