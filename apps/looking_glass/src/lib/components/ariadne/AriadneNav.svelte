<script lang="ts">
  import { page } from '$app/stores';

  $: current = $page.url.pathname;
</script>

<nav class="border-b border-neutral-800 bg-neutral-950">
  <div class="flex gap-1 px-4 py-2 overflow-x-auto">
    <a
      href="/ariadne/dashboard"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/dashboard' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Dashboard
    </a>
    <a
      href="/ariadne/search"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/search' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Search
    </a>
    <a
      href="/ariadne/context"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/context' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Context
    </a>
    <a
      href="/ariadne/graph"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/graph' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Graph
    </a>
    <a
      href="/ariadne/timeline"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/timeline' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Timeline
    </a>
    <a
      href="/ariadne/impact"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/impact' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Impact
    </a>
    <a
      href="/ariadne/similar"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/similar' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Similar
    </a>
    <a
      href="/ariadne/patterns"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current.startsWith('/ariadne/patterns') ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Patterns
    </a>
    <a
      href="/ariadne/regimes"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/regimes' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Regimes
    </a>
    <a
      href="/ariadne/hypotheses"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current.startsWith('/ariadne/hypotheses') ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Hypotheses
    </a>
    <a
      href="/ariadne/write"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/write' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Write
    </a>
    <a
      href="/ariadne/learn"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/learn' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Learn
    </a>
    <a
      href="/ariadne/admin"
      class="px-3 py-2 rounded text-sm whitespace-nowrap {current === '/ariadne/admin' ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'}"
    >
      Admin
    </a>
  </div>
</nav>

