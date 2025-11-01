# Agent Prompt Design - Vollständige Analyse

**Datum:** 2025-11-01  
**Agent:** daily-news-analyst  
**Kritik:** Prompts sind zu preskriptiv und micromanagen den Agent

---

## 🔍 Aktuelle Situation

### System-Prompt
```
Du bist ein News-Analyst, der täglich die wichtigsten Entwicklungen 
des Vortags analysiert und strukturiert als Thoughts speichert.

Wichtig:
- Analysiere News systematisch und effizient
- Identifiziere die wichtigsten Signale (nicht alle Artikel)
- Speichere nur signifikante Erkenntnisse als Thoughts
- Nutze Telegram für Zusammenfassungen und wichtige Events
- Qualität über Quantität: Nur wirklich wichtige Entwicklungen
- Thought-Formulierung: Immer zuerst einen strukturierten Thought formulieren, dann Duplikat prüfen
```

**Bewertung:** ✅ Akzeptabel - beschreibt Rolle und Grundsätze, aber könnte noch minimiert werden

---

### Turn 1: `discover_news`

**Aktueller Prompt:** ~450 Tokens, Schritt-für-Schritt Anweisungen

**Probleme:**
1. **Preskriptiv:** Exakte Schritte 1-11 mit Code-Beispielen
2. **Micromanagement:** "Berechne Datum: today = new Date()..." - das kann der Agent selbst!
3. **Redundanz:** Incremental Processing Rule enthält ähnliche Infos
4. **Keine Freiheit:** Agent kann nicht selbst entscheiden wie er vorgeht

**Beispiel-Probleme:**
```
"Option A (empfohlen): mf-search({...})"
"Option B: mf-timeline({...})"
"→ Dann Filter: Nur die mit tags [...]"
```

Das ist wie ein Kochrezept - der Agent wird zum "Rechenknecht" statt intelligentem Agent.

---

### Turn 2: `analyze_relevant`

**Aktueller Prompt:** ~300 Tokens, Schritt-für-Schritt Anweisungen

**Probleme:**
1. **Preskriptiv:** "1. Für jeden Artikel: Finde ähnliche Artikel..."
2. **Tool-Micromanagement:** "→ Besser als semantic-search wenn..."
3. **Fallback-Anweisungen:** "→ **WICHTIG**: Wenn fehlschlägt, nutze fallback..."
4. **Bulk-Tool-Propaganda:** "→ **VIEL effizienter**..." - Agent sollte das selbst erkennen!

**Das Problem:** Der Agent wird nicht als intelligent behandelt, sondern als Script-Runner.

---

### Turn 3: `store_insights`

**Aktueller Prompt:** ~800 Tokens, extrem preskriptiv

**Probleme:**
1. **Ultra-preskriptiv:** Exakte Schritte 1-8 mit Code-Beispielen
2. **Thought-Formulierung:** "**Titel:** Deutscher oder englischer..." - zu detailliert
3. **Duplikat-Check:** Exakte Tool-Call-Anweisung mit Parametern
4. **Telegram:** "→ Nutze die Telegram-Rule für Details..." - aber dann trotzdem detaillierte Anweisungen
5. **Post-Run:** Exakte Schritte 5-7 mit Code-Beispielen

**Das Problem:** Der Agent kann nicht kreativ oder intelligent agieren - er folgt nur Befehlen.

---

## 🎯 Philosophie: Was sollte ein Agent-Prompt sein?

### ❌ Was NICHT:
- Schritt-für-Schritt Anweisungen
- Code-Beispiele für einfache Operationen
- Tool-Micromanagement ("nutze Tool X, dann Tool Y")
- Fallback-Anweisungen ("wenn fehlschlägt, nutze...")
- Exakte Parameter-Anweisungen ("threshold=0.85")

### ✅ Was SOLLTE es sein:

#### 1. System-Prompt: Minimal, fokussiert
- **Identität:** Wer bin ich?
- **Ziel:** Was ist mein Ziel?
- **Verfügbare Systeme:** Welche Tools/MCPs habe ich?
- **Grundsätze:** Wichtige Prinzipien (nicht Schritt-für-Schritt)

#### 2. Turn-Prompts: Offene Ziele, nicht Anweisungen
- **Was** soll erreicht werden, nicht **wie**
- **Ziele** definieren, nicht **Schritte**
- **Kontext** geben, nicht **Micromanagement**
- **Tools verfügbar machen**, nicht **Tool-Usage vorschreiben**

#### 3. Rules: Detaillierte Patterns (wenn nötig)
- **Patterns** für komplexe Workflows (z.B. Incremental Processing)
- **Constraints** die eingehalten werden müssen
- **Best Practices** die helfen, nicht einschränken

---

## 📊 Vergleich: Aktuell vs. Ideal

