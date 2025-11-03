<script lang="ts">
  import { goto } from '$app/navigation';
  
  export let items: Array<{ label: string; href?: string }> = [];
  
  function handleClick(e: MouseEvent, href: string) {
    e.preventDefault();
    goto(href);
  }
</script>

<nav class="flex items-center gap-2 text-sm text-neutral-400 mb-4">
  {#each items as item, index (index)}
    {#if item.href}
      {@const href = item.href}
      <a 
        href={href}
        class="hover:text-indigo-400 transition-colors"
        on:click={(e) => handleClick(e, href)}
      >
        {item.label}
      </a>
    {:else}
      <span class="text-neutral-500">{item.label}</span>
    {/if}
    {#if index < items.length - 1}
      <span class="text-neutral-600">/</span>
    {/if}
  {/each}
</nav>


