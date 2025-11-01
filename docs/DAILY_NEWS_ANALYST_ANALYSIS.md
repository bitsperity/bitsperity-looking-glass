# Daily News Analyst - Vollständige Analyse & Optimierungsplan

**Datum:** 2025-11-01  
**Agent:** daily-news-analyst  
**Bot-Name:** Noesis  
**Creator:** Päsic  
**Zielgruppe:** Politik & Wirtschaftsenthusiasten (humorvoll-zynischer Ton)

---

## 🔍 Aktuelle Analyse

### System Prompt
**Status:** ❌ Zu generisch
- Fehlt Persönlichkeit "Noesis"
- Kein humorvoll-zynischer Ton
- Keine Erwähnung der Zielgruppe

### Turn 1: `discover_news`
**Status:** ✅ Gut strukturiert
- Incremental Processing implementiert
- Diversitäts-Check vorhanden
- Token-effizient (`include_content=false`)

**Verbesserungspotenzial:**
- Prompt könnte klarer strukturiert sein

### Turn 2: `analyze_relevant`
**Status:** ✅ Gut optimiert
- Bulk-Tools werden genutzt
- Strukturierte Analyse-Anweisungen
- Token-effizient

**Verbesserungspotenzial:**
- Könnte noch präziser sein

### Turn 3: `store_insights`
**Status:** ⚠️ Mehrere Probleme

**Kritische Probleme:**
1. **Threshold 0.90 zu hoch** → sollte 0.85 sein (basierend auf Tests)
2. **Fehlende Thought-Formulierung** → Agent könnte rohen News-Titel verwenden
3. **Prompt zu lang** → könnte effizienter sein
4. **Keine explizite Anweisung** für Thought-Qualität

**Stärken:**
- Telegram-Anweisungen vorhanden
- Verlinkung von ähnlichen Thoughts
- Processing-Marker korrekt

### Telegram-Rule
**Status:** ⚠️ Gut, aber unvollständig
- Natürlicher Ton vorhanden
- **Fehlt:** Humorvoll-zynischer Ton für Politik/Wirtschaft
- **Fehlt:** Erwähnung von "Noesis" Persönlichkeit
- **Fehlt:** Kontext zur Zielgruppe

### Incremental Processing Rule
**Status:** ✅ Sehr gut
- Korrekte Datum-Tags
- State-Management implementiert
- Redundanz-Vermeidung vorhanden

---

## 🎯 Optimierungsziele

1. **Persönlichkeit:** "Noesis" als humorvoll-zynischer Bot für Politik/Wirtschaft
2. **Threshold:** 0.90 → 0.85 (bessere Duplikat-Erkennung)
3. **Thought-Qualität:** Explizite Formulierungs-Anweisungen
4. **Telegram-Ton:** Humorvoll-zynisch, für Politik/Wirtschaftsenthusiasten
5. **Workflow:** Klarere Struktur, weniger Redundanz
6. **Token-Effizienz:** Prompts straffen ohne Qualitätsverlust

---

## 📋 Optimierungsplan

### 1. System Prompt Überarbeitung
- **Vorher:** Generischer News-Analyst
- **Nachher:** "Noesis" - humorvoll-zynischer Bot für Politik/Wirtschaft
- **Ton:** Intelligent, witzig, leicht zynisch, aber informativ

### 2. Threshold-Korrektur
- **Vorher:** `threshold=0.90`
- **Nachher:** `threshold=0.85`
- **Begründung:** Tests zeigen bessere Duplikat-Erkennung bei 0.85

### 3. Thought-Formulierung
- **Vorher:** Nicht explizit
- **Nachher:** Klare Anweisung: Zuerst Thought formulieren, dann Duplikat prüfen
- **Format:** Deutscher/englischer Titel, strukturierte Summary

### 4. Telegram-Rule Überarbeitung
- **Vorher:** Natürlicher, persönlicher Ton
- **Nachher:** Humorvoll-zynisch für Politik/Wirtschaftsenthusiasten
- **Elemente:** 
  - Intelligente Kommentare
  - Leicht zynische Beobachtungen
  - Witze über Politik/Wirtschaft
  - Aber informativ und wertvoll

### 5. Turn-Prompts Optimierung
- **Turn 1:** Klarere Struktur
- **Turn 2:** Präzisere Anweisungen
- **Turn 3:** Explizite Thought-Formulierung, effizientere Struktur

---

## ✅ Erwartete Verbesserungen

1. **Qualität:** Bessere Thought-Formulierung, weniger Duplikate
2. **Persönlichkeit:** "Noesis" Ton konsistent durch alle Turns
3. **Effizienz:** Weniger Token-Verschwendung, klarere Anweisungen
4. **Engagement:** Telegram-Nachrichten humorvoll-zynisch und ansprechend
5. **Workflow:** Rundere, konsistentere Ausführung

