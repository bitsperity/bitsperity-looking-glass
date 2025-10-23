<script lang="ts">
  import type { Pattern } from '$lib/types/ariadne';
  import ConfidenceBadge from './ConfidenceBadge.svelte';

  export let pattern: Pattern;
</script>

<div class="bg-neutral-900 rounded border border-neutral-800 p-4 hover:border-neutral-700 transition-colors">
  <div class="flex items-start justify-between mb-2">
    <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-pink-800 text-pink-100">
      {pattern.category}
    </span>
    <ConfidenceBadge confidence={pattern.confidence} />
  </div>
  <h3 class="text-lg font-medium text-neutral-100 mb-1">{pattern.name}</h3>
  {#if pattern.description}
    <p class="text-sm text-neutral-400 mb-2">{pattern.description}</p>
  {/if}
  <div class="flex items-center gap-4 text-xs text-neutral-500 mt-2">
    <div>Occurrences: {pattern.occurrences}</div>
    {#if pattern.success_rate != null}
      <div>Success: {Math.round(pattern.success_rate * 100)}%</div>
    {/if}
    {#if pattern.validated_by}
      <div>By: {pattern.validated_by}</div>
    {/if}
  </div>
</div>

