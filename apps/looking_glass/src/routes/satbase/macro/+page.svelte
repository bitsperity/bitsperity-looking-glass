<script lang="ts">
  import { getSeries } from '$lib/api/macro';
  import { onMount } from 'svelte';
  let series_id = 'CPIAUCSL';
  const today = new Date().toISOString().slice(0,10);
  const yest = new Date(Date.now() - 86400000*365).toISOString().slice(0,10);
  let from = yest; let to = today;
  let items: any[] = [];
  let loading = false; let err: string | null = null;
  async function load() {
    loading = true; err = null;
    try { items = (await getSeries(series_id, from, to)).items; } catch(e){ err=String(e); } finally { loading=false; }
  }
  onMount(load);
</script>

<div class="space-y-4">
  <h2 class="text-xl font-semibold">Macro (FRED)</h2>
  <div class="grid grid-cols-6 gap-2 items-end">
    <div class="col-span-2">
      <label class="text-xs text-neutral-400">Series ID</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" bind:value={series_id} />
    </div>
    <div>
      <label class="text-xs text-neutral-400">From</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" type="date" bind:value={from} />
    </div>
    <div>
      <label class="text-xs text-neutral-400">To</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" type="date" bind:value={to} />
    </div>
    <div class="flex justify-end col-span-2">
      <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" on:click={load}>Load</button>
    </div>
  </div>

  {#if err}
    <div class="text-red-400 text-sm">{err}</div>
  {/if}
  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {/if}
  <div class="p-3 bg-neutral-800 rounded text-sm text-neutral-300">{items.length} points</div>
</div>

