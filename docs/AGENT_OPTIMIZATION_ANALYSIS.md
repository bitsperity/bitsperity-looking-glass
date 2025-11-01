# Agent-Optimierung: Token-Effizienz & Bias-Analyse

## 1. Telegram-Nachricht Verbesserung ✅

### Problem
Die ursprüngliche Nachricht war zu technisch:
```
📊 Daily News Analyst - ✅ Erfolgreich
- 4 Thoughts erstellt
- TOP-3 Signale: [...]
- Betroffene Ticker: [...]
```

**Feedback**: Nicht "abholend" genug für morgens beim Aufwachen.

### Lösung
Neue Telegram-Nachricht mit:
- 🌅 Emotionaler Ansprache ("Guten Morgen!")
- 📊 Strukturierte Signale mit Kontext
- 💰 Betroffene Ticker klar aufgelistet
- 📈 **Markt-Implikationen**: Bullish/Bearish/Neutral + Begründung
- 📈 **Gesamtbewertung**: Wie war der Tag insgesamt?
- 🔍 Details für Kontext

**Beispiel-Format**:
```
🌅 Guten Morgen! Hier ist dein Daily News Briefing:

📊 **Wichtigste Entwicklungen vom [Datum]:**

🔹 **[Signal-Titel]**
   [Was ist passiert? Warum wichtig?]
   💰 Betroffene Ticker: [Liste]
   📈 Markt-Implikation: Bullish/Bearish/Neutral + Warum

**📈 Gesamtbewertung:**
[Wie war der Tag insgesamt? Mehr Bullish oder Bearish? Warum?]

**🔍 Details:**
- [Anzahl] Thoughts erstellt
- Analysiert: [Anzahl] Artikel
- Abgedeckte Themen: [Topics-Liste]

Viel Erfolg heute! 💪
```

---

## 2. Token-Effizienz Analyse

### Aktuelle Token-Verteilung

**System Prompt**: ~120 Tokens ✅ (sehr kompakt)
```
Du bist ein News-Analyst, der täglich die wichtigsten Entwicklungen 
des Vortags analysiert und strukturiert als Thoughts speichert.
```

**Turn 1 (`discover_news`)**: ~450 Tokens
- ✅ Optimiert: Prägnante Anweisungen
- ✅ Token-sparende Tool-Calls (`include_content=false`)

**Turn 2 (`analyze_relevant`)**: ~200 Tokens ✅ (sehr kompakt)
- Optimiert: Reduziert von ~400 auf ~200 Tokens
- Keine Wiederholungen

**Turn 3 (`store_insights`)**: ~350 Tokens
- ✅ Optimiert: Von ~800 auf ~350 Tokens reduziert
- Telegram-Template als konkretes Beispiel (hilft Agent)
- Kurze, präzise Anweisungen

**Rules**: 
- `rule_1761996483263_jjhi1l3b2` (Telegram): ~400 Tokens
- `rule_1761997792538_k64icduvb` (Incremental Processing): ~600 Tokens

### Optimierungs-Empfehlungen

**✅ Bereits Optimiert:**
- System Prompt sehr kurz (120 Tokens)
- Turn Prompts kompakt ohne Wiederholungen
- Token-sparende Tool-Calls (`include_content=false`)

**⚠️ Weitere Optimierungen möglich (aber nur wenn Performance OK):**

1. **Rules kürzen** (optional):
   - Telegram-Rule: ~400 → ~250 Tokens (nur Kern-Guidelines)
   - Incremental-Processing-Rule: ~600 → ~400 Tokens (nur Workflow)
   - **Risiko**: Agent könnte Details vergessen
   - **Empfehlung**: Erst testen ob aktuelle Performance OK ist

2. **Turn Prompts weiter kürzen** (optional):
   - Von ~350 auf ~250 Tokens möglich
   - **Risiko**: Agent könnte weniger präzise arbeiten
   - **Empfehlung**: Nur wenn Token-Budget knapp wird

