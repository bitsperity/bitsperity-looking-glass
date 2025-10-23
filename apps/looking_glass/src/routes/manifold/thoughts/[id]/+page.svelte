<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { loadThought, saveThought, reembed } from '$lib/services/manifoldService';
  import { similar } from '$lib/api/manifold';

  let id = '';
  let item: any = null;
  let loading = true; let error: string | null = null; let saving = false;
  let sim: any[] = [];

  $: id = $page.params.id;

  async function load() {
    loading = true; error = null;
    try {
      item = await loadThought(id);
      const s = await similar(id, 10);
      sim = s.similar || [];
    } catch (e: any) { error = e?.message ?? 'Error'; }
    finally { loading = false; }
  }

  async function save() {
    saving = true;
    try { await saveThought({ ...item, id }); } finally { saving = false; }
  }

  async function doReembed() {
    await reembed(id);
  }

  onMount(load);
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Thought · {id}</h1>

  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {:else if error}
    <div class="text-red-400">{error}</div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <input class="px-3 py-2 rounded bg-neutral-800 w-full" bind:value={item.title} />
        <textarea class="px-3 py-2 rounded bg-neutral-800 w-full" rows="8" bind:value={item.content}></textarea>
        <div class="flex gap-2">
          <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" disabled={saving} on:click={save}>Save</button>
          <button class="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" on:click={doReembed}>Re-embed</button>
          <a class="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" href={`/manifold/relations/${id}`}>Relations</a>
          <a class="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700" href={`/manifold/promote/${id}`}>Promote</a>
        </div>
      </div>
      <div class="space-y-2">
        <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
          <div class="text-sm text-neutral-400">Meta</div>
          <div class="text-xs">type: {item.type}</div>
          <div class="text-xs">status: {item.status}</div>
          <div class="text-xs">confidence: {item.confidence_score}</div>
          <div class="text-xs">updated_at: {item.updated_at}</div>
        </div>
        <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
          <div class="text-sm text-neutral-400">Links</div>
          <div class="text-xs">ariadne_facts: {JSON.stringify(item.links?.ariadne_facts || [])}</div>
          <div class="text-xs">ariadne_entities: {JSON.stringify(item.links?.ariadne_entities || [])}</div>
          <div class="text-xs">related_thoughts: {JSON.stringify(item.links?.related_thoughts || [])}</div>
        </div>
        <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
          <div class="text-sm text-neutral-400 mb-1">Similar</div>
          <div class="space-y-1 max-h-[30vh] overflow-auto">
            {#each sim as s}
              <div class="text-sm flex items-center justify-between">
                <div class="truncate">{s.title}</div>
                <a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700" href={`/manifold/thoughts/${s.thought_id}`}>Open</a>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>


