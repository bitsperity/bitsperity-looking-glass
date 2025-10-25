<script lang="ts">
  import { onMount } from 'svelte';
  import { coalescenceClient, type DashboardStats, type CoalescenceCostBreakdown } from '$lib/coalescence-client';
  import CostDisplay from '$lib/components/coalescence/CostDisplay.svelte';
  import TokenDisplay from '$lib/components/coalescence/TokenDisplay.svelte';

  let dashboard: DashboardStats | null = null;
  let loading = true;
  let error: string | null = null;
  let selectedDays = 7;

  async function loadData() {
    try {
      loading = true;
      error = null;
      dashboard = await coalescenceClient.getDashboard(selectedDays);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load cost data';
    } finally {
      loading = false;
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }

  onMount(() => {
    loadData();
  });
</script>

<div class="flex-1 overflow-auto px-6 pb-6">
  <!-- Header & Controls -->
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold">Cost Analytics</h1>
    <div class="flex items-center gap-2">
      <select
        bind:value={selectedDays}
        on:change={loadData}
        class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"
      >
        <option value={1}>Last 24h</option>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
      </select>
      <button
        on:click={loadData}
        class="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm transition-colors"
      >
        🔄 Refresh
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-64 text-neutral-400">
      <div>Loading cost data...</div>
    </div>
  {:else if error}
    <div class="text-red-400 py-8">{error}</div>
  {:else if dashboard}
    <!-- Summary Cards -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-neutral-800 border border-neutral-700 rounded p-4">
        <div class="text-xs text-neutral-400 mb-2">Total Cost</div>
        <div class="text-2xl font-bold">
          <CostDisplay cost={dashboard.total.cost} showDetail={false} />
        </div>
      </div>
      <div class="bg-neutral-800 border border-neutral-700 rounded p-4">
        <div class="text-xs text-neutral-400 mb-2">Total Tokens</div>
        <div class="text-2xl font-bold">
          <TokenDisplay tokens={dashboard.total.tokens} />
        </div>
      </div>
      <div class="bg-neutral-800 border border-neutral-700 rounded p-4">
        <div class="text-xs text-neutral-400 mb-2">Total Runs</div>
        <div class="text-2xl font-bold">{dashboard.total.runs}</div>
      </div>
      <div class="bg-neutral-800 border border-neutral-700 rounded p-4">
        <div class="text-xs text-neutral-400 mb-2">Agents Active</div>
        <div class="text-2xl font-bold">{dashboard.total.agents}</div>
      </div>
    </div>

    <!-- By Agent -->
    <div class="bg-neutral-800 border border-neutral-700 rounded p-6 mb-6">
      <h2 class="text-xl font-bold mb-4">Cost by Agent</h2>
      <div class="space-y-3">
        {#each Object.entries(dashboard.byAgent) as [agentName, stats]}
          <div class="flex items-center justify-between p-3 bg-neutral-900/50 rounded">
            <div class="flex-1">
              <div class="font-semibold">{agentName}</div>
              <div class="text-xs text-neutral-400">{stats.runs} runs · {stats.tokens.toLocaleString()} tokens</div>
            </div>
            <div class="text-right">
              <div class="font-semibold"><CostDisplay cost={stats.cost} showDetail={false} /></div>
              {#if stats.lastRun}
                <div class="text-xs text-neutral-400">{formatDate(stats.lastRun)}</div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- By Date -->
    <div class="bg-neutral-800 border border-neutral-700 rounded p-6">
      <h2 class="text-xl font-bold mb-4">Cost Timeline</h2>
      <div class="space-y-2">
        {#each dashboard.byDate as day}
          <div class="flex items-center justify-between p-3 bg-neutral-900/50 rounded">
            <div class="flex-1">
              <div class="font-semibold">{formatDate(day.date)}</div>
              <div class="text-xs text-neutral-400">{day.runs} runs · {day.tokens.toLocaleString()} tokens</div>
            </div>
            <div class="font-semibold"><CostDisplay cost={day.cost} showDetail={false} /></div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
