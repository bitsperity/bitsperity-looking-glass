<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { findSimilar, type SearchResult } from '$lib/api/tesseract';
  import Button from '../shared/Button.svelte';
  
  export let initialArticle: SearchResult | null = null;
  
  interface GraphNode {
    id: string;
    article: SearchResult;
    x: number;
    y: number;
    level: number;
    similarity?: number;
  }
  
  interface GraphEdge {
    from: string;
    to: string;
    similarity: number;
  }
  
  let nodes: GraphNode[] = [];
  let edges: GraphEdge[] = [];
  let centerNode: GraphNode | null = null;
  let trail: SearchResult[] = [];
  let loading = false;
  let error: string | null = null;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let hoveredNode: GraphNode | null = null;
  let selectedNode: GraphNode | null = null;
  let viewMode: 'graph' | 'list' | 'timeline' = 'graph';
  let similarityThreshold = 0.7;
  
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;
  const NODE_RADIUS = 40;
  const CENTER_RADIUS = 60;
  
  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
    }
    
    if (initialArticle) {
      exploreArticle(initialArticle, true);
    }
  });
  
  async function exploreArticle(article: SearchResult, isInitial = false) {
    loading = true;
    error = null;
    
    try {
      const data = await findSimilar(article.id, 10);
      const similarArticles = data.similar_articles || [];
      
      // Filter by threshold
      const filtered = similarArticles.filter((a: SearchResult) => 
        (a.score || 0) >= similarityThreshold
      );
      
      if (!isInitial) {
        trail = [...trail, article];
      }
      
      // Create center node
      centerNode = {
        id: article.id,
        article,
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        level: 0
      };
      
      // Create radial layout for similar articles
      nodes = [centerNode];
      edges = [];
      
      const angleStep = (2 * Math.PI) / filtered.length;
      const radius = 250;
      
      filtered.forEach((similar: SearchResult, idx: number) => {
        const angle = idx * angleStep;
        const node: GraphNode = {
          id: similar.id,
          article: similar,
          x: centerNode!.x + Math.cos(angle) * radius,
          y: centerNode!.y + Math.sin(angle) * radius,
          level: 1,
          similarity: similar.score
        };
        
        nodes.push(node);
        edges.push({
          from: centerNode!.id,
          to: node.id,
          similarity: similar.score || 0
        });
      });
      
      drawGraph();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
  
  function drawGraph() {
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        ctx!.beginPath();
        ctx!.moveTo(fromNode.x, fromNode.y);
        ctx!.lineTo(toNode.x, toNode.y);
        
        // Line width based on similarity
        ctx!.lineWidth = 1 + edge.similarity * 3;
        
        // Color gradient based on similarity
        const alpha = 0.3 + edge.similarity * 0.7;
        ctx!.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx!.stroke();
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const isCenter = node === centerNode;
      const isHovered = node === hoveredNode;
      const isSelected = node === selectedNode;
      const radius = isCenter ? CENTER_RADIUS : NODE_RADIUS;
      
      // Node circle
      ctx!.beginPath();
      ctx!.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      
      if (isCenter) {
        const gradient = ctx!.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(147, 51, 234, 0.6)');
        ctx!.fillStyle = gradient;
      } else {
        const alpha = isHovered || isSelected ? 0.8 : 0.6;
        ctx!.fillStyle = `rgba(38, 38, 38, ${alpha})`;
      }
      
      ctx!.fill();
      
      // Border
      ctx!.strokeStyle = isHovered || isSelected ? 'rgba(59, 130, 246, 1)' : 'rgba(115, 115, 115, 0.5)';
      ctx!.lineWidth = isHovered || isSelected ? 3 : 2;
      ctx!.stroke();
      
      // Similarity badge (for non-center nodes)
      if (!isCenter && node.similarity) {
        ctx!.fillStyle = 'rgba(59, 130, 246, 0.9)';
        ctx!.font = 'bold 12px sans-serif';
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillText(`${Math.round(node.similarity * 100)}%`, node.x, node.y);
      }
    });
  }
  
  function handleCanvasClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked on a node
    for (const node of nodes) {
      const radius = node === centerNode ? CENTER_RADIUS : NODE_RADIUS;
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      
      if (distance <= radius) {
        if (node !== centerNode) {
          exploreArticle(node.article);
        }
        return;
      }
    }
  }
  
  function handleCanvasMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let found = false;
    for (const node of nodes) {
      const radius = node === centerNode ? CENTER_RADIUS : NODE_RADIUS;
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      
      if (distance <= radius) {
        hoveredNode = node;
        found = true;
        canvas.style.cursor = 'pointer';
        break;
      }
    }
    
    if (!found) {
      hoveredNode = null;
      canvas.style.cursor = 'default';
    }
    
    drawGraph();
  }
  
  function resetGraph() {
    if (initialArticle) {
      trail = [];
      exploreArticle(initialArticle, true);
    }
  }
  
  function goBack() {
    if (trail.length > 0) {
      const previous = trail.pop();
      trail = trail;
      if (previous) {
        exploreArticle(previous);
      }
    }
  }
  
  $: if (similarityThreshold) {
    if (centerNode) {
      exploreArticle(centerNode.article);
    }
  }
