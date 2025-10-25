<script lang="ts">
  import { page } from '$app/stores';

  $: current = $page.url.pathname.split('/').pop() || 'dashboard';
</script>

<nav class="flex border-b border-neutral-700 mb-4 gap-1">
  <a
    href="/coalescence"
    class={`px-4 py-2 border-b-2 transition-colors ${
      current === 'coalescence' || current === ''
        ? 'border-blue-400 text-blue-400'
        : 'border-transparent text-neutral-400 hover:text-neutral-300'
    }`}
  >
    📊 Dashboard
  </a>
  <a
    href="/coalescence/runs"
    class={`px-4 py-2 border-b-2 transition-colors ${
      current === 'runs' ? 'border-blue-400 text-blue-400' : 'border-transparent text-neutral-400 hover:text-neutral-300'
    }`}
  >
    🏃 Runs
  </a>
  <a
    href="/coalescence/agents"
    class={`px-4 py-2 border-b-2 transition-colors ${
      current === 'agents'
        ? 'border-blue-400 text-blue-400'
        : 'border-transparent text-neutral-400 hover:text-neutral-300'
    }`}
  >
    ⚙️ Agents
  </a>
  <a
    href="/coalescence/costs"
    class={`px-4 py-2 border-b-2 transition-colors ${
      current === 'costs' ? 'border-blue-400 text-blue-400' : 'border-transparent text-neutral-400 hover:text-neutral-300'
    }`}
  >
    💰 Costs
  </a>
</nav>