### Turn 1: Aktuell
```
**Pre-Run State-Check:**
1. **Berechne Datum:** today = new Date(), yesterday = new Date(today - 1 Tag), todayStr = today.toISOString().split('T')[0] (z.B. "2025-11-01")
2. **Suche Processing-Marker** (WICHTIG: Mit explizitem Datum!):
   Option A (empfohlen): mf-search({...})
   Option B: mf-timeline({...})
   → Dann Filter: Nur die mit tags ["daily-news-analyst", "processed"]
3. Hole Run-Context: coalescence_get-run-context(...)
4. Bestimme letzten Verarbeitungszeitpunkt: ...
[... 7 weitere Schritte ...]
```

### Turn 1: Ideal
```
Finde neue, noch nicht verarbeitete Artikel vom gestrigen Tag.

**Kontext:**
- Nutze Processing-Marker und Run-Context um bereits verarbeitete Artikel zu identifizieren
- Stelle sicher, dass du Diversität bei Topics/Tickers beachtest
- Identifiziere die TOP-10 wichtigsten neuen Artikel

**Verfügbare Tools:**
- Satbase: News, Coverage, Trending-Ticker, Topics
- Manifold: Suche nach Processing-Markern
- Coalescence: Run-Context für State-Management
```

**Unterschied:** Ziel vs. Schritt-für-Schritt

---

### Turn 2: Aktuell
```
Für die TOP-5 wichtigsten NEUEN Artikel:

1. Für jeden Artikel: Finde ähnliche Artikel mit tesseract_find-similar-articles(news_id="...", limit=5)
   → Besser als semantic-search wenn man bereits einen spezifischen Artikel hat
   → **WICHTIG**: Wenn fehlschlägt, nutze fallback: tesseract_semantic-search(query="...", limit=5)

2. Hole vollständige Bodies: satbase_bulk-news(ids=[...], include_body=true)

3. **Preisdaten effizient holen (BULK!):**
   - Sammle ALLE betroffenen Ticker aus allen TOP-5 Artikeln
   - Hole Preisdaten für ALLE Ticker auf einmal: satbase_list-prices-bulk(...)
   → **VIEL effizienter** als einzelne Calls - nutze das Bulk-Tool!
   → Falls Bulk fehlschlägt, nutze Fallback: satbase_list-prices() einzeln
[...]
```

### Turn 2: Ideal
```
Analysiere die wichtigsten neuen Artikel tiefgreifend.

**Ziele:**
- Verstehe Kontext jedes Artikels durch ähnliche Artikel
- Hole relevante Daten: Preise, Firmeninfo, Fundamentaldaten
- Analysiere: Kern-Thema, Ticker, Preisbewegungen, Markt-Implikationen

**Hinweise:**
- Nutze Bulk-Tools wo möglich für Effizienz
- Kombiniere Daten aus verschiedenen Quellen für vollständiges Bild
```

**Unterschied:** Ziel + Hinweise vs. Schritt-für-Schritt + Tool-Anweisungen

---

### Turn 3: Aktuell
```
**Für TOP-3 Signale:**

**WICHTIG: Zuerst Thought formulieren, dann Duplikat prüfen!**

1. **Formuliere einen strukturierten Thought** aus deiner Analyse:
   - **Titel:** Deutscher oder englischer, prägnanter Titel der die Kern-Erkenntnis beschreibt
     → NICHT den rohen News-Artikel-Titel verwenden!
     → Beispiel: "Pfizer Files Lawsuit Against Novo Nordisk Over Metsera Acquisition" statt portugiesischem Original
   - **Summary:** Strukturierte Zusammenfassung der Erkenntnis (2-3 Sätze)
   - **Content:** Detaillierte Analyse mit Kontext, Zusammenhängen, Markt-Implikationen
   - **Tickers:** Liste der betroffenen Ticker
   - **Type:** "signal" oder "analysis" je nach Inhalt

2. **Prüfe Duplikate** mit dem formulierten Thought:
   mf-check-duplicate(title="[FORMULIERTER TITEL]", summary="[FORMULIERTE SUMMARY]", threshold=0.85)
   → **WICHTIG**: Nutze den formulierten Thought-Titel/Summary, NICHT den News-Artikel-Titel!
   → **Threshold 0.85** ist optimal (basierend auf Tests)
   → Wenn Duplikat gefunden (is_duplicate=true): Überspringe diesen Thought, er existiert bereits
[...]
```

### Turn 3: Ideal
```
Speichere die wichtigsten Erkenntnisse als Thoughts und sende Telegram-Zusammenfassung.

**Ziele:**
- Formuliere strukturierte Thoughts aus deinen Analysen (nicht rohe News-Titel)
- Prüfe auf Duplikate bevor du speicherst
- Verlinke ähnliche Thoughts für Kontext
- Speichere Processing-Marker und Run-Context
- Sende Telegram-Nachricht gemäß Telegram-Rule

**Wichtig:**
- Thought-Qualität: Strukturierter Titel, Summary, Content mit Markt-Implikationen
- Duplikat-Prüfung: Nutze formulierten Thought, nicht News-Titel
- Telegram: Gemäß Telegram-Rule (humorvoll-zynisch für Politik/Wirtschaftsenthusiasten)
```

**Unterschied:** Ziele + Constraints vs. Schritt-für-Schritt + Code-Beispiele