</script>

<div class="h-full flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
  <!-- Controls -->
  <div class="flex-shrink-0 p-4 bg-gradient-to-b from-neutral-900/80 to-neutral-950/60 backdrop-blur-lg border-b border-neutral-700/20">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Knowledge Graph</h3>
        {#if centerNode}
          <span class="text-sm text-neutral-400">· {nodes.length - 1} connections</span>
        {/if}
      </div>
      
      <div class="flex items-center gap-2">
        <!-- View Mode Tabs -->
        <div class="flex bg-neutral-800/50 rounded-lg p-1 border border-neutral-700/30">
          <button
            class="px-3 py-1 text-xs rounded transition-all duration-200 {viewMode === 'graph' ? 'bg-blue-500/20 text-blue-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}"
            on:click={() => viewMode = 'graph'}
          >
            Graph
          </button>
          <button
            class="px-3 py-1 text-xs rounded transition-all duration-200 {viewMode === 'list' ? 'bg-blue-500/20 text-blue-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}"
            on:click={() => viewMode = 'list'}
          >
            List
          </button>
          <button
            class="px-3 py-1 text-xs rounded transition-all duration-200 {viewMode === 'timeline' ? 'bg-blue-500/20 text-blue-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}"
            on:click={() => viewMode = 'timeline'}
          >
            Timeline
          </button>
        </div>
        
        {#if trail.length > 0}
          <Button variant="secondary" size="sm" on:click={goBack}>
            ← Back
          </Button>
        {/if}
        
        <Button variant="secondary" size="sm" on:click={resetGraph}>
          Reset
        </Button>
      </div>
    </div>
    
    <!-- Trail -->
    {#if trail.length > 0}
      <div class="flex items-center gap-2 text-xs text-neutral-400 overflow-x-auto pb-2">
        <span>Trail:</span>
        {#each trail as item, idx}
          <span class="flex items-center gap-2">
            <span class="text-neutral-500">→</span>
            <span class="truncate max-w-[200px]">{item.title || 'Untitled'}</span>
          </span>
        {/each}
      </div>
    {/if}
    
    <!-- Similarity Threshold -->
    <div class="flex items-center gap-3 mt-3">
      <label class="text-xs text-neutral-300 font-semibold">Similarity Threshold:</label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        bind:value={similarityThreshold}
        class="flex-1 max-w-xs"
      />
      <span class="text-xs text-neutral-400 font-mono">{(similarityThreshold * 100).toFixed(0)}%</span>
    </div>
  </div>
  
  <!-- Graph Area -->
  <div class="flex-1 overflow-hidden relative">
    {#if loading}
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
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-6 text-sm text-red-300 backdrop-blur-sm shadow-lg max-w-md">
          {error}
        </div>
      </div>
    {/if}
    
    {#if viewMode === 'graph'}
      <div class="flex items-center justify-center h-full p-6">
        <canvas
          bind:this={canvas}
          on:click={handleCanvasClick}
          on:mousemove={handleCanvasMove}
          class="rounded-xl border border-neutral-700/30 shadow-2xl bg-neutral-900/30 backdrop-blur-sm"
        ></canvas>
      </div>
      
      <!-- Hovered Node Info -->
      {#if hoveredNode && hoveredNode !== centerNode}
        <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-neutral-800/95 to-neutral-900/95 border border-neutral-600/30 rounded-xl p-4 backdrop-blur-lg shadow-2xl max-w-md">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/10 flex items-center justify-center border border-blue-500/30">
              <span class="text-sm font-bold text-blue-300">{Math.round((hoveredNode.similarity || 0) * 100)}%</span>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-neutral-100 line-clamp-2">{hoveredNode.article.title}</h4>
              <p class="text-xs text-neutral-400 mt-1 line-clamp-2">{hoveredNode.article.text}</p>
              <div class="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                <span>{hoveredNode.article.source_name || hoveredNode.article.source}</span>
                <span>•</span>
                <span>{new Date(hoveredNode.article.published_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <p class="text-xs text-neutral-500 mt-3 text-center">Click to explore this node</p>
        </div>
      {/if}
    {:else if viewMode === 'list'}
      <div class="p-6 overflow-y-auto h-full">
        <div class="max-w-4xl mx-auto space-y-3">
          {#each nodes.filter(n => n !== centerNode) as node}
            <button
              class="w-full text-left bg-gradient-to-r from-neutral-800/60 to-neutral-900/40 border border-neutral-600/30 rounded-xl p-4 hover:border-blue-500/50 transition-all duration-200 backdrop-blur-sm shadow-lg group"
              on:click={() => exploreArticle(node.article)}
            >
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/10 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform duration-200">
                  <span class="text-lg font-bold text-blue-300">{Math.round((node.similarity || 0) * 100)}%</span>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-semibold text-neutral-100 mb-1 group-hover:text-blue-300 transition-colors">{node.article.title}</h4>
                  <p class="text-xs text-neutral-400 line-clamp-2 mb-2">{node.article.text}</p>
                  <div class="flex items-center gap-2 text-xs text-neutral-500">
                    <span>{node.article.source_name || node.article.source}</span>
                    <span>•</span>
                    <span>{new Date(node.article.published_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Timeline View -->
      <div class="p-6 overflow-y-auto h-full">
        <div class="max-w-4xl mx-auto">
          <div class="relative">
            <!-- Timeline line -->
            <div class="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-purple-500/50"></div>
            
            <div class="space-y-6">
              {#each nodes
                .filter(n => n !== centerNode)
                .sort((a, b) => new Date(b.article.published_at).getTime() - new Date(a.article.published_at).getTime()) as node}
                <div class="relative pl-16">
                  <!-- Timeline dot -->
                  <div class="absolute left-6 top-2 w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-neutral-900"></div>
                  
                  <button
                    class="w-full text-left bg-gradient-to-r from-neutral-800/60 to-neutral-900/40 border border-neutral-600/30 rounded-xl p-4 hover:border-blue-500/50 transition-all duration-200 backdrop-blur-sm shadow-lg group"
                    on:click={() => exploreArticle(node.article)}
                  >
                    <div class="flex items-start justify-between gap-4 mb-2">
                      <span class="text-xs font-mono text-neutral-400">{new Date(node.article.published_at).toLocaleString()}</span>
                      <span class="flex-shrink-0 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold rounded border border-blue-500/30">
                        {Math.round((node.similarity || 0) * 100)}%
                      </span>
                    </div>
                    <h4 class="text-sm font-semibold text-neutral-100 mb-1 group-hover:text-blue-300 transition-colors">{node.article.title}</h4>
                    <p class="text-xs text-neutral-400 line-clamp-2">{node.article.text}</p>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Legend -->
  <div class="flex-shrink-0 p-4 bg-gradient-to-t from-neutral-900/80 to-neutral-950/60 backdrop-blur-lg border-t border-neutral-700/20">
    <div class="flex items-center justify-center gap-8 text-xs text-neutral-400">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/80 to-purple-500/60 border-2 border-neutral-700"></div>
        <span>Center Article</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-full bg-neutral-800 border-2 border-neutral-600"></div>
        <span>Similar Article</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-12 h-0.5 bg-gradient-to-r from-blue-500/30 to-blue-500/80"></div>
        <span>Connection Strength</span>
      </div>
    </div>
  </div>
</div>

