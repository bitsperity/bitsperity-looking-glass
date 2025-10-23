#!/usr/bin/env python3
"""
Cleanup Script für doppelte/dreifache Daten in Neo4j (Ariadne).

Entfernt:
- Duplicate Nodes (gleiche Properties)
- Duplicate Relationships (gleicher Typ zwischen gleichen Nodes)
- Orphaned Nodes (ohne Relationships)
"""

import asyncio
from neo4j import GraphDatabase
from collections import defaultdict
import os

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")


class Neo4jCleaner:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def get_stats(self):
        """Get current graph statistics."""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (n)
                WITH labels(n) as labels, count(n) as count
                RETURN labels, count
                ORDER BY count DESC
            """)
            node_stats = {r["labels"][0] if r["labels"] else "Unlabeled": r["count"] for r in result}

            result = session.run("""
                MATCH ()-[r]->()
                WITH type(r) as type, count(r) as count
                RETURN type, count
                ORDER BY count DESC
            """)
            rel_stats = {r["type"]: r["count"] for r in result}

            return {
                "nodes": node_stats,
                "relationships": rel_stats,
                "total_nodes": sum(node_stats.values()),
                "total_relationships": sum(rel_stats.values()),
            }

    def find_duplicate_nodes(self, label: str = None, limit: int = 1000):
        """Find nodes with identical properties."""
        with self.driver.session() as session:
            if label:
                query = f"""
                    MATCH (n:{label})
                    WITH properties(n) as props, collect(n) as nodes
                    WHERE size(nodes) > 1
                    RETURN props, nodes
                    LIMIT $limit
                """
            else:
                query = """
                    MATCH (n)
                    WITH labels(n) as labels, properties(n) as props, collect(n) as nodes
                    WHERE size(nodes) > 1
                    RETURN labels, props, nodes
                    LIMIT $limit
                """
            
            result = session.run(query, limit=limit)
            duplicates = []
            for record in result:
                nodes = record["nodes"]
                if len(nodes) > 1:
                    duplicates.append({
                        "props": record.get("props"),
                        "count": len(nodes),
                        "node_ids": [n.element_id for n in nodes],
                    })
            
            return duplicates

    def merge_duplicate_nodes(self, dry_run: bool = True):
        """Merge duplicate nodes, keeping one and redirecting relationships."""
        duplicates = self.find_duplicate_nodes()
        
        if not duplicates:
            print("✓ No duplicate nodes found")
            return 0

        print(f"Found {len(duplicates)} groups of duplicate nodes")
        
        merged_count = 0
        with self.driver.session() as session:
            for dup in duplicates:
                node_ids = dup["node_ids"]
                keep_id = node_ids[0]
                delete_ids = node_ids[1:]
                
                print(f"  Merging {len(delete_ids)} duplicate(s) into {keep_id}")
                
                if not dry_run:
                    # Redirect incoming relationships
                    session.run("""
                        MATCH (n)-[r]->(dup)
                        WHERE elementId(dup) IN $delete_ids
                        MATCH (keep)
                        WHERE elementId(keep) = $keep_id
                        CREATE (n)-[r2:type(r)]->(keep)
                        SET r2 = properties(r)
                        DELETE r
                    """, delete_ids=delete_ids, keep_id=keep_id)
                    
                    # Redirect outgoing relationships
                    session.run("""
                        MATCH (dup)-[r]->(n)
                        WHERE elementId(dup) IN $delete_ids
                        MATCH (keep)
                        WHERE elementId(keep) = $keep_id
                        CREATE (keep)-[r2:type(r)]->(n)
                        SET r2 = properties(r)
                        DELETE r
                    """, delete_ids=delete_ids, keep_id=keep_id)
                    
                    # Delete duplicates
                    session.run("""
                        MATCH (dup)
                        WHERE elementId(dup) IN $delete_ids
                        DETACH DELETE dup
                    """, delete_ids=delete_ids)
                    
                    merged_count += len(delete_ids)
        
        if dry_run:
            print(f"[DRY RUN] Would merge {sum(d['count'] - 1 for d in duplicates)} duplicate nodes")
        else:
            print(f"✓ Merged {merged_count} duplicate nodes")
        
        return merged_count

    def find_duplicate_relationships(self, limit: int = 1000):
        """Find duplicate relationships between same nodes."""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (a)-[r]->(b)
                WITH a, b, type(r) as relType, collect(r) as rels
                WHERE size(rels) > 1
                RETURN elementId(a) as source, elementId(b) as target, relType, size(rels) as count
                LIMIT $limit
            """, limit=limit)
            
            duplicates = []
            for record in result:
                duplicates.append({
                    "source": record["source"],
                    "target": record["target"],
                    "type": record["relType"],
                    "count": record["count"],
                })
            
            return duplicates

    def remove_duplicate_relationships(self, dry_run: bool = True):
        """Remove duplicate relationships, keeping only one."""
        duplicates = self.find_duplicate_relationships()
        
        if not duplicates:
            print("✓ No duplicate relationships found")
            return 0

        print(f"Found {len(duplicates)} pairs with duplicate relationships")
        
        removed_count = 0
        with self.driver.session() as session:
            for dup in duplicates:
                print(f"  {dup['source']} --[{dup['type']}]--> {dup['target']}: {dup['count']} copies")
                
                if not dry_run:
                    # Keep first, delete rest
                    result = session.run("""
                        MATCH (a)-[r:$relType]->(b)
                        WHERE elementId(a) = $source AND elementId(b) = $target
                        WITH r
                        ORDER BY elementId(r)
                        WITH collect(r) as rels
                        UNWIND rels[1..] as rel_to_delete
                        DELETE rel_to_delete
                        RETURN count(rel_to_delete) as deleted
                    """, source=dup["source"], target=dup["target"], relType=dup["type"])
                    
                    deleted = result.single()["deleted"]
                    removed_count += deleted
        
        if dry_run:
            print(f"[DRY RUN] Would remove {sum(d['count'] - 1 for d in duplicates)} duplicate relationships")
        else:
            print(f"✓ Removed {removed_count} duplicate relationships")
        
        return removed_count

    def remove_orphaned_nodes(self, dry_run: bool = True, exclude_labels: list = None):
        """Remove nodes without any relationships."""
        if exclude_labels is None:
            exclude_labels = ["Pattern", "Regime"]  # Keep these even if orphaned
        
        with self.driver.session() as session:
            # Find orphaned nodes
            label_filter = " AND ".join([f"NOT n:{label}" for label in exclude_labels])
            query = f"""
                MATCH (n)
                WHERE NOT (n)--() AND {label_filter}
                RETURN elementId(n) as id, labels(n) as labels
            """
            
            result = session.run(query)
            orphaned = [(r["id"], r["labels"]) for r in result]
            
            if not orphaned:
                print("✓ No orphaned nodes found")
                return 0

            print(f"Found {len(orphaned)} orphaned nodes")
            
            if not dry_run:
                session.run(f"""
                    MATCH (n)
                    WHERE NOT (n)--() AND {label_filter}
                    DELETE n
                """)
                print(f"✓ Deleted {len(orphaned)} orphaned nodes")
            else:
                print(f"[DRY RUN] Would delete {len(orphaned)} orphaned nodes")
            
            return len(orphaned)


