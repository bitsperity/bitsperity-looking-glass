<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { fetchTimeline } from '$lib/services/ariadneService';
  import EventCard from '$lib/components/ariadne/EventCard.svelte';
  import LabelBadge from '$lib/components/ariadne/LabelBadge.svelte';
  import RelTypeBadge from '$lib/components/ariadne/RelTypeBadge.svelte';
  import AutocompleteInput from '$lib/components/shared/AutocompleteInput.svelte';
  import { fetchTickerSuggestions } from '$lib/services/ariadneSuggestions';
  import type { TimelineResponse } from '$lib/types/ariadne';

  let ticker = '';
  let fromDate = '';
  let toDate = '';
  let loading = false;
  let error: string | null = null;
  let data: TimelineResponse | null = null;
  let activeTab: 'events' | 'price_events' | 'relations' = 'events';

  $: {
    const t = $page.url.searchParams.get('ticker');
    if (t) ticker = t;
  }

  async function load() {
    if (!ticker) return;

    loading = true;
    error = null;
    try {
      data = await fetchTimeline({ ticker, from_date: fromDate || undefined, to_date: toDate || undefined });
    } catch (e: any) {
      error = e?.message ?? 'Failed to load timeline';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (ticker) {
      load();
    }
  });
</script>

<div class="max-w-7xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Timeline</h1>

  <!-- Input -->
  <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">Ticker</label>
      <AutocompleteInput
        bind:value={ticker}
        fetchSuggestions={fetchTickerSuggestions}
        placeholder="e.g., NVDA"
        on:select={load}
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">From Date</label>
      <input
        type="date"
        bind:value={fromDate}
        class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-neutral-300 mb-1">To Date</label>
      <input
        type="date"
        bind:value={toDate}
        class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
      />
    </div>
  </div>

  <button
    on:click={load}
    class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white mb-6"
  >
    Load Timeline
  </button>

  {#if loading}
    <div class="text-neutral-400">Loading...</div>
  {:else if error}
    <div class="text-red-400">Error: {error}</div>
  {:else if data}
    <!-- Entity Info -->
    <div class="mb-6 bg-neutral-900 rounded border border-neutral-800 p-4">
      <div class="flex items-center gap-2 mb-2">
        <LabelBadge label={data.entity.label} />
        <h2 class="text-xl font-semibold text-neutral-100">
          {data.entity.properties.name || data.entity.properties.ticker || data.entity.id}
        </h2>
      </div>
      {#if data.entity.properties.sector}
        <div class="text-sm text-neutral-400">Sector: {data.entity.properties.sector}</div>
      {/if}
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-4 border-b border-neutral-800">
      <button
        class="px-4 py-2 {activeTab === 'events' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-neutral-400'}"
        on:click={() => (activeTab = 'events')}
      >
        Events ({data.events.length})
      </button>
      <button
        class="px-4 py-2 {activeTab === 'price_events' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-neutral-400'}"
        on:click={() => (activeTab = 'price_events')}
      >
        Price Events ({data.price_events.length})
      </button>
      <button
        class="px-4 py-2 {activeTab === 'relations' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-neutral-400'}"
        on:click={() => (activeTab = 'relations')}
      >
        Relations ({data.relations.length})
      </button>
    </div>

    <!-- Tab Content -->
    <div class="space-y-3">
      {#if activeTab === 'events'}
        {#if data.events.length === 0}
          <div class="text-neutral-400">No events found</div>
        {:else}
          {#each data.events as event}
            <EventCard {event} />
          {/each}
        {/if}
      {:else if activeTab === 'price_events'}
        {#if data.price_events.length === 0}
          <div class="text-neutral-400">No price events found</div>
        {:else}
          {#each data.price_events as pe}
            <div class="bg-neutral-900 rounded border border-neutral-800 p-3">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-neutral-100">{pe.event_type}</span>
                <span class="text-xs text-neutral-500">{new Date(pe.occurred_at).toLocaleString()}</span>
              </div>
              <div class="text-xs text-neutral-400">Symbol: {pe.symbol}</div>
            </div>
          {/each}
        {/if}
      {:else if activeTab === 'relations'}
        {#if data.relations.length === 0}
          <div class="text-neutral-400">No relations found</div>
        {:else}
          {#each data.relations as rel}
            <div class="bg-neutral-900 rounded border border-neutral-800 p-3">
              <div class="flex items-center gap-2 mb-1">
                <RelTypeBadge relType={rel.rel_type} />
                {#if rel.properties.valid_from}
                  <span class="text-xs text-neutral-500">
                    Valid from: {new Date(rel.properties.valid_from).toLocaleDateString()}
                  </span>
                {/if}
              </div>
              <div class="text-xs text-neutral-400">
                {rel.source_id} → {rel.target_id}
              </div>
            </div>
          {/each}
        {/if}
      {/if}
    </div>
  {/if}
</div>

