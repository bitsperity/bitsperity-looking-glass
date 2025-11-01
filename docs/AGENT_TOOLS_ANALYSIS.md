# Agent Tools Analyse: daily-news-analyst

## Verfügbare Tools Gesamtübersicht

### 📊 Satbase (59 Tools)
**Status & Health (2)**
- `get-coverage` ✅ Verwendet (Turn 1)
- `health-check` ❌ Nicht verwendet

**News (9)**
- `list-news` ✅ Verwendet (Turn 1, 2)
- `bulk-news` ✅ Verwendet (Turn 2)
- `get-news-by-id` ❌ Nicht verwendet (könnte nützlich sein)
- `news-trending-tickers` ❌ **FEHLT** - Könnte für Discovery helfen
- `news-heatmap` ❌ Nicht verwendet (Coverage-Analyse)
- `news-analytics` ❌ Nicht verwendet (Trend-Analyse)
- `delete-news` ❌ Nicht verwendet
- `news-health` ❌ Nicht verwendet
- `news-integrity-check` ❌ Nicht verwendet

**Prices (5)**
- `list-prices` ✅ Verwendet (Turn 2)
- `prices-search` ❌ Nicht verwendet
- `prices-info` ❌ **FEHLT** - Firmeninfo könnte Kontext geben
- `prices-fundamentals` ❌ **FEHLT** - PE, Market Cap könnten wichtig sein
- `prices-status` ❌ Nicht verwendet

**Macro (5)**
- `fred-search` ❌ Nicht verwendet
- `fred-observations` ❌ **FEHLT** - Makro-Kontext könnte wichtig sein
- `fred-categories` ❌ Nicht verwendet
- `fred-refresh-core` ❌ Nicht verwendet
- `macro-status` ❌ Nicht verwendet

**Topics (7)**
- `get-topics` ❌ **FEHLT** - Könnte für Diversitäts-Check helfen
- `topics-all` ❌ Nicht verwendet
- `topics-summary` ❌ Nicht verwendet
- `topics-stats` ❌ Nicht verwendet
- `topics-coverage` ❌ Nicht verwendet
- `add-topics` ❌ Nicht verwendet
- `delete-topic` ❌ Nicht verwendet

**Watchlist (6)**
- `get-watchlist` ❌ **FEHLT** - Könnte Agent-Fokus steuern
- `add-watchlist` ❌ Nicht verwendet
- `remove-watchlist` ❌ Nicht verwendet
- `watchlist-refresh` ❌ Nicht verwendet
- `watchlist-status` ❌ Nicht verwendet
- `update-watchlist` ❌ Nicht verwendet

### 🔍 Tesseract (11 Tools)
**Search (3)**
- `semantic-search` ✅ Verwendet (Turn 2)
- `find-similar-articles` ❌ **FEHLT** - Besser für ähnliche Artikel zu einem spezifischen Artikel
- `get-article-similarity` ❌ **FEHLT** - Könnte Content-Qualität prüfen vor Analyse

**Analytics (2)**
- `get-search-history` ❌ Nicht verwendet
- `get-search-stats` ❌ Nicht verwendet

**Collection Management (4)**
- `init-collection` ❌ Nicht verwendet
- `list-collections` ❌ Nicht verwendet
- `switch-collection` ❌ Nicht verwendet
- `delete-collection` ❌ Nicht verwendet

**Embedding (2)**
- `start-batch-embedding` ❌ Nicht verwendet
- `get-embedding-status` ❌ Nicht verwendet

### 🧠 Manifold (~50 Tools)
**Thoughts CRUD**
- `mf-create-thought` ✅ Verwendet (Turn 2)
- `mf-check-duplicate` ✅ Verwendet (Turn 2)
- `mf-search` ✅ Verwendet (Turn 1, 2)
- `mf-link-related` ✅ Verwendet (Turn 2)
- `mf-get-thought` ❌ **FEHLT** - Könnte für Verlinkung nützlich sein
- `mf-get-thought-tree` ❌ Nicht verwendet (Kontext-Exploration)
- `mf-get-similar` ❌ **FEHLT** - Besser als mf-search für ähnliche Thoughts
- `mf-timeline` ❌ **FEHLT** - Könnte historische Muster zeigen
- `mf-patch-thought` ❌ Nicht verwendet
- `mf-delete-thought` ❌ Nicht verwendet

**Relations**
- `mf-get-related` ❌ **FEHLT** - Könnte bestehende Verlinkungen prüfen
- `mf-related-graph` ❌ Nicht verwendet
- `mf-unlink-related` ❌ Nicht verwendet

**Analytics**
- `mf-stats` ❌ Nicht verwendet
- `mf-get-statistics` ❌ Nicht verwendet
- `mf-graph` ❌ Nicht verwendet

