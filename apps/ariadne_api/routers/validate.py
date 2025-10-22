"""
Validation workflow endpoints for hypothesis evidence and validation
"""

from fastapi import APIRouter, Depends, HTTPException
from libs.ariadne_core.models import (
    EvidenceRequest,
    ValidationRequest,
    EvidenceResponse,
    ValidationResponse,
    Hypothesis,
    Pattern
)
from libs.ariadne_core.storage import GraphStore
from libs.ariadne_core.services import PatternExtractor
from libs.ariadne_core.utils import ManifoldSync
from apps.ariadne_api.main import get_graph_store
from datetime import datetime
import uuid

router = APIRouter()


@router.post("/hypothesis/{hypothesis_id}/evidence", response_model=EvidenceResponse)
async def add_evidence(
    hypothesis_id: str,
    request: EvidenceRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Add evidence annotation to hypothesis.
    Auto-triggers validation check if threshold reached.
    """
    try:
        # 1. Verify hypothesis exists
        hyp_query = """
            MATCH (h:Hypothesis {id: $hypothesis_id})
            RETURN h
        """
        hyp_result = store.execute_read(hyp_query, {"hypothesis_id": hypothesis_id})
        
        if not hyp_result:
            raise HTTPException(status_code=404, detail=f"Hypothesis {hypothesis_id} not found")
        
        hyp_data = dict(hyp_result[0]["h"])
        
        # 2. Create EVIDENCE_FOR or CONTRADICTS edge
        rel_type = "EVIDENCE_FOR" if request.evidence_type == "supporting" else "CONTRADICTS"
        
        edge_query = f"""
            MATCH (h:Hypothesis {{id: $hypothesis_id}})
            MATCH (e:{request.evidence_source_type} {{id: $evidence_id}})
            MERGE (e)-[r:{rel_type}]->(h)
            SET r.confidence = $confidence,
                r.notes = $notes,
                r.annotated_by = $annotated_by,
                r.annotated_at = datetime()
            RETURN r
        """
        
        store.execute_write(edge_query, {
            "hypothesis_id": hypothesis_id,
            "evidence_id": request.evidence_source_id,
            "confidence": request.confidence,
            "notes": request.notes,
            "annotated_by": request.annotated_by
        })
        
        # 3. Increment evidence/contradiction count
        count_field = "evidence_count" if request.evidence_type == "supporting" else "contradiction_count"
        
        update_query = f"""
            MATCH (h:Hypothesis {{id: $hypothesis_id}})
            SET h.{count_field} = h.{count_field} + 1
            RETURN h.evidence_count as evidence_count, 
                   h.contradiction_count as contradiction_count,
                   h.validation_threshold as threshold
        """
        
        update_result = store.execute_write(update_query, {"hypothesis_id": hypothesis_id})
        
        # Access aliased return fields; fallback defaults for safety
        evidence_count = update_result["evidence_count"] if update_result else 0
        contradiction_count = update_result["contradiction_count"] if update_result else 0
        threshold = update_result["threshold"] if update_result else 3
        
        # 4. Check if validation threshold reached
        total_annotations = evidence_count + contradiction_count
        validation_pending = total_annotations >= threshold
        
        return EvidenceResponse(
            status="evidence_added",
            hypothesis_id=hypothesis_id,
            evidence_count=evidence_count,
            contradiction_count=contradiction_count,
            validation_pending=validation_pending
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add evidence: {str(e)}")


@router.post("/hypothesis/{hypothesis_id}/validate", response_model=ValidationResponse)
async def validate_hypothesis(
    hypothesis_id: str,
    request: ValidationRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Final validation decision by agent.
    If validated: promote to Pattern, update Manifold thought status.
    If invalidated: mark hypothesis, update Manifold.
    """
    try:
        # 1. Get hypothesis data
        hyp_query = """
            MATCH (h:Hypothesis {id: $hypothesis_id})
            RETURN h
        """
        hyp_result = store.execute_read(hyp_query, {"hypothesis_id": hypothesis_id})
        
        if not hyp_result:
            raise HTTPException(status_code=404, detail=f"Hypothesis {hypothesis_id} not found")
        
        hyp_data = dict(hyp_result[0]["h"])
        manifold_thought_id = hyp_data.get("manifold_thought_id")
        
        # 2. Update hypothesis status
        status_map = {
            "validate": "validated",
            "invalidate": "invalidated",
            "defer": "active"
        }
        new_status = status_map[request.decision]
        
        update_query = """
            MATCH (h:Hypothesis {id: $hypothesis_id})
            SET h.status = $status,
                h.validated_at = datetime(),
                h.validated_by = $validated_by,
                h.validation_reasoning = $reasoning
            RETURN h
        """
        
        store.execute_write(update_query, {
            "hypothesis_id": hypothesis_id,
            "status": new_status,
            "validated_by": request.validated_by,
            "reasoning": request.reasoning
        })
        
        pattern_created = False
        pattern_id = None
        
        # 3. If validated and create_pattern=True: extract pattern
        if request.decision == "validate" and request.create_pattern:
            # Get supporting evidence
            evidence_query = """
                MATCH (e)-[r:EVIDENCE_FOR]->(h:Hypothesis {id: $hypothesis_id})
                RETURN e, r
            """
            evidence_results = store.execute_read(evidence_query, {"hypothesis_id": hypothesis_id})
            
            # Convert to Hypothesis and Evidence objects
            # Robustly parse created_at from Neo4j (string or neo4j.time.DateTime)
            created_at_val = hyp_data.get("created_at")
            created_at_dt = datetime.utcnow()
            try:
                if isinstance(created_at_val, str):
                    created_at_dt = datetime.fromisoformat(created_at_val.replace("Z", ""))
                elif hasattr(created_at_val, "to_native"):
                    created_at_dt = created_at_val.to_native()
                elif isinstance(created_at_val, datetime):
                    created_at_dt = created_at_val
            except Exception:
                created_at_dt = datetime.utcnow()

            hypothesis = Hypothesis(
                id=hypothesis_id,
                statement=hyp_data.get("statement"),
                source_entity_id=hyp_data.get("source_entity_id"),
                target_entity_id=hyp_data.get("target_entity_id"),
                relation_type=hyp_data.get("relation_type"),
                confidence=hyp_data.get("confidence"),
                created_at=created_at_dt,
                created_by=hyp_data.get("created_by"),
                manifold_thought_id=manifold_thought_id,
                status=new_status,
                evidence_count=hyp_data.get("evidence_count", 0),
                contradiction_count=hyp_data.get("contradiction_count", 0),
                validation_threshold=hyp_data.get("validation_threshold", 3)
            )
            
            from libs.ariadne_core.models.graph import Edge
            evidence_edges = [
                Edge(
                    source_id=dict(res["e"]).get("id"),
                    target_id=hypothesis_id,
                    rel_type="EVIDENCE_FOR",
                    properties=dict(res["r"])
                )
                for res in evidence_results
            ]
            
            # Extract pattern
            extractor = PatternExtractor(store)
            pattern = extractor.extract_pattern_from_hypothesis(hypothesis, evidence_edges)
            
            # Create pattern node
            pattern_node = extractor.create_pattern_node(pattern)
            pattern_id = pattern.id
            
            # Link pattern to hypothesis
            link_query = """
                MATCH (p:Pattern {id: $pattern_id}), (h:Hypothesis {id: $hypothesis_id})
                MERGE (p)-[r:EXTRACTED_FROM]->(h)
                SET r.created_at = datetime()
                RETURN r
            """
            store.execute_write(link_query, {
                "pattern_id": pattern_id,
                "hypothesis_id": hypothesis_id
            })
            
            # Link pattern to evidence
            evidence_ids = [dict(res["e"]).get("id") for res in evidence_results]
            extractor.link_pattern_to_evidence(pattern_id, evidence_ids)
            
            pattern_created = True
        
        return ValidationResponse(
            status="validation_complete",
            hypothesis_id=hypothesis_id,
            manifold_thought_id=manifold_thought_id,
            decision=request.decision,
            pattern_created=pattern_created,
            pattern_id=pattern_id
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate hypothesis: {str(e)}")


@router.get("/hypotheses/pending-validation")
async def get_pending_validations(
    min_annotations: int = 3,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Get hypotheses that have reached validation threshold.
    For agent review queue.
    """
    try:
        query = """
            MATCH (h:Hypothesis)
            WHERE h.status = 'active'
            AND (COALESCE(h.evidence_count,0) + COALESCE(h.contradiction_count,0)) >= $min_annotations
            RETURN h
            ORDER BY (COALESCE(h.evidence_count,0) + COALESCE(h.contradiction_count,0)) DESC
            LIMIT 50
        """
        
        results = store.execute_read(query, {"min_annotations": min_annotations})
        
        hypotheses = []
        for record in results:
            h_data = dict(record["h"])
            hypotheses.append({
                "id": h_data.get("id"),
                "statement": h_data.get("statement"),
                "confidence": h_data.get("confidence"),
                "evidence_count": h_data.get("evidence_count", 0),
                "contradiction_count": h_data.get("contradiction_count", 0),
                "created_at": h_data.get("created_at"),
                "created_by": h_data.get("created_by"),
                "manifold_thought_id": h_data.get("manifold_thought_id")
            })
        
        return {
            "status": "success",
            "count": len(hypotheses),
            "hypotheses": hypotheses
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pending validations: {str(e)}")


@router.get("/hypotheses/{hypothesis_id}")
async def get_hypothesis(
    hypothesis_id: str,
    store: GraphStore = Depends(get_graph_store)
):
    """Get detailed hypothesis with evidence"""
    try:
        # Get hypothesis
        hyp_query = """
            MATCH (h:Hypothesis {id: $hypothesis_id})
            RETURN h
        """
        hyp_result = store.execute_read(hyp_query, {"hypothesis_id": hypothesis_id})
        
        if not hyp_result:
            raise HTTPException(status_code=404, detail=f"Hypothesis {hypothesis_id} not found")
        
        hyp_data = dict(hyp_result[0]["h"])
        
        # Get supporting evidence
        evidence_query = """
            MATCH (e)-[r:EVIDENCE_FOR]->(h:Hypothesis {id: $hypothesis_id})
            RETURN e, r
        """
        evidence_results = store.execute_read(evidence_query, {"hypothesis_id": hypothesis_id})
        
        # Get contradictions
        contra_query = """
            MATCH (e)-[r:CONTRADICTS]->(h:Hypothesis {id: $hypothesis_id})
            RETURN e, r
        """
        contra_results = store.execute_read(contra_query, {"hypothesis_id": hypothesis_id})
        
        supporting_evidence = [
            {
                "id": dict(res["e"]).get("id"),
                "type": dict(res["e"]).get("type"),
                "confidence": dict(res["r"]).get("confidence"),
                "notes": dict(res["r"]).get("notes"),
                "annotated_by": dict(res["r"]).get("annotated_by")
            }
            for res in evidence_results
        ]
        
        contradictions = [
            {
                "id": dict(res["e"]).get("id"),
                "type": dict(res["e"]).get("type"),
                "confidence": dict(res["r"]).get("confidence"),
                "notes": dict(res["r"]).get("notes"),
                "annotated_by": dict(res["r"]).get("annotated_by")
            }
            for res in contra_results
        ]
        
        return {
            "hypothesis": hyp_data,
            "supporting_evidence": supporting_evidence,
            "contradictions": contradictions
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get hypothesis: {str(e)}")

