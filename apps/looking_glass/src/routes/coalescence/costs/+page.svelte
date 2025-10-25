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

<div class="flex-1 overflow-auto px-8 pb-8">
  <!-- Header & Controls -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white flex items-center gap-3 mb-2">
        <span class="text-4xl">💰</span>
        Cost Analytics
      </h1>
      <p class="text-neutral-400">Detaillierte Kostenübersicht und Analyse</p>
    </div>
    <div class="flex items-center gap-3">
      <select
        bind:value={selectedDays}
        on:change={loadData}
        class="px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
      >
        <option value={1}>📅 Letzte 24h</option>
        <option value={7}>📅 Letzte 7 Tage</option>
        <option value={30}>📅 Letzte 30 Tage</option>
      </select>
      <button
        on:click={loadData}
        class="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
      >
        <span>🔄</span>
        Aktualisieren
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-96">
      <div class="text-center">
        <div class="inline-block animate-spin text-5xl mb-4">💰</div>
        <div class="text-xl text-neutral-400 font-medium">Kostendaten werden geladen...</div>
      </div>
    </div>
  {:else if error}
    <div class="bg-gradient-to-r from-red-900/40 to-red-800/30 border-2 border-red-600/50 rounded-xl p-6 shadow-lg shadow-red-900/30 flex items-center gap-3">
      <span class="text-3xl">⚠️</span>
      <div class="flex-1 text-red-300 text-lg">{error}</div>
    </div>
  {:else if dashboard}
    <!-- Summary Cards -->
    <div class="grid grid-cols-4 gap-6 mb-10">
      <div class="group relative bg-gradient-to-br from-emerald-900/40 to-neutral-800 border border-emerald-700/30 rounded-xl p-6 shadow-lg hover:shadow-emerald-500/20 hover:border-emerald-600/50 transition-all duration-300">
        <div class="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-30 transition-opacity">💵</div>
        <div class="text-sm font-medium text-emerald-400 mb-3 uppercase tracking-wide">Gesamtkosten</div>
        <div class="text-4xl font-bold mb-2 text-white">
          <CostDisplay cost={dashboard.total.cost} showDetail={false} />
        </div>
        <div class="text-xs text-neutral-400">{selectedDays} Tage</div>
      </div>
      
      <div class="group relative bg-gradient-to-br from-blue-900/40 to-neutral-800 border border-blue-700/30 rounded-xl p-6 shadow-lg hover:shadow-blue-500/20 hover:border-blue-600/50 transition-all duration-300">
        <div class="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-30 transition-opacity">⚡</div>
        <div class="text-sm font-medium text-blue-400 mb-3 uppercase tracking-wide">Tokens Verbraucht</div>
        <div class="text-4xl font-bold mb-2 text-white">
          <TokenDisplay tokens={dashboard.total.tokens} />
        </div>
        <div class="text-xs text-neutral-400">
          Ø {Math.round(dashboard.total.tokens / (dashboard.total.runs || 1)).toLocaleString()} / Run
        </div>
      </div>
      
      <div class="group relative bg-gradient-to-br from-purple-900/40 to-neutral-800 border border-purple-700/30 rounded-xl p-6 shadow-lg hover:shadow-purple-500/20 hover:border-purple-600/50 transition-all duration-300">
        <div class="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-30 transition-opacity">🏃</div>
        <div class="text-sm font-medium text-purple-400 mb-3 uppercase tracking-wide">Total Runs</div>
        <div class="text-4xl font-bold mb-2 text-white">{dashboard.total.runs}</div>
        <div class="text-xs text-neutral-400">
          Ø ${(dashboard.total.cost / (dashboard.total.runs || 1)).toFixed(4)} / Run
        </div>
      </div>
      
      <div class="group relative bg-gradient-to-br from-amber-900/40 to-neutral-800 border border-amber-700/30 rounded-xl p-6 shadow-lg hover:shadow-amber-500/20 hover:border-amber-600/50 transition-all duration-300">
        <div class="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-30 transition-opacity">🤖</div>
        <div class="text-sm font-medium text-amber-400 mb-3 uppercase tracking-wide">Aktive Agents</div>
        <div class="text-4xl font-bold mb-2 text-white">{Object.keys(dashboard.byAgent).length}</div>
        <div class="text-xs text-neutral-400">{dashboard.total.agents} konfiguriert</div>
      </div>
    </div>

    <!-- By Agent -->
    <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-8 mb-8 shadow-lg">
      <h2 class="text-2xl font-bold mb-6 text-white flex items-center gap-3">
        <span>📊</span>
        Kosten pro Agent
      </h2>
      {#if Object.keys(dashboard.byAgent).length === 0}
        <div class="text-center py-12 text-neutral-400">
          <div class="text-5xl mb-4 opacity-30">📭</div>
          <p>Noch keine Kosten aufgezeichnet</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each Object.entries(dashboard.byAgent).sort((a, b) => b[1].cost - a[1].cost) as [agentName, stats]}
            {@const percentage = (stats.cost / dashboard.total.cost) * 100}
            <div class="bg-neutral-900/50 border border-neutral-700/50 rounded-lg p-5 hover:border-blue-500/50 transition-all">
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <div class="font-bold text-lg text-white mb-1">{agentName}</div>
                  <div class="text-sm text-neutral-400 flex items-center gap-4">
                    <span>🏃 {stats.runs} Runs</span>
                    <span>⚡ {stats.tokens.toLocaleString()} Tokens</span>
                    {#if stats.lastRun}
                      <span>🕒 {formatDate(stats.lastRun)}</span>
                    {/if}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold text-emerald-400">
                    <CostDisplay cost={stats.cost} showDetail={false} />
                  </div>
                  <div class="text-xs text-neutral-500">{percentage.toFixed(1)}% des Gesamt</div>
                </div>
              </div>
              
              <!-- Visual Bar -->
              <div class="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                  style="width: {percentage}%"
                />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- By Date -->
    <div class="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-xl p-8 shadow-lg">
      <h2 class="text-2xl font-bold mb-6 text-white flex items-center gap-3">
        <span>📈</span>
        Cost Timeline
      </h2>
      {#if dashboard.byDate.length === 0}
        <div class="text-center py-12 text-neutral-400">
          <div class="text-5xl mb-4 opacity-30">📅</div>
          <p>Keine Daten für diesen Zeitraum</p>
        </div>
      {:else}
        {@const maxCost = Math.max(...dashboard.byDate.map(d => d.cost))}
        <div class="space-y-3">
          {#each dashboard.byDate.reverse() as day}
            {@const barWidth = maxCost > 0 ? (day.cost / maxCost) * 100 : 0}
            <div class="bg-neutral-900/50 border border-neutral-700/50 rounded-lg p-5 hover:border-blue-500/50 transition-all">
              <div class="flex items-center justify-between mb-3">
                <div class="flex-1">
                  <div class="font-bold text-white mb-1">{formatDate(day.date)}</div>
                  <div class="text-sm text-neutral-400 flex items-center gap-4">
                    <span>🏃 {day.runs} Runs</span>
                    <span>⚡ {day.tokens.toLocaleString()} Tokens</span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-bold text-blue-400">
                    <CostDisplay cost={day.cost} showDetail={false} />
                  </div>
                  <div class="text-xs text-neutral-500">
                    ${(day.cost / (day.runs || 1)).toFixed(4)} / Run
                  </div>
                </div>
              </div>
              
              <!-- Visual Bar -->
              <div class="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  class="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                  style="width: {barWidth}%"
                />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
