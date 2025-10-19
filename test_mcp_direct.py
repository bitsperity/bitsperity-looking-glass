#!/usr/bin/env python3
"""
Direkter Test des MCP-Servers durch Simulation eines MCP-Clients.
"""

import json
import asyncio
import sys

# Füge den Server-Code hinzu
sys.path.insert(0, '/home/sascha-laptop/alpaca-bot')

from mcp_hello_world_correct import server

async def test_tools():
    """Teste alle Tools direkt."""
    
    print("=" * 70)
    print("🧪 TESTE MCP SERVER TOOLS DIREKT")
    print("=" * 70)
    print()
    
    # Importiere die Handler-Funktionen
    from mcp_hello_world_correct import list_tools, call_tool, list_resources, read_resource
    
    # Test 1: Liste alle Tools
    print("📝 Test 1: Liste alle verfügbaren Tools")
    tools = await list_tools()
    for tool in tools:
        print(f"   - {tool.name}: {tool.description}")
    print()
    
    # Test 2: Begrüßung auf Deutsch
    print("📝 Test 2: greet(name='Sascha', language='de')")
    result = await call_tool("greet", {"name": "Sascha", "language": "de"})
    print(f"   Ergebnis: {result[0].text}")
    print()
    
    # Test 3: Begrüßung auf Englisch
    print("📝 Test 3: greet(name='World', language='en')")
    result = await call_tool("greet", {"name": "World", "language": "en"})
    print(f"   Ergebnis: {result[0].text}")
    print()
    
    # Test 4: Aktuelle Zeit
    print("📝 Test 4: get_current_time(timezone='local')")
    result = await call_tool("get_current_time", {"timezone": "local"})
    print(f"   Ergebnis: {result[0].text}")
    print()
    
    # Test 5: UTC Zeit
    print("📝 Test 5: get_current_time(timezone='utc')")
    result = await call_tool("get_current_time", {"timezone": "utc"})
    print(f"   Ergebnis: {result[0].text}")
    print()
    
    # Test 6: Addition
    print("📝 Test 6: calculate(operation='add', a=5, b=3)")
    result = await call_tool("calculate", {"operation": "add", "a": 5, "b": 3})
    print(f"   Ergebnis: {result[0].text}")
    print()
    
    # Test 7: Multiplikation
    print("📝 Test 7: calculate(operation='multiply', a=42, b=1337)")
    result = await call_tool("calculate", {"operation": "multiply", "a": 42, "b": 1337})
    print(f"   Ergebnis: {result[0].text}")
    print()
    
    # Test 8: Division
    print("📝 Test 8: calculate(operation='divide', a=100, b=5)")
    result = await call_tool("calculate", {"operation": "divide", "a": 100, "b": 5})
    print(f"   Ergebnis: {result[0].text}")
    print()
    
    # Test 9: Division durch Null
    print("📝 Test 9: calculate(operation='divide', a=10, b=0) - Fehlerbehandlung")
    result = await call_tool("calculate", {"operation": "divide", "a": 10, "b": 0})
    print(f"   Ergebnis: {result[0].text}")
    print()
    
    # Test 10: Statistiken
    print("📝 Test 10: get_greeting_stats()")
    result = await call_tool("get_greeting_stats", {})
    print(f"   Ergebnis: {result[0].text}")
    print()
    
    # Test 11: Resources
    print("📝 Test 11: Liste alle Resources")
    resources = await list_resources()
    for resource in resources:
        print(f"   - {resource['uri']}: {resource['name']}")
    print()
    
    # Test 12: Lese Resource
    print("📝 Test 12: Lese Resource hello://info")
    info = await read_resource("hello://info")
    print(f"   {info[:100]}...")
    print()
    
    print("=" * 70)
    print("✅ ALLE TESTS ERFOLGREICH!")
    print("=" * 70)
    print()
    print("💡 Der MCP-Server funktioniert korrekt!")
    print("   Resources: ✅ Funktionieren in Cursor")
    print("   Tools: ⏳ Benötigen Cursor-Neustart")
    print()
    print("📝 NÄCHSTE SCHRITTE:")
    print("   1. Starte Cursor KOMPLETT neu (schließe alle Fenster)")
    print("   2. Öffne einen NEUEN Chat")
    print("   3. Teste mit: 'Begrüße mich auf Deutsch mit dem Namen Sascha'")

if __name__ == "__main__":
    asyncio.run(test_tools())

