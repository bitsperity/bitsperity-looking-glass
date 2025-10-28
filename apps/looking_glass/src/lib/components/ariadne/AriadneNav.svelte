<script lang="ts">
  import { page } from '$app/stores';

  $: current = $page.url.pathname;

  const TABS = [
    { href: '/ariadne/overview', label: '🏠 Overview', icon: 'home' },
    { href: '/ariadne/explore', label: '🔍 Explore', icon: 'search' },
    { href: '/ariadne/intelligence', label: '🧠 Intelligence', icon: 'zap' },
    { href: '/ariadne/manage', label: '⚙️ Manage', icon: 'settings' },
    { href: '/ariadne/write', label: '✍️ Write', icon: 'edit' },
  ];

  // Reactive: automatically update when current changes
  $: isActive = (href: string) => current.startsWith(href);
</script>

<nav class="sticky top-0 z-40 border-b border-neutral-800 bg-gradient-to-r from-neutral-950/80 to-neutral-900/80 backdrop-blur-xl">
  <div class="px-6 py-4">
    <!-- Logo + Brand -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
          <span class="text-lg font-bold text-white">⚡</span>
        </div>
        <div>
          <h1 class="text-lg font-bold text-neutral-100">Ariadne</h1>
          <p class="text-xs text-neutral-500">Knowledge Intelligence Platform</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
      {#each TABS as tab}
        <a
          href={tab.href}
          class={`
            px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200
            ${
              isActive(tab.href)
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }
          `}
        >
          {tab.label}
        </a>
      {/each}
    </div>
  </div>
</nav>

<style>
  :global(.scrollbar-hide) {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  :global(.scrollbar-hide::-webkit-scrollbar) {
    display: none;
  }
</style>

