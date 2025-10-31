from __future__ import annotations

import uuid
import json
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..deps import get_db


router = APIRouter()


class MessageCreate(BaseModel):
    from_agent: str
    to_agent: str  # agent name or "all" for broadcast
    type: str  # 'insight', 'warning', 'question', 'data'
    content: str
    related_entities: Optional[list[str]] = None


@router.post("/messages")
def send_message(message_data: MessageCreate):
    """Send a message from one agent to another."""
    db = get_db()
    
    # Check if from_agent exists
    from_agent = db.get_agent_config(message_data.from_agent)
    if not from_agent:
        return {"error": f"Agent '{message_data.from_agent}' not found"}
    
    # If to_agent is not "all", check if it exists
    if message_data.to_agent != "all":
        to_agent = db.get_agent_config(message_data.to_agent)
        if not to_agent:
            return {"error": f"Agent '{message_data.to_agent}' not found"}
    
    message_id = str(uuid.uuid4())
    
    db.save_message(
        message_id,
        message_data.from_agent,
        message_data.to_agent,
        message_data.type,
        message_data.content,
        message_data.related_entities
    )
    
    return {
        "status": "sent",
        "message_id": message_id,
        "from_agent": message_data.from_agent,
        "to_agent": message_data.to_agent
    }


@router.get("/messages/{agent_name}")
def get_messages(
    agent_name: str,
    unread_only: bool = Query(True, description="Only return unread messages"),
    from_agent: Optional[str] = Query(None, description="Filter by sender agent")
):
    """Get messages for an agent."""
    db = get_db()
    
    # Check if agent exists
    agent = db.get_agent_config(agent_name)
    if not agent:
        return {"error": f"Agent '{agent_name}' not found"}
    
    messages = db.get_messages(agent_name, unread_only, from_agent)
    
    # Parse JSON fields
    for msg in messages:
        if msg.get("related_entities"):
            try:
                msg["related_entities"] = json.loads(msg["related_entities"])
            except:
                msg["related_entities"] = []
    
    return {
        "agent_name": agent_name,
        "unread_only": unread_only,
        "count": len(messages),
        "messages": messages
    }


@router.patch("/messages/{message_id}/read")
def mark_message_read(message_id: str):
    """Mark a message as read."""
    db = get_db()
    
    db.mark_message_read(message_id)
    
    return {
        "status": "read",
        "message_id": message_id
    }

