#!/usr/bin/env python3
"""
Populate Ariadne Knowledge Graph with comprehensive Phase 3+4 test data.
Uses Neo4j driver directly to create complex scenarios for full validation.
"""

from neo4j import GraphDatabase
from datetime import datetime, timedelta
import os

# Neo4j connection
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "ariadne2025")

# Color codes
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'

def print_step(step: int, total: int, message: str):
    print(f"\n{BLUE}[{step}/{total}] {message}{NC}")

def print_success(message: str):
    print(f"{GREEN}✅ {message}{NC}")

def print_error(message: str):
    print(f"{RED}❌ {message}{NC}")

def create_test_graph(driver):
    """Create comprehensive Phase 3+4 test scenarios"""
    
    with driver.session() as session:
        # Clear all data
        session.run("MATCH (n) DETACH DELETE n")
        print_success("Graph cleared")
        
        # Create companies
        companies = [
            ("TSLA", "Tesla Inc", "Automotive"),
            ("NVDA", "NVIDIA Corp", "Semiconductors"),
            ("AAPL", "Apple Inc", "Technology"),
            ("MSFT", "Microsoft Corp", "Technology"),
            ("TSLA2", "Tesla Motors Inc", "Automotive"),  # Duplicate for testing
        ]
        
        for ticker, name, sector in companies:
            session.run("""
                CREATE (c:Company {
                    ticker: $ticker,
                    name: $name,
                    sector: $sector,
                    created_at: datetime()
                })
            """, ticker=ticker, name=name, sector=sector)
        
        print_success(f"Created {len(companies)} companies")
        
        # SCENARIO 1: Contradictions (positive vs negative effects)
        session.run("""
            MATCH (a:Company {ticker: 'TSLA'}), (b:Company {ticker: 'NVDA'})
            CREATE (a)-[:AFFECTS {effect: 'positive', confidence: 0.9}]->(b)
            CREATE (a)-[:AFFECTS {effect: 'negative', confidence: 0.7}]->(b)
        """)
        print_success("Scenario 1: Created contradictions (TSLA → NVDA positive + negative)")
        
        # SCENARIO 2: Gaps (low-confidence relations on important node)
        # TSLA with 20 relations, 15 have confidence < 0.5
        session.run("""
            MATCH (a:Company {ticker: 'TSLA'})
            MATCH (b:Company {ticker: 'NVDA'})
            MATCH (c:Company {ticker: 'AAPL'})
            MATCH (d:Company {ticker: 'MSFT'})
            MATCH (e:Company {ticker: 'TSLA2'})
            
            // High confidence relations (5 total)
            CREATE (a)-[:SUPPLIES_TO {confidence: 0.95}]->(b)
            CREATE (a)-[:AFFECTS {effect: 'positive', confidence: 0.92}]->(c)
            CREATE (a)-[:COMPETES_WITH {confidence: 0.88}]->(d)
            CREATE (a)-[:PARTNERS {confidence: 0.85}]->(e)
            CREATE (a)-[:ENABLES {confidence: 0.90}]->(b)
            
            // Low confidence relations (15 total)
            CREATE (a)-[:AFFECTS {effect: 'positive', confidence: 0.35}]->(d)
            CREATE (a)-[:AFFECTS {effect: 'positive', confidence: 0.42}]->(e)
            CREATE (a)-[:INFLUENCES {confidence: 0.38}]->(c)
            CREATE (a)-[:RELATED_TO {confidence: 0.45}]->(b)
            CREATE (a)-[:DEPENDENT_ON {confidence: 0.40}]->(d)
            CREATE (a)-[:SUPPLIES_TO {confidence: 0.32}]->(c)
            CREATE (a)-[:AFFECTS {effect: 'negative', confidence: 0.28}]->(e)
            CREATE (a)-[:INFLUENCED_BY {confidence: 0.41}]->(d)
            CREATE (a)-[:SIMILAR_TO {confidence: 0.36}]->(b)
            CREATE (a)-[:ADJACENT_TO {confidence: 0.39}]->(c)
            CREATE (a)-[:RELATED_TO {confidence: 0.44}]->(e)
            CREATE (a)-[:CONNECTED_TO {confidence: 0.31}]->(d)
            CREATE (a)-[:AFFECTS {effect: 'positive', confidence: 0.37}]->(c)
            CREATE (a)-[:TRIGGERS {confidence: 0.43}]->(b)
            CREATE (a)-[:DRIVEN_BY {confidence: 0.29}]->(e)
        """)
        print_success("Scenario 2: Created gaps (TSLA: 20 relations, 15 low-confidence)")
        
        # SCENARIO 3: Anomalies (AAPL with high degree, MSFT with temporal spike)
        session.run("""
            MATCH (a:Company {ticker: 'AAPL'})
            MATCH (b:Company {ticker: 'TSLA'})
            MATCH (c:Company {ticker: 'NVDA'})
            MATCH (d:Company {ticker: 'MSFT'})
            MATCH (e:Company {ticker: 'TSLA2'})
            
            // AAPL: Create many relations (60+ total)
            CREATE (a)-[:SUPPLIES_TO]->(b)
            CREATE (a)-[:AFFECTS {effect: 'positive'}]->(c)
            CREATE (a)-[:COMPETES_WITH]->(d)
            CREATE (a)-[:PARTNERS]->(e)
            
            // Create 20 relations to TSLA
            FOREACH (i IN range(1, 20) | 
                CREATE (a)-[:RELATED_TO {confidence: 0.5 + (i*0.01)}]->(b)
            )
            
            // Create 15 relations to NVDA  
            FOREACH (i IN range(1, 15) |
                CREATE (a)-[:SIMILAR_TO {confidence: 0.4 + (i*0.01)}]->(c)
            )
            
            // Create 12 relations to MSFT
            FOREACH (i IN range(1, 12) |
                CREATE (a)-[:INFLUENCES {confidence: 0.6 + (i*0.01)}]->(d)
            )
            
            // Create 10 relations to TSLA2
            FOREACH (i IN range(1, 10) |
                CREATE (a)-[:DEPENDENT_ON {confidence: 0.5 + (i*0.02)}]->(e)
            )
            
            // MSFT: Setup temporal spike (degree_7d_ago: 10, current: many)
            SET d.degree_7d_ago = 10
        """)
        print_success("Scenario 3: Created anomalies (AAPL: 60+ high-degree, MSFT: temporal spike)")
        
        # SCENARIO 4: Duplicates (TSLA vs TSLA2 with similar structure)
        session.run("""
            MATCH (a:Company {ticker: 'TSLA'})
            MATCH (b:Company {ticker: 'TSLA2'})
            MATCH (c:Company {ticker: 'NVDA'})
            MATCH (d:Company {ticker: 'AAPL'})
            
            // Make TSLA2 similar to TSLA by creating same relation types
            CREATE (b)-[:SUPPLIES_TO {confidence: 0.96}]->(c)
            CREATE (b)-[:AFFECTS {effect: 'positive', confidence: 0.91}]->(d)
            CREATE (b)-[:PARTNERS {confidence: 0.87}]->(a)
            CREATE (b)-[:ENABLES {confidence: 0.89}]->(c)
            CREATE (b)-[:COMPETES_WITH {confidence: 0.85}]->(d)
        """)
        print_success("Scenario 4: Created duplicates (TSLA2 with similar structure to TSLA)")
        
        # SCENARIO 5: Evidence lineage chains
        session.run("""
            CREATE (news1:News {
                id: 'news-1',
                title: 'NVIDIA Q4 Earnings Call',
                source: 'Reuters',
                published_at: datetime(),
                created_at: datetime()
            })
            
            CREATE (obs1:Observation {
                id: 'obs-1',
                content: 'NVIDIA mentioned TSLA as key customer in automotive sector',
                date: date(),
                confidence: 0.85,
                created_at: datetime()
            })
            
            CREATE (hyp1:Hypothesis {
                id: 'hyp-1',
                title: 'TSLA benefits from NVIDIA AI chips',
                status: 'active',
                confidence: 0.80,
                created_at: datetime()
            })
            
            CREATE (news2:News {
                id: 'news-2',
                title: 'Tesla AI announcement',
                source: 'TechCrunch',
                published_at: datetime() - duration('P1D'),
                created_at: datetime()
            })
            
            CREATE (obs2:Observation {
                id: 'obs-2',
                content: 'Tesla announced new AI infrastructure partnership',
                date: date() - duration('P1D'),
                confidence: 0.90,
                created_at: datetime()
            })
            
            CREATE (news1)-[:SUPPORTS {confidence: 0.85}]->(obs1)
            CREATE (obs1)-[:SUPPORTS {confidence: 0.88}]->(hyp1)
            
            WITH hyp1, news2, obs2
            MATCH (tsla:Company {ticker: 'TSLA'})
            CREATE (hyp1)-[:DERIVED_FROM {confidence: 0.82}]->(tsla)
            CREATE (news2)-[:SUPPORTS {confidence: 0.90}]->(obs2)
            CREATE (obs2)-[:EVIDENCE {confidence: 0.85}]->(tsla)
        """)
        print_success("Scenario 5: Created evidence lineage chains (News → Observation → Hypothesis → Company)")
        
        # Set temporal snapshot
        session.run("""
            MATCH (n:Company)
            OPTIONAL MATCH (n)-[r]-()
            WITH n, count(DISTINCT r) as degree
            SET n.degree_7d_ago = coalesce(n.degree_7d_ago, degree)
        """)
        print_success("Temporal snapshots set for all companies")

def main():
    """Main execution"""
    try:
        print(f"\n{YELLOW}═══════════════════════════════════════════════════════════{NC}")
        print(f"{YELLOW}  ARIADNE PHASE 3+4: COMPLEX TEST DATA POPULATION{NC}")
        print(f"{YELLOW}═══════════════════════════════════════════════════════════{NC}")
        
        # Connect to Neo4j
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        
        try:
            # Create test graph
            create_test_graph(driver)
            
            # Verify
            with driver.session() as session:
                stats = session.run("MATCH (n) RETURN count(n) as nodes").single()
                edges = session.run("MATCH ()-[r]->() RETURN count(r) as edges").single()
                
            print(f"\n{GREEN}═══════════════════════════════════════════════════════════{NC}")
            print(f"{GREEN}  ✅ COMPLEX TEST DATA READY!{NC}")
            print(f"{GREEN}═══════════════════════════════════════════════════════════{NC}")
            print(f"\n📊 Graph Statistics:")
            print(f"   Nodes: {stats['nodes']}")
            print(f"   Edges: {edges['edges']}")
            print(f"\n🧪 Ready to test all Phase 3+4 endpoints!\n")
            
        finally:
            driver.close()
        
    except Exception as e:
        print_error(f"Failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