### ⚙️ Coalescence (19 Tools)
**Context**
- `save-run-context` ✅ Verwendet (Turn 2)
- `get-run-context` ❌ **FEHLT** - Wird in Rule erwähnt, aber nicht als Tool verfügbar!

**Insights**
- `save-insights` ✅ Verwendet (Turn 2)
- `get-insights` ❌ Nicht verwendet

**Agents**
- `list-agents` ❌ Nicht verwendet
- `get-agent` ❌ Nicht verwendet
- `create-agent` ❌ Nicht verwendet
- `update-agent` ❌ Nicht verwendet
- `delete-agent` ❌ Nicht verwendet
- `trigger-agent` ❌ Nicht verwendet

**Rules**
- `list-rules` ❌ Nicht verwendet
- `get-rule` ❌ Nicht verwendet
- `create-rule` ❌ Nicht verwendet
- `update-rule` ❌ Nicht verwendet
- `delete-rule` ❌ Nicht verwendet

**Messages**
- `send-message` ❌ Nicht verwendet
- `get-messages` ❌ Nicht verwendet
- `mark-message-read` ❌ Nicht verwendet

**Tools**
- `list-all-tools` ❌ Nicht verwendet

### 📱 Telegram (1 Tool)
- `send_message` ✅ Verwendet (Turn 2)

### 🕸️ Ariadne (70+ Tools)
- **NICHT VERWENDET** - Könnte für Hypothesis-Validation hilfreich sein

---

## Turn-Analyse: Fehlende Tools

### Turn 1: `discover_news`
**Aktuelle Tools:** `satbase_get-coverage`, `satbase_list-news`, `manifold_mf-search`

**Fehlende Tools die nützlich wären:**
1. ❌ `satbase_news-trending-tickers` - **KRITISCH**
   - **Warum**: Agent soll "trending tickers" identifizieren, aber hat kein Tool dafür
   - **Use Case**: Zeigt welche Ticker am meisten erwähnt wurden (volumen-basiert)

2. ❌ `satbase_get-topics` - **WICHTIG**
   - **Warum**: Für Diversitäts-Check - Agent soll prüfen ob Topics einseitig sind
   - **Use Case**: Liste aller konfigurierten Topics für gezielte Abfragen

3. ❌ `satbase_topics-coverage` - **OPTIONAL**
   - **Warum**: Könnte zeigen welche Topics Coverage haben
   - **Use Case**: Heatmap für Topic-Verteilung

4. ❌ `coalescence_get-run-context` - **KRITISCH**
   - **Warum**: Wird in Rule erwähnt, aber nicht als Tool verfügbar!
   - **Use Case**: Pre-Run State-Check für letzte Verarbeitungszeit

**Empfehlung**: Mindestens `news-trending-tickers` und `get-run-context` hinzufügen.

---

### Turn 2: `analyze_relevant`
**Aktuelle Tools:** `satbase_list-news`, `satbase_list-prices`, `tesseract_semantic-search`, `satbase_bulk-news`

**Fehlende Tools die nützlich wären:**
1. ❌ `tesseract_find-similar-articles` - **WICHTIG**
   - **Warum**: Besser als `semantic-search` wenn man bereits einen Artikel hat
   - **Use Case**: "Finde ähnliche Artikel zu diesem spezifischen Artikel" statt generische Suche

2. ❌ `tesseract_get-article-similarity` - **OPTIONAL**
   - **Warum**: Content-Qualität prüfen vor Deep-Dive
   - **Use Case**: Filtere niedrige Qualität (title-body mismatch)

3. ❌ `satbase_prices-info` - **WICHTIG**
   - **Warum**: Firmeninfo (Sector, Industry) könnte Kontext geben
   - **Use Case**: "Welche Branche ist betroffen?"

4. ❌ `satbase_prices-fundamentals` - **WICHTIG**
   - **Warum**: PE Ratio, Market Cap könnten für Analyse wichtig sein
   - **Use Case**: "Ist die Bewertung fair? Warum bewegt sich der Preis?"

5. ❌ `satbase_fred-observations` - **OPTIONAL**
   - **Warum**: Makro-Kontext könnte wichtig sein (z.B. Fed Rates, Inflation)
   - **Use Case**: "Wie passt diese News zu aktuellen Makro-Trends?"

**Empfehlung**: Mindestens `find-similar-articles` und `prices-fundamentals` hinzufügen.

---

### Turn 3: `store_insights`
**Aktuelle Tools:** `manifold_mf-check-duplicate`, `manifold_mf-create-thought`, `manifold_mf-search`, `manifold_mf-link-related`, `coalescence_save-run-context`, `coalescence_save-insights`, `telegram_send_message`

**Fehlende Tools die nützlich wären:**
1. ❌ `manifold_mf-get-similar` - **WICHTIG**
   - **Warum**: Besser als `mf-search` für ähnliche Thoughts zu einem spezifischen Thought
   - **Use Case**: Nach Thought-Erstellung: Finde ähnliche für Verlinkung

