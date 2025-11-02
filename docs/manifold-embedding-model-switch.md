# Manifold Embedding Model Wechsel & Collection Reset

## Problem

Wenn bei `mf-search` mit "nvidia" auch viel Pharma-Zeug kommt, kann das an schlechten Embeddings liegen. Unterschiedliche Models haben unterschiedliche Qualität für semantische Suche.

## Aktuelle Modelle

- **Manifold**: `mixedbread-ai/mxbai-embed-large-v1` (1024 dims) - OHNE Query/Passage Prefixes
- **Tesseract**: `intfloat/multilingual-e5-large` (1024 dims) - MIT Query/Passage Prefixes

**Tesseract nutzt das gleiche Model wie Manifold könnte** und hat bessere Ergebnisse, weil:
1. `intfloat/multilingual-e5-large` ist speziell für multilinguale Suche optimiert
2. Query/Passage Prefixes ("query: " / "passage: ") verbessern die Qualität deutlich

## Empfohlene Modelle

### Option 1: `intfloat/multilingual-e5-large` (Empfohlen)
- ✅ Multilingual (DE, EN, etc.)
- ✅ Query/Passage Prefixes unterstützt
- ✅ Gute Performance in Tesseract
- ✅ 1024 dims (passt zu aktueller Collection)

### Option 2: `intfloat/e5-large-v2`
- ✅ Sehr gute englische Suche
- ✅ Query/Passage Prefixes unterstützt
- ✅ 1024 dims
- ⚠️ Weniger gut für Deutsch

### Option 3: `BAAI/bge-large-en-v1.5`
- ✅ Sehr gute englische Suche
- ✅ 1024 dims
- ⚠️ Keine Query/Passage Prefixes nötig

## Model Wechseln

### Schritt 1: Environment Variable setzen

```bash
# In docker-compose.yml oder .env
MANIFOLD_EMBED_MODEL=intfloat/multilingual-e5-large
```

Oder temporär:
```bash
export MANIFOLD_EMBED_MODEL=intfloat/multilingual-e5-large
```

### Schritt 2: API neu starten

```bash
docker-compose restart manifold-api
```

### Schritt 3: Collection Reset (ALLE Daten löschen!)

**WICHTIG**: Dies löscht ALLE Thoughts in Manifold!

```bash
curl -X POST http://localhost:8083/v1/memory/admin/reset \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

Response:
```json
{
  "status": "success",
  "message": "Manifold factory reset complete",
  "deleted": {
    "thoughts": 1234
  },
  "collection_recreated": true
}
```

### Schritt 4: Alle Thoughts neu erstellen

Nach dem Reset müssen alle Thoughts neu erstellt werden. Das passiert automatisch wenn:
- Agent-Runs laufen (`daily-news-analyst`, `manifold-knowledge-curator`)
- Neue Thoughts via API erstellt werden

**Oder**: Falls du bestehende Thoughts aus einer Backup-DB wiederherstellen willst, müsstest du sie neu via API erstellen (die Embeddings werden dann automatisch mit dem neuen Model generiert).

## Re-Embedding ohne Reset

Falls du nur die Embeddings neu generieren willst (ohne Daten zu löschen):

### Schritt 1: Dry-Run prüfen

```bash
curl -X POST http://localhost:8083/v1/memory/admin/reindex \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'
```

Response:
```json
{
  "status": "ok",
  "would_reindex": 1234
}
```

### Schritt 2: Re-Indexing durchführen

```bash
curl -X POST http://localhost:8083/v1/memory/admin/reindex \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false}'
```

**WICHTIG**: Dies nutzt das aktuell konfigurierte Model (aus `MANIFOLD_EMBED_MODEL`). Stelle sicher, dass das neue Model bereits konfiguriert ist!

### Schritt 3: Optional - Filter nach Type/Status

```bash
# Nur bestimmte Thoughts re-indexen
curl -X POST http://localhost:8083/v1/memory/admin/reindex \
  -H "Content-Type: application/json" \
  -d '{
    "dry_run": false,
    "filters": {
      "must": [
        {"key": "type", "match": {"value": "analysis"}}
      ]
    }
  }'
```

## Bulk Re-Embedding für einzelne Thoughts

Falls du nur bestimmte Thoughts neu embedden willst:

```bash
curl -X POST http://localhost:8083/v1/memory/admin/bulk/reembed \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["thought-id-1", "thought-id-2"],
    "vectors": ["text", "title"]
  }'
```

## Query/Passage Prefixes

Die Implementierung unterstützt jetzt automatisch Query/Passage Prefixes für e5-Models:

- **Queries** (Suche): `embed(text, is_query=True)` → fügt "query: " Prefix hinzu
- **Passages** (Content): `embed(text, is_query=False)` → fügt "passage: " Prefix hinzu

Das passiert automatisch wenn das Model "e5" im Namen hat.

## Vergleich: Vorher vs. Nachher

### Vorher (mixedbread-ai/mxbai-embed-large-v1)
- ❌ Keine Query/Passage Prefixes
- ❌ Möglicherweise schlechtere semantische Suche
- ✅ Gut für allgemeine Embeddings

### Nachher (intfloat/multilingual-e5-large)
- ✅ Query/Passage Prefixes
- ✅ Besser für semantische Suche
- ✅ Multilingual Support
- ✅ Gleiches Model wie Tesseract (konsistent)

## Testing

Nach dem Model-Wechsel solltest du testen:

```bash
# Test-Suche
curl -X POST http://localhost:8083/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "nvidia",
    "limit": 10
  }'
```

Erwartung: Relevante NVIDIA-Ergebnisse, nicht Pharma-Zeug.

## Troubleshooting

### Problem: Collection hat falsche Vector-Dimension

Wenn das neue Model eine andere Dimension hat (z.B. 768 statt 1024), musst du die Collection neu erstellen:

```bash
# 1. Reset (löscht Collection)
curl -X POST http://localhost:8083/v1/memory/admin/reset \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'

# 2. Collection wird automatisch mit neuer Dimension erstellt beim nächsten Thought-Create
```

### Problem: Embeddings sind immer noch schlecht

1. Prüfe ob das Model korrekt geladen wurde:
   ```bash
   curl http://localhost:8083/v1/memory/health
   ```
   → Sollte das neue Model in `embedding_model` zeigen

2. Prüfe ob Query/Passage Prefixes aktiv sind:
   - Models mit "e5" im Namen nutzen automatisch Prefixes
   - Prüfe Logs beim Search-Call

3. Teste mit einem anderen Model (z.B. `BAAI/bge-large-en-v1.5`)

## Empfehlung

**Für deinen Use-Case (DE/EN Marktanalyse):**
- ✅ `intfloat/multilingual-e5-large` - Beste Wahl
- ✅ Gleiches Model wie Tesseract → konsistente Ergebnisse
- ✅ Query/Passage Prefixes → bessere Suche
- ✅ Multilingual → funktioniert für DE und EN

