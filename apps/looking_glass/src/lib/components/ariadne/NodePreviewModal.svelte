<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LabelBadge from './LabelBadge.svelte';
  import RelTypeBadge from './RelTypeBadge.svelte';
  import ConfidenceBadge from './ConfidenceBadge.svelte';
  import type { Node } from '$lib/types/ariadne';

  export let node: Node | null;
  export let incomingEdges: any[] = [];
  export let outgoingEdges: any[] = [];

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function navigateToNode(nodeId: string) {
    dispatch('navigate', nodeId);
  }
</script>

{#if node}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" on:click={close}>
    <div 
      class="bg-neutral-900 rounded border border-neutral-800 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <LabelBadge label={node.label} />
            <h2 class="text-xl font-semibold text-neutral-100">
              {node.properties.name || node.properties.ticker || node.id}
            </h2>
          </div>
        </div>
        <button
          on:click={close}
          class="text-neutral-400 hover:text-neutral-100"
        >
          ✕
        </button>
      </div>

      <!-- Properties -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-neutral-300 mb-2">Properties</h3>
        <div class="bg-neutral-950 rounded border border-neutral-800 p-3 space-y-1">
          {#each Object.entries(node.properties) as [key, value]}
            <div class="flex items-start gap-2 text-xs">
              <span class="text-neutral-500 min-w-24">{key}:</span>
              <span class="text-neutral-300 flex-1">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Incoming Edges -->
      {#if incomingEdges.length > 0}
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-neutral-300 mb-2">Incoming ({incomingEdges.length})</h3>
          <div class="space-y-2">
            {#each incomingEdges.slice(0, 5) as edge}
              <div class="bg-neutral-950 rounded border border-neutral-800 p-2 flex items-center justify-between">
                <div class="flex items-center gap-2 flex-1">
                  <RelTypeBadge relType={edge.rel_type} />
                  <span class="text-xs text-neutral-400">from</span>
                  <button
                    on:click={() => navigateToNode(edge.source_id)}
                    class="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {edge.source_id}
                  </button>
                </div>
                {#if edge.properties?.confidence}
                  <ConfidenceBadge confidence={edge.properties.confidence} />
                {/if}
              </div>
            {/each}
            {#if incomingEdges.length > 5}
              <div class="text-xs text-neutral-500 text-center">
                + {incomingEdges.length - 5} more
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Outgoing Edges -->
      {#if outgoingEdges.length > 0}
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-neutral-300 mb-2">Outgoing ({outgoingEdges.length})</h3>
          <div class="space-y-2">
            {#each outgoingEdges.slice(0, 5) as edge}
              <div class="bg-neutral-950 rounded border border-neutral-800 p-2 flex items-center justify-between">
                <div class="flex items-center gap-2 flex-1">
                  <RelTypeBadge relType={edge.rel_type} />
                  <span class="text-xs text-neutral-400">to</span>
                  <button
                    on:click={() => navigateToNode(edge.target_id)}
                    class="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {edge.target_id}
                  </button>
                </div>
                {#if edge.properties?.confidence}
                  <ConfidenceBadge confidence={edge.properties.confidence} />
                {/if}
              </div>
            {/each}
            {#if outgoingEdges.length > 5}
              <div class="text-xs text-neutral-500 text-center">
                + {outgoingEdges.length - 5} more
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex gap-2">
        {#if node.properties.ticker}
          <a
            href="/ariadne/timeline?ticker={node.properties.ticker}"
            class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
          >
            View Timeline
          </a>
        {/if}
        <button
          on:click={close}
          class="px-3 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-sm"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

