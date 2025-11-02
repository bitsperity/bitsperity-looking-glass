from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
import httpx
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Orchestrator API URL (default: http://localhost:3100)
ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://localhost:3100")


@router.get("/tools")
async def list_all_tools(mcp_name: Optional[str] = None):
    """
    List all available tools from all MCPs.
    Queries the orchestrator's ToolExecutor API to get actual tools.
    Returns simple mapping: {mcp_name: [tool_names]} for token efficiency.
    """
    try:
        # Build URL
        if mcp_name:
            url = f"{ORCHESTRATOR_URL}/api/tools/{mcp_name}"
        else:
            url = f"{ORCHESTRATOR_URL}/api/tools"
        
        logger.info(f"Fetching tools from orchestrator: {url}")
        
        # Fetch from orchestrator
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
        
        # Extract only tool names, grouped by MCP
        result: dict[str, list[str]] = {}
        
        if mcp_name:
            # Single MCP response - orchestrator returns {mcp, count, tools: [...]}
            tools = data.get("tools", [])
            tool_names = [tool.get("toolName") or tool.get("name", "").replace(f"{mcp_name}_", "") for tool in tools]
            result[mcp_name] = [name for name in tool_names if name]
        else:
            # All MCPs response - orchestrator returns {byMcp: {...}}
            by_mcp = data.get("byMcp", {})
            for mcp, tools in by_mcp.items():
                tool_names = [tool.get("toolName") or tool.get("name", "").replace(f"{mcp}_", "") for tool in tools]
                result[mcp] = [name for name in tool_names if name]
        
        return result
            
    except httpx.TimeoutException:
        logger.error("Timeout fetching tools from orchestrator")
        raise HTTPException(status_code=504, detail="Orchestrator timeout")
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching tools: {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Orchestrator error: {e.response.text}")
    except Exception as e:
        logger.error(f"Error fetching tools: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch tools: {str(e)}")


@router.get("/tools/{mcp_name}")
async def list_mcp_tools(mcp_name: str):
    """List tools for a specific MCP."""
    return await list_all_tools(mcp_name=mcp_name)

