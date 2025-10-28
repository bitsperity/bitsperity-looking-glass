"""Smoke tests for Manifold Backend Upgrade v2."""
import pytest
from datetime import datetime
from uuid import uuid4


class TestMultiVector:
    """Test 3-vector embedding (text, title, summary)."""
    
    def test_create_thought_with_summary(self, client):
        """Create thought with summary field → 3 vectors embedded."""
        response = client.post("/v1/memory/thought", json={
            "title": "Tesla Q4 2025 Analysis",
            "content": "Revenue grew 15% YoY, margins compressed due to competition...",
            "summary": "Tesla Q4: 15% YoY growth, margin compression",
            "type": "analysis",
            "tickers": ["TSLA"],
            "confidence_score": 0.85
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "created"
        assert "thought_id" in data
    
    def test_search_with_vector_type(self, client):
        """Search with vector_type parameter (summary/text/title)."""
        # Create test thought
        create_resp = client.post("/v1/memory/thought", json={
            "title": "Bitcoin macro thesis",
            "content": "Long Bitcoin due to macro factors...",
            "summary": "Bitcoin bullish macro setup",
            "type": "hypothesis",
            "tickers": ["BTC"],
        })
        assert create_resp.status_code == 200
        
        # Search with summary vector (cheap)
        search_resp = client.post("/v1/memory/search", json={
            "query": "Bitcoin bullish",
            "vector_type": "summary",
            "include_content": False,
            "limit": 10
        })
        assert search_resp.status_code == 200
        data = search_resp.json()
        assert data["status"] == "ok"
        # Should return lightweight results (no content)
        if len(data["results"]) > 0:
            assert "title" in data["results"][0]["thought"]
            assert "summary" in data["results"][0]["thought"]


class TestSessions:
    """Test Session/Workspace management."""
    
    def test_create_thoughts_in_session(self, client):
        """Create multiple thoughts in a session."""
        session_id = str(uuid4())
        
        for i in range(3):
            response = client.post("/v1/memory/thought", json={
                "title": f"Thought {i}",
                "content": f"Content {i}",
                "type": "observation",
                "session_id": session_id,
                "tickers": ["AAPL"],
            })
            assert response.status_code == 200
    
    def test_list_sessions(self, client):
        """List all sessions."""
        response = client.get("/v1/memory/sessions")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "sessions" in data
    
    def test_get_session_thoughts(self, client):
        """Fetch all thoughts in a session."""
        session_id = str(uuid4())
        
        # Create test thoughts
        for i in range(2):
            client.post("/v1/memory/thought", json={
                "title": f"Test {i}",
                "content": f"Content {i}",
                "session_id": session_id,
                "type": "observation",
            })
        
        # Fetch session
        response = client.get(f"/v1/memory/session/{session_id}/thoughts")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["count"] == 2
    
    def test_session_summary(self, client):
        """Create and retrieve session summary."""
        session_id = str(uuid4())
        
        # Create summary
        response = client.post(f"/v1/memory/session/{session_id}/summary", json={
            "title": "Session Summary",
            "summary": "Key findings from session",
            "content": "Detailed findings..."
        })
        assert response.status_code == 200
        
        # Retrieve summary
        response = client.get(f"/v1/memory/session/{session_id}/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["summary"] is not None
        assert data["summary"]["type"] == "summary"


class TestVersioning:
    """Test light versioning (snapshots on update)."""
    
    def test_patch_creates_version_snapshot(self, client):
        """Update thought → version snapshot created."""
        # Create thought
        create_resp = client.post("/v1/memory/thought", json={
            "title": "Original Title",
            "content": "Original content",
            "type": "observation",
        })
        thought_id = create_resp.json()["thought_id"]
        
        # Update thought
        patch_resp = client.patch(f"/v1/memory/thought/{thought_id}", json={
            "title": "Updated Title",
            "status": "validated"
        })
        assert patch_resp.status_code == 200
        
        # Fetch and check versions
        get_resp = client.get(f"/v1/memory/thought/{thought_id}")
        assert get_resp.status_code == 200
        thought = get_resp.json()
        assert thought["version"] == 2
        assert len(thought.get("versions", [])) > 0


class TestDuplicateWarnings:
    """Test duplicate detection (no auto-delete)."""
    
    def test_check_duplicate(self, client):
        """Check if thought content duplicates existing."""
        # Create reference thought
        client.post("/v1/memory/thought", json={
            "title": "Tesla Valuation",
            "content": "Tesla is overvalued at current levels",
            "type": "hypothesis",
            "tickers": ["TSLA"],
        })
        
        # Check for duplicate
        response = client.post("/v1/memory/check-duplicate", json={
            "title": "Tesla Overvalued",
            "summary": "Tesla overvalued",
            "threshold": 0.85
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "similar_count" in data
    
    def test_get_duplicate_warnings(self, client):
        """Get list of potential duplicates in system."""
        response = client.get("/v1/memory/warnings/duplicates?threshold=0.92&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "duplicate_pairs_found" in data


class TestTreeNavigation:
    """Test parent-child chunking via tree structure."""
    
    def test_create_parent_children(self, client):
        """Create parent thought + child sections."""
        # Create parent
        parent_resp = client.post("/v1/memory/thought", json={
            "title": "Deep Dive: Tesla Financial Analysis",
            "content": "Executive summary...",
            "type": "analysis",
        })
        parent_id = parent_resp.json()["thought_id"]
        
        # Create children
        for i, section in enumerate(["Revenue", "Margins", "Valuation"]):
            client.post("/v1/memory/thought", json={
                "title": f"Section: {section}",
                "content": f"Content for {section}...",
                "type": "analysis",
                "parent_id": parent_id,
                "ordinal": i,
                "section": section,
            })
        
        # Get tree
        response = client.get(f"/v1/memory/thought/{parent_id}/tree")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert len(data["children"]) == 3
        # Check ordering
        assert data["children"][0]["ordinal"] == 0
        assert data["children"][1]["ordinal"] == 1
    
    def test_get_children_endpoint(self, client):
        """Fetch children directly via /children endpoint."""
        # Create parent + children
        parent_resp = client.post("/v1/memory/thought", json={
            "title": "Parent",
            "content": "Parent content",
            "type": "analysis",
        })
        parent_id = parent_resp.json()["thought_id"]
        
        client.post("/v1/memory/thought", json={
            "title": "Child 1",
            "content": "Child content",
            "parent_id": parent_id,
            "ordinal": 0,
        })
        
        # Fetch children
        response = client.get(f"/v1/memory/thought/{parent_id}/children")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["children_count"] == 1


class TestGraphWithNewFilters:
    """Test graph endpoints with session/workspace filters."""
    
    def test_graph_with_session_filter(self, client):
        """Get graph filtered by session_id."""
        session_id = str(uuid4())
        
        # Create thoughts in session
        for i in range(3):
            client.post("/v1/memory/thought", json={
                "title": f"Thought {i}",
                "content": f"Content {i}",
                "session_id": session_id,
                "type": "observation",
            })
        
        # Get session graph
        response = client.get(f"/v1/memory/session/{session_id}/graph")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert len(data["nodes"]) == 3
    
    def test_global_graph_includes_parent_child_edges(self, client):
        """Global graph shows parent-child edges (type='section-of')."""
        # Create parent + child
        parent_resp = client.post("/v1/memory/thought", json={
            "title": "Parent Analysis",
            "content": "Parent",
            "type": "analysis",
        })
        parent_id = parent_resp.json()["thought_id"]
        
        client.post("/v1/memory/thought", json={
            "title": "Child Section",
            "content": "Child",
            "parent_id": parent_id,
            "ordinal": 0,
            "type": "analysis",
        })
        
        # Get graph
        response = client.get("/v1/memory/graph?limit=100")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        
        # Check for section-of edges
        section_edges = [e for e in data["edges"] if e["type"] == "section-of"]
        assert len(section_edges) > 0
