<script context="module" lang="ts">
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { globalGraph } from '$lib/api/manifold';
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
  let previewId: string | null = null;
  let containerEl: HTMLDivElement;
  let renderer: any = null;
  let selectedNode: any = null;

  async function load() {
    loading = true; 
    error = null;
    try {
      const resp = await globalGraph({ 
        limit: 400, 
        type: type || undefined, 
        status: status || undefined, 
        tickers: tickers || undefined 
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
          graph.addEdge(e.from, e.to, { 
            label: e.type, 
            size: 2, 
            color: '#4b5563',
            type: 'arrow',
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
        enableEdgeEvents: true,
        labelSize: 14,
        labelWeight: 'bold',
        labelColor: { color: '#e5e5e5' }, // Hell-graue Labels für dunklen Hintergrund
        defaultNodeColor: '#9ca3af',
        defaultEdgeColor: '#4b5563',
        labelRenderedSizeThreshold: 8, // Labels nur ab bestimmter Node-Größe
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
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Manifold · Graph</h1>
  <ManifoldNav />

  <!-- Filter Controls -->
  <div class="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
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
      <div class="flex items-end">
        <button 
          class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 w-full text-sm font-medium transition-colors"
          on:click={load}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Reload Graph'}
        </button>
      </div>
    </div>
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
            <div>• <span class="font-medium">Click</span>: Select node</div>
            <div>• <span class="font-medium">Double-click</span>: Quick preview</div>
            <div>• <span class="font-medium">Drag</span>: Pan canvas</div>
            <div>• <span class="font-medium">Scroll</span>: Zoom in/out</div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<ThoughtPreviewModal thoughtId={previewId} onClose={() => { previewId = null; }} />


