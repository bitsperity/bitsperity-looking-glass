<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let coalescenceApi = import.meta.env.VITE_COALESCENCE_BASE || 'http://localhost:3100';

  onMount(() => {
    console.log('Coalescence layout loaded, API:', coalescenceApi);
  });
</script>

<div class="coalescence-container">
  <slot />
</div>

<style>
  :global(html, body) {
    overflow: hidden;
  }

  :global(.coalescence-container) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
  }

  :global(.coalescence-page) {
    flex: 1;
    display: flex;
    overflow: hidden;
    gap: 1rem;
    padding: 1rem;
  }

  :global(.coalescence-panel) {
    flex: 1;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  :global(.coalescence-panel-header) {
    padding: 1rem;
    border-bottom: 1px solid #e5e5e5;
    flex-shrink: 0;
  }

  :global(.coalescence-panel-content) {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }

  :global(.coalescence-panel-footer) {
    padding: 0.75rem 1rem;
    border-top: 1px solid #e5e5e5;
    background: #fafafa;
    flex-shrink: 0;
  }
</style>
