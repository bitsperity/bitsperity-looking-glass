from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..deps import get_db


router = APIRouter()


class ContextSave(BaseModel):
    agent_name: str
    run_id: str
    context_summary: str
    kg_entities: Optional[list] = None
    manifold_thoughts: Optional[list] = None


@router.get("/context/{agent_name}")
def get_run_context(
    agent_name: str,
    days_back: int = Query(7, description="Number of days to look back")
):
    """Load run context for an agent (pre-run)."""
    db = get_db()
    
    # Check if agent exists
    agent = db.get_agent_config(agent_name)
    if not agent:
        return {"error": f"Agent '{agent_name}' not found"}
    
    context = db.get_run_context(agent_name, days_back)
    
    return {
        "agent_name": agent_name,
        "days_back": days_back,
        "context": context
    }


@router.post("/context")
def save_run_context(context_data: ContextSave):
    """Save run context (post-run)."""
    db = get_db()
    
    import uuid
    context_id = str(uuid.uuid4())
    
    db.save_run_context(
        context_id,
        context_data.agent_name,
        context_data.run_id,
        context_data.context_summary,
        context_data.kg_entities,
        context_data.manifold_thoughts
    )
    
    return {
        "status": "saved",
        "context_id": context_id,
        "agent_name": context_data.agent_name,
        "run_id": context_data.run_id
    }

