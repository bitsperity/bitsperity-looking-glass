<script lang="ts">
  export let current: string = '';
</script>

<nav class="w-64 bg-neutral-950 text-neutral-200 h-screen p-4">
  <div class="text-lg font-semibold mb-6">LookingGlass</div>
  <ul class="space-y-2">
    <li>
      <a href="/satbase" class="block px-3 py-2 rounded hover:bg-neutral-800 {current==='satbase' ? 'bg-neutral-800' : ''}">Satbase</a>
    </li>
    <li>
      <a href="/tesseract" class="block px-3 py-2 rounded hover:bg-neutral-800 {current==='tesseract' ? 'bg-neutral-800' : ''}">Tesseract</a>
    </li>
    <li>
      <a href="/manifold/dashboard" class="block px-3 py-2 rounded hover:bg-neutral-800 {current==='manifold' ? 'bg-neutral-800' : ''}">Manifold</a>
    </li>
    <li>
      <a href="/ariadne/dashboard" class="block px-3 py-2 rounded hover:bg-neutral-800 {current==='ariadne' ? 'bg-neutral-800' : ''}">Ariadne</a>
    </li>
  </ul>
</nav>

<style>
  :global(html){ color-scheme: dark; }
</style>

