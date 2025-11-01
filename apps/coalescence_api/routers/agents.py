from __future__ import annotations

import uuid
import json
from typing import Any, Optional
from fastapi import APIRouter, status, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..deps import get_db


router = APIRouter()


class TurnConfig(BaseModel):
    id: int
    name: str
    model: Optional[str] = None
    max_tokens: int
    max_steps: Optional[int] = None
    mcps: Optional[list[str]] = None  # Deprecated: use tools instead
    tools: Optional[list[str]] = None  # Specific tool names (prefixed, e.g. "satbase_list-news")
    prompt: Optional[str] = None
    prompt_file: Optional[str] = None
    rules: Optional[list[str]] = None


class AgentConfigCreate(BaseModel):
    name: str
    enabled: bool = True
    model: str
    schedule: str
    system_prompt: Optional[str] = None
    max_tokens_per_turn: Optional[int] = None
    max_steps: int = 5
    budget_daily_tokens: int
    timeout_minutes: int
    turns: list[TurnConfig]


class AgentConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    model: Optional[str] = None
    schedule: Optional[str] = None
    system_prompt: Optional[str] = None
    max_tokens_per_turn: Optional[int] = None
    max_steps: Optional[int] = None
    budget_daily_tokens: Optional[int] = None
    timeout_minutes: Optional[int] = None
    turns: Optional[list[TurnConfig]] = None


@router.get("/agents")
def list_agents():
    """List all agent configs."""
    db = get_db()
    agents = db.list_agent_configs()
    
    # Format response
    result = []
    for agent in agents:
        # Get turns count for this agent
        agent_config = db.get_agent_config(agent["name"])
        turns_count = len(agent_config.get("turns", [])) if agent_config else 0
        
        result.append({
            "name": agent["name"],
            "enabled": bool(agent["enabled"]),
            "model": agent["model"],
            "schedule": agent["schedule"],
            "turns": agent_config.get("turns", []) if agent_config else [],  # Include turns array
            "last_run_at": agent.get("last_run_at"),
            "total_runs": agent.get("total_runs", 0),
            "total_tokens": agent.get("total_tokens", 0),
            "total_cost_usd": agent.get("total_cost_usd", 0),
            "created_at": agent.get("created_at"),
            "updated_at": agent.get("updated_at")
        })
    
    return {"count": len(result), "agents": result}


@router.get("/agents/{name}")
def get_agent(name: str):
    """Get agent config by name."""
    db = get_db()
    agent = db.get_agent_config(name)
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{name}' not found")
    
    return agent


@router.post("/agents")
def create_agent(config: AgentConfigCreate):
    """Create a new agent config."""
    db = get_db()
    
    # Check if agent already exists
    existing = db.get_agent_config(config.name)
    if existing:
        raise HTTPException(status_code=409, detail=f"Agent '{config.name}' already exists")
    
    # Save agent config
    config_dict = config.model_dump()
    db.save_agent_config(config.name, config_dict)
    
    # Save turns - convert Pydantic models to dicts
    if config.turns:
        turns_dicts = [turn.model_dump() for turn in config.turns]
        db.save_agent_turns(config.name, turns_dicts)
    
    return {"status": "created", "agent": config.name}


@router.patch("/agents/{name}")
def update_agent(name: str, updates: AgentConfigUpdate):
    """Update agent config."""
    db = get_db()
    
    # Check if agent exists
    existing = db.get_agent_config(name)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Agent '{name}' not found")
    
    # Prepare updates
    update_dict = updates.model_dump(exclude_unset=True)
    
    # Handle turns separately
    turns = update_dict.pop("turns", None)
    
    # Update config
    if update_dict:
        db.update_agent_config(name, update_dict)
    
    # Update turns if provided - convert Pydantic models to dicts
    if turns is not None:
        turns_dicts = []
        for turn in turns:
            if hasattr(turn, 'model_dump'):
                turn_dict = turn.model_dump(exclude_unset=False)
            else:
                turn_dict = dict(turn)
            # Ensure mcps and tools are lists (not None)
            if turn_dict.get("mcps") is None:
                turn_dict["mcps"] = []
            if turn_dict.get("tools") is None:
                turn_dict["tools"] = []
            turns_dicts.append(turn_dict)
        db.save_agent_turns(name, turns_dicts)
    
    # Reload and return updated config
    updated = db.get_agent_config(name)
    return {"status": "updated", "agent": updated}


@router.delete("/agents/{name}")
def delete_agent(name: str):
    """Delete agent config."""
    db = get_db()
    
    # Handle empty name case (workaround for agents created with empty names)
    # FastAPI redirects /agents/ to /agents, so we need to handle empty names specially
    # Use _empty as a special marker from frontend
    if name == '_empty':
        # Check if empty agent exists by listing all agents (get_agent_config('') might not work reliably)
        all_agents = db.list_agent_configs()
        empty_agent = next((a for a in all_agents if not a.get('name') or a.get('name', '').strip() == ''), None)
        
        if not empty_agent:
            raise HTTPException(status_code=404, detail="Agent with empty name not found")
        
        db.delete_agent_config('')
        return {"status": "deleted", "agent": ""}
    
    # Handle actual empty string (shouldn't happen via normal routes, but handle it)
    if not name or name.strip() == '':
        all_agents = db.list_agent_configs()
        empty_agent = next((a for a in all_agents if not a.get('name') or a.get('name', '').strip() == ''), None)
        
        if not empty_agent:
            raise HTTPException(status_code=404, detail="Agent with empty name not found")
        
        db.delete_agent_config('')
        return {"status": "deleted", "agent": ""}
    
    # Check if agent exists
    existing = db.get_agent_config(name)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Agent '{name}' not found")
    
    db.delete_agent_config(name)
    
    return {"status": "deleted", "agent": name}


@router.post("/agents/{name}/trigger")
def trigger_agent(name: str):
    """Manually trigger an agent run (delegates to orchestrator API)."""
    # This endpoint would need to communicate with the orchestrator
    # For now, return a placeholder response
    return {
        "status": "triggered",
        "agent": name,
        "message": "Agent run triggered. Check orchestrator logs for status."
    }

