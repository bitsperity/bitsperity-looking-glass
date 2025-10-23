<script context="module" lang="ts">
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fetchContext } from '$lib/services/ariadneService';
  import LabelBadge from '$lib/components/ariadne/LabelBadge.svelte';
  import RelTypeBadge from '$lib/components/ariadne/RelTypeBadge.svelte';
  import AutocompleteInput from '$lib/components/shared/AutocompleteInput.svelte';
  import { fetchTopicSuggestions, fetchTickerSuggestions } from '$lib/services/ariadneSuggestions';
  
  let SigmaCtor: any;
  let GraphCtor: any;
  let forceAtlas2: any;

  let topic = '';
  let tickersInput = '';
  let asOf = '';
  let depth = 2;
  let limit = 100;
  let loading = false;
  let error: string | null = null;
  let containerEl: HTMLDivElement;
  let renderer: any = null;
  let selectedNode: any = null;
  let hoveredEdge: any = null;
  let nodes: any[] = [];
  let edges: any[] = [];

  async function loadGraph() {
    loading = true;
    error = null;
    try {
      const tickers = tickersInput ? tickersInput.split(',').map(t => t.trim()).filter(t => t) : [];
      const resp = await fetchContext({
        topic: topic || undefined,
        tickers: tickers.length > 0 ? tickers : undefined,
        as_of: asOf || undefined,
        depth,
        limit,
      });
      
      nodes = resp.subgraph.nodes;
      edges = resp.subgraph.edges;
      
      await tick();
      setTimeout(() => renderSigma(), 50);
    } catch (e: any) {
      error = e?.message ?? 'Failed to load context';
    } finally {
      loading = false;
    }
  }

  async function renderSigma() {
    if (!SigmaCtor || !GraphCtor || !containerEl) return;
    if (nodes.length === 0) return;

    if (renderer) {
      renderer.kill();
      renderer = null;
    }

    const graph = new GraphCtor();
    
    // Add nodes
    for (const node of nodes) {
      graph.addNode(node.id, {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 10 + (node.properties.ticker ? 5 : 0),
        label: node.properties.name || node.properties.ticker || node.id,
        color: colorForLabel(node.label),
        type: 'circle',
        labelColor: '#e5e5e5',
        nodeLabel: node.label,
        nodeSector: node.properties.sector || '',
      });
    }

    // Add edges (skip duplicates)
    const addedEdges = new Set<string>();
    for (const edge of edges) {
      const edgeKey = `${edge.source_id}-${edge.target_id}`;
      if (graph.hasNode(edge.source_id) && graph.hasNode(edge.target_id) && !addedEdges.has(edgeKey)) {
        graph.addEdge(edge.source_id, edge.target_id, {
          label: edge.rel_type,
          color: colorForRelType(edge.rel_type),
          size: (edge.properties.confidence || 0.5) * 3,
          edgeLabelColor: '#c9c9c9',
          edgeProperties: edge.properties,
        });
        addedEdges.add(edgeKey);
      }
    }

    // Layout
    if (forceAtlas2) {
      const settings = forceAtlas2.inferSettings(graph);
      forceAtlas2.assign(graph, { iterations: 300, settings });
    }

    // Render
    renderer = new SigmaCtor(graph, containerEl, {
      labelRenderedSizeThreshold: 5,
      labelColor: { color: '#e5e5e5' },
      edgeLabelColor: { attribute: 'edgeLabelColor' },
      renderEdgeLabels: true,
    });

    // Events
    renderer.on('clickNode', ({ node }: any) => {
      selectedNode = nodes.find(n => n.id === node);
    });

    renderer.on('doubleClickNode', ({ node }: any) => {
      // Open preview or detail
      window.open(`/ariadne/search?tickers=${nodes.find(n => n.id === node)?.properties?.ticker || ''}`, '_blank');
    });

    renderer.on('enterEdge', ({ edge }: any) => {
      const edgeData = graph.getEdgeAttributes(edge);
      hoveredEdge = {
        from: graph.source(edge),
        to: graph.target(edge),
        type: edgeData.label,
        properties: edgeData.edgeProperties || {},
      };
    });

    renderer.on('leaveEdge', () => {
      hoveredEdge = null;
    });
  }

  function colorForLabel(label: string): string {
    const colors: Record<string, string> = {
      Company: '#3b82f6',
      Instrument: '#06b6d4',
      Event: '#ef4444',
      Concept: '#a855f7',
      Location: '#10b981',
      Observation: '#f59e0b',
      PriceEvent: '#f97316',
      Pattern: '#ec4899',
      Hypothesis: '#6366f1',
      Regime: '#14b8a6',
      News: '#6b7280',
    };
    return colors[label] || '#9ca3af';
  }

  function colorForRelType(relType: string): string {
    const colors: Record<string, string> = {
      SUPPLIES_TO: '#3b82f6',
      COMPETES_WITH: '#ef4444',
      AFFECTS: '#f97316',
      CORRELATES_WITH: '#a855f7',
      CORRELATED_WITH: '#a855f7',
      MENTIONS: '#6b7280',
      EVIDENCE_FOR: '#10b981',
      CONTRADICTS: '#7f1d1d',
      VALIDATES: '#14b8a6',
      EXTRACTED_FROM: '#ec4899',
      HAS_PRICE_EVENT: '#f59e0b',
      PRICE_EVENT_OF: '#f59e0b',
      SAME_COMMUNITY: '#06b6d4',
      BENEFITS_FROM: '#6366f1',
    };
    return colors[relType] || '#9ca3af';
  }

  onMount(async () => {
    try {
      const [sigmaModule, graphologyModule, fa2Module] = await Promise.all([
        import('sigma'),
        import('graphology'),
        import('graphology-layout-forceatlas2'),
      ]);
      SigmaCtor = sigmaModule.default;
      GraphCtor = graphologyModule.default;
      forceAtlas2 = fa2Module.default;
    } catch (e: any) {
      error = `Failed to load Sigma.js: ${e?.message}`;
    }
  });