**Fazit**: Aktuelle Token-Verteilung ist bereits sehr effizient. Weitere Optimierungen nur wenn Token-Budget-Probleme auftreten.

---

## 3. satbase_list-news Bias-Analyse

### Problem-Identifikation

**Aktuelle Implementierung**:
```python
# libs/satbase_core/storage/news_db.py:326
ORDER BY a.published_at DESC
LIMIT ? OFFSET ?
```

**Agent verwendet**:
```javascript
satbase_list-news(
  from="2025-10-31",
  to="2025-10-31",
  include_body=false,
  limit=50
)
```

### Potenzielle Bias-Quellen

1. **Zeit-Bias**: 
   - Sortiert nach `published_at DESC` (neueste zuerst)
   - Frühe Artikel des Tages könnten unterrepräsentiert sein
   - Späte Artikel könnten überrepräsentiert sein

2. **Source-Bias**:
   - Quellen die schneller publizieren haben Vorteil
   - Quellen die mehr Artikel produzieren dominieren die Top-50

3. **Topic-Bias**:
   - Wenn ein Topic viele Artikel produziert, dominiert es die Liste
   - Andere wichtige Topics könnten unterrepräsentiert sein

4. **Ticker-Bias**:
   - Große Ticker (AAPL, NVDA) haben mehr Coverage → dominieren
   - Kleinere, aber wichtige Ticker könnten übersehen werden

### Lösungsansätze

**✅ Bereits implementiert:**
- Agent nutzt `satbase_get-coverage()` um Übersicht zu bekommen
- Agent prüft Diversität: "Analysiere die Verteilung nach Topics/Tickers"

**🔧 Weitere Verbesserungen möglich:**

1. **Topic-basierte Diversität** (empfohlen):
   ```javascript
   // Agent sollte mehrere Queries machen:
   satbase_list-news(from="...", to="...", limit=10)  // Allgemein
   satbase_list-news(from="...", to="...", topics=["AI"], limit=5)  // AI
   satbase_list-news(from="...", to="...", topics=["FEDERAL RESERVE"], limit=5)  // Macro
   // etc. für alle wichtigen Topics
   ```

2. **Backend: Diverse Sampling** (optional):
   - Neuer Endpoint: `satbase_list-news-diverse`
   - Garantiert max N Artikel pro Topic/Ticker
   - Besser für Agent-Use-Case

3. **Agent-Logik verbessern**:
   - Nach `satbase_list-news` die Topic-Verteilung analysieren
   - Wenn einseitig: Zusätzliche Queries für unterrepräsentierte Topics

### Empfehlung

**Aktuell**: Agent sollte explizit nach Diversität suchen:
```markdown
**WICHTIG**: Analysiere die Verteilung nach Topics/Tickers - 
wenn einseitig, hole zusätzlich gezielt andere Topics
```

**Zukünftig**: Wenn Bias-Probleme auftreten:
1. Agent macht mehrere Topic-spezifische Queries
2. Oder: Backend bietet `list-news-diverse` Endpoint

**Fazit**: Aktuelle Implementierung ist OK, aber Agent sollte bewusst auf Diversität achten (wie jetzt im Prompt).

---

## Zusammenfassung

### ✅ Verbessert
1. **Telegram-Nachricht**: Emotional ansprechend, mit Markt-Implikationen
2. **Token-Effizienz**: Prompts kompakt (~1100 Tokens total vs. ~1800 vorher)
3. **Bias-Bewusstsein**: Agent prüft explizit auf Diversität

### 📊 Metriken
- **Token-Reduktion**: ~40% (von ~1800 auf ~1100 Tokens)
- **Telegram-Qualität**: Von technisch zu informativ + emotional
- **Bias-Risiko**: Mittel (bewusst adressiert durch Diversitäts-Check)

### 🎯 Nächste Schritte
1. Testen der neuen Telegram-Nachricht beim nächsten Run
2. Beobachten ob Bias-Probleme auftreten
3. Falls nötig: Topic-basierte Diversitäts-Queries implementieren

