import sqlite3

conn = sqlite3.connect('knowledge_graph/knowledgegraph.db')

print("="*60)
print("📊 KNOWLEDGE GRAPH STATISTICS")
print("="*60)

total_entities = conn.execute('SELECT COUNT(*) FROM entities WHERE project="alpaca-bot"').fetchone()[0]
total_relations = conn.execute('SELECT COUNT(*) FROM relations WHERE project="alpaca-bot"').fetchone()[0]

print(f"Total Entities:  {total_entities}")
print(f"Total Relations: {total_relations}")
print()

print("Entity Types:")
print("-"*60)
for row in conn.execute('SELECT entity_type, COUNT(*) FROM entities WHERE project="alpaca-bot" GROUP BY entity_type ORDER BY COUNT(*) DESC'):
    print(f"  {row[0]:30s}: {row[1]:3d}")

print()
print("Relation Types:")
print("-"*60)
for row in conn.execute('SELECT relation_type, COUNT(*) FROM relations WHERE project="alpaca-bot" GROUP BY relation_type ORDER BY COUNT(*) DESC'):
    print(f"  {row[0]:30s}: {row[1]:3d}")

print("="*60)

conn.close()


