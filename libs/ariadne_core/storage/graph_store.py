"""
Neo4j graph store wrapper
"""

from neo4j import GraphDatabase, Driver
import os
from datetime import datetime
from typing import Any


class GraphStore:
    """Neo4j graph database wrapper"""
    
    def __init__(self, uri: str | None = None, user: str | None = None, password: str | None = None):
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "ariadne2025")
        self.driver: Driver | None = None
    
    def connect(self):
        """Establish Neo4j connection"""
        if not self.driver:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
        return self
    
    def close(self):
        """Close Neo4j connection"""
        if self.driver:
            self.driver.close()
            self.driver = None
    
    def verify_connection(self) -> bool:
        """Verify database connection"""
        try:
            with self.driver.session() as session:
                result = session.run("RETURN 1 AS num")
                return result.single()["num"] == 1
        except Exception:
            return False
    
    def initialize_schema(self):
        """Create constraints and indexes"""
        with self.driver.session() as session:
            # Constraints for uniqueness
            session.run("""
                CREATE CONSTRAINT company_ticker_unique IF NOT EXISTS
                FOR (c:Company) REQUIRE c.ticker IS UNIQUE
            """)
            
            session.run("""
                CREATE CONSTRAINT instrument_symbol_unique IF NOT EXISTS
                FOR (i:Instrument) REQUIRE i.symbol IS UNIQUE
            """)
            
            session.run("""
                CREATE CONSTRAINT concept_name_unique IF NOT EXISTS
                FOR (c:Concept) REQUIRE c.name IS UNIQUE
            """)
            
            session.run("""
                CREATE CONSTRAINT location_country_unique IF NOT EXISTS
                FOR (l:Location) REQUIRE l.country IS UNIQUE
            """)
            
            # New constraints for Pattern, Hypothesis, Regime
            session.run("""
                CREATE CONSTRAINT pattern_id_unique IF NOT EXISTS
                FOR (p:Pattern) REQUIRE p.id IS UNIQUE
            """)
            
            session.run("""
                CREATE CONSTRAINT hypothesis_id_unique IF NOT EXISTS
                FOR (h:Hypothesis) REQUIRE h.id IS UNIQUE
            """)
            
            session.run("""
                CREATE CONSTRAINT regime_id_unique IF NOT EXISTS
                FOR (r:Regime) REQUIRE r.id IS UNIQUE
            """)
            
            # Indexes for performance
            session.run("""
                CREATE INDEX event_time IF NOT EXISTS
                FOR (e:Event) ON (e.occurred_at)
            """)
            
            session.run("""
                CREATE INDEX price_event_time IF NOT EXISTS
                FOR (pe:PriceEvent) ON (pe.occurred_at)
            """)
            
            session.run("""
                CREATE INDEX observation_date IF NOT EXISTS
                FOR (o:Observation) ON (o.date)
            """)
            
            session.run("""
                CREATE INDEX news_published IF NOT EXISTS
                FOR (n:News) ON (n.published_at)
            """)
            
            # New indexes for Pattern, Hypothesis, Regime
            session.run("""
                CREATE INDEX pattern_category IF NOT EXISTS
                FOR (p:Pattern) ON (p.category)
            """)
            
            session.run("""
                CREATE INDEX pattern_confidence IF NOT EXISTS
                FOR (p:Pattern) ON (p.confidence, p.success_rate)
            """)
            
            session.run("""
                CREATE INDEX hypothesis_pending IF NOT EXISTS
                FOR (h:Hypothesis) ON (h.status, h.evidence_count)
            """)
            
            session.run("""
                CREATE INDEX regime_dates IF NOT EXISTS
                FOR (r:Regime) ON (r.start_date, r.end_date)
            """)
    
    def execute_read(self, query: str, parameters: dict | None = None) -> list[dict]:
        """Execute read query and return results"""
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [dict(record) for record in result]
    
    def execute_write(self, query: str, parameters: dict | None = None) -> Any:
        """Execute write query and return result"""
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return result.single()
    
    def get_stats(self) -> dict:
        """Get database statistics"""
        with self.driver.session() as session:
            # Node counts by label
            node_result = session.run("""
                MATCH (n)
                RETURN labels(n)[0] AS label, count(n) AS count
            """)
            nodes_by_label = {record["label"]: record["count"] for record in node_result if record["label"]}
            
            # Edge counts by type
            edge_result = session.run("""
                MATCH ()-[r]->()
                RETURN type(r) AS rel_type, count(r) AS count
            """)
            edges_by_type = {record["rel_type"]: record["count"] for record in edge_result if record["rel_type"]}
            
            total_nodes = sum(nodes_by_label.values()) if nodes_by_label else 0
            total_edges = sum(edges_by_type.values()) if edges_by_type else 0
            
            return {
                "nodes_by_label": nodes_by_label,
                "edges_by_type": edges_by_type,
                "total_nodes": total_nodes,
                "total_edges": total_edges,
                "last_updated": datetime.utcnow()
            }
    
    def merge_node(self, label: str, properties: dict) -> dict:
        """Merge a node (create or update)"""
        # Extract unique key for merge
        unique_keys = {
            "Company": "ticker",
            "Instrument": "symbol",
            "Concept": "name",
            "Location": "country",
        }
        
        merge_key = unique_keys.get(label)
        if not merge_key or merge_key not in properties:
            raise ValueError(f"Cannot merge {label} without {merge_key}")
        
        query = f"""
            MERGE (n:{label} {{{merge_key}: $merge_value}})
            SET n += $properties
            SET n.updated_at = datetime()
            RETURN n
        """
        
        with self.driver.session() as session:
            result = session.run(query, {
                "merge_value": properties[merge_key],
                "properties": properties
            })
            record = result.single()
            return dict(record["n"]) if record else {}
    
    def merge_edge(
        self,
        source_label: str,
        source_id: str,
        target_label: str,
        target_id: str,
        rel_type: str,
        properties: dict
    ) -> dict:
        """Merge an edge (create or update) with provenance"""
        # Add ingestion metadata
        properties["ingested_at"] = datetime.utcnow().isoformat()
        
        query = f"""
            MATCH (s:{source_label}), (t:{target_label})
            WHERE id(s) = $source_id AND id(t) = $target_id
            MERGE (s)-[r:{rel_type}]->(t)
            SET r += $properties
            RETURN r
        """
        
        with self.driver.session() as session:
            result = session.run(query, {
                "source_id": source_id,
                "target_id": target_id,
                "properties": properties
            })
            record = result.single()
            return dict(record["r"]) if record else {}
    
    def _get_edge_version_count(self, source_id: str, target_id: str, rel_type: str) -> int:
        """Get current version count for an edge"""
        query = f"""
            MATCH (s)-[r:{rel_type}]->(t)
            WHERE id(s) = $source_id AND id(t) = $target_id
            RETURN COALESCE(r.version, 0) AS version
            ORDER BY version DESC
            LIMIT 1
        """
        
        with self.driver.session() as session:
            result = session.run(query, {
                "source_id": int(source_id),
                "target_id": int(target_id)
            })
            record = result.single()
            return record["version"] if record else 0
    
    def merge_edge_temporal(
        self,
        source_label: str,
        source_id: str,
        target_label: str,
        target_id: str,
        rel_type: str,
        properties: dict,
        valid_from: datetime,
        valid_to: datetime | None = None
    ) -> dict:
        """Merge edge with mandatory temporal bounds and version tracking"""
        
        # Get current version count
        version = self._get_edge_version_count(source_id, target_id, rel_type) + 1
        
        # Enforce temporal metadata
        properties.update({
            "valid_from": valid_from.isoformat(),
            "valid_to": valid_to.isoformat() if valid_to else None,
            "ingested_at": datetime.utcnow().isoformat(),
            "version": version
        })
        
        # Query with temporal conflict check
        query = f"""
            MATCH (s:{source_label}), (t:{target_label})
            WHERE id(s) = $source_id AND id(t) = $target_id
            
            // Check for overlapping temporal edges
            OPTIONAL MATCH (s)-[existing:{rel_type}]->(t)
            WHERE existing.valid_to IS NULL OR existing.valid_to >= $valid_from
            
            WITH s, t, existing
            WHERE existing IS NULL OR existing.valid_to < $valid_from
            
            MERGE (s)-[r:{rel_type}]->(t)
            SET r += $properties
            RETURN r
        """
        
        with self.driver.session() as session:
            # Handle both string and int IDs
            try:
                src_id = int(source_id)
                tgt_id = int(target_id)
            except (ValueError, TypeError):
                # Already integers or conversion failed
                src_id = source_id
                tgt_id = target_id
            
            result = session.run(query, {
                "source_id": src_id,
                "target_id": tgt_id,
                "properties": properties,
                "valid_from": valid_from.isoformat()
            })
            record = result.single()
            return dict(record["r"]) if record else {}