</script>

<div class="flex flex-col h-screen bg-neutral-950 text-neutral-100">
  <div class="p-4 border-b border-neutral-800">
    <h1 class="text-2xl font-bold mb-3">Context Graph</h1>
    
    <!-- Controls -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
      <AutocompleteInput
        bind:value={topic}
        fetchSuggestions={fetchTopicSuggestions}
        placeholder="Topic"
        on:select={loadGraph}
      />
      <AutocompleteInput
        bind:value={tickersInput}
        fetchSuggestions={fetchTickerSuggestions}
        placeholder="Tickers (comma-sep)"
        on:select={loadGraph}
      />
      <input
        type="datetime-local"
        bind:value={asOf}
        placeholder="As of (ISO)"
        class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"
      />
      <input
        type="number"
        bind:value={depth}
        min="1"
        max="3"
        placeholder="Depth"
        class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"
      />
      <input
        type="number"
        bind:value={limit}
        min="10"
        max="500"
        placeholder="Limit"
        class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"
      />
    </div>

    <button
      on:click={loadGraph}
      disabled={loading}
      class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Load Context'}
    </button>

    {#if error}
      <div class="mt-2 text-red-400 text-sm">{error}</div>
    {/if}
  </div>

  <div class="flex-1 relative">
    <div bind:this={containerEl} class="absolute inset-0"></div>

    <!-- Legends -->
    <div class="absolute top-4 right-4 bg-neutral-900/90 rounded border border-neutral-800 p-3 max-w-xs">
      <div class="text-xs font-semibold text-neutral-300 mb-2">Interactions</div>
      <div class="text-xs text-neutral-400 space-y-1">
        <div>• Click: Select node</div>
        <div>• Double-click: Open detail</div>
        <div>• Hover edge: Show relation info</div>
      </div>
    </div>

    <!-- Node Info Panel -->
    {#if selectedNode}
      <div class="absolute bottom-4 left-4 bg-neutral-900 rounded border border-neutral-800 p-4 max-w-sm">
        <div class="flex items-center gap-2 mb-2">
          <LabelBadge label={selectedNode.label} />
          <h3 class="text-sm font-medium text-neutral-100">
            {selectedNode.properties.name || selectedNode.properties.ticker || selectedNode.id}
          </h3>
        </div>
        {#if selectedNode.properties.sector}
          <div class="text-xs text-neutral-400">Sector: {selectedNode.properties.sector}</div>
        {/if}
        <button
          on:click={() => selectedNode = null}
          class="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
        >
          Close
        </button>
      </div>
    {/if}

    <!-- Edge Info Card -->
    {#if hoveredEdge}
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neutral-900 rounded border border-neutral-800 p-3 max-w-xs pointer-events-none">
        <div class="flex items-center gap-2 mb-2">
          <RelTypeBadge relType={hoveredEdge.type} />
        </div>
        {#if hoveredEdge.properties.confidence != null}
          <div class="text-xs text-neutral-400">Confidence: {Math.round(hoveredEdge.properties.confidence * 100)}%</div>
        {/if}
        {#if hoveredEdge.properties.valid_from}
          <div class="text-xs text-neutral-400">From: {new Date(hoveredEdge.properties.valid_from).toLocaleDateString()}</div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="p-2 border-t border-neutral-800 text-xs text-neutral-500 text-center">
    {nodes.length} nodes | {edges.length} edges
  </div>
</div>

