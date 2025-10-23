<script lang="ts">
  import { onMount } from 'svelte';
  import { getThought, similar } from '$lib/api/manifold';

  export let thoughtId: string | null = null;
  export let onClose: (() => void) | null = null;

  let item: any = null;
  let sims: any[] = [];
  let loading = false;

  async function load() {
    if (!thoughtId) return;
    loading = true;
    try {
      item = await getThought(thoughtId);
      const s = await similar(thoughtId, 5);
      sims = s.similar || [];
    } finally {
      loading = false;
    }
  }

  function close() { onClose && onClose(); }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  $: thoughtId, load();
  onMount(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); });
</script>

{#if thoughtId}
  <button class="fixed inset-0 bg-black/60 z-50" aria-label="Close" on:click={close}></button>
  <div role="dialog" aria-modal="true" class="fixed right-0 top-0 h-full w-full md:w-[720px] bg-neutral-950 z-50 border-l border-neutral-800 overflow-auto" on:click|stopPropagation>
    <div class="p-4 border-b border-neutral-800 flex items-center justify-between">
      <div class="text-lg font-semibold">Thought Preview</div>
      <button class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800" on:click={close}>Close</button>
    </div>
    <div class="p-4 space-y-3">
      {#if loading}
        <div class="text-neutral-400">Loading…</div>
      {:else if item}
        <div>
          <div class="text-sm text-neutral-400">{item.type} · {item.status}</div>
          <div class="text-xl font-semibold">{item.title}</div>
          {#if item.tickers?.length}
            <div class="mt-1 flex flex-wrap gap-1">{#each item.tickers as t}<span class="text-xs bg-neutral-800 rounded px-2 py-0.5">{t}</span>{/each}</div>
          {/if}
        </div>
        <div class="text-sm whitespace-pre-wrap">{item.content}</div>
        <div class="grid grid-cols-2 gap-2">
          <div class="text-xs text-neutral-400">confidence: {Math.round((item.confidence_score||0)*100)}%</div>
          <div class="text-xs text-neutral-400">timeframe: {item.timeframe || '-'}</div>
        </div>
        {#if item.tags?.length}
          <div>
            <div class="text-xs text-neutral-500 mb-1">Tags</div>
            <div class="flex gap-1 flex-wrap">{#each item.tags as tg}<span class="text-xs bg-neutral-800 rounded px-2 py-0.5">{tg}</span>{/each}</div>
          </div>
        {/if}
        {#if sims.length}
          <div>
            <div class="text-xs text-neutral-500 mb-1">Similar</div>
            <div class="space-y-1">
              {#each sims as s}
                <div class="flex items-center justify-between text-sm">
                  <div class="truncate">{s.title}</div>
                  <a class="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800" href={`/manifold/thoughts/${s.thought_id}`}>Open</a>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        <div class="flex gap-2">
          <a class="px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800" href={`/manifold/thoughts/${thoughtId}`}>Open full</a>
          <a class="px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800" href={`/manifold/relations/${thoughtId}`}>Relations</a>
          <a class="px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800" href={`/manifold/promote/${thoughtId}`}>Promote</a>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(body) { overflow: auto; }
</style>


