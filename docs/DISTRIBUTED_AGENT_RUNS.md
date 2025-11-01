# Verteile Agent-Runs: State-Management & Incremental Processing

## Problem Statement

**Ziel**: Agents sollen über den Tag verteilt mehrere kleine Runs machen statt einem großen Run, um:
- ✅ Rate Limits zu respektieren (100K input tokens/min für Haiku 3.5)
- ✅ Kosten zu minimieren (keine redundanten API-Calls)
- ✅ Echten Mehrwert pro Run bieten (keine Duplikate)

**Herausforderung**: Wie weiß der Agent, was er schon getan hat?

---

## Lösung: Multi-Layer State-Management

### Layer 1: Manifold als primärer State-Speicher

**Konzept**: Agents speichern **"Processing-Marker"** als Thoughts in Manifold.

**Thought-Struktur für State-Tracking**:
```json
{
  "type": "meta",
  "title": "Processed Articles: 2025-01-15",
  "summary": "Processed 50 articles from 2025-01-15",
  "content": "Article IDs: [id1, id2, id3, ...]",
  "tags": ["daily-news-analyst", "processed", "2025-01-15"],
  "created_at": "2025-01-15T07:00:00Z"
}
```

**Vorteile**:
- ✅ Semantische Suche: `mf-search(query="processed articles today", filters={tags: ["daily-news-analyst", "2025-01-15"]})`
- ✅ Duplikat-Check: `mf-check-duplicate(title="Processed Articles: 2025-01-15")`
- ✅ Timeline-Filter: Nur Thoughts von heute/vorgestern
- ✅ Ticker-basiert: `filters={tickers: ["AAPL"]}` um zu sehen, was für AAPL schon verarbeitet wurde

**Workflow**:
1. **Pre-Run**: Agent sucht nach Processing-Markern der letzten N Stunden
2. **Run**: Agent verarbeitet nur neue Artikel (nicht in Markern)
3. **Post-Run**: Agent speichert neuen Processing-Marker mit verarbeiteten Article-IDs

---

### Layer 2: Coalescence Run-Context

**Konzept**: Run-spezifischer State (welcher Run hat was gemacht).

**Tools**:
- `coalescence_get-run-context(agent_name, days_back=1)` - Lädt Kontext vor Run
- `coalescence_save-run-context(agent_name, run_id, context_summary, manifold_thoughts=[...])` - Speichert Kontext nach Run

**Verwendung**:
- Verknüpft Runs mit Manifold Thoughts
- Ermöglicht Run-basierte Historie ("Was hat Run XYZ gemacht?")
- Unterstützt Agent-zu-Agent-Kommunikation

---

### Layer 3: Satbase Datums-Filter

**Konzept**: Agents filtern News nach `published_at` um nur neue Artikel zu holen.

**Workflow**:
1. **Pre-Run**: Agent bestimmt letzten Verarbeitungszeitpunkt
   - Option A: Aus Manifold Thoughts (neuester `created_at` von Processing-Marker)
   - Option B: Aus Coalescence Run-Context (letzter erfolgreicher Run)
2. **Run**: `satbase_list-news(from=last_processed_date, to=today, include_body=false)` 
3. **Post-Run**: Verarbeitete Artikel als Thought-Marker speichern

---

## Konkreter Agent-Workflow: `daily-news-analyst`

### Aktueller Zustand (ein großer Run):
```
07:00 - Großer Run startet
  - Turn 1: discover_news (50 Artikel ohne Body)
  - Turn 2: analyze_relevant (TOP-5 mit Body)
  - Turn 3: store_insights (Speichern als Thoughts)
~35K-135K Tokens pro Run
```

### Optimierter Zustand (verteilte Runs):
```
07:00 - Run 1: Discovery
  - Turn 1: discover_news (nur neue Artikel seit letztem Run)
  - Turn 2: store_discovery (Processing-Marker + TOP-10 Artikel-IDs)
~5K-10K Tokens

09:00 - Run 2: Deep-Dive (nur wenn neue Artikel)
  - Turn 1: check_what_missed (suche nach Processing-Markern)
  - Turn 2: analyze_relevant (TOP-5 mit Body, nur neue)
  - Turn 3: store_insights
~15K-25K Tokens

11:00 - Run 3: Deep-Dive Fortsetzung
  - Turn 1: check_what_missed
  - Turn 2: analyze_relevant (weitere TOP-5)
  - Turn 3: store_insights
~15K-25K Tokens

...weitere Runs über den Tag verteilt...
```

