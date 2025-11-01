# Mediastack API - Vollständige Analyse

**Datum:** 2025-11-01  
**Kosten:** 20€/Monat (Standard Plan)  
**Frage:** Nutzen wir alle relevanten Features für aktuelle/daily news?

---

## 📊 Aktuelle Nutzung

### Was wir NUTZEN (in `mediastack.fetch`):

```python
params_api = {
    "access_key": api_key,
    "keywords": query,           # ✅ Nutzen wir
    "date": date_range,          # ✅ Nutzen wir
    "limit": min(limit, 100),    # ✅ Nutzen wir
    "sort": "published_desc",    # ✅ Nutzen wir (aber nur diese Option)
}
```

### Was wir SPEICHERN (aus Mediastack Response):

```python
# ✅ Alle diese Felder werden gespeichert:
- category      # z.B. "business", "technology", "health"
- language      # z.B. "en", "de", "pt"
- country       # z.B. "us", "gb", "de"
- source_name   # z.B. "CNN", "BBC", "Reuters"
- author
- image
```

### Was wir in `list-news` FILTERN können:

```python
# ✅ Verfügbar:
- from/to (date range)
- q (text search)
- tickers
- topics
- has_body
- limit/offset
```

---

## ❌ Was wir NICHT nutzen (aber verfügbar)

### 1. **categories** Parameter bei Fetch
**Verfügbar:** `categories=business,-sports` (include/exclude)  
**Kategorien:** general, business, entertainment, health, science, sports, technology

**Problem:** Wir nutzen nur `keywords` - aber Kategorien könnten besser sein!

**Beispiel:**
```python
# Aktuell:
keywords="AI technology"  # Sucht nach "AI" UND "technology" im Text

# Besser:
categories="technology"   # Direkt Tech-News, unabhängig von Keywords
keywords="AI"            # Kombiniert: Tech-Kategorie + AI-Keyword
```

**Use Case:** Für aktuelle Tech-News könnten wir direkt `categories=technology` nutzen statt komplexe Keywords.

---

### 2. **sources** Parameter bei Fetch
**Verfügbar:** `sources=cnn,-bbc` (include/exclude)  
**Problem:** Wir nutzen es nicht, aber speichern `source_name`

**Use Case:**
- Hochwertige Quellen bevorzugen: `sources=reuters,bloomberg,financial-times`
- Low-Quality ausschließen: `sources=-buzzfeed,-tmz`

**Wert:** Könnte Qualität der daily news deutlich verbessern!

---

### 3. **countries** Parameter bei Fetch
**Verfügbar:** `countries=us,gb,de` (include/exclude)  
**Problem:** Wir speichern `country`, filtern aber nicht danach

**Use Case:**
- Internationale Abdeckung: `countries=us,gb,de,fr,jp`
- US-fokussiert: `countries=us`

**Wert:** Für tägliche News könnte man gezielt Länder abdecken.

---

### 4. **languages** Parameter bei Fetch
**Verfügbar:** `languages=en,de` (include/exclude)  
**Problem:** Wir speichern `language`, filtern aber nicht danach

**Use Case:**
- Multilingual: `languages=en,de` für Deutsch/Englisch
- Nur Englisch: `languages=en,-de` (exclude German)

**Wert:** Könnte Sprachqualität sicherstellen.

---

### 5. **sort: popularity** statt nur `published_desc`
**Verfügbar:** `sort=popularity` oder `sort=published_asc`  
**Problem:** Wir nutzen nur `published_desc`

**Use Case:**
- Für daily news: `sort=popularity` könnte relevantere Artikel bringen
- Oder: Kombination aus beidem

**Wert:** Könnte bessere Artikel-Auswahl für tägliche News bringen.

---

### 6. **offset** für Pagination
**Verfügbar:** `offset=100` für Pagination  
**Problem:** Wir nutzen es nicht (nur `limit`)

**Use Case:** Wenn wir mehr als 100 Artikel pro Tag holen wollen, brauchen wir Pagination.

**Wert:** Aktuell Limit 100 könnte zu wenig sein für tägliche News.

---

## 🎯 Empfehlungen für bessere Daily News

### 1. **Kategorien-basierte Fetch** (HOCHER PRIORITÄT)

**Problem:** Aktuell nutzen wir nur Keywords - aber Kategorien könnten besser sein!

**Lösung:** Mediastack Adapter erweitern:

```python
def fetch(params: dict[str, Any]) -> Iterable[dict]:
    # NEU: Kategorien unterstützen
    categories = params.get("categories")  # z.B. "business,technology"
    sources = params.get("sources")         # z.B. "reuters,bloomberg"
    countries = params.get("countries")     # z.B. "us,gb,de"
    languages = params.get("languages")    # z.B. "en,de"
    sort = params.get("sort", "published_desc")  # oder "popularity"
    
    params_api = {
        "access_key": api_key,
        "keywords": query,
        "date": date_range,
        "limit": min(limit, 100),
        "sort": sort,
    }
    
    # NEU: Optionale Filter hinzufügen
    if categories:
        params_api["categories"] = categories
    if sources:
        params_api["sources"] = sources
    if countries:
        params_api["countries"] = countries
    if languages:
        params_api["languages"] = languages
```

**Benefit:** Viel bessere Artikel-Auswahl für tägliche News!

---

### 2. **Filter in `list-news` erweitern** (HOCHER PRIORITÄT)

