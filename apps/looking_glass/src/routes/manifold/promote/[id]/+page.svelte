<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { promote, syncAriadne } from '$lib/api/manifold';

  let id = '';
  let payload: any = null; let loading = true; let error: string | null = null;
  let auto_mark = true;
  let syncStatus: string | null = null;

  $: id = $page.params.id;

  async function load() {
    loading = true; error = null; payload = null;
    try { const res = await promote(id, { auto_mark }); payload = res.kg_payload; }
    catch (e: any) { error = e?.message ?? 'Error'; }
    finally { loading = false; }
  }

  async function doSync() {
    const res = await syncAriadne({ thought_id: id, status: 'validated', ariadne_fact_id: 'demo-fact-1', ariadne_entity_ids: [] });
    syncStatus = res.status;
  }

  onMount(load);
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Promote · {id}</h1>

  <div class="flex items-center gap-2">
    <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={auto_mark} /> auto_mark</label>
    <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" on:click={load}>Prepare</button>
  </div>

  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {:else if error}
    <div class="text-red-400">{error}</div>
  {:else if payload}
    <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
      <pre class="text-xs overflow-auto">{JSON.stringify(payload, null, 2)}</pre>
    </div>
    <button class="px-3 py-2 rounded bg-green-700 hover:bg-green-600" on:click={doSync}>Sync back (demo)</button>
    {#if syncStatus}
      <div class="text-sm text-neutral-400">{syncStatus}</div>
    {/if}
  {/if}
</div>


