<script lang="ts">
  import { onMount } from 'svelte';
  import { search } from '$lib/api/manifold';
  import { saveThought, softDeleteThought } from '$lib/services/manifoldService';
  import ThoughtCard from '$lib/components/manifold/ThoughtCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';
  import { goto } from '$app/navigation';

  let items: any[] = [];
  let loading = false; let error: string | null = null;

  let form = {
    type: 'observation',
    title: '',
    content: '',
    tickers: [] as string[]
  };

  async function load() {
    loading = true; error = null;
    try {
      const resp = await search({ query: '', limit: 100 });
      items = (resp.results || []).map((r: any) => r.thought);
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally { loading = false; }
  }

  async function create() {
    await saveThought({ ...form });
    form = { type: 'observation', title: '', content: '', tickers: [] };
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this thought?')) return;
    await softDeleteThought(id);
    await load();
  }

  function openThought(id: string) {
    goto(`/manifold/thoughts/${id}`);
  }

  onMount(load);
</script>

<div class="p-6 space-y-4 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Manifold · Thoughts</h1>
  <ManifoldNav />

  <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
    <div class="text-sm text-neutral-400 mb-2">Create Thought</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <select class="px-3 py-2 rounded bg-neutral-800" bind:value={form.type}>
        <option value="observation">observation</option>
        <option value="hypothesis">hypothesis</option>
        <option value="analysis">analysis</option>
        <option value="decision">decision</option>
        <option value="reflection">reflection</option>
        <option value="question">question</option>
      </select>
      <input class="px-3 py-2 rounded bg-neutral-800" placeholder="Title" bind:value={form.title} />
      <textarea class="px-3 py-2 rounded bg-neutral-800 md:col-span-2" rows="4" placeholder="Content" bind:value={form.content} />
    </div>
    <button class="mt-3 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" on:click={create}>Create</button>
  </div>

  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {:else if error}
    <div class="text-red-400">{error}</div>
  {:else}
    <div class="text-sm text-neutral-400 mb-2">{items.length} thoughts</div>
    <div class="space-y-2">
      {#each items as it}
        <ThoughtCard thought={it} onOpen={openThought} onDelete={remove} />
      {/each}
    </div>
  {/if}
</div>


