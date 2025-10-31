from __future__ import annotations

import uuid
import json
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..deps import get_db


router = APIRouter()


class InsightCreate(BaseModel):
    agent_name: str
    insight: str
    priority: str = "medium"  # 'high', 'medium', 'low'
    run_id: Optional[str] = None
    related_entities: Optional[list[str]] = None


@router.post("/insights")
def save_insights(insight_data: InsightCreate):
    """Save insights for an agent."""
    db = get_db()
    
    # Check if agent exists
    agent = db.get_agent_config(insight_data.agent_name)
    if not agent:
        return {"error": f"Agent '{insight_data.agent_name}' not found"}
    
    insight_id = str(uuid.uuid4())
    
    db.save_insight(
        insight_id,
        insight_data.agent_name,
        insight_data.insight,
        insight_data.priority,
        insight_data.run_id,
        insight_data.related_entities
    )
    
    return {
        "status": "saved",
        "insight_id": insight_id,
        "agent_name": insight_data.agent_name
    }


@router.get("/insights/{agent_name}")
def get_insights(
    agent_name: str,
    days_back: int = Query(7, description="Number of days to look back")
):
    """Get insights for an agent."""
    db = get_db()
    
    # Check if agent exists
    agent = db.get_agent_config(agent_name)
    if not agent:
        return {"error": f"Agent '{agent_name}' not found"}
    
    insights = db.get_insights(agent_name, days_back)
    
    # Parse JSON fields
    for insight in insights:
        if insight.get("related_entities"):
            try:
                insight["related_entities"] = json.loads(insight["related_entities"])
            except:
                insight["related_entities"] = []
    
    return {
        "agent_name": agent_name,
        "days_back": days_back,
        "count": len(insights),
        "insights": insights
    }

