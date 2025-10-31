<script lang="ts">
  import { page } from '$app/stores';

  const navItems = [
    { href: '/coalescence', label: 'Dashboard', icon: '📊', key: 'dashboard' },
    { href: '/coalescence/runs', label: 'Runs', icon: '🏃', key: 'runs' },
    { href: '/coalescence/agents', label: 'Agents', icon: '⚙️', key: 'agents' },
    { href: '/coalescence/rules', label: 'Rules', icon: '📋', key: 'rules' },
    { href: '/coalescence/costs', label: 'Costs', icon: '💰', key: 'costs' },
    { href: '/coalescence/tools', label: 'Tools', icon: '🔧', key: 'tools' }
  ];
  
  function getActiveSection(pathname: string): string {
    const pathParts = pathname.split('/').filter(p => p);
    // pathParts[0] is 'coalescence'
    // pathParts[1] is 'runs', 'agents', 'rules', 'costs', or undefined (dashboard)
    return pathParts[1] || 'dashboard';
  }
  
  function isActive(key: string, pathname: string): boolean {
    return key === getActiveSection(pathname);
  }
</script>

<nav class="relative flex border-b-2 border-neutral-700/50 mb-6 gap-2">
  {#each navItems as item (item.key)}
    <a
      href={item.href}
      class={`relative px-5 py-3 font-medium transition-all duration-200 flex items-center gap-2 group ${
        isActive(item.key, $page.url.pathname)
          ? 'text-blue-400'
          : 'text-neutral-400 hover:text-neutral-200'
      }`}
    >
      <span class="text-xl transition-transform group-hover:scale-110">{item.icon}</span>
      <span>{item.label}</span>
      {#if isActive(item.key, $page.url.pathname)}
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg shadow-blue-500/50"></div>
      {/if}
      {#if !isActive(item.key, $page.url.pathname)}
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neutral-600 to-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      {/if}
    </a>
  {/each}
</nav>

