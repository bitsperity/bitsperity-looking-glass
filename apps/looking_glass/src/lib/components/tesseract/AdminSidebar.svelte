<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { EmbedStatus } from '$lib/api/tesseract';
  import Button from '../shared/Button.svelte';
  import Badge from '../shared/Badge.svelte';

  export let open = false;
  export let embedStatus: EmbedStatus | null = null;
  export let collections: any = null;
  export let activeAlias: string = 'news_embeddings';

  const dispatch = createEventDispatcher();

  let batchFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  let batchTo = new Date().toISOString().slice(0, 10);
  let showBatchModal = false;
  let showSwitchModal = false;
  let showDeleteModal = false;
  let targetCollection = '';

  function handleBatchStart() {
    dispatch('batchStart', { from: batchFrom, to: batchTo });
    showBatchModal = false;
  }

  function handleCollectionSwitch() {
    dispatch('collectionSwitch', { name: targetCollection });
    showSwitchModal = false;
  }

  function handleCollectionDelete() {
    dispatch('collectionDelete', { name: targetCollection });
    showDeleteModal = false;
  }

  function isActiveCollection(colName: string): boolean {
    return colName === activeAlias;
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
    on:click={() => { open = false; }}
  ></div>

  <!-- Sidebar -->
  <div class="fixed right-0 top-0 h-full w-96 bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 overflow-y-auto animate-slide-in">
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-100">Admin Panel</h2>
        <button 
          class="text-neutral-400 hover:text-neutral-200 text-2xl leading-none"
          on:click={() => { open = false; }}
        >
          ×
        </button>
      </div>

      <!-- Vector Store Status -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium text-neutral-300">Vector Store</h3>
        <div class="bg-neutral-800/50 rounded-lg p-4 space-y-2 border border-neutral-700/50">
          {#if embedStatus}
            <div class="flex justify-between text-xs">
              <span class="text-neutral-400">Collection</span>
              <span class="text-neutral-200 font-mono">{activeAlias}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-neutral-400">Vectors</span>
              <span class="text-neutral-200 font-mono">{embedStatus.vector_count?.toLocaleString() ?? 0}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-neutral-400">Dimensions</span>
              <span class="text-neutral-200 font-mono">{embedStatus.vector_size ?? 1024}D</span>
            </div>
          {:else}
            <div class="text-xs text-neutral-500">Loading status...</div>
          {/if}
        </div>
      </div>

      <!-- Embedding Status -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-neutral-300">Embedding Status</h3>
          <button 
            class="text-xs text-blue-400 hover:text-blue-300"
            on:click={() => dispatch('refreshStatus')}
          >
            Refresh
          </button>
        </div>
        <div class="bg-neutral-800/50 rounded-lg p-4 space-y-3 border border-neutral-700/50">
          {#if embedStatus}
            <div class="flex items-center justify-between">
              <span class="text-xs text-neutral-400">Status</span>
              <Badge 
                variant={embedStatus.status === 'done' ? 'success' : embedStatus.status === 'running' ? 'primary' : embedStatus.status === 'error' ? 'danger' : 'secondary'}
                size="sm"
              >
                {embedStatus.status}
              </Badge>
            </div>
            {#if embedStatus.status === 'running' || embedStatus.status === 'done'}
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-neutral-400">Progress</span>
                  <span class="text-neutral-200">{embedStatus.processed?.toLocaleString() ?? 0} / {embedStatus.total?.toLocaleString() ?? 0}</span>
                </div>
                <div class="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div 
                    class="bg-blue-500 h-full transition-all duration-500"
                    style="width: {embedStatus.percent?.toFixed(1) ?? 0}%"
                  ></div>
                </div>
                <div class="text-xs text-neutral-500 mt-1">{embedStatus.percent?.toFixed(1) ?? 0}%</div>
              </div>
            {/if}
            {#if embedStatus.device}
              <div class="flex justify-between text-xs">
                <span class="text-neutral-400">Device</span>
                <span class="text-neutral-200 font-mono uppercase">{embedStatus.device}</span>
              </div>
            {/if}
            {#if embedStatus.error}
              <div class="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                {embedStatus.error}
              </div>
            {/if}
          {/if}
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-3">
        <h3 class="text-sm font-medium text-neutral-300">Actions</h3>
        <div class="space-y-2">
          <Button
            variant="secondary"
            size="sm"
            classes="w-full justify-center"
            on:click={() => dispatch('initCollection')}
          >
            New Collection
          </Button>
          <Button
            variant="primary"
            size="sm"
            classes="w-full justify-center"
            on:click={() => { showBatchModal = true; }}
          >
            Batch Embed
          </Button>
        </div>
      </div>

      <!-- Collections -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-neutral-300">Collections</h3>
          <button 
            class="text-xs text-blue-400 hover:text-blue-300"
            on:click={() => dispatch('refreshCollections')}
          >
            Refresh
          </button>
        </div>
        <div class="space-y-2">
          {#if collections?.collections}
            {#each collections.collections as col}
              <div class="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3">
                <div class="flex items-start justify-between gap-2">
                  <button
                    class="flex-1 text-left hover:bg-neutral-800/50 rounded p-1 -m-1 transition-colors"
                    on:click={() => { if (!isActiveCollection(col.name)) { targetCollection = col.name; showSwitchModal = true; } }}
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs font-mono text-neutral-200">{col.name}</span>
                      {#if col.is_active_alias_target !== undefined ? col.is_active_alias_target : (col.name === activeAlias)}
                        <Badge variant="success" size="sm">Active</Badge>
                      {/if}
                    </div>
                    <div class="text-xs text-neutral-400">
                      {col.points_count?.toLocaleString() ?? 0} vectors · {col.vector_size ?? 1024}D
                    </div>
                  </button>
                  {#if !isActiveCollection(col.name)}
                    <button
                      class="flex-shrink-0 text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                      on:click={() => { targetCollection = col.name; showDeleteModal = true; }}
                      title="Delete collection"
                    >
                      ×
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          {:else}
            <div class="text-xs text-neutral-500 p-4 text-center">No collections found</div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Batch Embed Modal -->
{#if showBatchModal}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" on:click={() => { showBatchModal = false; }}>
    <div class="bg-neutral-900 border border-neutral-700 rounded-lg max-w-md w-full mx-4 p-6" on:click|stopPropagation>
      <h3 class="text-lg font-semibold text-neutral-100 mb-4">Start Batch Embedding</h3>
      <div class="space-y-4">
        <div>
          <label class="text-sm text-neutral-400 mb-1 block">From Date</label>
          <input 
            type="date" 
            bind:value={batchFrom}
            class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100"
          />
        </div>
        <div>
          <label class="text-sm text-neutral-400 mb-1 block">To Date</label>
          <input 
            type="date" 
            bind:value={batchTo}
            class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100"
          />
        </div>
        <div class="flex gap-2">
          <Button variant="secondary" size="sm" classes="flex-1 justify-center" on:click={() => { showBatchModal = false; }}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" classes="flex-1 justify-center" on:click={handleBatchStart}>
            Start
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Collection Switch Confirmation Modal -->
{#if showSwitchModal}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" on:click={() => { showSwitchModal = false; }}>
    <div class="bg-neutral-900 border border-neutral-700 rounded-lg max-w-md w-full mx-4 p-6" on:click|stopPropagation>
      <h3 class="text-lg font-semibold text-neutral-100 mb-2">Switch Collection</h3>
      <p class="text-sm text-neutral-400 mb-4">
        Switch active alias to <span class="font-mono text-neutral-200">{targetCollection}</span>? 
        This change is instant and affects all queries.
      </p>
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" classes="flex-1 justify-center" on:click={() => { showSwitchModal = false; }}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" classes="flex-1 justify-center" on:click={handleCollectionSwitch}>
          Confirm
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Collection Delete Confirmation Modal -->
{#if showDeleteModal}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" on:click={() => { showDeleteModal = false; }}>
    <div class="bg-neutral-900 border border-red-900/50 rounded-lg max-w-md w-full mx-4 p-6" on:click|stopPropagation>
      <h3 class="text-lg font-semibold text-red-400 mb-2">Delete Collection</h3>
      <p class="text-sm text-neutral-400 mb-4">
        Permanently delete <span class="font-mono text-neutral-200">{targetCollection}</span>? 
        This action cannot be undone. All vectors in this collection will be lost.
      </p>
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" classes="flex-1 justify-center" on:click={() => { showDeleteModal = false; }}>
          Cancel
        </Button>
        <button
          class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded transition-colors"
          on:click={handleCollectionDelete}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
</style>

