<script context="module" lang="ts">
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { globalGraph } from '$lib/api/manifold';
  import { search as searchThoughts } from '$lib/api/manifold';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import ThoughtPreviewModal from '$lib/components/manifold/ThoughtPreviewModal.svelte';
  
  // Sigma wird nur im Browser dynamisch geladen
  let SigmaCtor: any;
  let GraphCtor: any;
  let forceAtlas2: any;

  let nodes: any[] = [];
  let edges: any[] = [];
  let loading = false; 
  let error: string | null = null;
  let type = ''; 
  let status = ''; 
  let tickers = '';
  let sessionId = '';
  let workspaceId = '';
  let previewId: string | null = null;
  let containerEl: HTMLDivElement;
  let renderer: any = null;
  let selectedNode: any = null;
  let hoveredEdge: any = null;
  
  // Search & Mask
  let searchQuery = '';
  let searchResults: string[] = []; // IDs of matching thoughts
  let searchActive = false;

  async function load() {
    loading = true; 
    error = null;
    try {
      const resp = await globalGraph({ 
        limit: 400, 
        type: type || undefined, 
        status: status || undefined, 
        tickers: tickers || undefined,
        session_id: sessionId || undefined,
        workspace_id: workspaceId || undefined,
      });
      nodes = resp.nodes || []; 
      edges = resp.edges || [];
      
      // Warte auf DOM-Update und render dann
      await tick();
      setTimeout(() => renderSigma(), 50);
    } catch (e: any) { 
      error = e?.message ?? 'Error'; 
    } finally { 
      loading = false; 
    }
  }

  async function runSearch() {
    if (!searchQuery.trim()) {
      // Clear search - show all
      searchActive = false;
      searchResults = [];
      applyMask();
      return;
    }

    try {
      const resp = await searchThoughts({ query: searchQuery, limit: 100 });
      searchResults = (resp.results || []).map((r: any) => String(r.id));
      searchActive = true;
      applyMask();
    } catch (e: any) {
      console.error('Search failed:', e);
    }
  }

  function clearSearch() {
    searchQuery = '';
    searchActive = false;
    searchResults = [];
    applyMask();
  }

  function applyMask() {
    if (!renderer) return;
    
    const graph = renderer.getGraph();
    
    if (!searchActive || searchResults.length === 0) {
      // No mask - show all nodes and edges
      graph.forEachNode((node: string) => {
        const nodeData = nodes.find((n) => String(n.id) === String(node));
        graph.setNodeAttribute(node, 'color', colorForType(nodeData?.payload?.type, nodeData?.payload?.status));
        graph.setNodeAttribute(node, 'hidden', false);
      });
      
      graph.forEachEdge((edge: string) => {
        const attrs = graph.getEdgeAttributes(edge);
        graph.setEdgeAttribute(edge, 'color', colorForEdgeType(attrs.label));
        graph.setEdgeAttribute(edge, 'hidden', false);
      });
    } else {
      // Mask applied - hide non-matching nodes and edges
      graph.forEachNode((node: string) => {
        const isMatch = searchResults.includes(String(node));
        const nodeData = nodes.find((n) => String(n.id) === String(node));
        
        if (isMatch) {
          // Show with original color
          graph.setNodeAttribute(node, 'color', colorForType(nodeData?.payload?.type, nodeData?.payload?.status));
          graph.setNodeAttribute(node, 'hidden', false);
        } else {
          // Hide completely
          graph.setNodeAttribute(node, 'hidden', true);
        }
      });
      
      graph.forEachEdge((edge: string) => {
        const source = graph.source(edge);
        const target = graph.target(edge);
        const sourceMatch = searchResults.includes(String(source));
        const targetMatch = searchResults.includes(String(target));
        const attrs = graph.getEdgeAttributes(edge);
        
        if (sourceMatch && targetMatch) {
          // Both ends match - show with color
          graph.setEdgeAttribute(edge, 'color', colorForEdgeType(attrs.label));
          graph.setEdgeAttribute(edge, 'hidden', false);
        } else {
          // At least one end doesn't match - hide completely
          graph.setEdgeAttribute(edge, 'hidden', true);
        }
      });
    }
    
    renderer.refresh();
  }

  onMount(async () => {
    // Dynamische Imports nur im Browser
    const sigmaMod = await import('sigma');
    SigmaCtor = sigmaMod.default;
    GraphCtor = (await import('graphology')).MultiDirectedGraph;
    forceAtlas2 = (await import('graphology-layout-forceatlas2')).default;
    
    await load();
  });

  function renderSigma() {
    if (!containerEl) {
      console.warn('Container element not ready');
      return;
    }
    
    if (!SigmaCtor || !GraphCtor) {
      console.warn('Sigma or Graphology not loaded');
      return;
    }
    
    // Check container dimensions
    const rect = containerEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Container has zero dimensions, retrying...');
      setTimeout(() => renderSigma(), 100);
      return;
    }

    try {
      // Build graphology graph
      const graph = new GraphCtor();
      
      // Add nodes
      for (const n of nodes) {
        graph.addNode(n.id, {
          label: n.payload?.title || n.id,
          type: 'circle', // Sigma node renderer type
          thoughtType: n.payload?.type, // Our application type
          status: n.payload?.status,
          size: 5 + Math.min(10, (n.payload?.tickers?.length || 0) * 2),
          color: colorForType(n.payload?.type, n.payload?.status),
          x: Math.random(),
          y: Math.random(),
        });
      }
      
      // Add edges
      let edgeId = 0;
      for (const e of edges) {
        const id = `edge_${edgeId++}`;
        if (graph.hasNode(e.from) && graph.hasNode(e.to)) {
          const isSection = e.type === 'section-of';
          const edgeColor = isSection ? '#4b5563' : colorForEdgeType(e.type); // gray für section-of
          const edgeSize = isSection ? 0.5 : Math.max(1, Math.min(5, (e.weight || 1.0) * 3));
          
          graph.addEdge(e.from, e.to, { 
            label: e.type || 'related', 
            size: edgeSize, 
            color: edgeColor,
            type: 'arrow', // Sigma supports only 'arrow' and 'line'
            relationWeight: e.weight || 1.0,
            relationDescription: e.description || null, // Store description for hover tooltip
            isDashed: isSection,
          });
        }
      }
      
      // Apply force-directed layout
      if (graph.order > 0) {
        forceAtlas2.assign(graph, { 
          iterations: 150, 
          settings: { 
            gravity: 1.5, 
            scalingRatio: 15,
            strongGravityMode: true,
            barnesHutOptimize: true,
          } 
        });
      }
      
      // Clean up old renderer
      if (renderer) {
        renderer.kill();
        renderer = null;
      }
      
      // Create new Sigma renderer
      renderer = new SigmaCtor(graph, containerEl, { 
        renderLabels: true,
        renderEdgeLabels: true,
        enableEdgeEvents: true,
        labelSize: 14,
        labelWeight: 'bold',
        labelColor: { color: '#e5e5e5' },
        edgeLabelSize: 11,
        edgeLabelWeight: 'normal',
        edgeLabelColor: { color: '#a3a3a3' },
        defaultNodeColor: '#9ca3af',
        defaultEdgeColor: '#4b5563',
        labelRenderedSizeThreshold: 8,
      });
      
      // Node click handlers
      renderer.on('clickNode', ({ node }) => {
        const nodeData = nodes.find((x) => String(x.id) === String(node));
        selectedNode = { 
          id: String(node), 
          payload: nodeData?.payload 
        };
      });
      
      renderer.on('doubleClickNode', ({ node }) => { 
        previewId = String(node); 
      });
      
      // Edge hover handlers
      renderer.on('enterEdge', ({ edge }) => {
        const edgeData = graph.getEdgeAttributes(edge);
        const sourceId = graph.source(edge);
        const targetId = graph.target(edge);
        const sourceNode = nodes.find((x) => String(x.id) === String(sourceId));
        const targetNode = nodes.find((x) => String(x.id) === String(targetId));
        
        hoveredEdge = {
          id: edge,
          type: edgeData.label || 'related',
          weight: edgeData.relationWeight || 1.0,
          description: edgeData.relationDescription || null,
          from: {
            id: sourceId,
            title: sourceNode?.payload?.title || sourceId,
          },
          to: {
            id: targetId,
            title: targetNode?.payload?.title || targetId,
          },
        };
      });
      
      renderer.on('leaveEdge', () => {
        hoveredEdge = null;
      });
      
      console.log(`Graph rendered: ${graph.order} nodes, ${graph.size} edges`);
    } catch (err: any) {
      console.error('Failed to render graph:', err);
      error = `Graph rendering failed: ${err.message}`;
    }
  }

  function colorForType(type?: string, status?: string): string {
    const byType: Record<string, string> = {
      observation: '#60a5fa',
      hypothesis: '#f59e0b',
      analysis: '#34d399',
      decision: '#f472b6',
      reflection: '#a78bfa',
      question: '#f87171',
    };
    
    let color = byType[type || ''] || '#9ca3af';
    
    // Override by status
    if (status === 'validated') color = '#22c55e';
    if (status === 'invalidated' || status === 'deleted') color = '#ef4444';
    if (status === 'quarantined') color = '#eab308';
    
    return color;
  }

  function colorForEdgeType(edgeType?: string): string {
    const edgeColors: Record<string, string> = {
      related: '#6b7280',
      supports: '#22c55e',
      contradicts: '#ef4444',
      followup: '#3b82f6',
      duplicate: '#a855f7',
      informs: '#14b8a6',
      questions: '#f59e0b',
      'section-of': '#6b7280',
    };
    
    return edgeColors[edgeType || 'related'] || '#6b7280';
  }
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Manifold · Graph</h1>
  <ManifoldNav />

  <!-- Search Bar -->
  <div class="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-lg p-4 border border-neutral-700">
    <div class="flex gap-2">
      <div class="flex-1">
        <input 
          class="px-4 py-2 rounded bg-neutral-800 w-full text-sm border border-neutral-700 focus:border-indigo-500 focus:outline-none transition-colors" 
          placeholder="Search thoughts to mask graph… (semantic search across all fields)" 
          bind:value={searchQuery}
          on:keydown={(e) => e.key === 'Enter' && runSearch()}
        />
      </div>
      <button 
        class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors flex items-center gap-2"
        on:click={runSearch}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Search
      </button>
      {#if searchActive}
        <button 
          class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-sm font-medium transition-colors flex items-center gap-2"
          on:click={clearSearch}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      {/if}
    </div>
    {#if searchActive}
      <div class="mt-2 text-xs text-indigo-400">
        🎯 Showing {searchResults.length} matching thoughts · Rest is masked
      </div>
    {/if}
  </div>

  <!-- Filter Controls -->
  <div class="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
    <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div>
        <label class="text-xs text-neutral-400 mb-1 block">Type</label>
        <input 
          class="px-3 py-2 rounded bg-neutral-800 w-full text-sm" 
          placeholder="observation, hypothesis…" 
          bind:value={type} 
        />
      </div>
      <div>
        <label class="text-xs text-neutral-400 mb-1 block">Status</label>
        <input 
          class="px-3 py-2 rounded bg-neutral-800 w-full text-sm" 
          placeholder="active, validated…" 
          bind:value={status} 
        />
      </div>
      <div>
        <label class="text-xs text-neutral-400 mb-1 block">Tickers</label>
        <input 
          class="px-3 py-2 rounded bg-neutral-800 w-full text-sm" 
          placeholder="NVDA,AMD,TSLA" 
          bind:value={tickers} 
        />
      </div>
      <div>
        <label class="text-xs text-neutral-400 mb-1 block">Session</label>
        <input 
          class="px-3 py-2 rounded bg-neutral-800 w-full text-sm" 
          placeholder="session-alpha" 
          bind:value={sessionId} 
        />
      </div>
      <div>
        <label class="text-xs text-neutral-400 mb-1 block">Workspace</label>
        <input 
          class="px-3 py-2 rounded bg-neutral-800 w-full text-sm" 
          placeholder="workspace-id" 
          bind:value={workspaceId} 
        />
      </div>
    </div>
    <button 
      class="mt-3 w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
      on:click={load}
      disabled={loading}
    >
      {loading ? 'Loading…' : 'Reload Graph'}
    </button>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-[70vh] text-neutral-400">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p>Loading graph data…</p>
      </div>
    </div>
  {:else if error}
    <div class="bg-red-950 border border-red-800 rounded-lg p-4 text-red-200">
      <div class="font-semibold mb-1">Error</div>
      <div class="text-sm">{error}</div>
    </div>
  {:else}
    <!-- Stats Bar -->
    <div class="flex items-center justify-between text-sm">
      <div class="text-neutral-400">
        <span class="font-semibold text-neutral-200">{nodes.length}</span> nodes · 
        <span class="font-semibold text-neutral-200">{edges.length}</span> edges
      </div>
      <div class="flex gap-4 text-xs">
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full bg-blue-500"></div>
          <span class="text-neutral-400">observation</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full bg-amber-500"></div>
          <span class="text-neutral-400">hypothesis</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span class="text-neutral-400">analysis</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full bg-pink-500"></div>
          <span class="text-neutral-400">decision</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full bg-purple-500"></div>
          <span class="text-neutral-400">reflection</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          <span class="text-neutral-400">question</span>
        </div>
      </div>
    </div>

    <!-- Graph Layout -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Graph Canvas -->
      <div class="md:col-span-3">
        <div class="h-[70vh] bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
          <div bind:this={containerEl} class="w-full h-full"></div>
        </div>
      </div>

      <!-- Info Panel -->
      <div class="md:col-span-1 space-y-3">
        <!-- Edge Hover Info Card -->
        {#if hoveredEdge}
          <div class="bg-neutral-900 rounded-lg p-4 border border-amber-500 animate-pulse-subtle">
            <div class="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Relation
            </div>
            <div class="space-y-2">
              <!-- Relation Type -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-neutral-400">Type</span>
                <div class="flex items-center gap-2">
                  <div 
                    class="w-6 h-1 rounded" 
                    style="background-color: {colorForEdgeType(hoveredEdge.type)}"
                  ></div>
                  <span class="text-xs font-semibold text-neutral-200">{hoveredEdge.type}</span>
                </div>
              </div>
              
              <!-- Weight -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-neutral-400">Strength</span>
                <div class="flex items-center gap-2">
                  <div class="w-16 bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                      style="width: {hoveredEdge.weight * 100}%"
                    ></div>
                  </div>
                  <span class="text-xs font-mono text-neutral-200">{hoveredEdge.weight.toFixed(2)}</span>
                </div>
              </div>
              
              <!-- Description -->
              {#if hoveredEdge.description}
                <div class="pt-2 border-t border-neutral-800">
                  <div class="text-[11px] text-neutral-500 mb-1">Explanation</div>
                  <div class="text-xs text-neutral-300 leading-relaxed">
                    {hoveredEdge.description}
                  </div>
                </div>
              {/if}
              
              <!-- From → To -->
              <div class="pt-2 border-t border-neutral-800">
                <div class="text-[11px] text-neutral-500 mb-1">Connection</div>
                <div class="space-y-1">
                  <div class="flex items-start gap-2">
                    <div class="text-xs text-neutral-500 mt-0.5">FROM</div>
                    <div class="text-xs text-neutral-200 flex-1 truncate" title={hoveredEdge.from.title}>
                      {hoveredEdge.from.title}
                    </div>
                  </div>
                  <div class="flex items-center justify-center">
                    <svg class="w-3 h-3 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="text-xs text-neutral-500 mt-0.5">TO</div>
                    <div class="text-xs text-neutral-200 flex-1 truncate" title={hoveredEdge.to.title}>
                      {hoveredEdge.to.title}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <div class="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
          <div class="text-sm font-semibold text-neutral-300 mb-3">Node Info</div>
          {#if selectedNode}
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <div 
                  class="w-3 h-3 rounded-full" 
                  style="background-color: {colorForType(selectedNode.payload?.type, selectedNode.payload?.status)}"
                ></div>
                <span class="text-xs text-neutral-400">
                  {selectedNode.payload?.type || 'unknown'} · {selectedNode.payload?.status || 'unknown'}
                </span>
              </div>
              
              <div class="font-semibold text-neutral-100 truncate" title={selectedNode.payload?.title || selectedNode.id}>
                {selectedNode.payload?.title || selectedNode.id}
              </div>

              {#if selectedNode.payload?.content}
                <p class="text-xs text-neutral-400 line-clamp-3">
                  {selectedNode.payload.content}
                </p>
              {/if}

              {#if selectedNode.payload?.tickers?.length}
                <div class="flex gap-1 flex-wrap">
                  {#each selectedNode.payload.tickers as ticker}
                    <span class="text-xs bg-neutral-800 rounded px-2 py-1 font-mono">
                      {ticker}
                    </span>
                  {/each}
                </div>
              {/if}

              {#if selectedNode.payload?.tags?.length}
                <div class="flex gap-1 flex-wrap">
                  {#each selectedNode.payload.tags as tag}
                    <span class="text-xs bg-neutral-800 text-neutral-400 rounded px-2 py-0.5">
                      #{tag}
                    </span>
                  {/each}
                </div>
              {/if}

              <div class="pt-2 flex gap-2">
                <button 
                  class="flex-1 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs transition-colors"
                  on:click={() => { previewId = selectedNode.id; }}
                >
                  Preview
                </button>
                <a 
                  class="flex-1 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-center transition-colors"
                  href={`/manifold/thoughts/${selectedNode.id}`}
                >
                  Open
                </a>
              </div>
            </div>
          {:else}
            <div class="text-neutral-500 text-sm text-center py-8">
              <div class="mb-2">👆</div>
              <p>Click a node to view details</p>
              <p class="text-xs mt-1">Double-click for quick preview</p>
            </div>
          {/if}
        </div>

        <!-- Legend Card -->
        <div class="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
          <div class="text-sm font-semibold text-neutral-300 mb-2">Interactions</div>
          <div class="space-y-1 text-xs text-neutral-400">
            <div>• <span class="font-medium">Click node</span>: Select node</div>
            <div>• <span class="font-medium">Double-click node</span>: Quick preview</div>
            <div>• <span class="font-medium">Hover edge</span>: Show relation details</div>
            <div>• <span class="font-medium">Drag</span>: Pan canvas</div>
            <div>• <span class="font-medium">Scroll</span>: Zoom in/out</div>
          </div>
        </div>

        <!-- Edge Legend Card -->
        <div class="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
          <div class="text-sm font-semibold text-neutral-300 mb-2">Relations</div>
          <div class="space-y-1 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-8 h-0.5 bg-neutral-500"></div>
              <span class="text-neutral-400">related</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-8 h-0.5 bg-green-500"></div>
              <span class="text-neutral-400">supports</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-8 h-0.5 bg-red-500"></div>
              <span class="text-neutral-400">contradicts</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-8 h-0.5 bg-blue-500"></div>
              <span class="text-neutral-400">followup</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-8 h-0.5 bg-purple-500"></div>
              <span class="text-neutral-400">duplicate</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-8 h-0.5 bg-gray-500"></div>
              <span class="text-neutral-400">section-of</span>
            </div>
          </div>
          <div class="mt-2 text-[11px] text-neutral-500">
            Thicker edges = stronger relation
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<ThoughtPreviewModal thoughtId={previewId} onClose={() => { previewId = null; }} />


