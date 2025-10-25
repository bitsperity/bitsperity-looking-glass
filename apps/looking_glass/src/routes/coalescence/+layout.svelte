<script lang="ts">
  import CoalescenceNav from '$lib/components/coalescence/CoalescenceNav.svelte';
</script>

<!-- Coalescence nutzt das Looking Glass Layout, kein eigenes fixed Layout -->
<div class="flex flex-col h-full overflow-hidden">
  <div class="px-6 pt-4 flex-shrink-0">
    <CoalescenceNav />
  </div>
  <slot />
</div>
