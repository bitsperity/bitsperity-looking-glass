<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/ariadne/manage/quality');
  });
</script>

<div class="text-center py-12">
  <div class="text-neutral-400">Redirecting to Manage Dashboard...</div>
</div>
