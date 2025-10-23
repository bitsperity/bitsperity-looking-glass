<script lang="ts">
  import { page } from '$app/stores';
  
  $: current = $page.url.pathname;
  
  const links = [
    { href: '/manifold/dashboard', label: 'Dashboard' },
    { href: '/manifold/search', label: 'Search' },
    { href: '/manifold/timeline', label: 'Timeline' },
    { href: '/manifold/thoughts', label: 'Thoughts' },
    { href: '/manifold/admin', label: 'Admin' }
  ];
</script>

<div class="flex gap-2 border-b border-neutral-800 pb-3 mb-4">
  {#each links as link}
    <a 
      href={link.href} 
      class="px-3 py-1.5 rounded text-sm {current.startsWith(link.href) ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
    >
      {link.label}
    </a>
  {/each}
</div>

