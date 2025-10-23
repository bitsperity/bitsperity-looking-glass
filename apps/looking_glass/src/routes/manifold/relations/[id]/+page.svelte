<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getRelated, linkRelated, unlinkRelated } from '$lib/api/manifold';

  let id = '';
  let data: any = null;
  let relatedId = '';
  let loading = false; let error: string | null = null;
  $: id = $page.params.id;

  async function load() {
    loading = true; error = null;
    try { data = await getRelated(id); } catch (e: any) { error = e?.message ?? 'Error'; }
    finally { loading = false; }
  }

  async function addLink() {
    await linkRelated(id, relatedId);
    relatedId = '';
    await load();
  }

  async function removeLink(rid: string) {
    await unlinkRelated(id, rid);
    await load();
  }

  onMount(load);
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Relations · {id}</h1>

  <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
    <div class="text-sm text-neutral-400">Add relation</div>
    <div class="flex gap-2 mt-2">
      <input class="px-3 py-2 rounded bg-neutral-800" placeholder="related_id" bind:value={relatedId} />
      <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" on:click={addLink}>Link</button>
    </div>
  </div>

  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {:else if error}
    <div class="text-red-400">{error}</div>
  {:else if data}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
        <div class="text-sm text-neutral-400">Outgoing</div>
        <ul class="mt-2 space-y-1">
          {#each data.outgoing as edge}
            <li class="flex justify-between text-sm">
              <span>{edge.to_id}</span>
              <button class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700" on:click={() => removeLink(edge.to_id)}>Remove</button>
            </li>
          {/each}
        </ul>
      </div>
      <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
        <div class="text-sm text-neutral-400">Incoming</div>
        <ul class="mt-2 space-y-1">
          {#each data.incoming as edge}
            <li class="text-sm">{edge.from_id}</li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</div>


