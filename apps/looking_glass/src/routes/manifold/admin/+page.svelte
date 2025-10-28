<script lang="ts">
  import { onMount } from 'svelte';
  import { reindex, dedupe, getTrash, restoreTrash, quarantine, unquarantine, linkRelated, deleteThought } from '$lib/api/manifold';
  import { getDuplicateWarnings } from '$lib/api/manifold';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import GlassPanel from '$lib/components/manifold/GlassPanel.svelte';
  import DuplicateWarningCard from '$lib/components/manifold/DuplicateWarningCard.svelte';

  let dryRunCount: number | null = null;
  let scanned: number | null = null;
  let trash: any[] = [];
  let qId = '';
  let duplicateWarnings: any[] = [];
  let threshold = 0.92;
  let warningsLoading = false;

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

<div class="p-6 space-y-6 h-full overflow-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
      Manifold · Admin
    </h1>
  </div>
  
  <ManifoldNav />

  <!-- Duplicate Warnings Panel (NEW) -->
  <GlassPanel title="⚠️ Duplicate Warnings">
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <label class="text-xs font-medium text-neutral-400">Similarity Threshold</label>
        <input 
          type="range" 
          min="0.80" 
          max="0.99" 
          step="0.01" 
          bind:value={threshold}
          on:change={loadWarnings}
          class="flex-1"
        />
        <span class="text-sm font-semibold text-indigo-400 w-12">{(threshold * 100).toFixed(0)}%</span>
      </div>

      <div class="text-sm text-neutral-400">
        Found {duplicateWarnings.length} potential duplicates
      </div>

      {#if warningsLoading}
        <div class="text-neutral-500 text-center py-4">Loading…</div>
      {:else if duplicateWarnings.length === 0}
        <div class="text-center py-8 text-neutral-500">
          ✓ No duplicate warnings at {(threshold * 100).toFixed(0)}% similarity
        </div>
      {:else}
        <div class="space-y-2 max-h-[50vh] overflow-y-auto">
          {#each duplicateWarnings as warning (warning.thought1?.id + warning.thought2?.id)}
            <DuplicateWarningCard 
              {warning}
              onLinkDuplicate={handleLinkDuplicate}
              onDelete={handleDelete}
            />
          {/each}
        </div>
      {/if}
    </div>
  </GlassPanel>

  <!-- Maintenance Panels -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <GlassPanel title="🔄 Reindex">
      <button 
        class="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
        on:click={doDryRun}
      >
        Dry-Run
      </button>
      {#if dryRunCount !== null}
        <div class="text-xs mt-3 text-neutral-300">
          Would reindex: <span class="font-semibold text-indigo-400">{dryRunCount}</span> thoughts
        </div>
      {/if}
    </GlassPanel>

    <GlassPanel title="🔍 Dedupe Scan">
      <button 
        class="w-full px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white transition-colors"
        on:click={doDedupe}
      >
        Scan
      </button>
      {#if scanned !== null}
        <div class="text-xs mt-3 text-neutral-300">
          Scanned: <span class="font-semibold text-emerald-400">{scanned}</span> thoughts
        </div>
      {/if}
    </GlassPanel>
  </div>

  <!-- Quarantine / Unquarantine -->
  <GlassPanel title="⛔ Manual Quarantine">
    <div class="flex gap-2">
      <input 
        class="flex-1 px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
        placeholder="thought_id" 
        bind:value={qId} 
      />
      <button 
        class="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-sm font-medium text-white transition-colors"
        on:click={doQuarantine}
      >
        Quarantine
      </button>
      <button 
        class="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-sm font-medium text-white transition-colors"
        on:click={doUnquarantine}
      >
        Unquarantine
      </button>
    </div>
  </GlassPanel>

  <!-- Trash / Restore -->
  <GlassPanel title="🗑️ Trash">
    <div class="space-y-2">
      <button 
        class="w-full px-3 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-sm font-medium text-neutral-200 transition-colors mb-3"
        on:click={loadTrash}
      >
        Refresh
      </button>
      
      {#if trash.length === 0}
        <div class="text-center py-6 text-neutral-500 text-sm">
          Trash is empty
        </div>
      {:else}
        <div class="space-y-2 max-h-[40vh] overflow-y-auto">
          {#each trash as it (it.id)}
            <div class="flex items-center justify-between p-2 bg-neutral-800/50 rounded border border-neutral-700">
              <div class="flex-1 min-w-0">
                <div class="text-sm text-neutral-200 truncate font-medium">{it.title}</div>
                <div class="text-xs text-neutral-500">{it.type}</div>
              </div>
              <button 
                class="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-xs font-medium text-white transition-colors flex-shrink-0"
                on:click={() => doRestore(it.id)}
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


