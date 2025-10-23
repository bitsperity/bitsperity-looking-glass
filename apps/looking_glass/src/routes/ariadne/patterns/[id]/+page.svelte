<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { fetchPatternDetail } from '$lib/services/ariadneService';
  import ConfidenceBadge from '$lib/components/ariadne/ConfidenceBadge.svelte';
  import type { Pattern, PatternOccurrence } from '$lib/types/ariadne';
  
  $: id = $page.params.id;
  
  let loading = false;
  let error: string | null = null;
  let pattern: Pattern | null = null;
  let occurrences: PatternOccurrence[] = [];
  let count = 0;
  let fromDate = '';
  let toDate = '';
  
  async function load() {
    loading = true;
    error = null;
    try {
      const result = await fetchPatternDetail(id, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      pattern = result.pattern;
      occurrences = result.occurrences;
      count = result.count;
    } catch (e: any) {
      error = e?.message ?? 'Failed to load pattern';
    } finally {
      loading = false;
    }
  }
  
  onMount(() => {
    load();
  });
</script>

<div class="max-w-7xl mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold text-neutral-100">Pattern Detail</h1>
    <a href="/ariadne/patterns" class="text-sm text-indigo-400 hover:text-indigo-300">← Back to List</a>
  </div>

  {#if loading}
    <div class="text-neutral-400">Loading...</div>
  {:else if error}
    <div class="text-red-400">Error: {error}</div>
  {:else if pattern}
    <!-- Pattern Info -->
    <div class="mb-6 bg-neutral-900 rounded border border-neutral-800 p-6">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h2 class="text-2xl font-semibold text-neutral-100 mb-2">{pattern.name}</h2>
          {#if pattern.description}
            <p class="text-sm text-neutral-400 mb-3">{pattern.description}</p>
          {/if}
        </div>
        <div class="flex flex-col items-end gap-2">
          <ConfidenceBadge confidence={pattern.confidence} />
          <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-pink-800 text-pink-100">
            {pattern.category}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div>
          <span class="text-neutral-500">Occurrences:</span>
          <strong class="text-neutral-100 ml-1">{pattern.occurrences}</strong>
        </div>
        {#if pattern.success_rate != null}
          <div>
            <span class="text-neutral-500">Success Rate:</span>
            <strong class="text-neutral-100 ml-1">{Math.round(pattern.success_rate * 100)}%</strong>
          </div>
        {/if}
        {#if pattern.validated_at}
          <div>
            <span class="text-neutral-500">Validated:</span>
            <strong class="text-neutral-100 ml-1">{new Date(pattern.validated_at).toLocaleDateString()}</strong>
          </div>
        {/if}
        {#if pattern.validated_by}
          <div>
            <span class="text-neutral-500">By:</span>
            <strong class="text-neutral-100 ml-1">{pattern.validated_by}</strong>
          </div>
        {/if}
      </div>

      {#if pattern.manifold_source_id}
        <div class="text-xs text-neutral-600">
          <a href="/manifold/thoughts/{pattern.manifold_source_id}" class="hover:text-indigo-400">
            → Manifold Source: {pattern.manifold_source_id}
          </a>
        </div>
      {/if}
    </div>

    <!-- Filters -->
    <div class="mb-6 bg-neutral-900 rounded border border-neutral-800 p-4">
      <h3 class="text-lg font-semibold text-neutral-100 mb-3">Filter Occurrences</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">From Date</label>
          <input
            type="date"
            bind:value={fromDate}
            class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">To Date</label>
          <input
            type="date"
            bind:value={toDate}
            class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
          />
        </div>
      </div>
      <button
        on:click={load}
        class="mt-3 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        Apply Filters
      </button>
    </div>

    <!-- Occurrences Timeline -->
    <div>
      <h3 class="text-xl font-semibold text-neutral-200 mb-3">Historical Occurrences ({count})</h3>
      {#if occurrences.length === 0}
        <div class="text-neutral-400">No occurrences found in the selected time range</div>
      {:else}
        <div class="space-y-3">
          {#each occurrences as occ}
            <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-neutral-100 mb-1">{occ.title}</h4>
                  <div class="text-xs text-neutral-500">
                    {new Date(occ.occurred_at).toLocaleString()}
                  </div>
                  {#if occ.outcome}
                    <div class="mt-2 text-xs">
                      <span class="text-neutral-500">Outcome:</span>
                      <span class="text-neutral-300 ml-1">{occ.outcome}</span>
                    </div>
                  {/if}
                </div>
                <a
                  href="/ariadne/timeline?event_id={occ.event_id}"
                  class="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                >
                  View Event
                </a>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