---

## Implementierung: Neue Agent-Regel

### `rule_incremental_processing`

**Inhalt**:
```markdown
# Incremental Processing Pattern

## Pre-Run State-Check

1. **Lade letzte Processing-Marker**:
   - `coalescence_get-run-context(agent_name="daily-news-analyst", days_back=1)`
   - `mf-search(query="processed articles", filters={tags: ["daily-news-analyst", "processed"], type: "meta"}, limit=5)`

2. **Bestimme letzten Verarbeitungszeitpunkt**:
   - Aus neuestem Processing-Marker: `created_at` oder `content` (Article-IDs)
   - Oder: Heute 00:00 UTC (für tägliche Agents)

3. **Hole nur neue Artikel**:
   - `satbase_list-news(from=last_processed_date, to=today, include_body=false, limit=50)`
   - Filtere bereits verarbeitete Article-IDs (aus Processing-Markern)

## Run-Execution

- Verarbeite nur **neue** Artikel (nicht in Processing-Markern)
- Für jeden verarbeiteten Artikel: Prüfe Duplikate mit `mf-check-duplicate()`
- Speichere nur **signifikante** Erkenntnisse (nicht alle Artikel)

## Post-Run State-Save

1. **Speichere Processing-Marker**:
   - `mf-create-thought({
       type: "meta",
       title: "Processed Articles: YYYY-MM-DD HH:MM",
       summary: "Processed N articles",
       content: "Article IDs: [id1, id2, ...]",
       tags: ["daily-news-analyst", "processed", "YYYY-MM-DD"]
     })`

2. **Speichere Run-Context**:
   - `coalescence_save-run-context(
       agent_name="daily-news-analyst",
       run_id=run_id,
       context_summary="Processed N articles, created M thoughts",
       manifold_thoughts=[thought_id1, thought_id2, ...]
     )`

3. **Speichere Insights**:
   - `coalescence_save-insights(
       agent_name="daily-news-analyst",
       insight="TOP-3 Signale: ...",
       priority="medium",
       run_id=run_id
     )`

## Redundanz-Vermeidung

- **Niemals** denselben Artikel zweimal verarbeiten
- **Niemals** denselben Thought zweimal erstellen (nutze `mf-check-duplicate`)
- **Niemals** Run ohne neuen Mehrwert starten (prüfe vorher: gibt es neue Artikel?)
```

---

## Agent-Konfiguration: Verteilte Schedule

### Option 1: Stündliche Runs (empfohlen)
```json
{
  "schedule": "0 * * * *",  // Jede Stunde
  "budget_daily_tokens": 12000,
  "max_tokens_per_turn": 3000
}
```

**Vorteile**:
- ✅ Kleine Runs (~5K-15K Tokens pro Run)
- ✅ Rate Limit-friendly (max 1K requests/min, 100K tokens/min)
- ✅ Frische Daten (stündlich neue Artikel)

### Option 2: Adaptive Schedule
```json
{
  "schedule": "0 */2 * * *",  // Alle 2 Stunden
  "turns": [
    {
      "name": "check_if_needed",
      "prompt": "Prüfe ob neue Artikel verfügbar sind. Wenn nicht, beende Run sofort."
    }
  ]
}
```

**Vorteile**:
- ✅ Nur Runs wenn nötig
- ✅ Spart Tokens wenn keine neuen Daten

---

## Rate Limit & Cost Optimization

### Token-Budget pro Run (Haiku 3.5)

**Discovery Run**:
- Input: ~2K-5K Tokens (System-Prompt + 50 Artikel-Metadaten)
- Output: ~500-1K Tokens (TOP-10 Zusammenfassung)
- **Total: ~3K-6K Tokens**

**Deep-Dive Run**:
- Input: ~8K-15K Tokens (System-Prompt + 5 Artikel-Bodies + Preise)
- Output: ~2K-4K Tokens (Analyse)
- **Total: ~10K-19K Tokens**

**Mit 100K Tokens/Min Limit**:
- ✅ Discovery Run: ~3-6 Sekunden
- ✅ Deep-Dive Run: ~10-19 Sekunden
- ✅ 1 Run pro Minute möglich (unter Limit)

### Tägliches Budget

**12K Tokens Budget** = ~2-4 Runs pro Tag
- 1x Discovery (~5K)
- 2-3x Deep-Dive (~7K total)

