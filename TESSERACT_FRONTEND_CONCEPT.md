# Tesseract Frontend - Design Konzept

**Version:** 2.0  
**Datum:** 2025-10-21  
**Ziel:** Modern, ordentlich, angenehme UX, SOLID, volle Kontrolle

---

## Probleme im aktuellen Design

### 1. **Layout-Probleme**
- ❌ Search Button ragt in Suchleiste rein (`right-2 top-2` absolute positioning)
- ❌ Admin-Panel ist schwer verständlich (keine klare Hierarchie)
- ❌ "Similar" Button überlappt mit Badges
- ❌ Zu viele Elemente auf einmal sichtbar (overwhelming)

### 2. **UX-Probleme**
- ❌ Admin-Controls sind versteckt ("Show/Hide") → keine Transparenz
- ❌ Collection Switch hat keine Bestätigung → gefährlich
- ❌ Kein visuelles Feedback für Actions
- ❌ Progress Bar zu klein und unscheinbar
- ❌ Keine klare Trennung zwischen User- und Admin-Modus

### 3. **Funktionale Probleme**
- ❌ Keine Indication welche Collection aktiv ist
- ❌ Refresh-Button statt Auto-Polling für Status
- ❌ Fehler-Messages verschwinden nicht automatisch
- ❌ Similar-Modal zeigt nur Titel, keine Actions

---

## Design-Prinzipien

### 1. **Clarity over Cleverness**
- Klare visuelle Hierarchie
- Offensichtliche Aktions-Flows
- Keine versteckten Features

### 2. **Safety First**
- Destructive Actions (Collection Switch, Batch) benötigen Bestätigung
- Status-Indication für laufende Prozesse
- Clear Error States

### 3. **Professional & Modern**
- Glassmorphism für Depth
- Micro-Interactions für Feedback
- Consistent Spacing & Typography
- Dark Theme with High Contrast

### 4. **Agent-First**
- Alle Admin-Funktionen sichtbar und erreichbar
- Status-Information prominent
- Logs/History für Nachvollziehbarkeit

---

## Neue Architektur

### Layout-Struktur

```
┌─────────────────────────────────────────────┐
│ HEADER                                      │
│ [Tesseract] [Status Indicator]             │
│                                    [Admin] │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ SEARCH SECTION                              │
│ ┌───────────────────────────────────────┐   │
│ │ Search Input                [Search] │   │
│ └───────────────────────────────────────┘   │
│ [Filters: Tickers | From | To]             │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ RESULTS AREA (scrollable)                   │
│ ┌─────────────────────────────────────────┐ │
│ │ Result Card                             │ │
│ │ [Score Badge] [Similar Button]          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Admin Mode (Separate Page or Sidebar)

**Option A:** Separate `/tesseract/admin` Route  
**Option B:** Slide-in Sidebar von rechts  

**Empfehlung:** Slide-in Sidebar (weniger Klicks, aber visuelle Trennung)

```
┌─────────────────────────────────────────────┐
│ Main Content    │ ADMIN SIDEBAR             │
│                 │ ┌───────────────────────┐ │
│ Search Results  │ │ Vector Store Status   │ │
│                 │ │ • Collection: news_v1 │ │
│                 │ │ • Vectors: 2,408      │ │
│                 │ │ • Size: 1024D         │ │
│                 │ └───────────────────────┘ │
│                 │ ┌───────────────────────┐ │
│                 │ │ Embedding Status      │ │
│                 │ │ [Progress Bar]        │ │
│                 │ │ 2,408 / 2,408 (100%)  │ │
│                 │ │ Device: CUDA          │ │
│                 │ └───────────────────────┘ │
│                 │ ┌───────────────────────┐ │
│                 │ │ Actions               │ │
│                 │ │ [New Collection]      │ │
│                 │ │ [Batch Embed]         │ │
│                 │ │ [Switch Collection]   │ │
│                 │ └───────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Component-Architektur

