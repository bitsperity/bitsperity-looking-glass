<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCurrentRegimes, fetchSimilarRegimes } from '$lib/services/ariadneService';
  import RegimeCard from '$lib/components/ariadne/RegimeCard.svelte';
  import type { Regime } from '$lib/types/ariadne';

  let loading = false;
  let currentRegimes: Regime[] = [];
  let similarRegimes: Regime[] = [];
  let characteristicsInput = '';
  let similarLimit = 5;

  async function loadCurrent() {
    loading = true;
    try {
      const result = await fetchCurrentRegimes();
      currentRegimes = result.regimes;
    } finally {
      loading = false;
    }
  }

  async function searchSimilar() {
    if (!characteristicsInput) return;

    loading = true;
    try {
      const characteristics = characteristicsInput.split(',').map((c) => c.trim()).filter((c) => c);
      const result = await fetchSimilarRegimes({ characteristics, limit: similarLimit });
      similarRegimes = result.regimes;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadCurrent();
  });
</script>

<div class="max-w-7xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Market Regimes</h1>

  <!-- Current Regimes -->
  <div class="mb-8">
    <h2 class="text-xl font-semibold text-neutral-200 mb-3">Current Regimes</h2>
    {#if loading && currentRegimes.length === 0}
      <div class="text-neutral-400">Loading...</div>
    {:else if currentRegimes.length === 0}
      <div class="text-neutral-400">No current regimes found</div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each currentRegimes as regime}
          <RegimeCard {regime} />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Similar Regimes Search -->
  <div>
    <h2 class="text-xl font-semibold text-neutral-200 mb-3">Find Similar Historical Regimes</h2>
    <div class="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Characteristics (comma-separated)</label>
        <input
          type="text"
          bind:value={characteristicsInput}
          placeholder="e.g., high_vol, bear, rate_uncertainty"
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Limit</label>
        <input
          type="number"
          bind:value={similarLimit}
          min="1"
          max="20"
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>
    </div>

    <button
      on:click={searchSimilar}
      class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white mb-6"
    >
      Search Similar
    </button>

    {#if similarRegimes.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each similarRegimes as regime}
          <RegimeCard {regime} />
        {/each}
      </div>
    {/if}
  </div>
</div>