**Alternative: 24K Tokens Budget** = ~4-6 Runs pro Tag
- 1x Discovery (~5K)
- 4-5x Deep-Dive (~19K total)

---

## Tools-Checkliste für Agents

### ✅ Verfügbare Tools für State-Management

1. **Manifold**:
   - ✅ `mf-search` - Suche nach Processing-Markern
   - ✅ `mf-check-duplicate` - Verhindere Duplikate
   - ✅ `mf-create-thought` - Speichere Processing-Marker
   - ✅ `mf-get-thought` - Hole spezifischen Marker

2. **Coalescence**:
   - ✅ `coalescence_get-run-context` - Lade Run-Kontext
   - ✅ `coalescence_save-run-context` - Speichere Run-Kontext
   - ✅ `coalescence_save-insights` - Speichere Erkenntnisse
   - ✅ `coalescence_get-insights` - Hole Erkenntnisse

3. **Satbase**:
   - ✅ `satbase_list-news` - Filter nach Datum/IDs
   - ✅ `satbase_get-news-by-id` - Hole spezifische Artikel

**FAZIT**: Alle benötigten Tools sind bereits vorhanden! ✅

---

## Beispiel: Optimierter `daily-news-analyst` Agent

### Turn 1: `check_state_and_discover`
```markdown
1. Lade letzten Processing-Marker:
   - coalescence_get-run-context(agent_name="daily-news-analyst", days_back=1)
   - mf-search(query="processed articles today", filters={tags: ["daily-news-analyst", "processed"], type: "meta"}, limit=1)

2. Bestimme letzten Verarbeitungszeitpunkt:
   - Wenn Marker gefunden: Nutze `created_at` oder parse `content` für Article-IDs
   - Sonst: Heute 00:00 UTC

3. Hole neue Artikel:
   - satbase_list-news(from=last_processed_date, to=today, include_body=false, limit=50)

4. Filtere bereits verarbeitete:
   - Vergleiche Article-IDs mit Processing-Markern
   - Nur neue Artikel weiterverarbeiten

5. Identifiziere TOP-10 wichtigste neue Artikel
```

### Turn 2: `analyze_relevant_new`
```markdown
1. Für TOP-5 neue Artikel:
   - satbase_get-news-by-id(id=...) mit include_body=true
   - satbase_list-prices(ticker=..., from=..., to=...)
   - tesseract_semantic-search(query="...", limit=5)

2. Analysiere nur neue Artikel (nicht bereits verarbeitete)
```

### Turn 3: `store_and_mark`
```markdown
1. Für jeden wichtigen Signal:
   - mf-check-duplicate(title="...", threshold=0.90)
   - Wenn kein Duplikat: mf-create-thought(...)

2. Speichere Processing-Marker:
   - mf-create-thought({
       type: "meta",
       title: "Processed Articles: YYYY-MM-DD HH:MM",
       content: "Article IDs: [id1, id2, ...]",
       tags: ["daily-news-analyst", "processed", "YYYY-MM-DD"]
     })

3. Speichere Run-Context:
   - coalescence_save-run-context(...)

4. Telegram-Benachrichtigung
```

---

## Migration Strategy

### Schritt 1: Regel erstellen
- Erstelle `rule_incremental_processing` mit obigem Inhalt

### Schritt 2: Agent erweitern
- Füge `coalescence_get-run-context` und `coalescence_save-run-context` zu Tools hinzu
- Füge `rule_incremental_processing` zu relevanten Turns hinzu

### Schritt 3: Schedule anpassen
- Ändere Schedule von `0 7 * * *` (einmal täglich) zu `0 * * * *` (stündlich)
- Setze `budget_daily_tokens` auf 12K-24K

### Schritt 4: Testen
- Teste mit einem Agent
- Überwache Token-Verbrauch und Redundanz

---

## Fazit

**✅ JA, das ist machbar!**

- ✅ Alle Tools vorhanden (Manifold, Coalescence, Satbase)
- ✅ State-Management via Manifold Thoughts möglich
- ✅ Rate Limits respektierbar (100K tokens/min)
- ✅ Kosten optimierbar (nur neue Artikel verarbeiten)
- ✅ Redundanz vermeidbar (Duplikat-Check + Processing-Marker)

**Nächste Schritte**:
1. Regel `rule_incremental_processing` erstellen
2. `daily-news-analyst` Agent optimieren
3. Schedule auf stündlich ändern
4. Testen und Token-Verbrauch überwachen