async def main():
    print("=== Neo4j Cleanup Script ===\n")
    
    cleaner = Neo4jCleaner(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    
    try:
        # Print initial stats
        print("Initial Statistics:")
        stats = cleaner.get_stats()
        print(f"  Nodes: {stats['total_nodes']}")
        for label, count in stats['nodes'].items():
            print(f"    - {label}: {count}")
        print(f"  Relationships: {stats['total_relationships']}")
        for rel_type, count in stats['relationships'].items():
            print(f"    - {rel_type}: {count}")
        print()
        
        # Dry run first
        print("=== DRY RUN ===")
        cleaner.remove_duplicate_relationships(dry_run=True)
        cleaner.merge_duplicate_nodes(dry_run=True)
        cleaner.remove_orphaned_nodes(dry_run=True)
        print()
        
        # Ask for confirmation
        response = input("Proceed with cleanup? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted.")
            return
        
        # Execute cleanup
        print("\n=== EXECUTING CLEANUP ===")
        cleaner.remove_duplicate_relationships(dry_run=False)
        cleaner.merge_duplicate_nodes(dry_run=False)
        cleaner.remove_orphaned_nodes(dry_run=False)
        print()
        
        # Print final stats
        print("Final Statistics:")
        stats = cleaner.get_stats()
        print(f"  Nodes: {stats['total_nodes']}")
        print(f"  Relationships: {stats['total_relationships']}")
        
    finally:
        cleaner.close()


if __name__ == "__main__":
    asyncio.run(main())

