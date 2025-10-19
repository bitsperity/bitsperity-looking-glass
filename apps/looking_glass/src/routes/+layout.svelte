<script lang="ts">
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  export let data;
  import '../app.css';
</script>

<div class="flex bg-neutral-900 text-neutral-100 min-h-screen">
  <Sidebar current={data.section || ''} />
  <div class="flex-1 flex flex-col">
    <Topbar apiBase={data.apiBase} />
    <main class="flex-1 p-6">
      <slot />
    </main>
  </div>
  
</div>

