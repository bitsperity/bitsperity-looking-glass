<script lang="ts">
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  export let data;
  import '../app.css';
</script>

<div class="flex bg-neutral-900 text-neutral-100 h-screen overflow-hidden">
  <Sidebar current={data.section || ''} />
  <div class="flex-1 flex flex-col overflow-hidden">
    <Topbar apiBase={data.apiBase} />
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
  
</div>

