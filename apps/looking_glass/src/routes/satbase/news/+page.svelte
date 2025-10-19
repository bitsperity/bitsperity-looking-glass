<script lang="ts">
  import { onMount } from 'svelte';
  import { listNews, backfillBodies, type NewsItem } from '$lib/api/news';
  let items: NewsItem[] = [];
  let include_body = true;
  const today = new Date().toISOString().slice(0,10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  let from = yest; let to = today; let q = '';
  let tickers = '';
  let loading = false; let err: string | null = null;

  async function load() {
    loading = true; err = null;
    try {
      const res = await listNews({ from, to, q, tickers, limit: 50, include_body });
      items = res.items;
    } catch (e) {
      err = String(e);
    } finally { loading = false; }
  }

  async function fetchBodies() {
    try {
      const job = await backfillBodies(from, to);
      // UI: simple notice, bodies will appear on next load
    } catch (e) {}
  }

  onMount(load);
</script>

<div class="space-y-4">
  <h2 class="text-xl font-semibold">News</h2>
  <div class="grid grid-cols-6 gap-2 items-end">
    <div>
      <label class="text-xs text-neutral-400">From</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" type="date" bind:value={from} />
    </div>
    <div>
      <label class="text-xs text-neutral-400">To</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" type="date" bind:value={to} />
    </div>
    <div>
      <label class="text-xs text-neutral-400">Query</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" placeholder="chips, nvidia" bind:value={q} />
    </div>
    <div>
      <label class="text-xs text-neutral-400">Tickers</label>
      <input class="w-full bg-neutral-800 px-2 py-1 rounded" placeholder="NVDA,AAPL" bind:value={tickers} />
    </div>
    <div class="flex items-center space-x-2">
      <input id="cb" type="checkbox" bind:checked={include_body} />
      <label for="cb" class="text-sm">include body</label>
    </div>
    <div class="flex space-x-2 justify-end">
      <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" on:click={load}>Load</button>
      <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" on:click={fetchBodies}>Fetch Bodies</button>
    </div>
  </div>

  {#if err}
    <div class="text-red-400 text-sm">{err}</div>
  {/if}
  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {/if}
  <div class="space-y-2">
    {#each items as it}
      <div class="p-3 bg-neutral-800 rounded">
        <div class="text-sm text-neutral-400">{it.source} · {it.published_at}</div>
        <a class="text-lg hover:underline" href={it.url} target="_blank" rel="noreferrer">{it.title}</a>
        {#if include_body && (it.content_text || it.content_html)}
          <div class="text-sm text-neutral-300 mt-1 line-clamp-3">{it.content_text ?? ''}</div>
        {:else}
          <div class="text-sm text-neutral-500 mt-1">(no body)</div>
        {/if}
        {#if it.tickers?.length}
          <div class="text-xs text-neutral-400 mt-1">{it.tickers.join(', ')}</div>
        {/if}
      </div>
    {/each}
  </div>
</div>

