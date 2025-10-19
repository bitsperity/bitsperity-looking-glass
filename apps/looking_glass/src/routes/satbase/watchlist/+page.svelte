<script lang="ts">
  import { getWatchlist, postWatchlist, deleteWatchlist, getTopics, postTopics, deleteTopic } from '$lib/api/watchlist';
  import { onMount } from 'svelte';
  let wl: any[]=[]; let topics: any[]=[]; let symbols='NVDA,AAPL'; let ttl=7; let q='semiconductor'; let ttlq=2; let ingest=true;
  let err: string | null=null;
  async function load(){ try{ wl=await getWatchlist(); topics=await getTopics(); }catch(e){err=String(e);} }
  async function addW(){ try{ await postWatchlist({symbols: symbols.split(',').map(s=>s.trim()), ttl_days: ttl, ingest}); await load(); }catch(e){err=String(e);} }
  async function delW(s: string){ try{ await deleteWatchlist(s); await load(); }catch(e){err=String(e);} }
  async function addT(){ try{ await postTopics({queries:[q], ttl_days: ttlq, ingest}); await load(); }catch(e){err=String(e);} }
  async function delT(t: string){ try{ await deleteTopic(t); await load(); }catch(e){err=String(e);} }
  onMount(load);
</script>

<div class="space-y-6">
  <h2 class="text-xl font-semibold">Watchlist & Topics</h2>

  <div class="p-3 bg-neutral-800 rounded space-y-2">
    <div class="text-sm text-neutral-300">Watchlist</div>
    <div class="grid grid-cols-5 gap-2 items-end">
      <input class="bg-neutral-700 px-2 py-1 rounded col-span-2" bind:value={symbols} />
      <input class="bg-neutral-700 px-2 py-1 rounded" type="number" bind:value={ttl} />
      <label class="flex items-center space-x-2 text-sm"><input type="checkbox" bind:checked={ingest} /><span>ingest</span></label>
      <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" on:click={addW}>Add</button>
    </div>
    <div class="mt-2 space-y-1">
      {#each wl as it}
        <div class="flex justify-between text-sm bg-neutral-900 px-2 py-1 rounded">
          <span>{it.symbol} · ttl {it.ttl_days}</span>
          <button class="text-red-300" on:click={() => delW(it.symbol)}>delete</button>
        </div>
      {/each}
    </div>
  </div>

  <div class="p-3 bg-neutral-800 rounded space-y-2">
    <div class="text-sm text-neutral-300">News Topics</div>
    <div class="grid grid-cols-5 gap-2 items-end">
      <input class="bg-neutral-700 px-2 py-1 rounded col-span-2" bind:value={q} />
      <input class="bg-neutral-700 px-2 py-1 rounded" type="number" bind:value={ttlq} />
      <div></div>
      <button class="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600" on:click={addT}>Add</button>
    </div>
    <div class="mt-2 space-y-1">
      {#each topics as t}
        <div class="flex justify-between text-sm bg-neutral-900 px-2 py-1 rounded">
          <span>{t.query} · ttl {t.ttl_days}</span>
          <button class="text-red-300" on:click={() => delT(t.query)}>delete</button>
        </div>
      {/each}
    </div>
  </div>

  {#if err}<div class="text-red-400 text-sm">{err}</div>{/if}
</div>

