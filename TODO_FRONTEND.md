# 📝 TODO: Frontend (Vite/Svelte Fix)

**Status**: BLOCKED - Known Bug  
**Priority**: LOW (Graph funktioniert!)

---

## 🎯 AKTUELLE SITUATION

✅ **Knowledge Graph**: 293 Entities, 296 Relations - FUNKTIONIERT!  
✅ **Python Scripts**: graph_stats.py, extract_*.py - FUNKTIONIEREN!  
✅ **Repo**: 100% clean, alle Daten extrahiert  
⚠️ **Frontend**: Vite 5 + Svelte 4 Kompatibilitätsproblem

---

## 🐛 PROBLEM

```
Error: Unrecognized option 'hmr'
```

**Root Cause**: Vite 5.4.20 übergibt `hmr` Option an Svelte 4 Compiler, der diese nicht kennt.

**Known Issue**: https://github.com/sveltejs/vite-plugin-svelte/issues/842

---

## ✅ FUNKTIONIERT BEREITS (Nutze das!)

### Python CLI
```bash
# Graph Stats
python3 scripts/graph_stats.py

# Custom Queries
python3 -c "
import sqlite3
conn = sqlite3.connect('knowledge_graph/knowledgegraph.db')

# Alle Companies
companies = conn.execute('SELECT name FROM entities WHERE entity_type=\"company\" AND project=\"alpaca-bot\"').fetchall()
print(f'Companies: {len(companies)}')
for c in companies[:10]:
    print(f'  - {c[0]}')

# High Convictions
convictions = conn.execute('SELECT name FROM entities WHERE entity_type=\"conviction_entry\" AND project=\"alpaca-bot\"').fetchall()
print(f'\\nHigh Convictions: {len(convictions)}')
"
```

### SQLite CLI
```bash
sqlite3 knowledge_graph/knowledgegraph.db

# Queries:
.mode column
.headers on

SELECT entity_type, COUNT(*) as count 
FROM entities 
WHERE project='alpaca-bot' 
GROUP BY entity_type 
ORDER BY count DESC;

SELECT name, entity_type 
FROM entities 
WHERE entity_type='conviction_entry' 
LIMIT 10;
```

---

## 🔧 LÖSUNG: Neues Frontend von Grund auf

### Option A: Vite 4 (Stabil mit Svelte 4)

```bash
npm create vite@4 frontend -- --template svelte-ts
cd frontend
npm install better-sqlite3 d3 chart.js
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**package.json:**
```json
{
  "dependencies": {
    "d3": "^7.9.0",
    "better-sqlite3": "^9.2.2"
  },
  "devDependencies": {
    "vite": "^4.5.3",
    "@sveltejs/vite-plugin-svelte": "^2.5.3",
    "svelte": "^4.2.8",
    "tailwindcss": "^3.4.1"
  }
}
```

### Option B: Svelte 5 (Modern, Breaking Changes)

```bash
npm create svelte@latest frontend
cd frontend
# Choose: Skeleton + TypeScript
npm install better-sqlite3 d3 chart.js
npm install -D tailwindcss
```

**package.json:**
```json
{
  "dependencies": {
    "d3": "^7.9.0",
    "better-sqlite3": "^11.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "svelte": "^5.0.0",
    "tailwindcss": "^3.4.1"
  }
}
```

**Migration Guide**: https://svelte.dev/docs/svelte/v5-migration-guide

---

## 📋 FRONTEND TODOS (Wenn du Zeit hast)

1. [ ] Entscheide: Vite 4 + Svelte 4 ODER Vite 5 + Svelte 5
2. [ ] Setup neues Projekt (siehe oben)
3. [ ] Kopiere TypeScript Files:
   - `src/lib/kg-client.ts` (SQLite Client)
   - `src/lib/components/GraphViz.svelte` (D3 Component)
4. [ ] Erstelle Views:
   - Dashboard (`/`)
   - Graph Explorer (`/graph`)
   - Companies (`/companies`)
5. [ ] API Endpoints:
   - `/api/stats`
   - `/api/entities`
   - `/api/relations`

**Aufwand**: 3-4 Stunden

---

## 💡 ALTERNATIVE: Andere Frameworks

Falls Svelte zu buggy ist:

### Next.js
```bash
npx create-next-app@latest frontend
npm install better-sqlite3 d3
```

### SolidStart
```bash
npx degit solidjs/templates/ts frontend
cd frontend && npm install
npm install better-sqlite3 d3
```

---

## 🎯 PRIORITÄT

**LOW** - Graph funktioniert bereits perfekt mit Python/SQLite CLI!

Frontend ist nice-to-have, aber nicht kritisch. Alle Daten sind verfügbar und querybar.

---

## 📊 CURRENT WORKAROUND

```bash
# Quick Graph Query
alias graph-stats="python3 /home/sascha-laptop/alpaca-bot/scripts/graph_stats.py"
alias graph-query="sqlite3 /home/sascha-laptop/alpaca-bot/knowledge_graph/knowledgegraph.db"

# Usage
graph-stats
graph-query "SELECT * FROM entities WHERE entity_type='company' LIMIT 10;"
```

**→ Das reicht erstmal! Frontend später wenn du Zeit hast.** ✅


