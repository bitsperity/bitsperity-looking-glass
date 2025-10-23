<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchPatterns } from '$lib/services/ariadneService';
  import PatternCard from '$lib/components/ariadne/PatternCard.svelte';
  import AutocompleteInput from '$lib/components/shared/AutocompleteInput.svelte';
  import { fetchPatternCategorySuggestions } from '$lib/services/ariadneSuggestions';
  import type { Pattern } from '$lib/types/ariadne';

  let category = '';
  let minConfidence = 0.7;
  let minOccurrences = 1;
  let loading = false;
  let error: string | null = null;
  let patterns: Pattern[] = [];

  async function load() {
    loading = true;
    error = null;
    try {
      const result = await fetchPatterns({
        category: category || undefined,
        min_confidence: minConfidence,
        min_occurrences: minOccurrences,
      });
      patterns = result.patterns;
    } catch (e: any) {
      error = e?.message ?? 'Failed to load patterns';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    load();
  });
</script>

<div class="max-w-7xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Validated Patterns</h1>

  <!-- Filters -->
  <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">Category</label>
      <AutocompleteInput
        bind:value={category}
        fetchSuggestions={fetchPatternCategorySuggestions}
        placeholder="e.g., technical, fundamental, supply_chain"
        on:select={load}
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">Min Confidence</label>
      <input
        type="number"
        bind:value={minConfidence}
        min="0"
        max="1"
        step="0.1"
        class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">Min Occurrences</label>
      <input
        type="number"
        bind:value={minOccurrences}
        min="1"
        class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
      />
    </div>
  </div>

  <button
    on:click={load}
    class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white mb-6"
  >
    Apply Filters
  </button>

  {#if loading}
    <div class="text-neutral-400">Loading...</div>
  {:else if error}
    <div class="text-red-400">Error: {error}</div>
  {:else if patterns.length > 0}
    <div class="mb-4 text-sm text-neutral-400">Found {patterns.length} patterns</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each patterns as pattern}
        <a href="/ariadne/patterns/{pattern.id}">
          <PatternCard {pattern} />
        </a>
      {/each}
    </div>
  {:else}
    <div class="text-neutral-400">No patterns found</div>
  {/if}
</div>

