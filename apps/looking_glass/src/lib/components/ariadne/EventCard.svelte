<script lang="ts">
  import type { Event } from '$lib/types/ariadne';
  import ConfidenceBadge from './ConfidenceBadge.svelte';

  export let event: Event;
</script>

<div class="bg-neutral-900 rounded border border-neutral-800 p-3">
  <div class="flex items-start justify-between mb-2">
    <span class="text-xs text-neutral-500">{event.type}</span>
    <ConfidenceBadge confidence={event.confidence} />
  </div>
  <h4 class="text-sm font-medium text-neutral-100 mb-1">{event.title}</h4>
  {#if event.description}
    <p class="text-xs text-neutral-400 mb-2">{event.description}</p>
  {/if}
  <div class="text-xs text-neutral-500">
    {new Date(event.occurred_at).toLocaleString()}
  </div>
  {#if event.source}
    <div class="text-xs text-neutral-600 mt-1">Source: {event.source}</div>
  {/if}
</div>

