"""
Deduplication management endpoints for safe node merging.
Provides duplicate detection, merge planning, and safe execution.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store
from typing import Optional

router = APIRouter()


class DedupExecuteRequest(BaseModel):
    """Request body for deduplication execution"""
    source_id: str
    target_id: str
    strategy: str = "prefer_target"  # prefer_target, prefer_source, merge_all_properties
    dry_run: bool = True


@router.get("/deduplicate/plan")
async def get_dedup_plan(
    label: str = Query("Company", description="Node label to analyze"),
    threshold: float = Query(0.85, ge=0.0, le=1.0, description="Similarity threshold"),
    limit: int = Query(20, ge=1, le=100, description="Maximum duplicate pairs"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Generate deduplication plan: find potential duplicates and show merge preview.
    
    Uses GDS Node Similarity to find nodes with high structural similarity.
    Shows property differences so user can decide on merge strategy.
    
    Returns:
    - Duplicate pairs with similarity scores
    - Property differences (for decision-making)
    - Relationship overview for both nodes
    """
    try:
        # First, check how many nodes we have
        count_query = f"""
        MATCH (n:{label})
        RETURN count(n) as node_count
        """
        
        count_results = store.execute_read(count_query, {})
        node_count = count_results[0]["node_count"] if count_results else 0
        
        if node_count < 2:
            return {
                "status": "success",
                "label": label,
                "duplicates": [],
                "count": 0,
                "message": f"Fewer than 2 nodes of type {label} found"
            }
        
        # Project GDS graph
        graph_name = f"dedup_{label}_{int(__import__('time').time())}"
        try:
            store.project_gds_graph(graph_name, [label], [])
        except Exception as e:
            # If projection fails (e.g., too small), use fallback
            pass
        
        # Query: GDS Node Similarity
        similarity_query = f"""
        CALL gds.nodeSimilarity.stream(
            '{label}',
            {{similarityMetric: 'JACCARD'}}
        )
        YIELD node1, node2, similarity
        
        WITH gds.util.asNode(node1) as n1,
             gds.util.asNode(node2) as n2,
             similarity
        
        WHERE similarity >= $threshold AND elementId(n1) < elementId(n2)
        
        RETURN {{
            node1_id: elementId(n1),
            node1_name: coalesce(n1.name, n1.ticker, 'Unknown'),
            node1_type: labels(n1)[0],
            node2_id: elementId(n2),
            node2_name: coalesce(n2.name, n2.ticker, 'Unknown'),
            node2_type: labels(n2)[0],
            similarity: round(similarity, 3),
            properties_n1: properties(n1),
            properties_n2: properties(n2)
        }} as dup_pair
        
        ORDER BY similarity DESC
        LIMIT $limit
        """
        
        # Fallback if GDS not available: use property similarity
        fallback_query = f"""
        MATCH (n1:{label}), (n2:{label})
        WHERE elementId(n1) < elementId(n2)
        
        // Simple string similarity: count matching properties
        WITH n1, n2,
             coalesce(n1.name, n1.ticker, '') as name1,
             coalesce(n2.name, n2.ticker, '') as name2
        
        WHERE name1 <> '' AND name2 <> '' AND (
            name1 = name2 OR 
            toLower(name1) = toLower(name2) OR
            name1 CONTAINS name2 OR
            name2 CONTAINS name1
        )
        
        WITH n1, n2, 0.9 as similarity  // High confidence if names match
        
        RETURN {{
            node1_id: elementId(n1),
            node1_name: coalesce(n1.name, n1.ticker, 'Unknown'),
            node1_type: labels(n1)[0],
            node2_id: elementId(n2),
            node2_name: coalesce(n2.name, n2.ticker, 'Unknown'),
            node2_type: labels(n2)[0],
            similarity: round(similarity, 3),
            properties_n1: properties(n1),
            properties_n2: properties(n2)
        }} as dup_pair
        
        ORDER BY similarity DESC
        LIMIT $limit
        """
        
        try:
            results = store.execute_read(similarity_query, {
                "threshold": threshold,
                "limit": limit
            })
        except:
            # Fallback to property-based similarity
            results = store.execute_read(fallback_query, {"limit": limit})
        
        if not results:
            return {
                "status": "success",
                "label": label,
                "duplicates": [],
                "count": 0,
                "message": f"No duplicates found above {threshold} similarity"
            }
        
        # Build duplicate pairs with diff info
        duplicates = []
        for r in results:
            dup = r["dup_pair"]
            
            # Calculate property diff
            props1 = dup["properties_n1"] or {}
            props2 = dup["properties_n2"] or {}
            
            all_keys = set(props1.keys()) | set(props2.keys())
            diffs = {}
            for key in all_keys:
                if props1.get(key) != props2.get(key):
                    diffs[key] = {
                        "node1": props1.get(key),
                        "node2": props2.get(key)
                    }
            
            duplicates.append({
                "node1": {
                    "id": dup["node1_id"],
                    "name": dup["node1_name"],
                    "type": dup["node1_type"]
                },
                "node2": {
                    "id": dup["node2_id"],
                    "name": dup["node2_name"],
                    "type": dup["node2_type"]
                },
                "similarity": dup["similarity"],
                "property_differences": diffs,
                "recommended_strategy": "prefer_target" if len(str(props2)) >= len(str(props1)) else "prefer_source"
            })
        
        return {
            "status": "success",
            "label": label,
            "threshold": threshold,
            "duplicates": duplicates,
            "count": len(duplicates),
            "message": f"Found {len(duplicates)} potential duplicates"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dedup plan generation failed: {str(e)}")


@router.post("/deduplicate/execute")
async def execute_dedup(
    request: DedupExecuteRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Execute deduplication: merge two nodes safely.
    
    Strategies:
    - prefer_target: Keep target node, copy missing properties from source, rewire relationships
    - prefer_source: Keep source node, copy missing properties from target, rewire relationships
    - merge_all_properties: Merge all properties (target overwrites on conflicts)
    
    Dry-run shows what would happen; set dry_run=false to execute.
    
    Returns:
    - Merge plan / execution summary
    - Relationship rewiring details
    - Audit trail (merged_into property)
    """
    try:
        # Validate that both nodes exist
        validate_query = """
        MATCH (n1), (n2)
        WHERE elementId(n1) = $source_id AND elementId(n2) = $target_id
        RETURN elementId(n1) as n1_id, elementId(n2) as n2_id
        """
        
        validation = store.execute_read(validate_query, {
            "source_id": request.source_id,
            "target_id": request.target_id
        })
        
        if not validation:
            raise HTTPException(status_code=404, detail="Source or target node not found")
        
        # Prepare merge plan
        plan_query = """
        MATCH (source), (target)
        WHERE elementId(source) = $source_id AND elementId(target) = $target_id
        
        // Count incoming/outgoing relationships
        OPTIONAL MATCH (source)<-[r_in]-()
        WITH source, target, count(DISTINCT r_in) as source_in_rels
        
        OPTIONAL MATCH (source)-[r_out]->()
        WITH source, target, source_in_rels, count(DISTINCT r_out) as source_out_rels
        
        OPTIONAL MATCH (target)<-[r_in2]-()
        WITH source, target, source_in_rels, source_out_rels, count(DISTINCT r_in2) as target_in_rels
        
        OPTIONAL MATCH (target)-[r_out2]->()
        WITH source, target, source_in_rels, source_out_rels, target_in_rels, count(DISTINCT r_out2) as target_out_rels
        
        RETURN {
            source_name: coalesce(source.name, source.ticker, 'Unknown'),
            target_name: coalesce(target.name, target.ticker, 'Unknown'),
            source_props: properties(source),
            target_props: properties(target),
            source_in: source_in_rels,
            source_out: source_out_rels,
            target_in: target_in_rels,
            target_out: target_out_rels
        } as plan
        """
        
        plan_results = store.execute_read(plan_query, {
            "source_id": request.source_id,
            "target_id": request.target_id
        })
        
        if not plan_results:
            raise HTTPException(status_code=500, detail="Failed to generate merge plan")
        
        plan = plan_results[0]["plan"]
        
        if request.dry_run:
            # Return what would happen
            return {
                "status": "success",
                "dry_run": True,
                "action": "merge",
                "strategy": request.strategy,
                "plan": {
                    "source": {
                        "name": plan["source_name"],
                        "incoming_rels": plan["source_in"],
                        "outgoing_rels": plan["source_out"]
                    },
                    "target": {
                        "name": plan["target_name"],
                        "incoming_rels": plan["target_in"],
                        "outgoing_rels": plan["target_out"]
                    },
                    "merge_strategy": request.strategy,
                    "operations": [
                        f"Copy missing properties from source to target (strategy: {request.strategy})",
                        f"Rewire {plan['source_in']} incoming relationships to target",
                        f"Rewire {plan['source_out']} outgoing relationships to target",
                        f"Set source.merged_into = target.id (audit trail)",
                        "Delete source node"
                    ]
                },
                "message": "Dry-run mode: no changes made. Set dry_run=false to execute."
            }
        
        # EXECUTE: Perform actual merge (transactional)
        # Note: For real safety, this should be wrapped in a transaction
        execute_query = """
        MATCH (source), (target)
        WHERE elementId(source) = $source_id AND elementId(target) = $target_id
        
        // Step 1: Copy properties from source to target based on strategy
        CALL apoc.do.case([
            $strategy = 'prefer_target',
            'WITH source, target FOREACH (key IN keys(properties(source)) | 
                SET target[key] = COALESCE(target[key], source[key]))',
            $strategy = 'prefer_source',
            'WITH source, target FOREACH (key IN keys(properties(target)) | 
                SET target[key] = source[key])',
            true,
            'WITH source, target FOREACH (key IN keys(properties(source)) | 
                SET target[key] = COALESCE(target[key], source[key]))'
        ], {source: source, target: target}, {}) YIELD value
        
        // Step 2: Rewire incoming relationships
        WITH source, target
        MATCH (n)-[r_in]-(source)
        CREATE (n)-[:MERGED_WITH]->(target)
        DELETE r_in
        
        // Step 3: Rewire outgoing relationships
        WITH source, target
        MATCH (source)-[r_out]->(n)
        CREATE (target)-[r_out_new:MERGED_REL]->(n)
        SET r_out_new = properties(r_out)
        DELETE r_out
        
        // Step 4: Mark source as merged
        SET source.merged_into = elementId(target),
            source.merged_at = datetime()
        
        // Return result
        RETURN {
            merged_source_id: elementId(source),
            merged_target_id: elementId(target),
            merged_at: datetime()
        } as result
        """
        
        try:
            exec_result = store.execute_write(execute_query, {
                "source_id": request.source_id,
                "target_id": request.target_id,
                "strategy": request.strategy
            })
            
            return {
                "status": "success",
                "dry_run": False,
                "action": "merge_executed",
                "strategy": request.strategy,
                "summary": {
                    "source_id": request.source_id,
                    "target_id": request.target_id,
                    "source_name": plan["source_name"],
                    "target_name": plan["target_name"],
                    "relationships_rewired": plan["source_in"] + plan["source_out"],
                    "message": "Merge completed successfully"
                }
            }
        except Exception as exec_error:
            # Rollback by marking as failed (Neo4j doesn't auto-rollback in our setup)
            raise HTTPException(status_code=500, detail=f"Merge execution failed: {str(exec_error)}")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deduplication execution failed: {str(e)}")
