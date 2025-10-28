<script context="module" lang="ts">
  export const ssr = false;
</script>

<script lang="ts">
  // Re-export the graph page
  import Graph from '../graph/+page.svelte';
</script>

<svelte:component this={Graph} />
