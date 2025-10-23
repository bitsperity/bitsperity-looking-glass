<script lang="ts">
  import { onMount } from 'svelte';
  import { reindex, dedupe, getTrash, restoreTrash, quarantine, unquarantine } from '$lib/api/manifold';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';

  let dryRunCount: number | null = null;
  let scanned: number | null = null;
  let trash: any[] = [];
  let qId = '';

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

  onMount(loadTrash);
</script>

<div class="p-6 space-y-6 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Manifold · Admin</h1>
  <ManifoldNav />

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
      <div class="text-sm text-neutral-400">Reindex (Dry-Run)</div>
      <button class="mt-2 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" on:click={doDryRun}>Run</button>
      {#if dryRunCount !== null}
        <div class="text-xs mt-2">Would reindex: {dryRunCount}</div>
      {/if}
    </div>

    <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
      <div class="text-sm text-neutral-400">Dedupe (Stub)</div>
      <button class="mt-2 px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" on:click={doDedupe}>Run</button>
      {#if scanned !== null}
        <div class="text-xs mt-2">Scanned: {scanned}</div>
      {/if}
    </div>
  </div>

  <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
    <div class="text-sm text-neutral-400">Quarantine</div>
    <div class="flex gap-2 mt-2">
      <input class="px-3 py-2 rounded bg-neutral-800" placeholder="thought_id" bind:value={qId} />
      <button class="px-3 py-2 rounded bg-yellow-700 hover:bg-yellow-600" on:click={doQuarantine}>Quarantine</button>
      <button class="px-3 py-2 rounded bg-green-700 hover:bg-green-600" on:click={doUnquarantine}>Unquarantine</button>
    </div>
  </div>

  <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
    <div class="text-sm text-neutral-400">Trash</div>
    <button class="mt-2 px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" on:click={loadTrash}>Refresh</button>
    <div class="space-y-2 mt-2">
      {#each trash as it}
        <div class="flex items-center justify-between text-sm bg-neutral-800 rounded p-2">
          <div class="truncate">{it.title}</div>
          <button class="px-2 py-1 rounded bg-green-700 hover:bg-green-600" on:click={() => doRestore(it.id)}>Restore</button>
        </div>
      {/each}
    </div>
  </div>
</div>


