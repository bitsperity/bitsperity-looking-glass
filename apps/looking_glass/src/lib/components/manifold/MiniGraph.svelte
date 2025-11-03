<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  
  export let nodes: any[] = [];
  export let edges: any[] = [];
  export let height = 400;
  
  let containerEl: HTMLDivElement;
  let SigmaCtor: any;
  let GraphCtor: any;
  let forceAtlas2: any;
  let renderer: any = null;
  let loading = true;
  let hoveredNode: any = null;
  let tooltipEl: HTMLDivElement | null = null;
  let tooltipX = 0;
  let tooltipY = 0;
  
  function colorForType(type?: string, status?: string): string {
    const byType: Record<string, string> = {
      observation: '#60a5fa',
      hypothesis: '#f59e0b',
      analysis: '#34d399',
      decision: '#f472b6',
      reflection: '#a78bfa',
      question: '#f87171',
      summary: '#a78bfa',
    };
    
    let color = byType[type || ''] || '#9ca3af';
    
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
  
  async function renderGraph() {
    if (!containerEl || !SigmaCtor || !GraphCtor) return;
    
    const rect = containerEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setTimeout(() => renderGraph(), 100);
      return;
    }
    
    try {
      // Clean up old renderer
      if (renderer) {
        renderer.kill();
        renderer = null;
      }
      
      // Build graphology graph
      const graph = new GraphCtor();
      
      // Add nodes
      for (const n of nodes) {
        const nodeId = String(n.id || (n.payload?.id || String(Math.random())));
        const payload = n.payload || n;
        graph.addNode(nodeId, {
          label: payload.title || nodeId.substring(0, 8),
          type: 'circle',
          thoughtType: payload.type,
          status: payload.status,
          size: 4 + Math.min(8, (payload.tickers?.length || 0) * 1.5),
          color: colorForType(payload.type, payload.status),
          x: Math.random(),
          y: Math.random(),
        });
      }
      
      // Add edges
      let edgeId = 0;
      for (const e of edges) {
        const fromId = String(e.from);
        const toId = String(e.to);
        if (graph.hasNode(fromId) && graph.hasNode(toId)) {
          const isSection = e.type === 'section-of';
          const edgeColor = isSection ? '#4b5563' : colorForEdgeType(e.type);
          const edgeSize = isSection ? 0.5 : Math.max(0.5, Math.min(3, (e.weight || 1.0) * 2));
          
          graph.addEdge(fromId, toId, {
            label: e.type || 'related',
            size: edgeSize,
            color: edgeColor,
            type: 'arrow',
          });
        }
      }
      
      // Apply force-directed layout with fewer iterations for faster rendering
      if (graph.order > 0 && forceAtlas2) {
        forceAtlas2.assign(graph, {
          iterations: 80,
          settings: {
            gravity: 1.5,
            scalingRatio: 12,
            strongGravityMode: true,
            barnesHutOptimize: true,
          }
        });
      }
      
      // Create new Sigma renderer
      renderer = new SigmaCtor(graph, containerEl, {
        renderLabels: false,
        renderEdgeLabels: false,
        enableEdgeEvents: true,
        labelSize: 10,
        labelWeight: 'normal',
        labelColor: { color: '#e5e5e5' },
        defaultNodeColor: '#9ca3af',
        defaultEdgeColor: '#4b5563',
        labelRenderedSizeThreshold: 6,
      });

      if (renderer?.setSetting) {
        renderer.setSetting('hoverRenderer', () => undefined);
        renderer.setSetting('enableHovering', true);
      }
      
      // Custom hover tooltip mirroring the main graph component
      renderer.on('enterNode', ({ node }) => {
        const payloadNode = nodes.find((n) => String(n.id) === String(node)) || {};
        const graph = renderer.getGraph();
        const nodePosition = renderer.graphToViewport({ 
          x: graph.getNodeAttribute(node, 'x'), 
          y: graph.getNodeAttribute(node, 'y') 
        });
        
        hoveredNode = {
          id: String(node),
          payload: payloadNode.payload || payloadNode,
        };
        
        // Set initial tooltip position (same as main graph)
        tooltipX = nodePosition.x + 15;
        tooltipY = nodePosition.y - 10;
      });
      
      renderer.on('leaveNode', () => {
        hoveredNode = null;
      });
      
      // Update tooltip position on mouse move within graph (same as main graph)
      renderer.on('mousemove', ({ event }) => {
        if (hoveredNode) {
          const rect = containerEl.getBoundingClientRect();
          tooltipX = event.x - rect.left + 15;
          tooltipY = event.y - rect.top - 10;
        }
      });
       
      loading = false;
    } catch (err: any) {
      console.error('Failed to render mini graph:', err);
      loading = false;
    }
  }
  
  onMount(async () => {
    // Dynamically import Sigma.js
    try {
      const sigmaMod = await import('sigma');
      SigmaCtor = sigmaMod.default;
      GraphCtor = (await import('graphology')).MultiDirectedGraph;
      const forceAtlas2Mod = await import('graphology-layout-forceatlas2');
      forceAtlas2 = forceAtlas2Mod.default || forceAtlas2Mod;
      
      await tick();
      if (nodes.length === 0) {
        loading = false;
      }
      // renderGraph will be called by reactive statement once containerEl is available
    } catch (err) {
      console.error('Failed to load Sigma.js:', err);
      loading = false;
    }
  });
  
  onDestroy(() => {
    if (renderer) {
      renderer.kill();
      renderer = null;
    }
  });
  
  // Trigger render when all conditions are met
  $: if (nodes.length > 0 && SigmaCtor && GraphCtor && containerEl) {
    (async () => {
      loading = true;
      await tick();
      await renderGraph();
    })();
  }
  
  // Update loading state when nodes are empty and libraries are loaded
  $: if (nodes.length === 0 && SigmaCtor && GraphCtor) {
    loading = false;
  }
