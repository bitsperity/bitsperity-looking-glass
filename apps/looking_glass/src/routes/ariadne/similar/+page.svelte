<script lang="ts">
  import { fetchSimilar } from '$lib/services/ariadneService';
  import NodeCard from '$lib/components/ariadne/NodeCard.svelte';
  import LabelBadge from '$lib/components/ariadne/LabelBadge.svelte';
  import AutocompleteInput from '$lib/components/shared/AutocompleteInput.svelte';
  import { fetchTickerSuggestions } from '$lib/services/ariadneSuggestions';
  import type { SimilarEntitiesResponse } from '$lib/types/ariadne';

  let ticker = '';
  let method: 'weighted_jaccard' | 'gds' = 'weighted_jaccard';
  let limit = 10;
  let loading = false;
  let error: string | null = null;
  let data: SimilarEntitiesResponse | null = null;

  async function search() {
    if (!ticker) return;

    loading = true;
    error = null;
    try {
      data = await fetchSimilar({ ticker, method, limit });
    } catch (e: any) {
      error = e?.message ?? 'Failed to find similar entities';
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-7xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Similar Entities</h1>

  <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">Ticker</label>
      <AutocompleteInput
        bind:value={ticker}
        fetchSuggestions={fetchTickerSuggestions}
        placeholder="e.g., NVDA"
        on:select={search}
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">Method</label>
      <select
        bind:value={method}
        class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
      >
        <option value="weighted_jaccard">Weighted Jaccard</option>
        <option value="gds">GDS Node Similarity</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">Limit</label>
      <input
        type="number"
        bind:value={limit}
        min="1"
        max="50"
        class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
      />
    </div>
  </div>

  <button
    on:click={search}
    class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white mb-6"
  >
    Find Similar
  </button>

  {#if loading}
    <div class="text-neutral-400">Searching...</div>
  {:else if error}
    <div class="text-red-400">Error: {error}</div>
  {:else if data}
    <!-- Source Entity -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-neutral-200 mb-3">Reference Entity</h2>
      <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
        <div class="flex items-center gap-2 mb-1">
          <LabelBadge label={data.source.label} />
          <h3 class="text-lg font-medium text-neutral-100">
            {data.source.properties.name || data.source.properties.ticker || data.source.id}
          </h3>
        </div>
        {#if data.source.properties.sector}
          <div class="text-sm text-neutral-400">Sector: {data.source.properties.sector}</div>
        {/if}
      </div>
    </div>

    <!-- Similar Entities -->
    <div>
      <h2 class="text-xl font-semibold text-neutral-200 mb-3">Similar Entities</h2>
      {#if data.similar.length === 0}
        <div class="text-neutral-400">No similar entities found</div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each data.similar as { node, similarity, shared_relations }}
            <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
              <div class="flex items-center gap-2 mb-2">
                <LabelBadge label={node.label} />
                <h3 class="text-lg font-medium text-neutral-100">
                  {node.properties.name || node.properties.ticker || node.id}
                </h3>
              </div>
              {#if node.properties.sector}
                <div class="text-sm text-neutral-400 mb-2">Sector: {node.properties.sector}</div>
              {/if}
              <div class="flex items-center gap-4 text-sm text-neutral-500">
                <span>Similarity: <strong class="text-neutral-100">{(similarity * 100).toFixed(1)}%</strong></span>
                {#if shared_relations != null}
                  <span>Shared Relations: {shared_relations}</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

