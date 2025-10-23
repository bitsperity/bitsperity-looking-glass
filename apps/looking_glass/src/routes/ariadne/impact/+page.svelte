<script lang="ts">
  import { fetchImpact } from '$lib/services/ariadneService';
  import EventCard from '$lib/components/ariadne/EventCard.svelte';
  import NodeCard from '$lib/components/ariadne/NodeCard.svelte';
  import AutocompleteInput from '$lib/components/shared/AutocompleteInput.svelte';
  import { fetchEventNameSuggestions } from '$lib/services/ariadneSuggestions';
  import type { ImpactResponse } from '$lib/types/ariadne';

  let eventQuery = '';
  let k = 10;
  let loading = false;
  let error: string | null = null;
  let data: ImpactResponse | null = null;

  async function analyze() {
    if (!eventQuery) return;

    loading = true;
    error = null;
    try {
      data = await fetchImpact({ event_query: eventQuery, k });
    } catch (e: any) {
      error = e?.message ?? 'Failed to analyze impact';
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-7xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Impact Analysis</h1>

  <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">Event Query</label>
      <AutocompleteInput
        bind:value={eventQuery}
        fetchSuggestions={fetchEventNameSuggestions}
        placeholder="e.g., Export, Rate Hike, or select from existing events"
        on:select={analyze}
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">Top K Entities</label>
      <input
        type="number"
        bind:value={k}
        min="1"
        max="50"
        class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
      />
    </div>
  </div>

  <button
    on:click={analyze}
    class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white mb-6"
  >
    Analyze Impact
  </button>

  {#if loading}
    <div class="text-neutral-400">Analyzing...</div>
  {:else if error}
    <div class="text-red-400">Error: {error}</div>
  {:else if data}
    <!-- Event -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-neutral-200 mb-3">Event</h2>
      <EventCard event={data.event} />
    </div>

    <!-- Impacted Entities -->
    <div>
      <h2 class="text-xl font-semibold text-neutral-200 mb-3">Impacted Entities</h2>
      {#if data.impacted_entities.length === 0}
        <div class="text-neutral-400">No impacted entities found</div>
      {:else}
        <div class="space-y-3">
          {#each data.impacted_entities as { node, impact, paths }}
            <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-medium text-neutral-100 mb-1">
                    {node.properties.name || node.properties.ticker || node.id}
                  </h3>
                  <div class="flex items-center gap-4 text-sm text-neutral-400">
                    <span>Impact Score: <strong class="text-neutral-100">{impact.toFixed(2)}</strong></span>
                    <span>Indirect Paths: {paths}</span>
                  </div>
                </div>
                <a
                  href="/ariadne/timeline?ticker={node.properties.ticker}"
                  class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                >
                  Timeline
                </a>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

