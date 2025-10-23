<script context="module" lang="ts">
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { getContext } from '$lib/api/ariadne';
  import LabelBadge from '$lib/components/ariadne/LabelBadge.svelte';
  import RelTypeBadge from '$lib/components/ariadne/RelTypeBadge.svelte';
  import ConfidenceBadge from '$lib/components/ariadne/ConfidenceBadge.svelte';
  
  let SigmaCtor: any;
  let GraphCtor: any;
  let forceAtlas2: any;

  // State
  let containerEl: HTMLDivElement;
  let renderer: any = null;
  let graph: any = null;
  let loading = false;
  let error: string | null = null;
  
  // Filters
  let labelFilter = '';
  let relTypeFilter = '';
  let minConfidence = 0;
  let asOf = '';
  
  // Data
  let nodes: any[] = [];
  let edges: any[] = [];
  let allNodes: any[] = [];
  let allEdges: any[] = [];
  
  // Selection & Interaction
  let selectedNodes: Set<string> = new Set();
  let frozenNodes: Set<string> = new Set();
  let selectedNode: any = null;
  let hoveredEdge: any = null;
  
  // Search & Mask
  let searchQuery = '';
  let searchActive = false;
  let searchResults: string[] = [];
  
  // Path finding
  let showPathFinder = false;
  let pathSource = '';
  let pathTarget = '';
  let pathK = 3;
  let pathMaxLength = 5;
  let foundPaths: any[] = [];
  
  // Community overlay
  let showCommunities = false;
  
  async function loadInitialGraph() {
    loading = true;
    error = null;
    try {
      // Backend braucht topic ODER tickers - default Topic verwenden
      const resp = await getContext({ topic: 'technology', limit: 200, depth: 2 });
      allNodes = resp.subgraph.nodes;
      allEdges = resp.subgraph.edges;
      applyFilters();
      await tick();
      setTimeout(() => renderSigma(), 50);
    } catch (e: any) {
      error = e?.message ?? 'Failed to load graph';
    } finally {
      loading = false;
    }
  }

  function applyFilters() {
    nodes = allNodes.filter(n => {
      if (labelFilter && n.label !== labelFilter) return false;
      return true;
    });
    
    edges = allEdges.filter(e => {
      if (relTypeFilter && e.rel_type !== relTypeFilter) return false;
      if (minConfidence > 0 && (e.properties.confidence || 0) < minConfidence) return false;
      
      // Only edges where both nodes are visible
      const sourceVisible = nodes.some(n => n.id === e.source_id);
      const targetVisible = nodes.some(n => n.id === e.target_id);
      return sourceVisible && targetVisible;
    });
    
    if (renderer) {
      rebuildGraph();
    }
  }

  async function renderSigma() {
    if (!SigmaCtor || !GraphCtor || !containerEl) return;
    if (nodes.length === 0) return;

    if (renderer) {
      renderer.kill();
      renderer = null;
    }

    graph = new GraphCtor();
    
    // Add nodes first pass (to calculate degrees)
    const degreeMap = new Map<string, number>();
    for (const node of nodes) {
      degreeMap.set(node.id, 0);
    }
    for (const edge of edges) {
      if (degreeMap.has(edge.source_id)) {
        degreeMap.set(edge.source_id, (degreeMap.get(edge.source_id) || 0) + 1);
      }
      if (degreeMap.has(edge.target_id)) {
        degreeMap.set(edge.target_id, (degreeMap.get(edge.target_id) || 0) + 1);
      }
    }
    
    // Add nodes with size based on degree
    for (const node of nodes) {
      const community = node.properties.community_id || 0;
      const degree = degreeMap.get(node.id) || 0;
      const nodeSize = Math.max(8, Math.min(30, 8 + degree * 1.5)); // Size scales with connections
      
      // Smart label selection based on node type
      let displayLabel = node.id;
      if (node.properties.name) {
        displayLabel = node.properties.name;
      } else if (node.properties.ticker) {
        displayLabel = node.properties.ticker;
      } else if (node.properties.title) {
        // Events
        displayLabel = node.properties.title;
      } else if (node.properties.statement) {
        // Hypotheses
        displayLabel = node.properties.statement.substring(0, 50) + '...';
      } else if (node.properties.content) {
        // Observations
        displayLabel = node.properties.content.substring(0, 50) + '...';
      } else if (node.properties.pattern_name) {
        // Patterns
        displayLabel = node.properties.pattern_name;
      } else if (node.properties.regime_name) {
        // Regimes
        displayLabel = node.properties.regime_name;
      }
      
      graph.addNode(node.id, {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: nodeSize,
        label: displayLabel,
        color: showCommunities ? communityColor(community) : colorForLabel(node.label),
        type: 'circle',
        labelColor: '#e5e5e5',
        nodeLabel: node.label,
        nodeSector: node.properties.sector || '',
        community,
        degree,
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
      edgeLabelSize: 12,
      edgeLabelWeight: '600',
    });

    // Events
    renderer.on('clickNode', ({ node }: any) => {
      if (selectedNodes.has(node)) {
        selectedNodes.delete(node);
      } else {
        selectedNodes.add(node);
      }
      selectedNodes = new Set(selectedNodes);
      selectedNode = nodes.find(n => n.id === node);
      updateSelection();
    });

    renderer.on('doubleClickNode', ({ node }: any) => {
      const ticker = nodes.find(n => n.id === node)?.properties?.ticker;
      if (ticker) {
        window.open(`/ariadne/timeline?ticker=${ticker}`, '_blank');
      }
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

  function rebuildGraph() {
    if (!graph || !renderer) return;
    
    graph.clear();
    
    // Calculate degrees
    const degreeMap = new Map<string, number>();
    for (const node of nodes) {
      degreeMap.set(node.id, 0);
    }
    for (const edge of edges) {
      if (degreeMap.has(edge.source_id)) {
        degreeMap.set(edge.source_id, (degreeMap.get(edge.source_id) || 0) + 1);
      }
      if (degreeMap.has(edge.target_id)) {
        degreeMap.set(edge.target_id, (degreeMap.get(edge.target_id) || 0) + 1);
      }
    }
    
    for (const node of nodes) {
      const community = node.properties.community_id || 0;
      const degree = degreeMap.get(node.id) || 0;
      const nodeSize = Math.max(8, Math.min(30, 8 + degree * 1.5));
      
      // Smart label selection based on node type
      let displayLabel = node.id;
      if (node.properties.name) {
        displayLabel = node.properties.name;
      } else if (node.properties.ticker) {
        displayLabel = node.properties.ticker;
      } else if (node.properties.title) {
        // Events
        displayLabel = node.properties.title;
      } else if (node.properties.statement) {
        // Hypotheses
        displayLabel = node.properties.statement.substring(0, 50) + '...';
      } else if (node.properties.content) {
        // Observations
        displayLabel = node.properties.content.substring(0, 50) + '...';
      } else if (node.properties.pattern_name) {
        // Patterns
        displayLabel = node.properties.pattern_name;
      } else if (node.properties.regime_name) {
        // Regimes
        displayLabel = node.properties.regime_name;
      }
      
      graph.addNode(node.id, {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: nodeSize,
        label: displayLabel,
        color: showCommunities ? communityColor(community) : colorForLabel(node.label),
        type: 'circle',
        labelColor: '#e5e5e5',
        nodeLabel: node.label,
        nodeSector: node.properties.sector || '',
        community,
        degree,
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

    if (forceAtlas2) {
      const settings = forceAtlas2.inferSettings(graph);
      forceAtlas2.assign(graph, { iterations: 300, settings });
    }

    renderer.refresh();
  }

  function updateSelection() {
    if (!graph || !renderer) return;
    
    graph.forEachNode((node: string) => {
      const isSelected = selectedNodes.has(node);
      graph.setNodeAttribute(node, 'size', isSelected ? 16 : 12);
      if (isSelected) {
        graph.setNodeAttribute(node, 'color', '#f59e0b');
      }
    });
    
    renderer.refresh();
  }

  async function expandNeighbors(relType?: string) {
    if (selectedNodes.size === 0) return;
    
    loading = true;
    try {
      for (const nodeId of selectedNodes) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.properties.ticker) continue;
        
        const resp = await getContext({ 
          tickers: [node.properties.ticker], 
          depth: 1, 
          limit: 50 
        });
        
        // Add new nodes
        for (const newNode of resp.subgraph.nodes) {
          if (!allNodes.some(n => n.id === newNode.id)) {
            allNodes.push(newNode);
          }
        }
        
        // Add new edges
        for (const newEdge of resp.subgraph.edges) {
          if (relType && newEdge.rel_type !== relType) continue;
          if (!allEdges.some(e => e.source_id === newEdge.source_id && e.target_id === newEdge.target_id)) {
            allEdges.push(newEdge);
          }
        }
      }
      
      applyFilters();
    } finally {
      loading = false;
    }
  }

  function toggleFreeze() {
    for (const nodeId of selectedNodes) {
      if (frozenNodes.has(nodeId)) {
        frozenNodes.delete(nodeId);
      } else {
        frozenNodes.add(nodeId);
      }
    }
    frozenNodes = new Set(frozenNodes);
  }

  function clearSelection() {
    selectedNodes.clear();
    selectedNodes = new Set();
    selectedNode = null;
    if (graph && renderer) {
      graph.forEachNode((node: string) => {
        graph.setNodeAttribute(node, 'size', 12);
        const nodeData = nodes.find(n => n.id === node);
        const community = nodeData?.properties?.community_id || 0;
        graph.setNodeAttribute(node, 'color', showCommunities ? communityColor(community) : colorForLabel(nodeData?.label || ''));
      });
      renderer.refresh();
    }
  }

  function toggleCommunities() {
    showCommunities = !showCommunities;
    if (graph && renderer) {
      graph.forEachNode((node: string) => {
        const nodeData = nodes.find(n => n.id === node);
        const community = nodeData?.properties?.community_id || 0;
        graph.setNodeAttribute(node, 'color', showCommunities ? communityColor(community) : colorForLabel(nodeData?.label || ''));
      });
      renderer.refresh();
    }
  }

  async function runSearch() {
    if (!searchQuery.trim()) {
      searchActive = false;
      searchResults = [];
      applyMask();
      return;
    }

    searchActive = true;
    // Simple search: match by label/name/ticker
    searchResults = nodes
      .filter(n => {
        const name = (n.properties.name || n.properties.ticker || n.id).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
      .map(n => n.id);
    
    applyMask();
  }

  function applyMask() {
    if (!graph || !renderer) return;
    
    if (!searchActive || searchResults.length === 0) {
      graph.forEachNode((node: string) => {
        graph.setNodeAttribute(node, 'hidden', false);
      });
      graph.forEachEdge((edge: string) => {
        graph.setEdgeAttribute(edge, 'hidden', false);
      });
    } else {
      // Hide non-matching nodes
      graph.forEachNode((node: string) => {
        const isMatch = searchResults.includes(node);
        graph.setNodeAttribute(node, 'hidden', !isMatch);
      });
      
      // Hide edges where both nodes are hidden
      graph.forEachEdge((edge: string) => {
        const source = graph.source(edge);
        const target = graph.target(edge);
        const sourceHidden = graph.getNodeAttribute(source, 'hidden');
        const targetHidden = graph.getNodeAttribute(target, 'hidden');
        graph.setEdgeAttribute(edge, 'hidden', sourceHidden || targetHidden);
      });
    }
    
    renderer.refresh();
  }

  function clearSearch() {
    searchQuery = '';
    searchActive = false;
    searchResults = [];
    applyMask();
  }

  function findPaths() {
    if (!pathSource || !pathTarget || !graph) return;
    
    // Simple BFS k-shortest paths
    foundPaths = [];
    const queue: any[] = [[pathSource]];
    const visited = new Set<string>();
    
    while (queue.length > 0 && foundPaths.length < pathK) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      
      if (current === pathTarget && path.length > 1) {
        foundPaths.push(path);
        continue;
      }
      
      if (path.length >= pathMaxLength) continue;
      
      const neighbors = graph.neighbors(current);
      for (const neighbor of neighbors) {
        if (!path.includes(neighbor)) {
          queue.push([...path, neighbor]);
        }
      }
    }
    
    highlightPaths();
  }

  function highlightPaths() {
    if (!graph || !renderer) return;
    
    const pathNodes = new Set<string>();
    const pathEdges = new Set<string>();
    
    for (const path of foundPaths) {
      for (let i = 0; i < path.length; i++) {
        pathNodes.add(path[i]);
        if (i < path.length - 1) {
          const edgeId = graph.edge(path[i], path[i + 1]);
          if (edgeId) pathEdges.add(edgeId);
        }
      }
    }
    
    graph.forEachNode((node: string) => {
      graph.setNodeAttribute(node, 'color', pathNodes.has(node) ? '#f59e0b' : colorForLabel(nodes.find(n => n.id === node)?.label || ''));
    });
    
    graph.forEachEdge((edge: string) => {
      graph.setEdgeAttribute(edge, 'color', pathEdges.has(edge) ? '#f59e0b' : colorForRelType(graph.getEdgeAttribute(edge, 'label')));
    });
    
    renderer.refresh();
  }

  function clearPaths() {
    foundPaths = [];
    showPathFinder = false;
    if (graph && renderer) {
      graph.forEachNode((node: string) => {
        const nodeData = nodes.find(n => n.id === node);
        graph.setNodeAttribute(node, 'color', colorForLabel(nodeData?.label || ''));
      });
      graph.forEachEdge((edge: string) => {
        graph.setEdgeAttribute(edge, 'color', colorForRelType(graph.getEdgeAttribute(edge, 'label')));
      });
      renderer.refresh();
    }
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

  function communityColor(community: number): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'];
    return colors[community % colors.length];
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
      
      loadInitialGraph();
    } catch (e: any) {
      error = `Failed to load Sigma.js: ${e?.message}`;
    }
  });
</script>

<div class="flex flex-col h-screen bg-neutral-950 text-neutral-100">
  <!-- Top Controls -->
  <div class="p-4 border-b border-neutral-800">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-2xl font-bold">Knowledge Graph Explorer</h1>
      <div class="flex gap-2">
        <button
          on:click={loadInitialGraph}
          disabled={loading}
          class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Reload'}
        </button>
        <button
          on:click={toggleCommunities}
          class="px-3 py-1 rounded {showCommunities ? 'bg-purple-600' : 'bg-neutral-700'} hover:bg-purple-500 text-white text-sm"
        >
          Communities
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
      <select
        bind:value={labelFilter}
        on:change={applyFilters}
        class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"
      >
        <option value="">All Labels</option>
        <option value="Company">Company</option>
        <option value="Event">Event</option>
        <option value="Concept">Concept</option>
        <option value="Pattern">Pattern</option>
        <option value="Hypothesis">Hypothesis</option>
      </select>

      <select
        bind:value={relTypeFilter}
        on:change={applyFilters}
        class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"
      >
        <option value="">All Relations</option>
        <option value="SUPPLIES_TO">SUPPLIES_TO</option>
        <option value="COMPETES_WITH">COMPETES_WITH</option>
        <option value="CORRELATES_WITH">CORRELATES_WITH</option>
        <option value="AFFECTS">AFFECTS</option>
      </select>

      <input
        type="number"
        bind:value={minConfidence}
        on:input={applyFilters}
        min="0"
        max="1"
        step="0.1"
        placeholder="Min Confidence"
        class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"
      />

      <input
        type="datetime-local"
        bind:value={asOf}
        placeholder="As of (ISO)"
        class="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"
      />
    </div>

    <!-- Search -->
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={searchQuery}
        on:input={runSearch}
        placeholder="Search nodes (name, ticker)..."
        class="flex-1 px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-100"
      />
      {#if searchActive}
        <button
          on:click={clearSearch}
          class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-sm"
        >
          Clear ({searchResults.length})
        </button>
      {/if}
    </div>

    {#if error}
      <div class="mt-2 text-red-400 text-sm">{error}</div>
    {/if}
  </div>

  <!-- Graph Container -->
  <div class="flex-1 relative">
    <div bind:this={containerEl} class="absolute inset-0"></div>

    <!-- Selection Panel -->
    {#if selectedNodes.size > 0}
      <div class="absolute top-4 left-4 bg-neutral-900/95 rounded border border-neutral-800 p-3 max-w-xs">
        <div class="text-sm font-semibold text-neutral-300 mb-2">Selected: {selectedNodes.size}</div>
        <div class="flex flex-col gap-1">
          <button
            on:click={() => expandNeighbors()}
            class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
          >
            Expand Neighbors (All)
          </button>
          <button
            on:click={() => expandNeighbors('SUPPLIES_TO')}
            class="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs"
          >
            Expand SUPPLIES_TO
          </button>
          <button
            on:click={toggleFreeze}
            class="px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-white text-xs"
          >
            {frozenNodes.size > 0 ? 'Unfreeze' : 'Freeze'} Selection
          </button>
          <button
            on:click={() => showPathFinder = !showPathFinder}
            class="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs"
          >
            Find Paths
          </button>
          <button
            on:click={clearSelection}
            class="px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-xs"
          >
            Clear Selection
          </button>
        </div>
      </div>
    {/if}

    <!-- Path Finder -->
    {#if showPathFinder}
      <div class="absolute top-4 right-4 bg-neutral-900/95 rounded border border-neutral-800 p-3 max-w-sm">
        <div class="text-sm font-semibold text-neutral-300 mb-2">Path Finder</div>
        <div class="space-y-2">
          <input
            type="text"
            bind:value={pathSource}
            placeholder="Source Node ID"
            class="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-100"
          />
          <input
            type="text"
            bind:value={pathTarget}
            placeholder="Target Node ID"
            class="w-full px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-100"
          />
          <div class="grid grid-cols-2 gap-2">
            <input
              type="number"
              bind:value={pathK}
              min="1"
              max="5"
              placeholder="K paths"
              class="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-100"
            />
            <input
              type="number"
              bind:value={pathMaxLength}
              min="2"
              max="10"
              placeholder="Max length"
              class="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-100"
            />
          </div>
          <button
            on:click={findPaths}
            class="w-full px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs"
          >
            Find {pathK} Paths
          </button>
          {#if foundPaths.length > 0}
            <div class="text-xs text-neutral-400">
              Found {foundPaths.length} paths
            </div>
          {/if}
          <button
            on:click={clearPaths}
            class="w-full px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-xs"
          >
            Clear Paths
          </button>
        </div>
      </div>
    {/if}

    <!-- Node Info -->
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
        {#if selectedNode.properties.community_id != null}
          <div class="text-xs text-neutral-400">Community: {selectedNode.properties.community_id}</div>
        {/if}
      </div>
    {/if}

    <!-- Edge Info -->
    {#if hoveredEdge}
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neutral-900 rounded border border-neutral-800 p-3 max-w-xs pointer-events-none">
        <div class="flex items-center gap-2 mb-2">
          <RelTypeBadge relType={hoveredEdge.type} />
        </div>
        {#if hoveredEdge.properties.confidence != null}
          <ConfidenceBadge confidence={hoveredEdge.properties.confidence} />
        {/if}
        {#if hoveredEdge.properties.valid_from}
          <div class="text-xs text-neutral-400 mt-1">From: {new Date(hoveredEdge.properties.valid_from).toLocaleDateString()}</div>
        {/if}
      </div>
    {/if}

    <!-- Legends -->
    <div class="absolute bottom-4 right-4 space-y-3">
      <!-- Interactions Legend -->
      <div class="bg-neutral-900/90 rounded border border-neutral-800 p-3 max-w-xs">
        <div class="text-xs font-semibold text-neutral-300 mb-2">Interactions</div>
        <div class="text-xs text-neutral-400 space-y-1">
          <div>• Click: Select/Deselect</div>
          <div>• Double-click: Open Timeline</div>
          <div>• Hover edge: Show info</div>
        </div>
      </div>
      
      <!-- Relations Legend -->
      <div class="bg-neutral-900/90 rounded border border-neutral-800 p-3 max-w-xs">
        <div class="text-xs font-semibold text-neutral-300 mb-2">Relations</div>
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 text-xs">
            <div class="w-6 h-0.5 rounded" style="background: {colorForRelType('SUPPLIES_TO')}"></div>
            <span class="text-neutral-400">SUPPLIES_TO</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <div class="w-6 h-0.5 rounded" style="background: {colorForRelType('COMPETES_WITH')}"></div>
            <span class="text-neutral-400">COMPETES_WITH</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <div class="w-6 h-0.5 rounded" style="background: {colorForRelType('CORRELATES_WITH')}"></div>
            <span class="text-neutral-400">CORRELATES_WITH</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <div class="w-6 h-0.5 rounded" style="background: {colorForRelType('AFFECTS')}"></div>
            <span class="text-neutral-400">AFFECTS</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <div class="w-6 h-0.5 rounded" style="background: {colorForRelType('BENEFITS_FROM')}"></div>
            <span class="text-neutral-400">BENEFITS_FROM</span>
          </div>
        </div>
      </div>
      
      <!-- Node Types Legend -->
      <div class="bg-neutral-900/90 rounded border border-neutral-800 p-3 max-w-xs">
        <div class="text-xs font-semibold text-neutral-300 mb-2">Node Types</div>
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 text-xs">
            <div class="w-3 h-3 rounded-full" style="background: {colorForLabel('Company')}"></div>
            <span class="text-neutral-400">Company</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <div class="w-3 h-3 rounded-full" style="background: {colorForLabel('Event')}"></div>
            <span class="text-neutral-400">Event</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <div class="w-3 h-3 rounded-full" style="background: {colorForLabel('Hypothesis')}"></div>
            <span class="text-neutral-400">Hypothesis</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <div class="w-3 h-3 rounded-full" style="background: {colorForLabel('Observation')}"></div>
            <span class="text-neutral-400">Observation</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Status Bar -->
  <div class="p-2 border-t border-neutral-800 text-xs text-neutral-500 text-center">
    {nodes.length} nodes | {edges.length} edges | {selectedNodes.size} selected | {frozenNodes.size} frozen
  </div>
</div>