<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  $: {
    const pathname = $page.url.pathname;
    if (pathname.includes('/quality')) {
      current = 'quality';
    } else if (pathname.includes('/dedup')) {
      current = 'dedup';
    } else if (pathname.includes('/learning')) {
      current = 'learning';
    } else if (pathname.includes('/admin')) {
      current = 'admin';
    }
  }

  let current = 'quality';

  const VIEWS = [
    { id: 'quality', label: '🔍 Quality', desc: 'Monitor data quality', route: '/ariadne/manage/quality' },
    { id: 'dedup', label: '🔀 Dedup', desc: 'Find & merge duplicates', route: '/ariadne/manage/dedup' },
    { id: 'learning', label: '📚 Learning', desc: 'Feedback & history', route: '/ariadne/manage/learning' },
    { id: 'admin', label: '⚙️ Admin', desc: 'System maintenance', route: '/ariadne/manage/admin' },
  ];

  function updateView(viewId: string) {
    const view = VIEWS.find(v => v.id === viewId);
    if (view) {
      goto(view.route);
    }
  }
</script>

<div class="flex-1 overflow-auto">
  <div class="max-w-7xl mx-auto p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold bg-gradient-to-r from-neutral-100 to-neutral-300 bg-clip-text text-transparent mb-2">
        Manage
      </h1>
      <p class="text-neutral-400">Data quality, deduplication, learning & administration</p>
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

    <!-- Slot for sub-page content -->
    <slot />
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
