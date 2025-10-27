<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { JobStatus, OverallStatus } from '$lib/api/tesseract';
  import Button from '../shared/Button.svelte';
  import Badge from '../shared/Badge.svelte';

  export let open = false;
  export let embedStatus: JobStatus | OverallStatus | null = null;
  export let collections: any = null;
  export let activeAlias: string = 'news_embeddings';

  const dispatch = createEventDispatcher();

  let batchFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  let batchTo = new Date().toISOString().slice(0, 10);
  let showBatchModal = false;
  let showSwitchModal = false;
  let showResetModal = false;
  let targetCollection = '';

  // Reactive statement to ensure UI updates when embedStatus changes
  $: if (embedStatus) {
    // This forces Svelte to rerun the component when embedStatus updates
    void embedStatus;
  }

  function handleBatchStart() {
    dispatch('batchStart', { from: batchFrom, to: batchTo, body_only: true, incremental: true });
    showBatchModal = false;
  }

  function handleCollectionSwitch() {
    dispatch('collectionSwitch', { name: targetCollection });
    showSwitchModal = false;
  }

  async function handleFactoryReset() {
    try {
      const response = await fetch('http://localhost:8081/v1/admin/reset', { method: 'POST' });
      if (!response.ok) throw new Error('Reset failed');
      showResetModal = false;
      dispatch('refreshStatus');
      dispatch('refreshCollections');
    } catch (e) {
      console.error('Factory reset failed:', e);
    }
  }

  function isActiveCollection(colName: string): boolean {
    return colName === activeAlias;
  }

  function isOverallStatus(status: any): status is OverallStatus {
    return 'collection_name' in status;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'running': return 'from-blue-500/20 to-purple-500/20 border-blue-500/30';
      case 'done': return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30';
      case 'error': return 'from-red-500/20 to-orange-500/20 border-red-500/30';
      default: return 'from-neutral-500/10 to-neutral-600/10 border-neutral-500/20';
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'running': return '⚡';
      case 'done': return '✓';
      case 'error': return '⚠';
      default: return '○';
    }
  }
</script>

