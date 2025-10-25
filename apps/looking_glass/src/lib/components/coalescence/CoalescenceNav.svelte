<script lang="ts">
  import { page } from '$app/stores';

  let current: string = 'dashboard';
  
  // Reactively update current based on page pathname
  $: {
    // Extract the section from the full pathname
    // /coalescence -> 'dashboard'
    // /coalescence/runs -> 'runs'
    // /coalescence/runs/[id] -> 'runs'
    // /coalescence/agents -> 'agents'
    const pathParts = $page.url.pathname.split('/').filter(p => p);
    current = pathParts[1] || 'dashboard';
  }
  
  const navItems = [
    { href: '/coalescence', label: 'Dashboard', icon: '📊', key: 'dashboard' },
    { href: '/coalescence/runs', label: 'Runs', icon: '🏃', key: 'runs' },
    { href: '/coalescence/agents', label: 'Agents', icon: '⚙️', key: 'agents' },
    { href: '/coalescence/rules', label: 'Rules', icon: '📋', key: 'rules' },
    { href: '/coalescence/costs', label: 'Costs', icon: '💰', key: 'costs' }
  ];
  
  function isActive(key: string): boolean {
    return key === current;
  }
</script>

<nav class="relative flex border-b-2 border-neutral-700/50 mb-6 gap-2">
  {#each navItems as item}
    <a
      href={item.href}
      class={`relative px-5 py-3 font-medium transition-all duration-200 flex items-center gap-2 group ${
        isActive(item.key)
          ? 'text-blue-400'
          : 'text-neutral-400 hover:text-neutral-200'
      }`}
    >
      <span class="text-xl transition-transform group-hover:scale-110">{item.icon}</span>
      <span>{item.label}</span>
      {#if isActive(item.key)}
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg shadow-blue-500/50"></div>
      {/if}
      {#if !isActive(item.key)}
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neutral-600 to-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      {/if}
    </a>
  {/each}
</nav>