### 1. **SearchBar Component**
```svelte
<SearchBar 
  bind:query 
  bind:filters 
  on:search 
  loading={loading}
/>
```
**Features:**
- Full-width input mit klarem Focus State
- Search Button rechts AUSSERHALB des Inputs (nicht absolute)
- Filter-Section collapsible (Show/Hide Filters)
- Enter-Key Submit

### 2. **ResultCard Component**
```svelte
<ResultCard 
  result={item} 
  on:similar 
  on:open
/>
```
**Features:**
- Score Badge oben links (kein Overlap)
- Similar Button in Footer (nicht absolute)
- Hover State mit Lift-Effect
- Smooth Transitions

### 3. **AdminSidebar Component**
```svelte
<AdminSidebar 
  bind:open 
  on:action
/>
```
**Features:**
- Slide-in von rechts
- Auto-Polling für Status (alle 5s wenn Batch läuft)
- Section für: Status | Collections | Actions
- Confirmation Modals für gefährliche Actions

### 4. **StatusIndicator Component**
```svelte
<StatusIndicator 
  status={embedStatus}
/>
```
**Features:**
- Dot mit Farbe (idle=gray, running=blue, done=green, error=red)
- Tooltip mit Details
- Pulsing Animation bei "running"

### 5. **CollectionManager Component**
```svelte
<CollectionManager 
  collections={collections}
  activeAlias={activeAlias}
  on:switch
  on:create
/>
```
**Features:**
- List mit Radio Buttons (nur 1 aktiv)
- Active Collection highlighted
- Metadata als Subtitle (vectors count, size)
- Confirm Modal für Switch

### 6. **BatchEmbedModal Component**
```svelte
<BatchEmbedModal 
  bind:open
  on:start
/>
```
**Features:**
- Date Range Picker
- Estimated Count Preview
- Progress Bar wenn läuft
- Cancel Button

---

## UX-Flows

### Flow 1: Semantic Search
1. User kommt auf Page → Empty State mit Beispiel-Query
2. User tippt Query → Autocomplete (optional)
3. User klickt Search oder drückt Enter
4. Loading State (Spinner + "Searching...")
5. Results erscheinen mit Scroll-Animation
6. User kann Similar klicken → Modal öffnet

### Flow 2: Batch Embedding (Admin)
1. User öffnet Admin Sidebar
2. Status zeigt "idle" und Current Collection
3. User klickt "Batch Embed"
4. Modal öffnet mit Date Range
5. User wählt Dates, klickt "Start"
6. Modal schließt, Status zeigt Progress
7. Auto-Polling zeigt Live-Progress (24/2408, 1%, CUDA)
8. Bei Completion: Success Toast
9. User kann Logs sehen (optional)

### Flow 3: Collection Switch (Admin)
1. User öffnet Admin Sidebar
2. Section "Collections" zeigt alle verfügbaren
3. Active Collection ist highlighted (Radio Button selected)
4. User wählt andere Collection
5. Confirmation Modal: "Switch alias to news_v123? This is instant but changes active data."
6. User bestätigt
7. Alias switched
8. Success Toast
9. Page refreshed (optional) oder Status-Update

---

## Visual Design

### Color Palette
```css
/* Background */
--bg-primary: #0a0a0a;
--bg-secondary: #171717;
--bg-tertiary: #262626;

/* Borders */
--border-primary: #404040;
--border-secondary: #525252;

/* Text */
--text-primary: #fafafa;
--text-secondary: #a3a3a3;
--text-tertiary: #737373;

/* Accent */
--accent-blue: #3b82f6;
--accent-green: #10b981;
--accent-red: #ef4444;
--accent-yellow: #f59e0b;
```

### Typography
```css
/* Headers */
--font-h1: 2rem / 600;
--font-h2: 1.5rem / 600;
--font-h3: 1.25rem / 500;

/* Body */
--font-base: 0.875rem / 400;
--font-sm: 0.75rem / 400;
```

