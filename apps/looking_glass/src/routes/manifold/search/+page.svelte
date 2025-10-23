<script lang="ts">
  import { onMount } from 'svelte';
  import { runSearch } from '$lib/services/manifoldService';
  import ThoughtCard from '$lib/components/manifold/ThoughtCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';

  let q = '';
  let results: any[] = [];
  let loading = false;
  let error: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function doSearch() {
    loading = true; error = null; results = [];
    try {
      const resp = await runSearch({ query: q, facets: ['type', 'tickers', 'status'], limit: 50 });
      results = resp.results || [];
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  }

  function handleInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(), 400);
  }

  onMount(() => { doSearch(); });
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Manifold · Search</h1>
  <ManifoldNav />

  <div class="flex gap-2">
    <input 
      class="px-3 py-2 rounded bg-neutral-800 w-full" 
      placeholder="Search thoughts… (type to search, Enter to force)" 
      bind:value={q} 
      on:input={handleInput}
      on:keydown={(e) => e.key==='Enter' && doSearch()} 
    />
    <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" on:click={doSearch}>Search</button>
  </div>

  {#if loading}
    <div class="text-neutral-400">Searching…</div>
  {:else if error}
    <div class="text-red-400">{error}</div>
  {:else}
    <div class="text-sm text-neutral-400 mb-2">{results.length} results</div>
    <div class="space-y-2">
      {#each results as r}
        <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
          <ThoughtCard thought={r.thought} showActions={false} />
          <div class="mt-2 flex items-center justify-between">
            <div class="text-xs text-neutral-500">Score: {r.score.toFixed(3)}</div>
            <a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" href={`/manifold/thoughts/${r.id}`}>Open</a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>


