<script lang="ts">
  export let href: string | null = null;
  export let padding: string = 'p-4';
  export let hover: boolean = false;
</script>

{#if href}
  <a
    {href}
    target="_blank"
    rel="noreferrer"
    class="block bg-neutral-800/50 backdrop-blur border border-neutral-700/50 rounded-lg {padding} transition-all duration-200 {hover ? 'hover:bg-neutral-800/70 hover:border-neutral-600/50 hover:shadow-lg' : ''}"
  >
    <slot />
  </a>
{:else}
  <div class="bg-neutral-800/50 backdrop-blur border border-neutral-700/50 rounded-lg {padding}">
    <slot />
  </div>
{/if}

