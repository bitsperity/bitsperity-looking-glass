<script lang="ts">
  import { getPricesMulti } from '$lib/api/prices';
  import { onMount } from 'svelte';
  let tickers = 'NVDA,AAPL';
  const today = new Date().toISOString().slice(0,10);
  const yest = new Date(Date.now() - 86400000*5).toISOString().slice(0,10);
  let from = yest; let to = today; let btc_view = false;
  let series: Record<string, any[]> = {};
  let loading = false; let err: string | null = null;

  async function load() {
    loading = true; err = null;
    try {
      const res = await getPricesMulti(tickers.split(',').map(s=>s.trim()).filter(Boolean), from, to, btc_view);
      series = res.series;
    } catch (e) {
      err = String(e);
    } finally { loading = false; }
  }
  onMount(load);
</script>

<div class="space-y-4">
  <h2 class="text-xl font-semibold">Prices</h2>
  <div class="grid grid-cols-6 gap-2 items-end">
    <div class="col-span-2">
      <label class="text-xs text-neutral-400">Tickers</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" bind:value={tickers} />
    </div>
    <div>
      <label class="text-xs text-neutral-400">From</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" type="date" bind:value={from} />
    </div>
    <div>
      <label class="text-xs text-neutral-400">To</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" type="date" bind:value={to} />
    </div>
    <div class="flex items-center space-x-2">
      <input id="btc" type="checkbox" bind:checked={btc_view} />
      <label for="btc" class="text-sm">BTC view</label>
    </div>
    <div class="flex justify-end">
      <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" on:click={load}>Load</button>
    </div>
  </div>

  {#if err}
    <div class="text-red-400 text-sm">{err}</div>
  {/if}
  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {/if}
  <div class="space-y-2">
    {#each Object.keys(series) as t}
      <div class="p-3 bg-neutral-800 rounded">
        <div class="text-sm text-neutral-400 mb-1">{t}</div>
        <div class="text-xs text-neutral-300">{series[t].length} bars from {from} to {to}</div>
      </div>
    {/each}
  </div>
</div>

