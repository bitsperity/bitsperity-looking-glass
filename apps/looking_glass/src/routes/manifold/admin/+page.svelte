<script lang="ts">
  import { onMount } from 'svelte';
  import { reindex, dedupe, getTrash, restoreTrash, quarantine, unquarantine, linkRelated, deleteThought } from '$lib/api/manifold';
  import { getDuplicateWarnings } from '$lib/api/manifold';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import DuplicateComparisonModal from '$lib/components/manifold/DuplicateComparisonModal.svelte';

  let dryRunCount: number | null = null;
  let scanned: number | null = null;
  let trash: any[] = [];
  let qId = '';
  let duplicateWarnings: any[] = [];
  let threshold = 0.92;
  let warningsLoading = false;
  let selectedDuplicate: any = null;
  let showComparisonModal = false;

  async function doDryRun() {
    const res = await reindex(true);
    dryRunCount = res.would_reindex ?? null;
  }

  async function doDedupe() {
    const res = await dedupe();
    scanned = res.scanned;
  }

  async function loadTrash() {
    const res = await getTrash();
    trash = res.thoughts || [];
  }

  async function doRestore(id: string) {
    await restoreTrash(id);
    await loadTrash();
  }

  async function doQuarantine() {
    if (!qId) return;
    await quarantine(qId, 'manual');
  }

  async function doUnquarantine() {
    if (!qId) return;
    await unquarantine(qId);
  }

  async function loadWarnings() {
    warningsLoading = true;
    try {
      const resp = await getDuplicateWarnings(threshold, 50);
      duplicateWarnings = resp.duplicates || [];
    } catch (e) {
      console.error('Error loading warnings:', e);
    } finally {
      warningsLoading = false;
    }
  }

  async function handleLinkDuplicate(id1: string, id2: string) {
    await linkRelated(id1, id2);
    await loadWarnings();
  }

  async function handleDelete(id: string) {
    await deleteThought(id, true);
    await loadWarnings();
  }

  onMount(async () => {
    await Promise.all([loadTrash(), loadWarnings()]);
  });
</script>

