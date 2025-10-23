<script lang="ts">
  import { onMount } from 'svelte';
  import { timeline } from '$lib/api/manifold';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';

  let type = '';
  let tickers = '';
  let from_dt = '';
  let to_dt = '';
  let data: any = null;
  let loading = false;
  let error: string | null = null;

  async function load() {
    loading = true; error = null; data = null;
    try {
      data = await timeline({ type: type || undefined, tickers: tickers || undefined, from_dt: from_dt || undefined, to_dt: to_dt || undefined });
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  }

  onMount(load);
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Manifold · Timeline</h1>
  <ManifoldNav />

  <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
    <input class="px-3 py-2 rounded bg-neutral-800" placeholder="type (optional)" bind:value={type} />
    <input class="px-3 py-2 rounded bg-neutral-800" placeholder="tickers (comma)" bind:value={tickers} />
    <input class="px-3 py-2 rounded bg-neutral-800" placeholder="from_dt (ISO)" bind:value={from_dt} />
    <input class="px-3 py-2 rounded bg-neutral-800" placeholder="to_dt (ISO)" bind:value={to_dt} />
  </div>
  <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" on:click={load}>Apply</button>

  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {:else if error}
    <div class="text-red-400">{error}</div>
  {:else if data}
    <div class="space-y-4">
      <div class="text-sm text-neutral-400">{Object.keys(data.bucketed || {}).length} days</div>
      <div class="space-y-2 max-h-[60vh] overflow-auto">
        {#each Object.entries(data.bucketed || {}) as [day, items]}
          <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
            <div class="text-sm text-neutral-400">{day}</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {#each items as it}
                <div class="text-sm">
                  <div class="text-xs text-neutral-400">{it.type} · {it.status}</div>
                  <div class="font-semibold">{it.title}</div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>


