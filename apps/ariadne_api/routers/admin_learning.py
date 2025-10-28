"""
Learning and feedback management endpoints.
Automatically adjust confidence values based on observed patterns and occurrences.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from libs.ariadne_core.storage import GraphStore
from apps.ariadne_api.main import get_graph_store
from datetime import datetime, timedelta

router = APIRouter()


class LearningFeedbackRequest(BaseModel):
    """Request body for learning feedback"""
    label: str = "Company"
    window_days: int = 30
    max_adjust: float = 0.2  # Maximum confidence increase per run
    step: float = 0.05  # Increase per occurrence
    dry_run: bool = True


@router.post("/learning/apply-feedback")
async def apply_learning_feedback(
    request: LearningFeedbackRequest,
    store: GraphStore = Depends(get_graph_store)
):
    """
    Apply learning feedback: automatically adjust relationship confidences
    based on observation counts and temporal patterns.
    
    Logic:
    - Count pattern occurrences within time window
    - For each relation: new_confidence = min(old + (count * step), old + max_adjust, 1.0)
    - Persist adjustment timestamp: confidence_adjusted_at
    
    This allows the system to "learn" which relations are truly reliable
    based on repeated observation in the data.
    
    Parameters:
    - label: Node label to analyze (e.g., 'Company')
    - window_days: Time window for counting occurrences
    - max_adjust: Cap on confidence increase per run (0-0.5)
    - step: Confidence increase per occurrence (0.01-0.1)
    - dry_run: Preview without changes (true) or execute (false)
    
    Returns:
    - List of relations updated with new confidence scores
    - Summary statistics (count, avg increase)
    """
    try:
        # Calculate time window
        now = datetime.utcnow().isoformat()
        cutoff = (datetime.utcnow() - timedelta(days=request.window_days)).isoformat()
        
        # Query: Find relations that appear multiple times (learning signal)
        detection_query = f"""
        MATCH (n:{request.label})-[r]->(m)
        
        // Count evidence for this relation (e.g., via Events, News, Observations)
        OPTIONAL MATCH (n)-[:INVOLVES|AFFECTS|DERIVES_FROM]-(ev:Event)
        WHERE coalesce(ev.occurred_at, ev.created_at, '') >= '{cutoff}'
        WITH n, r, m, count(DISTINCT ev) as event_count
        
        OPTIONAL MATCH (n)-[:OBSERVED_IN]-(obs:Observation)
        WHERE coalesce(obs.date, '') >= '{cutoff}'
        WITH n, r, m, event_count, count(DISTINCT obs) as obs_count
        
        // Total occurrences
        WITH n, r, m,
             event_count + obs_count as total_occurrences,
             coalesce(r.confidence, 0.7) as current_confidence
        
        WHERE total_occurrences > 0
        
        // Calculate new confidence
        WITH {{
            relation_id: elementId(r),
            source_id: elementId(n),
            source_name: coalesce(n.name, n.ticker, 'Unknown'),
            target_id: elementId(m),
            target_name: coalesce(m.name, m.ticker, 'Unknown'),
            rel_type: type(r),
            old_confidence: current_confidence,
            occurrences: total_occurrences,
            raw_increase: total_occurrences * {request.step},
            capped_increase: CASE WHEN total_occurrences * {request.step} < {request.max_adjust} THEN total_occurrences * {request.step} ELSE {request.max_adjust} END,
            new_confidence: CASE WHEN current_confidence + (CASE WHEN total_occurrences * {request.step} < {request.max_adjust} THEN total_occurrences * {request.step} ELSE {request.max_adjust} END) > 1.0 THEN 1.0 ELSE current_confidence + (CASE WHEN total_occurrences * {request.step} < {request.max_adjust} THEN total_occurrences * {request.step} ELSE {request.max_adjust} END) END
        }} as learning_update
        
        RETURN learning_update
        ORDER BY learning_update.new_confidence - learning_update.old_confidence DESC
        """
        
        detection_results = store.execute_read(detection_query, {})
        
        if not detection_results:
            return {
                "status": "success",
                "dry_run": request.dry_run,
                "learning_updates": [],
                "count": 0,
                "message": f"No patterns detected for {request.label} in {request.window_days} day window"
            }
        
        updates = [r["learning_update"] for r in detection_results]
        
        if request.dry_run:
            # Return preview without changes
            return {
                "status": "success",
                "dry_run": True,
                "parameters": {
                    "label": request.label,
                    "window_days": request.window_days,
                    "step": request.step,
                    "max_adjust": request.max_adjust
                },
                "learning_updates": updates,
                "count": len(updates),
                "summary": {
                    "total_relations_to_update": len(updates),
                    "avg_confidence_increase": round(
                        sum(u["new_confidence"] - u["old_confidence"] for u in updates) / len(updates), 3
                    ) if updates else 0.0,
                    "min_increase": round(min(u["new_confidence"] - u["old_confidence"] for u in updates), 3) if updates else 0.0,
                    "max_increase": round(max(u["new_confidence"] - u["old_confidence"] for u in updates), 3) if updates else 0.0
                },
                "message": "Dry-run mode: no changes made. Set dry_run=false to execute."
            }
        
        # EXECUTE: Apply confidence updates
        execute_query = """
        MATCH (n)-[r]->(m)
        WHERE elementId(r) IN $relation_ids
        
        // Match relations and apply new confidence
        WITH r, $updates as updates_map
        UNWIND updates_map as update
        WHERE elementId(r) = update.relation_id
        
        SET r.confidence = update.new_confidence,
            r.confidence_adjusted_at = datetime(),
            r.learning_occurrences = update.occurrences,
            r.confidence_history = coalesce(r.confidence_history, []) + [
                {
                    timestamp: datetime(),
                    old_value: update.old_confidence,
                    new_value: update.new_confidence,
                    reason: 'learning_feedback',
                    occurrences: update.occurrences
                }
            ]
        
        RETURN {
            relation_id: elementId(r),
            old_confidence: update.old_confidence,
            new_confidence: update.new_confidence,
            increase: update.new_confidence - update.old_confidence,
            occurrences: update.occurrences
        } as executed_update
        """
        
        try:
            # Extract IDs and prepare update map
            relation_ids = [u["relation_id"] for u in updates]
            updates_map = updates
            
            # Execute in batches to avoid parameter size limits
            batch_size = 100
            all_executed = []
            
            for i in range(0, len(relation_ids), batch_size):
                batch_ids = relation_ids[i:i+batch_size]
                batch_updates = updates[i:i+batch_size]
                
                exec_results = store.execute_write(execute_query, {
                    "relation_ids": batch_ids,
                    "updates": batch_updates
                })
                
                if exec_results:
                    all_executed.extend([r["executed_update"] for r in exec_results])
            
            return {
                "status": "success",
                "dry_run": False,
                "action": "learning_applied",
                "learning_updates": all_executed,
                "count": len(all_executed),
                "summary": {
                    "total_relations_updated": len(all_executed),
                    "avg_confidence_increase": round(
                        sum(u["increase"] for u in all_executed) / len(all_executed), 3
                    ) if all_executed else 0.0,
                    "total_occurrences_observed": sum(u["occurrences"] for u in all_executed),
                    "window_days": request.window_days,
                    "message": f"Learning feedback applied to {len(all_executed)} relations"
                }
            }
        
        except Exception as exec_error:
            raise HTTPException(status_code=500, detail=f"Learning feedback execution failed: {str(exec_error)}")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Learning feedback processing failed: {str(e)}")


@router.get("/learning/history")
async def get_learning_history(
    relation_id: str = Query(..., description="Element ID of relationship to inspect"),
    limit: int = Query(10, ge=1, le=50, description="Maximum history entries"),
    store: GraphStore = Depends(get_graph_store)
):
    """
    Retrieve confidence adjustment history for a specific relation.
    
    Shows all confidence updates applied through learning feedback,
    allowing auditability and transparency.
    
    Returns:
    - Chronological list of confidence changes
    - Reason and metadata for each change
    """
    try:
        query = """
        MATCH (n)-[r]->(m)
        WHERE elementId(r) = $relation_id
        
        RETURN {
            relation_id: elementId(r),
            source: coalesce(n.name, n.ticker, 'Unknown'),
            target: coalesce(m.name, m.ticker, 'Unknown'),
            rel_type: type(r),
            current_confidence: coalesce(r.confidence, 0.7),
            confidence_history: coalesce(r.confidence_history, []),
            last_adjusted: coalesce(r.confidence_adjusted_at, 'never')
        } as history
        """
        
        results = store.execute_read(query, {"relation_id": relation_id})
        
        if not results:
            raise HTTPException(status_code=404, detail=f"Relation {relation_id} not found")
        
        history = results[0]["history"]
        
        return {
            "status": "success",
            "relation": {
                "id": history["relation_id"],
                "source": history["source"],
                "target": history["target"],
                "type": history["rel_type"],
                "current_confidence": round(history["current_confidence"], 3),
                "last_adjusted": history["last_adjusted"]
            },
            "adjustments": history["confidence_history"][-limit:] if history["confidence_history"] else [],
            "count": len(history["confidence_history"]) if history["confidence_history"] else 0
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Learning history retrieval failed: {str(e)}")
