<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchDashboard } from '$lib/services/manifoldService';
  import KpiCard from '$lib/components/manifold/KpiCard.svelte';
  import ManifoldNav from '$lib/components/manifold/ManifoldNav.svelte';

  let loading = true;
  let data: any = {};
  let error: string | null = null;

  onMount(async () => {
    try {
      data = await fetchDashboard();
    } catch (e: any) {
      error = e?.message ?? 'Error';
    } finally {
      loading = false;
    }
  });
</script>

<div class="p-6 space-y-6 h-full overflow-auto">
  <h1 class="text-2xl font-semibold">Manifold · Dashboard</h1>
  <ManifoldNav />

  {#if loading}
    <div class="text-neutral-400">Loading…</div>
  {:else if error}
    <div class="text-red-400">{error}</div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <KpiCard 
        title="Health" 
        value={data.health.status} 
        subtitle="Qdrant: {data.health.qdrant_connected ? 'connected' : 'down'} · Collection: {data.health.collection_name}"
        icon="✓"
      />

      <KpiCard 
        title="Device" 
        value={data.device.cuda_available ? '🚀 GPU' : 'CPU'} 
        subtitle="{data.device.gpu_name || 'CPU mode'} · {data.device.model_device}"
      />

      <KpiCard 
        title="Thoughts" 
        value={data.statsAll.total} 
        subtitle="Avg confidence: {Math.round((data.statsAll.avg_confidence ?? 0) * 100)}% · Validation rate: {Math.round((data.statsAll.validation_rate ?? 0) * 100)}%"
        icon="💭"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
        <div class="text-sm text-neutral-400 mb-2">By Type</div>
        <div class="space-y-1">
          {#each Object.entries(data.statsAll.by_type || {}) as [type, count]}
            <div class="flex justify-between text-sm">
              <span class="text-neutral-300">{type}</span>
              <span class="text-neutral-500">{count}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="bg-neutral-900 rounded p-4 border border-neutral-800">
        <div class="text-sm text-neutral-400 mb-2">By Status</div>
        <div class="space-y-1">
          {#each Object.entries(data.statsAll.by_status || {}) as [status, count]}
            <div class="flex justify-between text-sm">
              <span class="text-neutral-300">{status}</span>
              <span class="text-neutral-500">{count}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>


