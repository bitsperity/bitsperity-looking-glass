<script lang="ts">
  import { page } from '$app/stores';
  
  $: current = $page.url.pathname;
  
  const links = [
    { href: '/manifold/dashboard', label: 'Dashboard' },
    { href: '/manifold/search', label: 'Search' },
    { href: '/manifold/timeline', label: 'Timeline' },
    { href: '/manifold/thoughts', label: 'Thoughts' },
    { href: '/manifold/graph', label: 'Graph' },
    { href: '/manifold/analytics', label: 'Analytics' },
    { href: '/manifold/admin', label: 'Admin' }
  ];
</script>

<div role="navigation" aria-label="Manifold sections" class="flex gap-2 border-b border-neutral-800 pb-3 mb-4">
  {#each links as link}
    <a 
      href={link.href} 
      aria-current={current.startsWith(link.href) ? 'page' : undefined}
      class="px-3 py-1.5 rounded text-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-indigo-400 {current.startsWith(link.href) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
    >
      {link.label}
    </a>
  {/each}
</div>

