<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LabelBadge from './LabelBadge.svelte';
  import type { Node } from '$lib/types/ariadne';

  export let node: Node;
  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('click', node);
  }

  function handlePreview() {
    dispatch('preview', node);
  }

  const displayName = 
    node.properties.name || 
    node.properties.ticker || 
    node.properties.title || 
    node.properties.pattern_name ||
    node.properties.regime_name ||
    node.properties.statement ||
    node.properties.content ||
    node.properties.symbol || 
    node.id;
</script>

<div class="bg-neutral-900 rounded border border-neutral-800 p-4 hover:border-neutral-700 transition-colors">
  <div class="flex items-start justify-between mb-2">
    <LabelBadge label={node.label} />
    <div class="flex gap-1">
      <button
        class="px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
        on:click={handlePreview}
      >
        Preview
      </button>
      <button
        class="px-2 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white"
        on:click={handleClick}
      >
        Open
      </button>
    </div>
  </div>
  <h3 class="text-lg font-medium text-neutral-100 mb-1">{displayName}</h3>
  
  {#if node.properties.sector}
    <div class="text-sm text-neutral-400">Sector: {node.properties.sector}</div>
  {/if}
  
  {#if node.properties.ticker}
    <div class="text-xs text-neutral-500 mt-1">Ticker: {node.properties.ticker}</div>
  {/if}
  
  {#if node.properties.occurred_at}
    <div class="text-xs text-neutral-500 mt-1">Occurred: {new Date(node.properties.occurred_at).toLocaleDateString()}</div>
  {/if}
  
  {#if node.properties.category}
    <div class="text-sm text-neutral-400">Category: {node.properties.category}</div>
  {/if}
  
  {#if node.properties.description}
    <div class="text-xs text-neutral-500 mt-1 line-clamp-2">{node.properties.description}</div>
  {/if}
  
  {#if node.properties.confidence !== undefined}
    <div class="text-xs text-neutral-500 mt-1">Confidence: {(node.properties.confidence * 100).toFixed(0)}%</div>
  {/if}
</div>

