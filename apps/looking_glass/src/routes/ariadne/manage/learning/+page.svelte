<script lang="ts">
  import { onMount } from 'svelte';

  interface FeedbackUpdate {
    relation_id: string;
    target_name: string;
    old_confidence: number;
    new_confidence: number;
    adjustment: number;
  }

  let loading = false;
  let error: string | null = null;
  let executing = false;

  // Parameters
  let selectedLabel = 'Company';
  let windowDays = 30;
  let maxAdjust = 0.2;
  let step = 0.05;

  // Data
  let feedbackUpdates: FeedbackUpdate[] = [];
  let previewStats: any = null;

  // Selection
  let dryRun = true;
  let selectedUpdates: Set<string> = new Set();
  let applyResult: any = null;

  async function previewFeedback() {
    loading = true;
    error = null;
    feedbackUpdates = [];
    previewStats = null;

    try {
      const response = await fetch('http://localhost:8082/v1/kg/admin/learning/apply-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: selectedLabel,
          window_days: windowDays,
          max_adjust: maxAdjust,
          step: step,
          dry_run: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform API response: use capped_increase as adjustment
      feedbackUpdates = (data.learning_updates || [])
        .slice(0, 50)
        .map((u: any) => ({
          relation_id: u.relation_id,
          target_name: u.target_name || 'Unknown',
          old_confidence: u.old_confidence || 0,
          new_confidence: u.new_confidence || 0,
          adjustment: u.capped_increase || (u.new_confidence - u.old_confidence) || 0,
        }));

      previewStats = {
        totalUpdates: data.adjusted_count || feedbackUpdates.length,
        avgAdjustment:
          feedbackUpdates.length > 0
            ? feedbackUpdates.reduce((sum, u) => sum + u.adjustment, 0) / feedbackUpdates.length
            : 0,
        minAdjustment: feedbackUpdates.length > 0 ? Math.min(...feedbackUpdates.map(u => u.adjustment)) : 0,
        maxAdjustment: feedbackUpdates.length > 0 ? Math.max(...feedbackUpdates.map(u => u.adjustment)) : 0,
      };
    } catch (e: any) {
      error = e.message || 'Failed to preview feedback';
    } finally {
      loading = false;
    }
  }

  async function applyFeedback() {
    executing = true;
    error = null;
    applyResult = null;

    try {
      const response = await fetch('http://localhost:8082/v1/kg/admin/learning/apply-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: selectedLabel,
          window_days: windowDays,
          max_adjust: maxAdjust,
          step: step,
          dry_run: dryRun,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      applyResult = await response.json();

      // If not dry-run, reload preview
      if (!dryRun) {
        await previewFeedback();
      }
    } catch (e: any) {
      error = e.message || 'Failed to apply feedback';
    } finally {
      executing = false;
    }
  }

  function toggleSelection(id: string) {
    if (selectedUpdates.has(id)) {
      selectedUpdates.delete(id);
    } else {
      selectedUpdates.add(id);
    }
    selectedUpdates = selectedUpdates;
  }

  function getAdjustmentColor(value: number): string {
    if (value >= 0.15) return 'text-emerald-400';
    if (value >= 0.1) return 'text-blue-400';
    if (value >= 0.05) return 'text-yellow-400';
    return 'text-neutral-400';
  }

  onMount(() => {
    previewFeedback();
  });
</script>

<div class="space-y-6 pb-12">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="text-3xl font-bold text-neutral-100">📚 Learning Feedback</h1>
    <p class="text-neutral-400">Automatically adjust confidence based on observation patterns</p>
  </div>

  <!-- Controls -->
  <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-xl p-6 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Node Label</label>
        <select
          bind:value={selectedLabel}
          class="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="Company">Company</option>
          <option value="Event">Event</option>
        </select>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Window: {windowDays} days</label>
        <input type="range" min="7" max="90" step="1" bind:value={windowDays} class="w-full" />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Max Adjust: {(maxAdjust * 100).toFixed(0)}%</label>
        <input type="range" min="0.05" max="0.5" step="0.05" bind:value={maxAdjust} class="w-full" />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-semibold text-neutral-400">Step: {(step * 100).toFixed(1)}%</label>
        <input type="range" min="0.01" max="0.1" step="0.01" bind:value={step} class="w-full" />
      </div>
    </div>

    <div class="flex gap-3">
      <button
        on:click={previewFeedback}
        disabled={loading}
        class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-neutral-600 disabled:to-neutral-600 text-white font-medium text-sm transition-all active:scale-95"
      >
        {loading ? '🔄 Scanning...' : '👁️ Preview Adjustments'}
      </button>

      <button
        on:click={applyFeedback}
        disabled={executing || feedbackUpdates.length === 0}
        class="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-neutral-600 disabled:to-neutral-600 text-white font-medium text-sm transition-all active:scale-95"
      >
        {executing ? '⏳ Applying...' : dryRun ? '✅ Preview Apply' : '🚀 Apply Feedback'}
      </button>
    </div>

    <label class="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" bind:checked={dryRun} class="w-4 h-4" />
      <span class="text-sm text-neutral-300">🔍 Dry run (preview only)</span>
    </label>
  </div>

  <!-- Error -->
  {#if error}
    <div class="bg-red-950 border border-red-500/30 rounded-lg p-4 text-red-200 text-sm">
      ⚠️ {error}
    </div>
  {/if}

  <!-- Stats Cards -->
  {#if previewStats}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-600/30 rounded-lg p-4">
        <div class="text-xs text-green-400 font-semibold">Total Updates</div>
        <div class="text-2xl font-bold text-green-300 mt-1">{previewStats.totalUpdates}</div>
        <div class="text-xs text-neutral-400 mt-1">relations to adjust</div>
      </div>

      <div class="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-600/30 rounded-lg p-4">
        <div class="text-xs text-blue-400 font-semibold">Avg Adjustment</div>
        <div class="text-2xl font-bold text-blue-300 mt-1">+{(previewStats.avgAdjustment * 100).toFixed(1)}%</div>
        <div class="text-xs text-neutral-400 mt-1">confidence change</div>
      </div>

      <div class="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border border-orange-600/30 rounded-lg p-4">
        <div class="text-xs text-orange-400 font-semibold">Min Adjustment</div>
        <div class="text-2xl font-bold text-orange-300 mt-1">+{(previewStats.minAdjustment * 100).toFixed(1)}%</div>
        <div class="text-xs text-neutral-400 mt-1">minimum change</div>
      </div>

      <div class="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-600/30 rounded-lg p-4">
        <div class="text-xs text-purple-400 font-semibold">Max Adjustment</div>
        <div class="text-2xl font-bold text-purple-300 mt-1">+{(previewStats.maxAdjustment * 100).toFixed(1)}%</div>
        <div class="text-xs text-neutral-400 mt-1">maximum change</div>
      </div>
    </div>
  {/if}

  <!-- Results Table -->
  {#if feedbackUpdates.length > 0}
    <div class="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-transparent">
        <h3 class="text-sm font-semibold text-neutral-100">Proposed Adjustments</h3>
        <p class="text-xs text-neutral-400 mt-1">Showing first 50 of {previewStats?.totalUpdates || feedbackUpdates.length}</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-neutral-800/50 border-b border-neutral-700">
            <tr class="text-neutral-400 text-xs font-semibold uppercase">
              <td class="px-6 py-3 w-12">
                <input
                  type="checkbox"
                  checked={selectedUpdates.size === feedbackUpdates.length}
                  on:change={() => {
                    if (selectedUpdates.size === feedbackUpdates.length) {
                      selectedUpdates.clear();
                    } else {
                      feedbackUpdates.forEach(u => selectedUpdates.add(u.relation_id));
                    }
                    selectedUpdates = selectedUpdates;
                  }}
                  class="w-4 h-4"
                />
              </td>
              <td class="px-6 py-3">Relation</td>
              <td class="px-6 py-3">Target</td>
              <td class="px-6 py-3">Old Confidence</td>
              <td class="px-6 py-3">New Confidence</td>
              <td class="px-6 py-3 text-right">Adjustment</td>
            </tr>
          </thead>
          <tbody>
            {#each feedbackUpdates as update}
              <tr class="border-b border-neutral-700/50 hover:bg-neutral-800/30 transition-colors">
                <td class="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedUpdates.has(update.relation_id)}
                    on:change={() => toggleSelection(update.relation_id)}
                    class="w-4 h-4"
                  />
                </td>
                <td class="px-6 py-4 font-mono text-xs text-neutral-400">{update.relation_id.slice(-8)}</td>
                <td class="px-6 py-4 font-medium text-neutral-200">{update.target_name}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <div class="w-12 h-2 bg-neutral-700 rounded-full overflow-hidden">
                      <div class="h-full bg-orange-500" style="width: {update.old_confidence * 100}%" />
                    </div>
                    <span class="text-xs text-neutral-400">{(update.old_confidence * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <div class="w-12 h-2 bg-neutral-700 rounded-full overflow-hidden">
                      <div class="h-full bg-emerald-500" style="width: {update.new_confidence * 100}%" />
                    </div>
                    <span class="text-xs text-neutral-400">{(update.new_confidence * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td class={`px-6 py-4 font-bold text-right ${getAdjustmentColor(update.adjustment)}`}>
                  +{(update.adjustment * 100).toFixed(1)}%
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if !loading}
    <div class="text-center py-12 bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-lg">
      <div class="text-4xl mb-2">✓</div>
      <p class="text-neutral-400">No feedback adjustments needed</p>
    </div>
  {/if}

  <!-- Apply Result -->
  {#if applyResult}
    <div class={`p-4 rounded-lg border ${
      applyResult.status === 'success'
        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100'
        : 'bg-red-950/30 border-red-500/30 text-red-100'
    }`}>
      <p class="text-sm font-medium">
        {applyResult.status === 'success' ? '✅ Feedback applied successfully!' : '❌ Failed to apply feedback'}
      </p>
      {#if applyResult.adjusted_count}
        <p class="text-xs mt-2 opacity-75">{applyResult.adjusted_count} relations updated</p>
      {/if}
    </div>
  {/if}

  <!-- Link to History -->
  <div class="text-center py-4">
    <a
      href="/ariadne/manage/learning/history"
      class="text-sm text-neutral-400 hover:text-neutral-300 transition-colors underline"
    >
      📚 View adjustment history →
    </a>
  </div>
</div>

<style>
  :global(input[type='range']) {
    @apply w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer;
  }

  :global(input[type='range']::-webkit-slider-thumb) {
    @apply appearance-none w-4 h-4 bg-green-500 rounded-full cursor-pointer hover:bg-green-400 transition-colors;
  }

  :global(input[type='range']::-moz-range-thumb) {
    @apply w-4 h-4 bg-green-500 rounded-full cursor-pointer hover:bg-green-400 transition-colors border-0;
  }
</style>
