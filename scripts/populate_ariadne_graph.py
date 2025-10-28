#!/usr/bin/env python3
"""
Populate Ariadne Knowledge Graph with realistic test data.
Creates a comprehensive network of companies, events, and relationships.
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any

API_BASE = "http://localhost:8082"

# Color codes for output
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

def print_step(step: int, total: int, message: str):
    """Print a formatted step message"""
    print(f"\n{BLUE}[{step}/{total}] {message}{NC}")

def print_success(message: str):
    """Print success message"""
    print(f"{GREEN}✅ {message}{NC}")

def print_error(message: str):
    """Print error message"""
    print(f"{RED}❌ {message}{NC}")

def reset_graph() -> bool:
    """Reset the graph to factory settings"""
    try:
        response = requests.post(f"{API_BASE}/v1/kg/admin/reset?confirm=true")
        data = response.json()
        if data.get("status") == "success":
            print_success(f"Graph reset. Deleted: {data['deleted']['nodes']} nodes, {data['deleted']['edges']} edges")
            return True
        else:
            print_error("Graph reset failed")
            return False
    except Exception as e:
        print_error(f"Reset error: {str(e)}")
        return False

def create_company(ticker: str, name: str, sector: str, description: str) -> Dict[str, Any]:
    """Create a company node"""
    try:
        response = requests.post(
            f"{API_BASE}/v1/kg/write/node",
            json={
                "label": "Company",
                "properties": {
                    "ticker": ticker,
                    "name": name,
                    "sector": sector,
                    "description": description
                }
            }
        )
        if response.status_code == 200:
            return response.json()
        else:
            print_error(f"Failed to create company {ticker}: {response.text}")
            return {}
    except Exception as e:
        print_error(f"Company creation error: {str(e)}")
        return {}

def create_event(title: str, description: str, occurred_at: str, event_type: str = "Market") -> Dict[str, Any]:
    """Create an event node"""
    try:
        response = requests.post(
            f"{API_BASE}/v1/kg/write/node",
            json={
                "label": "Event",
                "properties": {
                    "title": title,
                    "description": description,
                    "occurred_at": occurred_at,
                    "type": event_type
                }
            }
        )
        if response.status_code == 200:
            return response.json()
        else:
            print_error(f"Failed to create event {title}: {response.text}")
            return {}
    except Exception as e:
        print_error(f"Event creation error: {str(e)}")
        return {}

def create_relationship(source_id: int, target_id: int, rel_type: str, properties: Dict) -> bool:
    """Create a relationship between two nodes"""
    try:
        response = requests.post(
            f"{API_BASE}/v1/kg/write/edge",
            json={
                "source_id": source_id,
                "target_id": target_id,
                "rel_type": rel_type,
                "properties": properties
            }
        )
        if response.status_code == 200:
            return True
        else:
            # Silent fail on relationships - they might already exist
            return False
    except Exception as e:
        return False

def main():
    print(f"\n{BLUE}╔═══════════════════════════════════════════════════════════╗{NC}")
    print(f"{BLUE}║  ARIADNE KNOWLEDGE GRAPH POPULATION & FULL VALIDATION      ║{NC}")
    print(f"{BLUE}╚═══════════════════════════════════════════════════════════╝{NC}")

    step = 0
    total_steps = 5

    # STEP 1: Reset Graph
    step += 1
    print_step(step, total_steps, "RESETTING GRAPH")
    if not reset_graph():
        print_error("Cannot continue without reset")
        return

    time.sleep(1)

    # STEP 2: Create Companies
    step += 1
    print_step(step, total_steps, "CREATING COMPANIES")

    companies_data = [
        {"ticker": "TSLA", "name": "Tesla Inc", "sector": "Automotive", "description": "Electric vehicles and energy storage leader"},
        {"ticker": "NVDA", "name": "NVIDIA Corporation", "sector": "Semiconductors", "description": "AI chip design and GPU leader"},
        {"ticker": "AAPL", "name": "Apple Inc", "sector": "Technology", "description": "Consumer electronics and services"},
        {"ticker": "MSFT", "name": "Microsoft", "sector": "Software", "description": "Cloud computing and enterprise software"},
        {"ticker": "TSM", "name": "Taiwan Semiconductor Manufacturing", "sector": "Semiconductors", "description": "Leading semiconductor foundry"},
        {"ticker": "AMZN", "name": "Amazon", "sector": "E-commerce", "description": "E-commerce and cloud infrastructure"},
        {"ticker": "GOOGL", "name": "Alphabet/Google", "sector": "Software", "description": "Search, advertising, and cloud services"},
        {"ticker": "META", "name": "Meta/Facebook", "sector": "Software", "description": "Social media and metaverse"},
    ]

    companies = {}
    for company in companies_data:
        result = create_company(
            company["ticker"],
            company["name"],
            company["sector"],
            company["description"]
        )
        if "id" in result:
            companies[company["ticker"]] = result["id"]
            print(f"   Created: {company['name']} (ID: {result['id']})")

    print_success(f"Created {len(companies)} companies")

    # STEP 3: Create Events
    step += 1
    print_step(step, total_steps, "CREATING EVENTS")

    now = datetime.now()
    events_data = [
        {"title": "NVDA AI Breakthrough", "description": "NVIDIA announces next-gen AI GPU architecture", "type": "Product"},
        {"title": "TSLA Q4 Earnings Beat", "description": "Tesla reports better than expected Q4 2024 earnings", "type": "Earnings"},
        {"title": "Global Chip Shortage Warning", "description": "Semiconductor industry faces supply chain challenges", "type": "Market"},
        {"title": "AI Boom Accelerates", "description": "Market-wide focus on AI and machine learning investments", "type": "Trend"},
        {"title": "Tech Sector Correction", "description": "Technology stocks experience 5% pullback", "type": "Market"},
        {"title": "Microsoft Launches Copilot+PC", "description": "New AI-powered personal computer initiative", "type": "Product"},
        {"title": "Apple AI Integration", "description": "Apple incorporates AI into iOS ecosystem", "type": "Product"},
    ]

    events = {}
    for i, event in enumerate(events_data):
        event_time = (now - timedelta(days=i)).isoformat()
        result = create_event(
            event["title"],
            event["description"],
            event_time,
            event["type"]
        )
        if "id" in result:
            events[event["title"]] = result["id"]
            print(f"   Created: {event['title']} (ID: {result['id']})")

    print_success(f"Created {len(events)} events")

    # STEP 4: Create Relationships
    step += 1
    print_step(step, total_steps, "CREATING RELATIONSHIPS")

    relationships_count = 0

    # Supply chain relationships
    supply_chains = [
        ("NVDA", "TSLA", "SUPPLIES_TO", {"effect": "positive", "strength": 0.95}),
        ("TSM", "NVDA", "SUPPLIES_TO", {"effect": "positive", "strength": 0.90}),
        ("TSM", "AAPL", "SUPPLIES_TO", {"effect": "positive", "strength": 0.85}),
        ("NVDA", "AAPL", "ENABLES", {"effect": "positive", "strength": 0.80}),
        ("NVDA", "MSFT", "SUPPLIES_TO", {"effect": "positive", "strength": 0.88}),
        ("MSFT", "AMZN", "PARTNERS", {"effect": "neutral", "strength": 0.70}),
    ]

    print(f"   Creating {len(supply_chains)} supply chain relationships...")
    for source, target, rel_type, props in supply_chains:
        if source in companies and target in companies:
            if create_relationship(companies[source], companies[target], rel_type, props):
                relationships_count += 1

    # Competition relationships
    competitions = [
        ("TSLA", "AMZN", "COMPETES_WITH", {"intensity": "high", "market": "EV/Logistics"}),
        ("NVDA", "AMD", "COMPETES_WITH", {"intensity": "high", "market": "GPUs"}),  # AMD might not exist
        ("AAPL", "META", "COMPETES_WITH", {"intensity": "medium", "market": "Services"}),
        ("MSFT", "GOOGL", "COMPETES_WITH", {"intensity": "high", "market": "Cloud/Search"}),
    ]

    print(f"   Creating competition relationships...")
    for source, target, rel_type, props in competitions:
        if source in companies and target in companies:
            if create_relationship(companies[source], companies[target], rel_type, props):
                relationships_count += 1

    # Affects relationships (event -> company)
    affects_mapping = {
        "NVDA AI Breakthrough": [("NVDA", 0.95), ("TSLA", 0.60), ("MSFT", 0.70)],
        "TSLA Q4 Earnings Beat": [("TSLA", 0.90), ("AMZN", 0.40)],
        "AI Boom Accelerates": [("NVDA", 0.85), ("MSFT", 0.80), ("AAPL", 0.70), ("GOOGL", 0.85)],
    }

    print(f"   Creating event->company relationships...")
    for event_title, companies_affected in affects_mapping.items():
        if event_title in events:
            event_id = events[event_title]
            for ticker, strength in companies_affected:
                if ticker in companies:
                    if create_relationship(
                        event_id,
                        companies[ticker],
                        "AFFECTS",
                        {"effect": "positive", "strength": strength}
                    ):
                        relationships_count += 1

    print_success(f"Created {relationships_count} relationships")

    # STEP 5: Validate All Endpoints
    step += 1
    print_step(step, total_steps, "VALIDATING ALL 7 ENDPOINTS")

    endpoints = [
        ("Search", f"{API_BASE}/v1/kg/search?text=NVIDIA&limit=10", "count"),
        ("Path Finding", f"{API_BASE}/v1/kg/path?from_id=1&to_id=2&max_hops=5", "path_count"),
        ("Time-slice", f"{API_BASE}/v1/kg/time-slice?as_of=2025-01-20T00:00:00&limit=100", "edge_count"),
        ("Centrality", f"{API_BASE}/v1/kg/analytics/centrality?algo=pagerank&topk=10", "count"),
        ("Communities", f"{API_BASE}/v1/kg/analytics/communities?algo=louvain", "community_count"),
        ("Similarity", f"{API_BASE}/v1/kg/analytics/similarity?node_id=1&topk=10", "count"),
        ("Link-Prediction", f"{API_BASE}/v1/kg/analytics/link-prediction?node_id=1&topk=10", "count"),
    ]

    passed = 0
    failed = 0

    for endpoint_name, url, result_key in endpoints:
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    result_value = data.get(result_key, 0)
                    print(f"   {GREEN}✅{NC} {endpoint_name}: {result_value} results")
                    passed += 1
                else:
                    print(f"   {RED}❌{NC} {endpoint_name}: No success status")
                    failed += 1
            else:
                print(f"   {RED}❌{NC} {endpoint_name}: HTTP {response.status_code}")
                failed += 1
        except Exception as e:
            print(f"   {RED}❌{NC} {endpoint_name}: {str(e)}")
            failed += 1

    # Final Summary
    print(f"\n{BLUE}{'='*60}{NC}")
    print(f"{BLUE}GRAPH STATISTICS{NC}")
    print(f"{BLUE}{'='*60}{NC}")

    try:
        stats_response = requests.get(f"{API_BASE}/v1/kg/admin/stats")
        if stats_response.status_code == 200:
            stats = stats_response.json().get("statistics", {})
            print(f"   Total Nodes: {stats.get('total_nodes', 0)}")
            print(f"   Total Edges: {stats.get('total_edges', 0)}")
            print(f"   Nodes by Label: {stats.get('nodes_by_label', {})}")
            print(f"   Edges by Type: {stats.get('edges_by_type', {})}")
    except:
        pass

    print(f"\n{GREEN}{'='*60}{NC}")
    print(f"{GREEN}VALIDATION SUMMARY{NC}")
    print(f"{GREEN}{'='*60}{NC}")
    print(f"   Endpoints Passed: {GREEN}{passed}/7{NC}")
    print(f"   Endpoints Failed: {RED}{failed}/7{NC}")
    print(f"   Companies Created: {GREEN}{len(companies)}{NC}")
    print(f"   Events Created: {GREEN}{len(events)}{NC}")
    print(f"   Relationships Created: {GREEN}{relationships_count}{NC}")

    if passed == 7:
        print(f"\n{GREEN}🎉 ALL TESTS PASSED - BACKEND FULLY VALIDATED!{NC}\n")
    else:
        print(f"\n{YELLOW}⚠️  Some tests failed - review errors above{NC}\n")

if __name__ == "__main__":
    main()
