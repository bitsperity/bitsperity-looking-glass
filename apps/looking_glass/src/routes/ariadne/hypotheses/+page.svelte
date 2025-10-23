<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchPendingHypotheses } from '$lib/services/ariadneService';
  import ConfidenceBadge from '$lib/components/ariadne/ConfidenceBadge.svelte';
  import type { Hypothesis } from '$lib/types/ariadne';

  let minAnnotations = 3;
  let loading = false;
  let error: string | null = null;
  let hypotheses: Hypothesis[] = [];

  async function load() {
    loading = true;
    error = null;
    try {
      const result = await fetchPendingHypotheses(minAnnotations);
      hypotheses = result.hypotheses;
    } catch (e: any) {
      error = e?.message ?? 'Failed to load hypotheses';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    load();
  });
</script>

<div class="max-w-7xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Pending Validations</h1>

  <div class="mb-6">
    <label class="block text-sm font-medium text-neutral-300 mb-1">Min Annotations</label>
    <input
      type="number"
      bind:value={minAnnotations}
      min="1"
      class="w-48 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
    />
    <button
      on:click={load}
      class="ml-2 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
    >
      Refresh
    </button>
  </div>

  {#if loading}
    <div class="text-neutral-400">Loading...</div>
  {:else if error}
    <div class="text-red-400">Error: {error}</div>
  {:else if hypotheses.length > 0}
    <div class="mb-4 text-sm text-neutral-400">Found {hypotheses.length} pending hypotheses</div>
    <div class="space-y-3">
      {#each hypotheses as hyp}
        <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <h3 class="text-lg font-medium text-neutral-100 mb-1">{hyp.statement}</h3>
              <div class="text-sm text-neutral-400 mb-1">
                {hyp.relation_type}: {hyp.source_name || hyp.source_entity_id}{#if hyp.source_ticker} ({hyp.source_ticker}){/if} → {hyp.target_name || hyp.target_entity_id}{#if hyp.target_ticker} ({hyp.target_ticker}){/if}
              </div>
              <div class="flex items-center gap-3 text-xs text-neutral-500">
                <ConfidenceBadge confidence={hyp.confidence} />
                <span>Evidence: {hyp.evidence_count}</span>
                <span>Contradictions: {hyp.contradiction_count}</span>
                <span>Threshold: {hyp.validation_threshold}</span>
              </div>
              {#if hyp.manifold_thought_id}
                <div class="text-xs text-neutral-600 mt-1">
                  <a href="/manifold/thoughts/{hyp.manifold_thought_id}" class="hover:text-indigo-400">
                    Manifold: {hyp.manifold_thought_id}
                  </a>
                </div>
              {/if}
            </div>
            <a
              href="/ariadne/hypotheses/{hyp.id}"
              class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
            >
              Review
            </a>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-neutral-400">No pending validations</div>
  {/if}
</div>