### Spacing
```css
--space-xs: 0.5rem;   /* 8px */
--space-sm: 1rem;     /* 16px */
--space-md: 1.5rem;   /* 24px */
--space-lg: 2rem;     /* 32px */
--space-xl: 3rem;     /* 48px */
```

### Effects
```css
/* Glassmorphism */
.glass {
  background: rgba(23, 23, 23, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(64, 64, 64, 0.5);
}

/* Elevation */
.elevation-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.elevation-md { box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
.elevation-lg { box-shadow: 0 8px 24px rgba(0,0,0,0.5); }

/* Hover Lift */
.lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
```

---

## Micro-Interactions

### 1. **Button Click**
- Scale down (0.98) on mousedown
- Scale up (1) on mouseup
- Ripple effect (optional)

### 2. **Search Submit**
- Input blur
- Loading spinner in button
- Button disabled während loading

### 3. **Result Card Hover**
- Lift effect (translateY -2px)
- Border glow (accent color)
- Similar button fade-in

### 4. **Status Indicator**
- Pulsing animation bei "running"
- Color transition on state change
- Tooltip on hover

### 5. **Admin Sidebar**
- Slide-in animation (0.3s ease-out)
- Backdrop fade-in
- Sections stagger-in (0.1s delay each)

---

## Responsive Design

### Breakpoints
```css
--mobile: 640px;
--tablet: 768px;
--desktop: 1024px;
--wide: 1280px;
```

### Mobile Adaptations
- Admin Sidebar wird Full-Screen Modal
- Filters werden Accordion
- Result Cards werden full-width
- Search Button wird Full-Width unter Input

---

## Accessibility

### Keyboard Navigation
- Tab-Index auf allen interaktiven Elementen
- Escape schließt Modals/Sidebar
- Enter submitted Search
- Arrow Keys navigieren Results (optional)

### Screen Reader
- ARIA Labels auf allen Buttons
- Alt Text auf Icons
- Live Region für Status Updates

### Color Contrast
- Minimum 4.5:1 für Text
- Focus Indicators mit 3px Outline

---

## Performance

### Optimizations
1. **Virtual Scrolling** für >100 Results
2. **Debounce** für Auto-Complete (300ms)
3. **Lazy Load** für Similar Articles
4. **Memoization** für Result Cards
5. **Throttle** für Status Polling (5s)

---

## Implementation Plan

### Phase 1: Core Components (2h)
- [ ] SearchBar mit externem Button
- [ ] ResultCard ohne Overlap
- [ ] StatusIndicator
- [ ] Basis Layout

### Phase 2: Admin Features (2h)
- [ ] AdminSidebar Slide-in
- [ ] CollectionManager
- [ ] BatchEmbedModal
- [ ] Auto-Polling

### Phase 3: Polish (1h)
- [ ] Micro-Interactions
- [ ] Loading States
- [ ] Error Handling
- [ ] Responsive Design

### Phase 4: Testing (30min)
- [ ] UX-Flow Testing
- [ ] Mobile Testing
- [ ] Accessibility Testing

---

## Acceptance Criteria

### User Experience
✅ Search ist intuitiv und schnell  
✅ Admin-Funktionen sind klar getrennt  
✅ Keine UI-Overlaps oder Layout-Bugs  
✅ Feedback für alle Actions  
✅ Fehler sind verständlich  

### Visual Quality
✅ Modern & Professional  
✅ Consistent Spacing  
✅ Smooth Animations  
✅ High Contrast  

### Functionality
✅ Alle Backend-Endpoints integriert  
✅ Status-Polling funktioniert  
✅ Collection-Management sicher  
✅ Similar Articles öffnen Modal  

---

## Next Steps

1. **Cleanup:** Alte Tesseract Page archivieren
2. **Build:** Neue Components erstellen
3. **Integrate:** Backend-API einbinden
4. **Test:** UX-Flows durchgehen
5. **Polish:** Final touches

**Estimated Time:** 5-6 Stunden

