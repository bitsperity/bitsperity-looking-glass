<script lang="ts">
  import RelTypeBadge from './RelTypeBadge.svelte';
  import ConfidenceBadge from './ConfidenceBadge.svelte';
  import type { Edge } from '$lib/types/ariadne';

  export let edge: Edge;
  export let sourceNode: any = null;
  export let targetNode: any = null;
</script>

<div class="bg-neutral-900 rounded border border-neutral-800 p-4">
  <div class="flex items-center gap-2 mb-3">
    <RelTypeBadge relType={edge.rel_type} />
    {#if edge.properties.confidence}
      <ConfidenceBadge confidence={edge.properties.confidence} />
    {/if}
  </div>

  <div class="mb-3">
    <div class="text-xs text-neutral-500 mb-1">From:</div>
    <div class="text-sm text-neutral-100">{sourceNode?.properties?.name || edge.source_id}</div>
  </div>

  <div class="mb-3">
    <div class="text-xs text-neutral-500 mb-1">To:</div>
    <div class="text-sm text-neutral-100">{targetNode?.properties?.name || edge.target_id}</div>
  </div>

  {#if Object.keys(edge.properties).length > 0}
    <div>
      <div class="text-xs text-neutral-500 mb-1">Properties:</div>
      <div class="text-xs space-y-1">
        {#each Object.entries(edge.properties) as [key, value]}
          <div class="flex gap-2">
            <span class="text-neutral-500">{key}:</span>
            <span class="text-neutral-300">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