---

## 🎯 Empfehlungen

### 1. System-Prompt minimieren
**Vorher:** ~200 Tokens mit "Wichtig"-Liste  
**Nachher:** ~100 Tokens - Identität, Ziel, verfügbare Systeme, Grundsätze

### 2. Turn-Prompts umschreiben
**Von:** Schritt-für-Schritt Anweisungen  
**Zu:** Offene Ziele + Kontext + verfügbare Tools

### 3. Rules behalten für Patterns
**Incremental Processing Rule:** ✅ Gut - beschreibt Pattern, nicht exakte Schritte  
**Telegram Rule:** ✅ Gut - beschreibt Stil/Format, nicht exakte Schritte

### 4. Agent Freiheit geben
- Agent entscheidet selbst welche Tools er nutzt
- Agent entscheidet selbst in welcher Reihenfolge
- Agent kann kreativ sein
- Prompts geben nur Ziele und Constraints

---

## 📋 Konkrete Verbesserungen

### System-Prompt: Minimal
```
Du bist ein News-Analyst-Bot, der täglich die wichtigsten Entwicklungen analysiert 
und als strukturierte Thoughts in Manifold speichert.

**Ziel:** Identifiziere signifikante Markt-Signale, speichere als Thoughts, 
vermeide Duplikate, sende Telegram-Zusammenfassungen.

**Verfügbare Systeme:**
- Satbase: News, Preise, Firmeninfos, Makro-Daten
- Tesseract: Semantische Suche über News
- Manifold: Knowledge Graph für Thoughts, Duplikat-Prüfung
- Coalescence: Run-Context, State-Management
- Telegram: Benachrichtigungen

**Grundsätze:**
- Qualität über Quantität: Nur wirklich wichtige Entwicklungen
- Effizienz: Nutze Bulk-Tools wo möglich
- Redundanz-Vermeidung: Prüfe State vor Run, speichere Processing-Marker
- Thought-Qualität: Strukturierte Thoughts, nicht rohe News-Titel
```

### Turn 1: Offenes Ziel
```
Finde neue, noch nicht verarbeitete Artikel vom gestrigen Tag.

**Kontext:**
- Nutze Processing-Marker und Run-Context um bereits verarbeitete Artikel zu identifizieren
- Stelle sicher, dass du Diversität bei Topics/Tickers beachtest
- Identifiziere die TOP-10 wichtigsten neuen Artikel

**Verfügbare Tools:** Satbase (News, Coverage, Trending-Ticker, Topics), 
Manifold (Suche nach Processing-Markern), Coalescence (Run-Context)
```

### Turn 2: Offenes Ziel
```
Analysiere die wichtigsten neuen Artikel tiefgreifend.

**Ziele:**
- Verstehe Kontext durch ähnliche Artikel
- Hole relevante Daten: Preise, Firmeninfo, Fundamentaldaten
- Analysiere: Kern-Thema, Ticker, Preisbewegungen, Markt-Implikationen

**Hinweise:**
- Nutze Bulk-Tools wo möglich für Effizienz
- Kombiniere Daten aus verschiedenen Quellen

**Verfügbare Tools:** Satbase (Bulk-News, Prices-Bulk, Prices-Info, Fundamentals), 
Tesseract (Find-Similar, Semantic-Search)
```

### Turn 3: Offenes Ziel
```
Speichere die wichtigsten Erkenntnisse als Thoughts und sende Telegram-Zusammenfassung.

**Ziele:**
- Formuliere strukturierte Thoughts (nicht rohe News-Titel)
- Prüfe auf Duplikate bevor du speicherst
- Verlinke ähnliche Thoughts für Kontext
- Speichere Processing-Marker und Run-Context
- Sende Telegram-Nachricht gemäß Telegram-Rule

**Wichtig:**
- Thought-Qualität: Strukturierter Titel, Summary, Content mit Markt-Implikationen
- Duplikat-Prüfung: Nutze formulierten Thought, nicht News-Titel
- Telegram: Gemäß Telegram-Rule (humorvoll-zynisch für Politik/Wirtschaftsenthusiasten)

**Verfügbare Tools:** Manifold (Check-Duplicate, Create-Thought, Get-Similar, Link-Related), 
Coalescence (Save-Run-Context, Save-Insights), Telegram (Send-Message)
```

---

## ✅ Erwartete Verbesserungen

1. **Intelligenz:** Agent kann kreativ und flexibel agieren
2. **Effizienz:** Weniger Token-Verschwendung durch kürzere Prompts
3. **Robustheit:** Agent kann selbstständig auf Probleme reagieren
4. **Wartbarkeit:** Prompts sind einfacher zu verstehen und anzupassen
5. **Performance:** Agent nutzt Tools optimal, nicht wie vorgeschrieben

---

## 🎯 Nächste Schritte

1. ✅ System-Prompt minimieren
2. ✅ Turn-Prompts umschreiben (Ziele statt Schritte)
3. ✅ Rules prüfen (sind sie noch nötig?)
4. ✅ Testen ob Agent intelligent genug ist

