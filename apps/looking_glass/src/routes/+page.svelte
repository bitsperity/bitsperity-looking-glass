<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  onMount(() => goto('/satbase'));
</script>

<div class="flex items-center justify-center h-screen">
  <div class="text-center">
    <h1 class="text-4xl font-bold mb-4">LookingGlass</h1>
    <p class="text-neutral-400">Redirecting to Satbase...</p>
  </div>
</div>

