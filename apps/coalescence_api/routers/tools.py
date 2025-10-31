from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/tools")
def list_all_tools(mcp_name: Optional[str] = None):
    """
    List all available tools from all MCPs.
    This endpoint will be implemented to query the orchestrator's ToolExecutor.
    For now, returns a placeholder response.
    """
    # TODO: Integrate with orchestrator ToolExecutor to get actual tools
    # This would require the orchestrator to expose its ToolExecutor via API
    # Or we could query MCPs directly via stdio
    
    return {
        "message": "Tool listing will be implemented via orchestrator integration",
        "mcp_name": mcp_name,
        "tools": []
    }


@router.get("/tools/{mcp_name}")
def list_mcp_tools(mcp_name: str):
    """List tools for a specific MCP."""
    return list_all_tools(mcp_name=mcp_name)

