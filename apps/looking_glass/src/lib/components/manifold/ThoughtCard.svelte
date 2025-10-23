<script lang="ts">
  import TypeBadge from './TypeBadge.svelte';
  import StatusBadge from './StatusBadge.svelte';

  export let thought: any;
  export let onOpen: ((id: string) => void) | null = null;
  export let onDelete: ((id: string) => void) | null = null;
  export let onPreview: ((id: string) => void) | null = null;
  export let showActions = true;
</script>

<div class="bg-neutral-900 rounded p-4 border border-neutral-800 hover:border-neutral-700 transition-colors">
  <div class="flex items-center gap-2 mb-2">
    <TypeBadge type={thought.type} />
    <StatusBadge status={thought.status} />
    {#if thought.confidence_score}
      <span class="text-xs text-neutral-500">confidence: {Math.round(thought.confidence_score * 100)}%</span>
    {/if}
  </div>
  
  <div class="text-lg font-semibold mb-1">{thought.title}</div>
  <div class="text-sm text-neutral-300 line-clamp-3">{thought.content}</div>
  
  {#if thought.tickers && thought.tickers.length > 0}
    <div class="flex flex-wrap gap-1 mt-2">
      {#each thought.tickers as ticker}
        <span class="text-xs bg-neutral-800 px-2 py-0.5 rounded">{ticker}</span>
      {/each}
    </div>
  {/if}
  
  {#if showActions}
    <div class="mt-3 flex gap-2">
      {#if onOpen}
        <button class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" on:click={() => onOpen && onOpen(thought.id)}>Open</button>
      {:else}
        <a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" href={`/manifold/thoughts/${thought.id}`}>Open</a>
      {/if}
      {#if onPreview}
        <button class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" on:click={() => onPreview && onPreview(thought.id)}>Preview</button>
      {/if}
      {#if onDelete}
        <button class="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-sm" on:click={() => onDelete && onDelete(thought.id)}>Delete</button>
      {/if}
    </div>
  {/if}
</div>

