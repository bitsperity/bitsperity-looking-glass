<script lang="ts">
  import { onMount } from 'svelte';
  import { findSimilar, type SearchResult } from '$lib/api/tesseract';
  import { knowledgeGraphStore, type GraphNode, type GraphEdge } from '$lib/stores/tesseract';
  import GraphCanvas from './GraphCanvas.svelte';
  import MetadataSidebar from './MetadataSidebar.svelte';
  import BodySidebar from './BodySidebar.svelte';
  import GraphControls from './GraphControls.svelte';
  import TopicLegend from './TopicLegend.svelte';

  export let initialArticle: SearchResult | null = null;

  // Graph state
  let nodes: GraphNode[] = [];
  let edges: GraphEdge[] = [];
  let centerNode: GraphNode | null = null;
  let trail: SearchResult[] = [];
  let loading = false;
  let error: string | null = null;
  
  // Node interaction state
  let hoveredNode: GraphNode | null = null;
  let pinnedNode: GraphNode | null = null;
  
  // View state
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  let similarityThreshold = 0.7;
  
  // Body sidebar state
  let fullBodyText: string | null = null;
  let loadingBody = false;
  let bodyError: string | null = null;
  let lastFetchedArticleId: string | null = null;
  
  // Canvas reference for calling drawGraph
  let graphCanvas: GraphCanvas;

  // Restore state from store on mount
  $: if ($knowledgeGraphStore.nodes.length > 0 && nodes.length === 0) {
    nodes = $knowledgeGraphStore.nodes;
    edges = $knowledgeGraphStore.edges;
    centerNode = $knowledgeGraphStore.centerNode;
    trail = $knowledgeGraphStore.trail;
    panX = $knowledgeGraphStore.panX;
    panY = $knowledgeGraphStore.panY;
    zoom = $knowledgeGraphStore.zoom;
    similarityThreshold = $knowledgeGraphStore.similarityThreshold;
  }

  // Save state to store
  function saveGraphState() {
    knowledgeGraphStore.saveState({
      nodes,
      edges,
      centerNode,
      trail,
      panX,
      panY,
      zoom,
      similarityThreshold
    });
  }

  // Debounced threshold save
  let thresholdSaveTimeout: any;
  $: {
    if (similarityThreshold !== undefined && nodes.length > 0) {
      clearTimeout(thresholdSaveTimeout);
      thresholdSaveTimeout = setTimeout(() => {
        saveGraphState();
      }, 300);
    }
  }

  // Fetch full article body
  async function fetchFullBody(articleId: string) {
    loadingBody = true;
    bodyError = null;
    fullBodyText = null;
    
    try {
      const response = await fetch(`http://localhost:8080/v1/news/${articleId}`);
      if (response.ok) {
        const article = await response.json();
        fullBodyText = article.body_text || null;
        if (!fullBodyText) {
          bodyError = 'No body text available for this article.';
        }
      } else {
        bodyError = 'Failed to fetch article body.';
      }
    } catch (e) {
      bodyError = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loadingBody = false;
    }
  }

  // Watch for displayNode changes and fetch body
  $: {
    const displayNode = pinnedNode || hoveredNode;
    const currentArticleId = displayNode?.article.id || null;
    
    if (currentArticleId && currentArticleId !== lastFetchedArticleId) {
      lastFetchedArticleId = currentArticleId;
      fetchFullBody(currentArticleId);
    } else if (!currentArticleId && lastFetchedArticleId) {
      lastFetchedArticleId = null;
      fullBodyText = null;
      bodyError = null;
    }
  }

  // Explore article and build graph
  async function exploreArticle(article: SearchResult, isInitial = false) {
    loading = true;
    error = null;
    
    try {
      const data = await findSimilar(article.id, 10);
      const similarArticles = data.similar_articles || [];
      const filtered = similarArticles.filter((a: any) => (a.score || 0) >= similarityThreshold);
      
      const newsIds = filtered.map((a: any) => a.id);
      let enrichedArticles: SearchResult[] = [];
      
      if (newsIds.length > 0) {
        try {
          const satbaseResponse = await fetch('http://localhost:8080/v1/news/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: newsIds, include_body: false })
          });
          
          if (satbaseResponse.ok) {
            const satbaseData = await satbaseResponse.json();
            const satbaseMap = new Map(satbaseData.items.map((item: any) => [item.id, item]));
            
            enrichedArticles = filtered.map((similar: any) => {
              const satbaseArticle: any = satbaseMap.get(similar.id) || {};
              return {
                id: similar.id,
                score: similar.score,
                title: satbaseArticle.title || 'Unknown',
                text: similar.text || satbaseArticle.description || '',
                source: satbaseArticle.source_name || 'unknown',
                source_name: satbaseArticle.source_name,
                url: satbaseArticle.url || '',
                published_at: satbaseArticle.published_at || '',
                topics: satbaseArticle.topics || [],
                tickers: satbaseArticle.tickers || [],
                language: satbaseArticle.language,
                body_available: false,
                news_id: similar.id
              } as SearchResult;
            });
          }
        } catch (err) {
          console.error('Failed to fetch from Satbase bulk:', err);
        }
      }
      
      if (!isInitial) {
        trail = [...trail, article];
      }
      
      let clickedNode = nodes.find(n => n.id === article.id);
      if (!clickedNode) {
        clickedNode = {
          id: article.id,
          article,
          x: 600,
          y: 400,
          level: 0
        };
        nodes = [clickedNode];
        edges = [];
      }
      
      centerNode = clickedNode;
      
      const angleStep = (2 * Math.PI) / enrichedArticles.length;
      const radius = 250;
      
      enrichedArticles.forEach((similar: SearchResult, idx: number) => {
        if (nodes.some(n => n.id === similar.id)) {
          if (!edges.some(e => 
            (e.from === clickedNode!.id && e.to === similar.id) ||
            (e.to === clickedNode!.id && e.from === similar.id)
          )) {
            edges.push({
              from: clickedNode!.id,
              to: similar.id,
              similarity: similar.score || 0
            });
          }
          return;
        }
        
        const angle = idx * angleStep;
        const newNode: GraphNode = {
          id: similar.id,
          article: similar,
          x: clickedNode!.x + Math.cos(angle) * radius,
          y: clickedNode!.y + Math.sin(angle) * radius,
          level: (clickedNode!.level || 0) + 1,
          similarity: similar.score
        };
        
        nodes = [...nodes, newNode];
        edges = [...edges, {
          from: clickedNode!.id,
          to: newNode.id,
          similarity: similar.score || 0
        }];
      });
      
      nodes = nodes; // Trigger reactivity
      edges = edges;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
    
    saveGraphState();
  }

  // Event handlers
  function handleNodeClick(node: GraphNode, shiftKey: boolean) {
    if (shiftKey) {
      pinnedNode = node;
    } else {
      exploreArticle(node.article);
    }
  }

  function handleNodeHover(node: GraphNode | null) {
    hoveredNode = node;
  }

  function handlePanChange(newPanX: number, newPanY: number) {
    panX = newPanX;
    panY = newPanY;
    saveGraphState();
  }

  function handleZoomChange(newZoom: number) {
    zoom = newZoom;
    saveGraphState();
  }

  function handleThresholdChange(value: number) {
    similarityThreshold = value;
  }

  function handleUnpin() {
    pinnedNode = null;
    fullBodyText = null;
    bodyError = null;
    lastFetchedArticleId = null;
  }

  function handleZoomIn() {
    zoom = Math.min(5, zoom * 1.2);
    saveGraphState();
  }

  function handleZoomOut() {
    zoom = Math.max(0.1, zoom / 1.2);
    saveGraphState();
  }

  function handleResetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    saveGraphState();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && pinnedNode) {
      handleUnpin();
    }
  }

  onMount(() => {
    if (initialArticle) {
      exploreArticle(initialArticle, true);
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  $: displayNode = pinnedNode || hoveredNode;
  $: hasHoveredOrPinned = !!(hoveredNode || pinnedNode);
</script>

<div class="h-full flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
  {#if loading && nodes.length === 0}
    <div class="absolute inset-0 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm z-10">
      <div class="flex flex-col items-center">
        <div class="relative w-12 h-12 mb-4">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse opacity-25"></div>
          <svg class="animate-spin h-12 w-12 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p class="text-sm text-neutral-300 font-medium">Exploring connections...</p>
      </div>
    </div>
  {/if}

  {#if error}
    <div class="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-md">
      <div class="bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300 backdrop-blur-lg shadow-xl">
        {error}
      </div>
    </div>
  {/if}

  <div class="flex-1 overflow-hidden relative">
    <div class="flex items-center justify-center h-full p-6 relative">
      <!-- Main Canvas -->
      <GraphCanvas
        bind:this={graphCanvas}
        {nodes}
        {edges}
        {centerNode}
        {hoveredNode}
        {pinnedNode}
        {similarityThreshold}
        {panX}
        {panY}
        {zoom}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onPanChange={handlePanChange}
        onZoomChange={handleZoomChange}
      />

      <!-- Topic Legend (bottom-left, overlays canvas) -->
      <TopicLegend {nodes} />

      <!-- Zoom & Pan Controls (top-right, moves left when sidebar active) -->
      <GraphControls
        {zoom}
        {similarityThreshold}
        {hasHoveredOrPinned}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onThresholdChange={handleThresholdChange}
      />
    </div>

    <!-- Right Sidebar: Metadata -->
    {#if hoveredNode || pinnedNode}
      {#if nodes.length > 0}
        {#if displayNode}
          <MetadataSidebar
            {displayNode}
            isPinned={!!pinnedNode}
            onUnpin={handleUnpin}
          />
        {/if}
      {/if}
    {/if}

    <!-- Left Sidebar: Body -->
    {#if hoveredNode || pinnedNode}
      {#if nodes.length > 0}
        {#if displayNode}
          <BodySidebar
            {fullBodyText}
            {loadingBody}
            {bodyError}
          />
        {/if}
      {/if}
    {/if}
  </div>
</div>
