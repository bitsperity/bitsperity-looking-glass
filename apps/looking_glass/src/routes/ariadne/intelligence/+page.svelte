<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/ariadne/intelligence/impact');
  });
</script>

<div class="text-center py-12">
  <div class="text-neutral-400">Redirecting to Intelligence Dashboard...</div>
</div>