</script>

<div class="w-full">
  {#if nodes.length === 0}
    <div class="flex items-center justify-center" style="height: {height}px;">
      <div class="text-sm text-neutral-400">No graph data available</div>
    </div>
  {:else}
    <!-- Always render container so containerEl is available -->
    <div class="relative" style="height: {height}px;">
      {#if loading}
        <div class="absolute inset-0 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm z-10 rounded border border-neutral-700">
          <div class="text-sm text-neutral-400">Loading graph...</div>
        </div>
      {/if}
      <div 
        bind:this={containerEl}
        class="w-full border border-neutral-700 rounded bg-neutral-900 {loading ? 'opacity-50' : ''}"
        style="height: {height}px;"
      ></div>
      {#if hoveredNode}
        <div
          bind:this={tooltipEl}
          class="absolute z-50 pointer-events-none px-3 py-2.5 rounded-lg border border-neutral-700 shadow-2xl max-w-sm text-left"
          style="background: rgba(23, 23, 23, 0.95); backdrop-filter: blur(8px); left: {tooltipX}px; top: {tooltipY}px;"
        >
          <div class="flex items-center gap-2 mb-1.5">
            <div
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style="background-color: {colorForType(hoveredNode.payload?.type, hoveredNode.payload?.status)}"
            ></div>
            <span class="text-xs font-semibold text-neutral-300 truncate">
              {hoveredNode.payload?.title || hoveredNode.id}
            </span>
          </div>
          <div class="text-[10px] text-neutral-500 mb-2">
            {hoveredNode.payload?.type || 'unknown'} · {hoveredNode.payload?.status || 'unknown'}
          </div>
          
          <!-- Content/Summary -->
          {#if hoveredNode.payload?.content || hoveredNode.payload?.summary}
            <div class="mt-2 pt-2 border-t border-neutral-800">
              <p class="text-xs text-neutral-300 leading-relaxed line-clamp-4">
                {hoveredNode.payload?.summary || hoveredNode.payload?.content || ''}
              </p>
            </div>
          {/if}
          
          {#if hoveredNode.payload?.tickers?.length}
            <div class="mt-2 flex gap-1 flex-wrap">
              {#each hoveredNode.payload.tickers.slice(0, 3) as ticker}
                <span class="text-[10px] text-neutral-400 font-mono bg-neutral-800/50 px-1.5 py-0.5 rounded">
                  {ticker}
                </span>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
    <div class="mt-2 text-xs text-neutral-500 text-center">
      {nodes.length} nodes, {edges.length} edges
    </div>
  {/if}
</div>


