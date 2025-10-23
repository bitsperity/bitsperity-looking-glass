<script lang="ts">
  import AriadneNav from '$lib/components/ariadne/AriadneNav.svelte';
</script>

<div class="flex flex-col h-screen bg-neutral-950 text-neutral-100">
  <AriadneNav />
  <div class="flex-1 overflow-y-auto">
    <slot />
  </div>
</div>

