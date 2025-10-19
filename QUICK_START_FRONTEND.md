# 🚀 Frontend Quick Start

## Start

```bash
cd /home/sascha-laptop/alpaca-bot/frontend
npm run dev
```

Öffne: **http://localhost:5173**

---

## 📸 Dashboard

Das Dashboard zeigt:
- ✅ **Total Entities**: 249
- ✅ **Total Relations**: 253
- ✅ **Entity Types**: Top 10 (companies, discoveries, trades, ...)
- ✅ **Relation Types**: Top 10 (trades, operates_in, ...)

---

## 🎯 Nächste Features (TODO)

### 1. Graph Explorer (`/graph`)
```typescript
// Interactive D3 Force-Directed Graph
// Filter: By tags, entity type, date range
// Click: Show entity details + connected nodes
```

### 2. Portfolio Builder (`/portfolio`)
```typescript
// Query-based Portfolio Construction
// Input: Themes, Min Conviction, Max Positions
// Output: Tilts mit Rationales
// Action: Export to JSON → Execute
```

### 3. Conviction Tracker (`/convictions`)
```typescript
// Time-series Chart (Chart.js)
// X-Axis: Date, Y-Axis: Conviction (0-1)
// Lines: LRCX, ASML, KLAC, CEG, etc.
// Interactive: Hover → Show thesis
```

---

## 🔧 Entwicklung

### Neue Route hinzufügen
```bash
mkdir -p src/routes/graph
touch src/routes/graph/+page.svelte
```

### Neue API hinzufügen
```bash
mkdir -p src/routes/api/convictions
touch src/routes/api/convictions/+server.ts
```

### KG Client erweitern
```typescript
// src/lib/kg-client.ts
export class KnowledgeGraphClient {
  // Neue Methode
  getThemeMomentum(days: number = 7) {
    // Implementation
  }
}
```

---

## 🎨 Styling

Aktuell: **Vanilla CSS** (in `<style>` Blöcken)

Optional upgrade:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 🐛 Debugging

### SQLite Connection Error
```bash
# Check DB Path
ls -lh ../knowledge_graph/knowledgegraph.db

# Test DB
python3 -c "import sqlite3; print(sqlite3.connect('../knowledge_graph/knowledgegraph.db').execute('SELECT COUNT(*) FROM entities').fetchone())"
```

### API 500 Error
```bash
# Check Server Logs
npm run dev
# → Terminal output zeigt Fehler
```

---

## 📦 Build für Production

```bash
npm run build
npm run preview
```

Deploy:
```bash
# Static Adapter
npm i -D @sveltejs/adapter-static

# svelte.config.js
import adapter from '@sveltejs/adapter-static';
```

---

## 🔗 Links

- **SvelteKit Docs**: https://svelte.dev/docs/kit
- **D3.js Examples**: https://observablehq.com/@d3
- **Chart.js Docs**: https://www.chartjs.org/docs/


