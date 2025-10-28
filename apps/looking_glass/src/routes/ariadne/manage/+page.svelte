<script lang="ts">
  import { page } from '$app/stores';

  $: current = $page.url.searchParams.get('view') || 'quality';

  const VIEWS = [
    { id: 'quality', label: '🔍 Quality', desc: 'Contradictions, gaps, anomalies' },
    { id: 'dedup', label: '♻️ Deduplication', desc: 'Identify and merge duplicates' },
    { id: 'learning', label: '🧠 Learning', desc: 'Confidence feedback & adaptation' },
    { id: 'admin', label: '⚙️ Admin', desc: 'System administration' },
  ];

  function updateView(viewId: string) {
    window.history.replaceState({}, '', `?view=${viewId}`);
    current = viewId;
  }
</script>

<div class="flex-1 overflow-auto">
  <div class="max-w-7xl mx-auto p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent mb-2">
        Manage
      </h1>
      <p class="text-neutral-400">Knowledge graph quality and maintenance</p>
    </div>

    <!-- Sub-Tab Navigation -->
    <div class="flex gap-2 overflow-x-auto mb-8 pb-2 -mb-2 scrollbar-hide">
      {#each VIEWS as view}
        <button
          on:click={() => updateView(view.id)}
          class={`
            px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200
            ${
              current === view.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border border-transparent hover:border-neutral-700'
            }
          `}
        >
          <div>{view.label}</div>
          <div class="text-xs opacity-75 mt-0.5">{view.desc}</div>
        </button>
      {/each}
    </div>

    <!-- Content Area -->
    <div class="bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-700/50 rounded-xl p-8 backdrop-blur-sm">
      {#if current === 'quality'}
        <div class="text-center py-12">
          <div class="text-2xl font-bold text-neutral-100 mb-3">🔍 Quality Dashboard</div>
          <p class="text-neutral-400 mb-6">Coming soon - Monitor graph quality metrics and issues</p>
          <div class="inline-flex gap-3 flex-wrap justify-center">
            <div class="px-4 py-2 rounded-lg bg-red-600/20 border border-red-600/30 text-red-300 text-sm">
              ⚡ Contradictions
            </div>
            <div class="px-4 py-2 rounded-lg bg-amber-600/20 border border-amber-600/30 text-amber-300 text-sm">
              🕳️ Gaps
            </div>
            <div class="px-4 py-2 rounded-lg bg-orange-600/20 border border-orange-600/30 text-orange-300 text-sm">
              🔴 Anomalies
            </div>
          </div>
        </div>
      {:else if current === 'dedup'}
        <div class="text-center py-12">
          <div class="text-2xl font-bold text-neutral-100 mb-3">♻️ Deduplication Manager</div>
          <p class="text-neutral-400 mb-6">Coming soon - Detect and merge duplicate entities</p>
          <div class="inline-flex gap-3">
            <div class="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-600/30 text-cyan-300 text-sm">
              🔍 Similarity Detection
            </div>
            <div class="px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-300 text-sm">
              🔗 Merge Preview
            </div>
            <div class="px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-600/30 text-indigo-300 text-sm">
              ✅ Safe Execute
            </div>
          </div>
        </div>
      {:else if current === 'learning'}
        <div class="text-center py-12">
          <div class="text-2xl font-bold text-neutral-100 mb-3">🧠 Learning Feedback</div>
          <p class="text-neutral-400 mb-6">Coming soon - Apply confidence adjustments based on patterns</p>
          <div class="inline-flex gap-3">
            <div class="px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-300 text-sm">
              📊 Pattern Detection
            </div>
            <div class="px-4 py-2 rounded-lg bg-green-600/20 border border-green-600/30 text-green-300 text-sm">
              🔧 Apply Feedback
            </div>
            <div class="px-4 py-2 rounded-lg bg-teal-600/20 border border-teal-600/30 text-teal-300 text-sm">
              📈 Monitor Progress
            </div>
          </div>
        </div>
      {:else if current === 'admin'}
        <div class="text-center py-12">
          <div class="text-2xl font-bold text-neutral-100 mb-3">⚙️ Administration</div>
          <p class="text-neutral-400 mb-6">Coming soon - System administration and maintenance</p>
          <div class="inline-flex gap-3 flex-wrap justify-center">
            <div class="px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-600/30 text-purple-300 text-sm">
              📸 Snapshots
            </div>
            <div class="px-4 py-2 rounded-lg bg-pink-600/20 border border-pink-600/30 text-pink-300 text-sm">
              📥 Import/Export
            </div>
            <div class="px-4 py-2 rounded-lg bg-rose-600/20 border border-rose-600/30 text-rose-300 text-sm">
              🔄 Batch Operations
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(.scrollbar-hide) {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  :global(.scrollbar-hide::-webkit-scrollbar) {
    display: none;
  }
</style>
