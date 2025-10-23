<script lang="ts">
  import type { Regime } from '$lib/types/ariadne';
  import ConfidenceBadge from './ConfidenceBadge.svelte';

  export let regime: Regime;
</script>

<div class="bg-neutral-900 rounded border border-neutral-800 p-4">
  <div class="flex items-start justify-between mb-2">
    <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-teal-800 text-teal-100">
      {regime.type}
    </span>
    <ConfidenceBadge confidence={regime.confidence} />
  </div>
  <h3 class="text-lg font-medium text-neutral-100 mb-1">{regime.name}</h3>
  <div class="flex flex-wrap gap-1 mt-2">
    {#each regime.characteristics as char}
      <span class="text-xs bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">{char}</span>
    {/each}
  </div>
  <div class="text-xs text-neutral-500 mt-2">
    {new Date(regime.start_date).toLocaleDateString()}
    {#if regime.end_date}
      - {new Date(regime.end_date).toLocaleDateString()}
    {:else}
      - Present
    {/if}
  </div>
  {#if regime.similarity_score != null}
    <div class="text-xs text-neutral-600 mt-1">Similarity: {Math.round(regime.similarity_score * 100)}%</div>
  {/if}
</div>

