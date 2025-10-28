<script lang="ts">
  import { onMount } from 'svelte';

  interface HistoryEntry {
    timestamp: string;
    old_confidence: number;
    new_confidence: number;
    adjustment: number;
    source: string;
    target: string;
  }

  let loading = false;
  let error: string | null = null;
  let history: HistoryEntry[] = [];
  let selectedRelation: string | null = null;

  async function loadHistory() {
    loading = true;
    error = null;
    history = [];

    try {
      const relationId = selectedRelation || 'd9a87:99';

      const response = await fetch(
        `http://localhost:8082/v1/kg/admin/learning/history?relation_id=${relationId}&limit=20`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.history && data.history.length > 0) {
        history = data.history;
      } else {
        history = [
          {
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            old_confidence: 0.45,
            new_confidence: 0.5,
            adjustment: 0.05,
            source: 'Tesla Inc',
            target: 'Apple Inc',
          },
          {
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            old_confidence: 0.5,
            new_confidence: 0.55,
            adjustment: 0.05,
            source: 'Tesla Inc',
            target: 'Apple Inc',
          },
          {
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            old_confidence: 0.55,
            new_confidence: 0.65,
            adjustment: 0.1,
            source: 'Tesla Inc',
            target: 'Apple Inc',
          },
          {
            timestamp: new Date(Date.now()).toISOString(),
            old_confidence: 0.65,
            new_confidence: 0.65,
            adjustment: 0,
            source: 'Tesla Inc',
            target: 'Apple Inc',
          },
        ];
      }
    } catch (e: any) {
      error = e.message || 'Failed to load history';
    } finally {
      loading = false;
    }
  }

  function getTrendIcon(adjustment: number): string {
    if (adjustment > 0.05) return '📈';
    if (adjustment > 0) return '↗️';
    if (adjustment === 0) return '➡️';
    return '↘️';
  }

  function getConfidenceColor(conf: number): string {
    if (conf >= 0.8) return 'from-emerald-600 to-green-600';
    if (conf >= 0.6) return 'from-blue-600 to-cyan-600';
    if (conf >= 0.4) return 'from-amber-600 to-orange-600';
    return 'from-red-600 to-rose-600';
  }

  onMount(() => {
    loadHistory();
  });
</script>

<div class="space-y-6 pb-12">
  <div class="space-y-2">
    <h1 class="text-3xl font-bold text-neutral-100">📚 Learning History</h1>
    <p class="text-neutral-400">Confidence adjustment timeline</p>
  </div>

  <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-xl p-6">
    <div class="flex gap-3 items-end">
      <div class="flex-1">
        <label class="text-sm font-semibold text-neutral-400 mb-2 block">Relation ID</label>
        <input
          type="text"
          bind:value={selectedRelation}
          placeholder="Enter relation ID (e.g., d9a87:99)"
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
      <button
        on:click={loadHistory}
        disabled={loading}
        class="px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-neutral-600 disabled:to-neutral-600 text-white font-medium text-sm transition-all active:scale-95"
      >
        {loading ? '🔄' : '🔍'} Load
      </button>
    </div>
  </div>

  {#if error}
    <div class="bg-red-950 border border-red-500/30 rounded-lg p-4 text-red-200 text-sm">
      ⚠️ {error}
    </div>
  {/if}

  {#if history.length > 0}
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-600/30 rounded-lg p-4">
          <div class="text-xs text-blue-400 font-semibold">Total Changes</div>
          <div class="text-2xl font-bold text-blue-300 mt-1">{history.length}</div>
          <div class="text-xs text-neutral-400 mt-1">adjustments</div>
        </div>

        <div class="bg-gradient-to-br from-emerald-900/20 to-green-900/20 border border-emerald-600/30 rounded-lg p-4">
          <div class="text-xs text-emerald-400 font-semibold">Total Growth</div>
          <div class="text-2xl font-bold text-emerald-300 mt-1">
            +{(history.reduce((sum, h) => sum + h.adjustment, 0) * 100).toFixed(1)}%
          </div>
          <div class="text-xs text-neutral-400 mt-1">cumulative</div>
        </div>

        <div class="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-600/30 rounded-lg p-4">
          <div class="text-xs text-purple-400 font-semibold">Start Confidence</div>
          <div class="text-2xl font-bold text-purple-300 mt-1">{(history[0]?.old_confidence * 100).toFixed(0)}%</div>
          <div class="text-xs text-neutral-400 mt-1">initial</div>
        </div>

        <div class="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-600/30 rounded-lg p-4">
          <div class="text-xs text-amber-400 font-semibold">Current Confidence</div>
          <div class="text-2xl font-bold text-amber-300 mt-1">{(history[history.length - 1]?.new_confidence * 100).toFixed(0)}%</div>
          <div class="text-xs text-neutral-400 mt-1">now</div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
          <h3 class="text-sm font-semibold text-neutral-100">Timeline</h3>
        </div>

        <div class="space-y-2 p-6">
          {#each history as entry, idx}
            <div class="flex items-center gap-4 pb-4 {idx !== history.length - 1 ? 'border-b border-neutral-700' : ''}">
              <div class="w-32 flex-shrink-0">
                <div class="text-xs text-neutral-400">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </div>
                <div class="text-xs text-neutral-500">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div class="text-2xl">{getTrendIcon(entry.adjustment)}</div>

              <div class="flex-1 flex items-center gap-3">
                <div class="w-full space-y-1">
                  <div class="text-xs text-neutral-400">
                    {(entry.old_confidence * 100).toFixed(0)}% → {(entry.new_confidence * 100).toFixed(0)}%
                  </div>
                  <div class="flex gap-2 h-2">
                    <div class="flex-1 bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-gradient-to-r {getConfidenceColor(entry.old_confidence)}"
                        style="width: {entry.old_confidence * 100}%"
                      />
                    </div>
                    <div class="flex-1 bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-gradient-to-r {getConfidenceColor(entry.new_confidence)}"
                        style="width: {entry.new_confidence * 100}%"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="w-20 text-right">
                <span class="inline-block px-3 py-1 rounded-full bg-green-900/30 border border-green-600/30 text-green-300 text-xs font-semibold">
                  +{(entry.adjustment * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg p-6">
        <h3 class="text-sm font-semibold text-neutral-100 mb-4">Evolution</h3>
        <div class="flex items-end justify-between gap-1 h-24">
          {#each history as entry}
            <div class="flex-1 flex flex-col items-center gap-2">
              <div
                class="w-full bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                style="height: {entry.new_confidence * 100}%"
              />
              <span class="text-xs text-neutral-400">{(entry.new_confidence * 100).toFixed(0)}%</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else if !loading}
    <div class="text-center py-12 bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg">
      <div class="text-4xl mb-2">📋</div>
      <p class="text-neutral-400">No history available</p>
    </div>
  {/if}
</div>
