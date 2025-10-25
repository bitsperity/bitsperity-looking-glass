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

<div class="flex-1 overflow-auto px-8 pb-8">
  <!-- Filters -->
  <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-6 mb-8 shadow-lg">
    <div class="flex items-center gap-3 mb-4">
      <span class="text-2xl">🔍</span>
      <h3 class="text-lg font-bold text-white">Filter & Suche</h3>
    </div>
    <div class="grid grid-cols-4 gap-4">
      <input
        type="text"
        placeholder="🔍 Run ID oder Agent suchen..."
        bind:value={searchQuery}
        class="px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-neutral-500"
      />
      <select
        bind:value={filterAgent}
        class="px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
      >
        <option value="">🤖 Alle Agents</option>
        {#each ['discovery', 'analyst_tech', 'validator'] as agent}
          <option value={agent}>{agent}</option>
        {/each}
      </select>
      <select
        bind:value={filterStatus}
        class="px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
      >
        <option value="">📊 Alle Status</option>
        <option value="success">✅ Success</option>
        <option value="error">❌ Error</option>
        <option value="running">⚙️ Running</option>
      </select>
      <select
        bind:value={filterDays}
        on:change={loadRuns}
        class="px-4 py-3 bg-neutral-900/70 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
      >
        <option value={1}>📅 Letzte 24h</option>
        <option value={7}>📅 Letzte 7 Tage</option>
        <option value={30}>📅 Letzte 30 Tage</option>
      </select>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-96">
      <div class="text-center">
        <div class="inline-block animate-spin text-5xl mb-4">⚙️</div>
        <div class="text-xl text-neutral-400 font-medium">Runs werden geladen...</div>
      </div>
    </div>
  {:else if error}
    <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border-2 border-red-600/50 rounded-xl p-6 shadow-lg shadow-red-900/30 flex items-center gap-3">
      <span class="text-3xl">⚠️</span>
      <div class="flex-1 text-red-300 text-lg">{error}</div>
    </div>
  {:else if filteredRuns.length === 0}
    <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-16 text-center shadow-lg">
      <div class="text-6xl mb-4 opacity-30">📭</div>
      <div class="text-2xl text-neutral-400 mb-2">Keine Runs gefunden</div>
      <div class="text-neutral-500">Versuche andere Filter-Einstellungen</div>
    </div>
  {:else}
    <!-- Runs Table -->
    <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-lg">
      <table class="w-full text-sm">
        <thead class="bg-gradient-to-r from-neutral-800 to-neutral-900 border-b-2 border-neutral-600">
          <tr>
            <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Agent</th>
            <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Status</th>
            <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Tokens</th>
            <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Cost</th>
            <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Created</th>
            <th class="px-6 py-4 text-left font-bold text-neutral-300 uppercase tracking-wide text-xs">Run ID</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-700/50">
          {#each filteredRuns as run, i}
            <tr
              on:click={() => goto(`/coalescence/runs/${run.id}`)}
              class="group hover:bg-gradient-to-r hover:from-blue-900/20 hover:to-transparent cursor-pointer transition-all duration-200 {i % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent'}"
            >
              <td class="px-6 py-4 font-bold text-white group-hover:text-blue-400 transition-colors">{run.agent}</td>
              <td class="px-6 py-4">
                <StatusBadge status={statusClass(run.status)} />
              </td>
              <td class="px-6 py-4 font-semibold text-blue-400">
                <TokenDisplay tokens={run.total_tokens} />
              </td>
              <td class="px-6 py-4 font-semibold text-emerald-400">
                <CostDisplay cost={run.cost_usd} showDetail={false} />
              </td>
              <td class="px-6 py-4 text-neutral-400 text-xs font-medium">{formatDate(run.created_at)}</td>
              <td class="px-6 py-4 text-neutral-400 font-mono text-xs">{run.id.substring(0, 8)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="mt-6 flex items-center justify-center gap-2 text-sm">
      <span class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-900/30 to-blue-800/20 border border-blue-700/30 rounded-lg text-blue-400 font-medium">
        <span class="text-lg">📊</span>
        Zeige {filteredRuns.length} von {runs.length} Runs
      </span>
    </div>
  {/if}
</div>