{#if open}
  <!-- Backdrop with glassmorphism -->
  <button 
    type="button"
    aria-label="Close admin panel"
    class="fixed inset-0 bg-gradient-to-br from-black/50 via-neutral-900/40 to-black/60 backdrop-blur-sm z-40 transition-all duration-300"
    on:click={() => { open = false; }}
  ></button>

  <!-- Sidebar with modern design -->
  <div class="fixed right-0 top-0 h-full w-[420px] bg-gradient-to-br from-neutral-900/95 via-neutral-900/98 to-neutral-950/95 backdrop-blur-xl border-l border-neutral-700/50 shadow-2xl z-50 overflow-y-auto animate-slide-in">
    <div class="relative">
      <!-- Decorative gradient overlay -->
      <div class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none"></div>
      
      <div class="relative p-6 space-y-6">
        <!-- Header with close button -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent">Admin Panel</h2>
            <p class="text-xs text-neutral-500 mt-1">Tesseract Vector Store</p>
          </div>
          <button 
            class="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
            on:click={() => { open = false; }}
            aria-label="Close panel"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Vector Store Status Card -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 class="text-sm font-semibold text-neutral-200">Vector Store</h3>
          </div>
          <div class="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-xl p-5 space-y-3 border border-neutral-700/30 shadow-lg backdrop-blur-sm">
            {#if embedStatus}
              {#if isOverallStatus(embedStatus)}
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30">
                    <div class="text-xs text-neutral-500 mb-1">Collection</div>
                    <div class="text-sm font-mono text-neutral-100 truncate">{embedStatus.collection_name}</div>
                  </div>
                  <div class="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/30">
                    <div class="text-xs text-neutral-500 mb-1">Dimensions</div>
                    <div class="text-sm font-mono text-blue-400">{embedStatus.vector_size}D</div>
                  </div>
                  <div class="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/20">
                    <div class="text-xs text-blue-400 mb-1">Vectors</div>
                    <div class="text-lg font-bold text-neutral-100">{embedStatus.total_vectors.toLocaleString()}</div>
                  </div>
                  <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-lg p-3 border border-emerald-500/20">
                    <div class="text-xs text-emerald-400 mb-1">Articles</div>
                    <div class="text-lg font-bold text-neutral-100">{embedStatus.total_embedded_articles.toLocaleString()}</div>
                  </div>
                </div>
              {/if}
            {:else}
              <div class="text-sm text-neutral-500 flex items-center gap-2">
                <div class="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                Loading status...
              </div>
            {/if}
          </div>
        </div>

        <!-- Embedding Status Card -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 class="text-sm font-semibold text-neutral-200">Embedding Status</h3>
            </div>
            <button 
              class="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2 py-1 rounded transition-all"
              on:click={() => dispatch('refreshStatus')}
            >
              ↻ Refresh
            </button>
          </div>
          <div class="bg-gradient-to-br {embedStatus && !isOverallStatus(embedStatus) ? getStatusColor(embedStatus.status) : 'from-neutral-800/40 to-neutral-900/40'} rounded-xl p-5 space-y-4 border shadow-lg backdrop-blur-sm transition-all duration-500">
            {#if embedStatus && !isOverallStatus(embedStatus)}
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-neutral-400">Current Job</span>
                <div class="flex items-center gap-2">
                  <span class="text-lg">{getStatusIcon(embedStatus.status)}</span>
                  <Badge 
                    variant={embedStatus.status === 'done' ? 'success' : embedStatus.status === 'running' ? 'primary' : embedStatus.status === 'error' ? 'error' : 'secondary'}
                    size="sm"
                  >
                    {embedStatus.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              {#if embedStatus.status === 'running' || embedStatus.status === 'done'}
                <div>
                  <div class="flex justify-between text-xs mb-2">
                    <span class="text-neutral-400 font-medium">Progress</span>
                    <span class="text-neutral-200 font-mono">{embedStatus.processed.toLocaleString()} / {embedStatus.total.toLocaleString()}</span>
                  </div>
                  <div class="relative w-full bg-neutral-900/50 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div 
                      class="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 h-full transition-all duration-500 ease-out shadow-lg"
                      style="width: {embedStatus.percent.toFixed(1)}%"
                    >
                      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  <div class="text-xs text-neutral-400 mt-2 font-mono">{embedStatus.percent.toFixed(1)}% complete</div>
                </div>
              {/if}
              {#if embedStatus.error}
                <div class="text-xs text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg p-3 font-mono">
                  {embedStatus.error}
                </div>
              {/if}
            {:else}
              <div class="text-sm text-neutral-500 text-center py-2">
                <div class="text-2xl mb-2 opacity-40">⏸</div>
                No active job
              </div>
            {/if}
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <h3 class="text-sm font-semibold text-neutral-200">Actions</h3>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="bg-gradient-to-br from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/30 rounded-lg px-4 py-3 text-sm font-medium text-blue-300 transition-all hover:shadow-lg hover:shadow-blue-500/10 hover:scale-105"
              on:click={() => { showBatchModal = true; }}
            >
              <div class="text-lg mb-1">⚡</div>
              Batch Embed
            </button>
            <button
              class="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 rounded-lg px-4 py-3 text-sm font-medium text-emerald-300 transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-105"
              on:click={() => dispatch('initCollection')}
            >
              <div class="text-lg mb-1">➕</div>
              New Collection
            </button>
            <button
              class="col-span-2 bg-gradient-to-br from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-sm font-medium text-red-300 transition-all hover:shadow-lg hover:shadow-red-500/10"
              on:click={() => { showResetModal = true; }}
            >
              <div class="flex items-center justify-center gap-2">
                <span class="text-lg">🔄</span>
                <span>Factory Reset</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Collections -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <h3 class="text-sm font-semibold text-neutral-200">Collections</h3>
            </div>
            <button 
              class="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 px-2 py-1 rounded transition-all"
              on:click={() => dispatch('refreshCollections')}
            >
              ↻ Refresh
            </button>
          </div>
          <div class="space-y-2">
            {#if collections?.collections}
              {#each collections.collections as col}
                <button
                  class="w-full bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 hover:from-neutral-800/60 hover:to-neutral-900/60 border border-neutral-700/30 rounded-lg p-4 transition-all hover:shadow-lg text-left group"
                  disabled={isActiveCollection(col.name)}
                  on:click={() => { if (!isActiveCollection(col.name)) { targetCollection = col.name; showSwitchModal = true; } }}
                >
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="text-sm font-mono text-neutral-200 group-hover:text-neutral-100 transition-colors">{col.name}</span>
                    {#if isActiveCollection(col.name)}
                      <Badge variant="success" size="sm">Active</Badge>
                    {/if}
                  </div>
                  <div class="flex items-center gap-3 text-xs">
                    <span class="text-blue-400 font-mono">{col.points_count.toLocaleString()} vectors</span>
                    <span class="text-neutral-600">·</span>
                    <span class="text-purple-400 font-mono">{col.vector_size}D</span>
                  </div>
                </button>
              {/each}
            {:else}
              <div class="text-sm text-neutral-500 text-center py-8">
                <div class="text-3xl mb-2 opacity-30">📦</div>
                No collections found
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Batch Embed Modal -->
{#if showBatchModal}
  <button
    type="button"
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] animate-fade-in"
    on:click={() => { showBatchModal = false; }}
    aria-label="Close batch embed modal"
  ></button>
  <div class="fixed inset-0 flex items-center justify-center z-[60] animate-scale-in" on:click|stopPropagation>
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-700/50 rounded-2xl max-w-md w-full mx-4 p-6 shadow-2xl">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center text-lg">⚡</div>
        <h3 class="text-lg font-bold text-neutral-100">Start Batch Embedding</h3>
      </div>
      <div class="space-y-4">
        <div>
          <label for="batchFrom" class="text-sm font-medium text-neutral-300 mb-2 block">From Date</label>
          <input 
            type="date" 
            id="batchFrom"
            bind:value={batchFrom}
            class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
        </div>
        <div>
          <label for="batchTo" class="text-sm font-medium text-neutral-300 mb-2 block">To Date</label>
          <input 
            type="date" 
            id="batchTo"
            bind:value={batchTo}
            class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
        </div>
        <div class="flex gap-3 pt-2">
          <button
            class="flex-1 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all"
            on:click={() => { showBatchModal = false; }}
          >
            Cancel
          </button>
          <button
            class="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transition-all"
            on:click={handleBatchStart}
          >
            Start Embedding
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Collection Switch Modal -->
{#if showSwitchModal}
  <button
    type="button"
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] animate-fade-in"
    on:click={() => { showSwitchModal = false; }}
    aria-label="Close switch collection modal"
  ></button>
  <div class="fixed inset-0 flex items-center justify-center z-[60] animate-scale-in" on:click|stopPropagation>
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-700/50 rounded-2xl max-w-md w-full mx-4 p-6 shadow-2xl">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-lg">🔄</div>
        <h3 class="text-lg font-bold text-neutral-100">Switch Collection</h3>
      </div>
      <p class="text-sm text-neutral-400 mb-6">
        Switch active alias to <span class="font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">{targetCollection}</span>? This change is instant and affects all queries.
      </p>
      <div class="flex gap-3">
        <button
          class="flex-1 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all"
          on:click={() => { showSwitchModal = false; }}
        >
          Cancel
        </button>
        <button
          class="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:shadow-purple-500/20 transition-all"
          on:click={handleCollectionSwitch}
        >
          Confirm Switch
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Factory Reset Confirmation Modal -->
{#if showResetModal}
  <button
    type="button"
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] animate-fade-in"
    on:click={() => { showResetModal = false; }}
    aria-label="Close factory reset modal"
  ></button>
  <div class="fixed inset-0 flex items-center justify-center z-[60] animate-scale-in" on:click|stopPropagation>
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-red-500/30 rounded-2xl max-w-md w-full mx-4 p-6 shadow-2xl">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center text-lg">⚠️</div>
        <h3 class="text-lg font-bold text-red-300">Factory Reset</h3>
      </div>
      <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
        <p class="text-sm text-red-300 font-medium mb-2">⚠️ Warning: This action cannot be undone!</p>
        <p class="text-sm text-neutral-400">
          This will permanently delete:
        </p>
        <ul class="text-sm text-neutral-400 mt-2 space-y-1 ml-4">
          <li>• All Qdrant collections and vectors</li>
          <li>• All embedding job history</li>
          <li>• All tracking data in SQLite</li>
        </ul>
      </div>
      <div class="flex gap-3">
        <button
          class="flex-1 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-300 hover:text-neutral-100 transition-all"
          on:click={() => { showResetModal = false; }}
        >
          Cancel
        </button>
        <button
          class="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl hover:shadow-red-500/20 transition-all"
          on:click={handleFactoryReset}
        >
          Reset Everything
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .animate-slide-in {
    animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }

  .animate-scale-in {
    animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
</style>