2. ❌ `manifold_mf-get-thought` - **WICHTIG**
   - **Warum**: Könnte bestehende Thoughts für Verlinkung abrufen
   - **Use Case**: Nach `mf-search`: Hole vollständigen Thought für Verlinkung

3. ❌ `manifold_mf-get-related` - **OPTIONAL**
   - **Warum**: Prüfe ob Thought bereits verlinkt ist
   - **Use Case**: Vermeide doppelte Verlinkungen

4. ❌ `manifold_mf-timeline` - **OPTIONAL**
   - **Warum**: Könnte historische Muster zeigen
   - **Use Case**: "Gab es ähnliche Signale in der Vergangenheit?"

**Empfehlung**: Mindestens `mf-get-similar` und `mf-get-thought` hinzufügen.

---

## Kritische Fehlende Tools (TOP 5)

### 1. `coalescence_get-run-context` 🔴 **KRITISCH**
- **Turn**: 1
- **Problem**: Wird in Rule erwähnt, aber nicht als Tool verfügbar!
- **Impact**: Agent kann keinen Pre-Run State-Check machen
- **Lösung**: Tool zu Turn 1 hinzufügen

### 2. `satbase_news-trending-tickers` 🔴 **KRITISCH**
- **Turn**: 1
- **Problem**: Agent soll "trending tickers" identifizieren, hat aber kein Tool dafür
- **Impact**: Agent kann nur manuell aus News-Liste extrahieren (ungenau)
- **Lösung**: Tool zu Turn 1 hinzufügen

### 3. `tesseract_find-similar-articles` 🟡 **WICHTIG**
- **Turn**: 2
- **Problem**: Agent nutzt generische `semantic-search` statt spezifische Similarity-Suche
- **Impact**: Weniger präzise Ergebnisse für ähnliche Artikel
- **Lösung**: Tool zu Turn 2 hinzufügen, Prompt anpassen

### 4. `satbase_prices-fundamentals` 🟡 **WICHTIG**
- **Turn**: 2
- **Problem**: Agent analysiert Preise ohne Fundamentaldaten (PE, Market Cap)
- **Impact**: Unvollständige Analyse (Preis ohne Kontext)
- **Lösung**: Tool zu Turn 2 hinzufügen

### 5. `manifold_mf-get-similar` 🟡 **WICHTIG**
- **Turn**: 3
- **Problem**: Agent nutzt `mf-search` statt `mf-get-similar` für Thought-Ähnlichkeit
- **Impact**: Weniger präzise Verlinkungen
- **Lösung**: Tool zu Turn 3 hinzufügen, Prompt anpassen

---

## Empfohlene Tool-Ergänzungen

### Turn 1: `discover_news`
**Hinzufügen:**
- ✅ `coalescence_get-run-context` (für Pre-Run State-Check)
- ✅ `satbase_news-trending-tickers` (für Trending-Ticker-Identifikation)
- ✅ `satbase_get-topics` (für Diversitäts-Check)

**Begründung**: Agent braucht bessere State-Management und Trending-Daten.

---

### Turn 2: `analyze_relevant`
**Hinzufügen:**
- ✅ `tesseract_find-similar-articles` (besser als semantic-search für ähnliche Artikel)
- ✅ `satbase_prices-fundamentals` (für vollständige Analyse)
- ✅ `satbase_prices-info` (für Firmenkontext)

**Begründung**: Vollständigere Analyse mit Fundamentaldaten und präzisere Similarity-Suche.

---

### Turn 3: `store_insights`
**Hinzufügen:**
- ✅ `manifold_mf-get-similar` (besser als mf-search für Thought-Ähnlichkeit)
- ✅ `manifold_mf-get-thought` (für Thought-Details bei Verlinkung)

**Begründung**: Präzisere Verlinkungen zwischen Thoughts.

---

## Zusammenfassung

### ✅ Gut ausgestattet
- Turn 2: Gute Basis-Tools für Analyse
- Turn 3: Gute Tools für Thought-Management

### ⚠️ Verbesserungspotenzial
- Turn 1: Fehlt `get-run-context` und `news-trending-tickers`
- Turn 2: Könnte `find-similar-articles` und `prices-fundamentals` nutzen
- Turn 3: Könnte `mf-get-similar` für bessere Verlinkungen nutzen

### 🔴 Kritische Lücken
1. `coalescence_get-run-context` fehlt komplett (wird in Rule erwähnt!)
2. `satbase_news-trending-tickers` fehlt (Agent braucht es für Discovery)

---

## Nächste Schritte

1. ✅ Prüfe ob `coalescence_get-run-context` als Tool verfügbar ist
2. ✅ Füge fehlende kritische Tools zu den Turns hinzu
3. ✅ Teste Agent mit erweiterten Tools
4. ✅ Prüfe ob Performance durch zusätzliche Tools leidet

