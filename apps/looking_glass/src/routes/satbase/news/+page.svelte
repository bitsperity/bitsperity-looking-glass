<script lang="ts">
  import { onMount } from 'svelte';
  import { listNews, backfillBodies, type NewsItem } from '$lib/api/news';
  import NewsCard from '$lib/components/news/NewsCard.svelte';
  import Button from '$lib/components/shared/Button.svelte';
  import Input from '$lib/components/shared/Input.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  
  let items: NewsItem[] = [];
  let include_body = true;
  const today = new Date().toISOString().slice(0,10);
  const yest = new Date(Date.now() - 86400000*2).toISOString().slice(0,10);
  let from = yest; let to = today; let q = '';
  let tickers = '';
  let loading = false; let err: string | null = null;

  async function load() {
    loading = true; err = null;
    try {
      const res = await listNews({ from, to, q, tickers, limit: 100, include_body });
      items = res.items;
    } catch (e) {
      err = String(e);
    } finally { loading = false; }
  }

  async function fetchBodies() {
    try {
      await backfillBodies(from, to);
    } catch (e) {}
  }

  onMount(load);
</script>

<div class="max-w-5xl mx-auto space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-neutral-100">News Feed</h1>
      <p class="text-sm text-neutral-400 mt-1">Financial news from GDELT and RSS sources</p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant={items.length > 0 ? 'success' : 'secondary'}>{items.length} articles</Badge>
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-neutral-800/30 border border-neutral-700/50 rounded-xl p-5">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Input label="From" type="date" bind:value={from} />
      <Input label="To" type="date" bind:value={to} />
      <Input label="Search Query" placeholder="AI, chips, semiconductor" bind:value={q} />
      <Input label="Filter by Tickers" placeholder="NVDA, AAPL, MSFT" bind:value={tickers} />
    </div>
    
    <div class="flex items-center justify-between mt-4 pt-4 border-t border-neutral-700/50">
      <label class="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
        <input type="checkbox" bind:checked={include_body} class="rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-2 focus:ring-blue-500/50" />
        <span>Include article bodies</span>
      </label>
      
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" on:click={fetchBodies}>
          Fetch Bodies
        </Button>
        <Button variant="primary" size="sm" {loading} on:click={load}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
    </div>
  </div>

  <!-- Error -->
  {#if err}
    <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400">
      {err}
    </div>
  {/if}

  <!-- Loading State -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="flex flex-col items-center gap-3">
        <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-sm text-neutral-400">Loading news articles...</p>
      </div>
    </div>
  {/if}

  <!-- News Grid -->
  {#if !loading && items.length > 0}
    <div class="grid gap-4">
      {#each items as item (item.id)}
        <NewsCard {item} />
      {/each}
    </div>
  {:else if !loading && items.length === 0}
    <div class="flex flex-col items-center justify-center py-16 text-center">
      <svg class="w-16 h-16 text-neutral-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
      </svg>
      <h3 class="text-lg font-semibold text-neutral-300 mb-1">No articles found</h3>
      <p class="text-sm text-neutral-500">Try adjusting your filters or date range</p>
    </div>
  {/if}
</div>