**Problem:** Wir speichern category/language/country/source_name, können aber nicht danach filtern!

**Lösung:** Backend erweitern:

```python
@router.get("/news")
def list_news(
    categories: str | None = None,    # NEU
    sources: str | None = None,        # NEU
    countries: str | None = None,     # NEU
    languages: str | None = None,     # NEU
    sort: str = "published_desc",     # NEU
    ...
):
    # Parse Filter
    categories_filter = [c.strip() for c in categories.split(',')] if categories else None
    sources_filter = [s.strip() for s in sources.split(',')] if sources else None
    countries_filter = [c.strip() for c in countries.split(',')] if countries else None
    languages_filter = [l.strip() for l in languages.split(',')] if languages else None
    
    # Query mit neuen Filtern
    articles = db.query_articles(
        categories=categories_filter,
        sources=sources_filter,
        countries=countries_filter,
        languages=languages_filter,
        sort=sort,
        ...
    )
```

**Benefit:** Agent kann gezielt nach Kategorien/Ländern/Sprachen filtern!

---

### 3. **Sort-Optionen erweitern** (MITTELER PRIORITÄT)

**Problem:** Nur `published_desc` - aber `popularity` könnte besser sein!

**Lösung:**
- Bei Fetch: `sort=popularity` für relevantere Artikel
- Bei Query: Sort-Optionen in DB-Query

**Benefit:** Bessere Artikel-Auswahl für tägliche News.

---

### 4. **Pagination bei Fetch** (NIEDRIGE PRIORITÄT)

**Problem:** Limit 100 könnte zu wenig sein für tägliche News.

**Lösung:** Offset-basierte Pagination implementieren.

**Benefit:** Mehr Artikel pro Tag möglich.

---

## 💡 Konkrete Use Cases für Daily News

### Use Case 1: Tech-News am Morgen
**Aktuell:**
```python
keywords="artificial intelligence machine learning"  # Komplex, kann viel verpassen
```

**Mit Kategorien:**
```python
categories="technology"
keywords="AI"  # Optional für weitere Fokussierung
sources="techcrunch,arstechnica,the-verge"  # Hochwertige Tech-Quellen
countries="us,gb"  # Englischsprachige Länder
languages="en"
sort="popularity"  # Relevantere Artikel
```

**Resultat:** Viel bessere Tech-News-Auswahl!

---

### Use Case 2: Business-News täglich
**Aktuell:**
```python
keywords="business finance economy"  # Generisch
```

**Mit Filtern:**
```python
categories="business"
sources="reuters,bloomberg,financial-times,wsj"  # Hochwertige Business-Quellen
countries="us,gb,de,ch"  # Wichtige Finanzzentren
languages="en,de"
sort="popularity"
```

**Resultat:** Professionelle Business-News statt generischer Keywords!

---

### Use Case 3: Internationale Abdeckung
**Aktuell:**
```python
# Keine Länder-Filterung - alles gemischt
```

**Mit Filtern:**
```python
countries="us,gb,de,fr,jp,cn"  # Internationale Abdeckung
languages="en,de,fr"  # Multilingual
categories="business,technology"  # Fokus auf wichtige Kategorien
```

**Resultat:** Systematische internationale Abdeckung!

---

## 📋 Implementierungs-Priorität

### 🔴 HOCHER PRIORITÄT (sollte implementiert werden):

1. **categories Parameter** bei Fetch
   - Use Case: Direkt Tech/Business-News statt Keywords
   - Value: Deutlich bessere Artikel-Auswahl
   - Effort: Niedrig (nur Adapter erweitern)

2. **Filter in list-news** (categories, sources, countries, languages)
   - Use Case: Agent kann gezielt filtern
   - Value: Viel flexibler für daily news
   - Effort: Mittel (Backend + DB-Query erweitern)

3. **sources Parameter** bei Fetch
   - Use Case: Hochwertige Quellen bevorzugen
   - Value: Bessere Qualität der täglichen News
   - Effort: Niedrig (nur Adapter erweitern)

### 🟡 MITTLERE PRIORITÄT:

4. **sort: popularity** statt nur published_desc
   - Use Case: Relevantere Artikel
   - Value: Bessere Auswahl
   - Effort: Niedrig

5. **languages/countries Parameter** bei Fetch
   - Use Case: Internationale Abdeckung
   - Value: Systematische Länder-Abdeckung
   - Effort: Niedrig

### 🟢 NIEDRIGE PRIORITÄT:

6. **offset Pagination** bei Fetch
   - Use Case: Mehr als 100 Artikel pro Tag
   - Value: Mehr Coverage
   - Effort: Mittel (Loop mit Offset)

---

## ✅ Empfehlung

**JA, wir sollten die Features nutzen!** Besonders:

1. **categories** - Direkt nach Tech/Business filtern statt Keywords
2. **sources** - Hochwertige Quellen bevorzugen
3. **Filter in list-news** - Agent kann gezielt filtern

**Für 20€/Monat sollten wir alle Features nutzen!**

---

## 🔧 Nächste Schritte

1. ✅ Mediastack Adapter erweitern (categories, sources, countries, languages, sort)
2. ✅ Backend `list-news` erweitern (Filter nach categories/sources/countries/languages)
3. ✅ DB `query_articles` erweitern (neue Filter)
4. ✅ MCP Tool `list-news` erweitern (neue Parameter)
5. ✅ Agent-Prompts anpassen (kann jetzt gezielt filtern)

