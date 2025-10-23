<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { searchEntities } from '$lib/services/ariadneService';
  import NodeCard from '$lib/components/ariadne/NodeCard.svelte';
  import AutocompleteInput from '$lib/components/shared/AutocompleteInput.svelte';
  import { fetchTopicSuggestions, fetchTickerSuggestions } from '$lib/services/ariadneSuggestions';
  import type { Node } from '$lib/types/ariadne';

  let topic = '';
  let tickersInput = '';
  let depth = 2;
  let limit = 100;
  let loading = false;
  let error: string | null = null;
  let nodes: Node[] = [];
  let facets: { label: Set<string>; sector: Set<string> } = { label: new Set(), sector: new Set() };
  let tickerSuggestions: string[] = [];

  onMount(async () => {
    tickerSuggestions = await fetchTickerSuggestions();
  });

  let searchTimeout: ReturnType<typeof setTimeout>;

  $: {
    const q = $page.url.searchParams.get('q');
    const t = $page.url.searchParams.get('tickers');
    if (q) topic = q;
    if (t) tickersInput = t;
  }

  function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);
  }

  async function performSearch() {
    if (!topic && !tickersInput) {
      nodes = [];
      return;
    }

    loading = true;
    error = null;
    try {
      const tickers = tickersInput
        ? tickersInput.split(',').map((t) => t.trim()).filter((t) => t)
        : [];
      const result = await searchEntities({ topic: topic || undefined, tickers, depth, limit });
      nodes = result.subgraph.nodes;

      // Build facets
      facets.label = new Set(nodes.map((n) => n.label));
      facets.sector = new Set(
        nodes.map((n) => n.properties.sector).filter((s) => s)
      );
    } catch (e: any) {
      error = e?.message ?? 'Search failed';
    } finally {
      loading = false;
    }
  }

  let previewNode: Node | null = null;

  function handleNodeClick(event: CustomEvent<Node>) {
    const node = event.detail;
    // Navigate based on node type
    if (node.properties.ticker) {
      window.location.href = `/ariadne/timeline?ticker=${node.properties.ticker}`;
    } else if (node.label === 'Pattern') {
      window.location.href = `/ariadne/patterns`;
    } else if (node.label === 'Hypothesis') {
      const hypId = node.properties.hypothesis_id || node.id;
      window.location.href = `/ariadne/hypotheses/${hypId}`;
    } else {
      // Default: show context
      window.location.href = `/ariadne/context`;
    }
  }

  function handleNodePreview(event: CustomEvent<Node>) {
    previewNode = event.detail;
  }

  function closePreview() {
    previewNode = null;
  }

  onMount(() => {
    if (topic || tickersInput) {
      performSearch();
    }
  });
</script>

<div class="max-w-7xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Search Knowledge Graph</h1>

  <!-- Search Input -->
  <div class="mb-6 space-y-3">
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">
        Topic <span class="text-neutral-500 text-xs">(start typing for suggestions)</span>
      </label>
      <AutocompleteInput
        bind:value={topic}
        fetchSuggestions={fetchTopicSuggestions}
        placeholder="e.g., technology, semiconductors, AI..."
        on:select={debounceSearch}
        on:submit={debounceSearch}
      />
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">
          Tickers <span class="text-neutral-500 text-xs">(comma-separated, or pick from dropdown)</span>
        </label>
        <AutocompleteInput
          bind:value={tickersInput}
          suggestions={tickerSuggestions}
          placeholder="e.g., NVDA, AMD, INTC..."
          on:select={debounceSearch}
          on:submit={debounceSearch}
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Depth</label>
        <input
          type="number"
          bind:value={depth}
          min="1"
          max="3"
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Limit</label>
        <input
          type="number"
          bind:value={limit}
          min="10"
          max="500"
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>
    </div>
  </div>

  {#if loading}
    <div class="text-neutral-400">Searching...</div>
  {:else if error}
    <div class="text-red-400">Error: {error}</div>
  {:else if nodes.length > 0}
    <!-- Facets -->
    <div class="mb-4 flex gap-4 text-sm text-neutral-400">
      <div>
        <strong>Labels:</strong>
        {Array.from(facets.label).join(', ')}
      </div>
      {#if facets.sector.size > 0}
        <div>
          <strong>Sectors:</strong>
          {Array.from(facets.sector).join(', ')}
        </div>
      {/if}
    </div>

    <!-- Results -->
    <div class="mb-4 text-sm text-neutral-400">Found {nodes.length} nodes</div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each nodes as node}
        <NodeCard {node} on:click={handleNodeClick} on:preview={handleNodePreview} />
      {/each}
    </div>
  {:else if topic || tickersInput}
    <div class="text-neutral-400">No results found</div>
  {/if}
</div>

<!-- Preview Modal -->
{#if previewNode}
  <div 
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    on:click={closePreview}
    on:keydown={(e) => e.key === 'Escape' && closePreview()}
    role="button"
    tabindex="0"
  >
    <div 
      class="bg-neutral-900 rounded-lg border border-neutral-800 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      tabindex="-1"
    >
      <div class="flex items-start justify-between mb-4">
        <h2 class="text-2xl font-bold text-neutral-100">
          {previewNode.properties.name || previewNode.properties.pattern_name || previewNode.properties.title || previewNode.id}
        </h2>
        <button 
          on:click={closePreview}
          class="text-neutral-400 hover:text-neutral-200"
        >
          ✕
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <span class="text-sm font-medium text-neutral-400">Label:</span>
          <span class="text-neutral-100 ml-2">{previewNode.label}</span>
        </div>

        {#if previewNode.properties.category}
          <div>
            <span class="text-sm font-medium text-neutral-400">Category:</span>
            <span class="text-neutral-100 ml-2">{previewNode.properties.category}</span>
          </div>
        {/if}

        {#if previewNode.properties.description}
          <div>
            <span class="text-sm font-medium text-neutral-400">Description:</span>
            <p class="text-neutral-100 mt-1">{previewNode.properties.description}</p>
          </div>
        {/if}

        {#if previewNode.properties.confidence !== undefined}
          <div>
            <span class="text-sm font-medium text-neutral-400">Confidence:</span>
            <span class="text-neutral-100 ml-2">{(previewNode.properties.confidence * 100).toFixed(0)}%</span>
          </div>
        {/if}

        {#if previewNode.properties.occurrences}
          <div>
            <span class="text-sm font-medium text-neutral-400">Occurrences:</span>
            <span class="text-neutral-100 ml-2">{previewNode.properties.occurrences}</span>
          </div>
        {/if}

        <!-- Show all properties in a collapsible section -->
        <details class="mt-4">
          <summary class="text-sm font-medium text-neutral-400 cursor-pointer">All Properties</summary>
          <pre class="mt-2 text-xs text-neutral-300 bg-neutral-950 p-3 rounded overflow-x-auto">{JSON.stringify(previewNode.properties, null, 2)}</pre>
        </details>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button
          on:click={closePreview}
          class="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
        >
          Close
        </button>
        <button
          on:click={() => {
            if (previewNode) {
              const node = previewNode;
              closePreview();
              handleNodeClick(new CustomEvent('click', { detail: node }));
            }
          }}
          class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          Open
        </button>
      </div>
    </div>
  </div>
{/if}

