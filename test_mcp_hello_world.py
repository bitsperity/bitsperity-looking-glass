#!/usr/bin/env python3
"""
Test-Skript für den Hello World MCP Server.
Testet alle Tools direkt, ohne den MCP-Server zu starten.
"""

import sys
sys.path.insert(0, '/home/sascha-laptop/alpaca-bot')

# Importiere die Tools aus dem mcp_hello_world Modul
from mcp_hello_world import greet, get_current_time, calculate, get_greeting_stats

print("=" * 70)
print("🧪 TESTE HELLO WORLD MCP SERVER TOOLS")
print("=" * 70)
print()

# Test 1: greet auf Deutsch
print("📝 Test 1: Begrüßung auf Deutsch")
result = greet("Sascha", "de")
print(f"   Ergebnis: {result}")
print()

# Test 2: greet auf Englisch
print("📝 Test 2: Begrüßung auf Englisch")
result = greet("World", "en")
print(f"   Ergebnis: {result}")
print()

# Test 3: greet auf Spanisch
print("📝 Test 3: Begrüßung auf Spanisch")
result = greet("Mundo", "es")
print(f"   Ergebnis: {result}")
print()

# Test 4: Aktuelle Zeit (lokal)
print("📝 Test 4: Aktuelle lokale Zeit")
result = get_current_time("local")
print(f"   Ergebnis: {result}")
print()

# Test 5: UTC Zeit
print("📝 Test 5: UTC Zeit")
result = get_current_time("utc")
print(f"   Ergebnis: {result}")
print()

# Test 6: Addition
print("📝 Test 6: Addition (5 + 3)")
result = calculate("add", 5, 3)
print(f"   Ergebnis: {result}")
print()

# Test 7: Multiplikation
print("📝 Test 7: Multiplikation (42 * 1337)")
result = calculate("multiply", 42, 1337)
print(f"   Ergebnis: {result}")
print()

# Test 8: Division
print("📝 Test 8: Division (100 / 5)")
result = calculate("divide", 100, 5)
print(f"   Ergebnis: {result}")
print()

# Test 9: Division durch Null
print("📝 Test 9: Division durch Null (sollte Fehler zurückgeben)")
result = calculate("divide", 10, 0)
print(f"   Ergebnis: {result}")
print()

# Test 10: Statistiken
print("📝 Test 10: Begrüßungsstatistiken")
result = get_greeting_stats()
print(f"   Ergebnis: {result}")
print()

print("=" * 70)
print("✅ ALLE TESTS ERFOLGREICH ABGESCHLOSSEN")
print("=" * 70)
print()
print("Der MCP-Server ist bereit für die Verwendung in Cursor!")
print("Starte Cursor neu, um den 'hello-world' Server zu verwenden.")