<div class="p-6 space-y-6 h-full overflow-auto bg-gradient-to-b from-slate-900 via-slate-900 to-neutral-900">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
      Admin Center
    </h1>
    <p class="text-neutral-400 text-sm">Manage duplicate detection, maintenance & data quality</p>
  </div>
  
  <ManifoldNav />

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="bg-gradient-to-br from-indigo-950/50 to-indigo-900/20 border border-indigo-500/20 rounded-lg p-4 backdrop-blur-md">
      <div class="text-xs font-medium text-indigo-300 mb-1">Duplicate Detection</div>
      <div class="text-3xl font-bold text-indigo-400">{duplicateWarnings.length}</div>
      <div class="text-xs text-indigo-300/70 mt-1">at {(threshold * 100).toFixed(0)}% similarity</div>
    </div>
    
    <div class="bg-gradient-to-br from-emerald-950/50 to-emerald-900/20 border border-emerald-500/20 rounded-lg p-4 backdrop-blur-md">
      <div class="text-xs font-medium text-emerald-300 mb-1">Trash Items</div>
      <div class="text-3xl font-bold text-emerald-400">{trash.length}</div>
      <div class="text-xs text-emerald-300/70 mt-1">soft deleted thoughts</div>
    </div>

    <div class="bg-gradient-to-br from-amber-950/50 to-amber-900/20 border border-amber-500/20 rounded-lg p-4 backdrop-blur-md">
      <div class="text-xs font-medium text-amber-300 mb-1">Maintenance Status</div>
      <div class="text-3xl font-bold text-amber-400">✓</div>
      <div class="text-xs text-amber-300/70 mt-1">System healthy</div>
    </div>
  </div>

  <!-- Section 1: Duplicate Detection & Resolution -->
  <GlassPanel>
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-neutral-100 mb-1">🔍 Duplicate Detection</h2>
        <p class="text-xs text-neutral-400">Find and merge similar thoughts to clean up your database</p>
      </div>

      <!-- Threshold Control -->
      <div class="bg-neutral-900/50 border border-neutral-700 rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-neutral-300">Similarity Threshold</label>
          <span class="text-lg font-bold text-indigo-400">{(threshold * 100).toFixed(0)}%</span>
        </div>
        <input 
          type="range" 
          min="0.80" 
          max="0.99" 
          step="0.01" 
          bind:value={threshold}
          on:change={loadWarnings}
          class="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div class="flex justify-between text-xs text-neutral-500">
          <span>Stricter (80%)</span>
          <span>Looser (99%)</span>
        </div>
      </div>

      <!-- Results -->
      {#if warningsLoading}
        <div class="space-y-2">
          <div class="h-12 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-pulse"></div>
          <div class="h-12 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-pulse"></div>
        </div>
      {:else if duplicateWarnings.length === 0}
        <div class="flex flex-col items-center justify-center py-8 bg-neutral-900/50 border border-emerald-500/20 rounded-lg">
          <div class="text-3xl mb-2">✓</div>
          <div class="text-sm font-medium text-neutral-300">No Duplicates Found</div>
          <div class="text-xs text-neutral-500 mt-1">Database is clean at {(threshold * 100).toFixed(0)}% similarity</div>
        </div>
      {:else}
        <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {#each duplicateWarnings as warning, idx (idx)}
            <button
              on:click={() => {
                selectedDuplicate = warning;
                showComparisonModal = true;
              }}
              class="w-full text-left bg-neutral-900/50 border border-amber-500/30 rounded-lg p-4 hover:border-amber-500/60 hover:bg-neutral-900 transition-all active:scale-95"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <div class="text-sm font-semibold text-neutral-200 truncate">{(warning.thought1 || warning.thought_1)?.title || 'Untitled'}</div>
                  <div class="text-xs text-neutral-500 mt-1">vs</div>
                  <div class="text-sm font-semibold text-neutral-200 truncate mt-1">{(warning.thought2 || warning.thought_2)?.title || 'Untitled'}</div>
                </div>
                <div class="text-right ml-3 flex-shrink-0">
                  <div class="text-2xl font-bold text-amber-400">{Math.round((warning.similarity || 0) * 100)}%</div>
                  <div class="text-xs text-amber-300">similar</div>
                </div>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="px-2 py-1 rounded bg-indigo-950/50 text-indigo-300">{(warning.thought1 || warning.thought_1)?.type || 'thought'}</span>
                <span class="px-2 py-1 rounded bg-amber-950/50 text-amber-300">{(warning.thought2 || warning.thought_2)?.type || 'thought'}</span>
                <span class="ml-auto px-2 py-1 rounded bg-blue-950/50 text-blue-300">🔍 Click to compare →</span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </GlassPanel>

  <!-- Section 2: Maintenance Tools -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Reindex -->
    <GlassPanel>
      <div class="space-y-3">
        <div>
          <h3 class="text-lg font-semibold text-neutral-100">🔄 Reindex</h3>
          <p class="text-xs text-neutral-400 mt-1">Rebuild search indexes</p>
        </div>
        <button 
          on:click={doDryRun}
          class="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-indigo-500/50 active:scale-95"
        >
          Check What Would Reindex
        </button>
        {#if dryRunCount !== null}
          <div class="bg-indigo-950/50 border border-indigo-500/30 rounded-lg p-3">
            <div class="text-sm">
              <span class="text-neutral-400">Would reindex:</span>
              <span class="font-bold text-indigo-400 ml-2">{dryRunCount} thoughts</span>
            </div>
          </div>
        {/if}
      </div>
    </GlassPanel>

    <!-- Dedupe Scan -->
    <GlassPanel>
      <div class="space-y-3">
        <div>
          <h3 class="text-lg font-semibold text-neutral-100">🔍 Dedupe Scan</h3>
          <p class="text-xs text-neutral-400 mt-1">Scan for duplicate content</p>
        </div>
        <button 
          on:click={doDedupe}
          class="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-emerald-500/50 active:scale-95"
        >
          Run Scan Now
        </button>
        {#if scanned !== null}
          <div class="bg-emerald-950/50 border border-emerald-500/30 rounded-lg p-3">
            <div class="text-sm">
              <span class="text-neutral-400">Scanned:</span>
              <span class="font-bold text-emerald-400 ml-2">{scanned} thoughts</span>
            </div>
          </div>
        {/if}
      </div>
    </GlassPanel>
  </div>

  <!-- Section 3: Manual Actions -->
  <GlassPanel>
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-neutral-100 mb-1">⛔ Manual Control</h2>
        <p class="text-xs text-neutral-400">Quarantine or unquarantine specific thoughts</p>
      </div>

      <div class="flex gap-2">
        <input 
          type="text"
          class="flex-1 px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder="Enter thought ID to quarantine..." 
          bind:value={qId} 
        />
        <button 
          on:click={doQuarantine}
          disabled={!qId}
          class="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all active:scale-95"
        >
          Quarantine
        </button>
        <button 
          on:click={doUnquarantine}
          disabled={!qId}
          class="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all active:scale-95"
        >
          Restore
        </button>
      </div>
    </div>
  </GlassPanel>

  <!-- Section 4: Trash Management -->
  <GlassPanel>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-neutral-100 mb-1">🗑️ Trash ({trash.length})</h2>
          <p class="text-xs text-neutral-400">Soft-deleted thoughts can be restored</p>
        </div>
        <button 
          on:click={loadTrash}
          class="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm font-medium text-neutral-200 transition-all active:scale-95"
        >
          ↻ Refresh
        </button>
      </div>
      
      {#if trash.length === 0}
        <div class="flex flex-col items-center justify-center py-12 bg-neutral-900/50 border border-neutral-700 rounded-lg">
          <div class="text-4xl mb-2 opacity-50">🗑️</div>
          <div class="text-sm text-neutral-400">Trash is empty</div>
        </div>
      {:else}
        <div class="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
          {#each trash as item (item.id)}
            <div class="bg-neutral-900/50 border border-neutral-700 rounded-lg p-3 hover:border-neutral-600 transition-colors flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-neutral-200 truncate">{item.title || 'Untitled'}</div>
                <div class="text-xs text-neutral-500 mt-0.5">{item.type || 'thought'}</div>
              </div>
              <button 
                on:click={() => doRestore(item.id)}
                class="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/40 text-xs font-medium text-emerald-300 transition-all active:scale-95"
              >
                Restore
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </GlassPanel>
</div>

<!-- Duplicate Comparison Modal -->
<DuplicateComparisonModal 
  open={showComparisonModal}
  duplicate={selectedDuplicate}
  onLink={handleLinkDuplicate}
  onDelete={handleDelete}
  onClose={() => {
    showComparisonModal = false;
    selectedDuplicate = null;
  }}
/>

<style>
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: #404040;
    outline: none;
    border-radius: 2px;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #4f46e5;
    cursor: pointer;
    border-radius: 50%;
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #4f46e5;
    cursor: pointer;
    border-radius: 50%;
    border: none;
  }
</style>


