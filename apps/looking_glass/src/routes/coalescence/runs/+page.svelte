<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { coalescenceClient, type CoalescenceRun } from '$lib/coalescence-client';
  import StatusBadge from '$lib/components/coalescence/StatusBadge.svelte';
  import CostDisplay from '$lib/components/coalescence/CostDisplay.svelte';
  import TokenDisplay from '$lib/components/coalescence/TokenDisplay.svelte';

  let runs: CoalescenceRun[] = [];
  let filteredRuns: CoalescenceRun[] = [];
  let loading = true;
  let error: string | null = null;
  let searchQuery = '';
  let filterAgent = '';
  let filterStatus = '';
  let filterDays = 7;

  async function loadRuns() {
    try {
      loading = true;
      error = null;
      const result = await coalescenceClient.getRuns({
        days: filterDays,
        agent: filterAgent || undefined,
        status: filterStatus || undefined
      });
      runs = result.runs || [];
      applyFilters();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load runs';
    } finally {
      loading = false;
    }
  }

  function applyFilters() {
    filteredRuns = runs.filter((run) => {
      const matchesSearch = run.id.includes(searchQuery) || run.agent.includes(searchQuery);
      return matchesSearch;
    });
  }

  function formatDate(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleString();
  }

  function statusClass(status: string) {
    if (status === 'success') return 'success';
    if (status === 'error') return 'error';
    return 'running';
  }

  onMount(() => {
    loadRuns();
    const interval = setInterval(loadRuns, 10000);
    return () => clearInterval(interval);
  });

  $: {
    searchQuery;
    filterAgent;
    filterStatus;
    applyFilters();
  }
</script>

<div class="flex-1 overflow-auto px-6 pb-6">
  <!-- Filters -->
  <div class="bg-neutral-800 border border-neutral-700 rounded p-4 mb-6">
    <div class="grid grid-cols-4 gap-4">
      <input
        type="text"
        placeholder="Search run ID or agent..."
        bind:value={searchQuery}
        class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"
      />
      <select
        bind:value={filterAgent}
        class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"
      >
        <option value="">All Agents</option>
        {#each ['discovery', 'analyst_tech', 'validator'] as agent}
          <option value={agent}>{agent}</option>
        {/each}
      </select>
      <select
        bind:value={filterStatus}
        class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"
      >
        <option value="">All Status</option>
        <option value="success">Success</option>
        <option value="error">Error</option>
        <option value="running">Running</option>
      </select>
      <select
        bind:value={filterDays}
        on:change={loadRuns}
        class="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-sm focus:outline-none focus:border-blue-500"
      >
        <option value={1}>Last 24h</option>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
      </select>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-64 text-neutral-400">
      <div>Loading runs...</div>
    </div>
  {:else if error}
    <div class="text-red-400 py-8">{error}</div>
  {:else if filteredRuns.length === 0}
    <div class="text-neutral-400 py-8">No runs found</div>
  {:else}
    <!-- Runs Table -->
    <div class="border border-neutral-700 rounded overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-neutral-800 border-b border-neutral-700">
          <tr>
            <th class="px-4 py-3 text-left font-semibold">Agent</th>
            <th class="px-4 py-3 text-left font-semibold">Status</th>
            <th class="px-4 py-3 text-left font-semibold">Tokens</th>
            <th class="px-4 py-3 text-left font-semibold">Cost</th>
            <th class="px-4 py-3 text-left font-semibold">Created</th>
            <th class="px-4 py-3 text-left font-semibold">Run ID</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredRuns as run}
            <tr
              on:click={() => goto(`/coalescence/runs/${run.id}`)}
              class="border-b border-neutral-700 hover:bg-neutral-700/30 cursor-pointer transition-colors"
            >
              <td class="px-4 py-3 font-semibold">{run.agent}</td>
              <td class="px-4 py-3">
                <StatusBadge status={statusClass(run.status)} />
              </td>
              <td class="px-4 py-3">
                <TokenDisplay tokens={run.total_tokens} />
              </td>
              <td class="px-4 py-3">
                <CostDisplay cost={run.cost_usd} showDetail={false} />
              </td>
              <td class="px-4 py-3 text-neutral-400 text-xs">{formatDate(run.created_at)}</td>
              <td class="px-4 py-3 text-neutral-400 font-mono text-xs">{run.id.substring(0, 8)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="mt-4 text-sm text-neutral-400">
      Showing {filteredRuns.length} of {runs.length} runs
    </div>
  {/if}
</div>

