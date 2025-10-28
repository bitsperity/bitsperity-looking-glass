<script lang="ts">
  import { onMount } from 'svelte';
  import { getTree } from '$lib/api/manifold';

  export let thoughtId: string;
  export let depth: number = 3;
  
  let tree: any = null;
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      tree = await getTree(thoughtId, depth);
      loading = false;
    } catch (e: any) {
      error = e?.message ?? 'Error loading tree';
      loading = false;
    }
  });

  function typeIcon(type?: string): string {
    const icons: Record<string, string> = {
      observation: '●',
      hypothesis: '⬡',
      analysis: '■',
      decision: '◆',
      reflection: '✦',
      question: '△',
      summary: '⚡',
    };
    return icons[type || ''] || '•';
  }

  function renderNode(node: any, level: number = 0): string {
    const indent = '  '.repeat(level);
    return `${indent}${typeIcon(node.type)} ${node.title}`;
  }
</script>

{#if loading}
  <div class="text-neutral-500 text-sm">Loading tree structure...</div>
{:else if error}
  <div class="text-red-400 text-sm bg-red-950/20 px-3 py-2 rounded border border-red-500/30">
    {error}
  </div>
{:else if tree}
  <div class="space-y-4">
    <!-- Root Node -->
    <div class="border-l-2 border-indigo-500 pl-4 py-2">
      <div class="text-lg font-semibold text-neutral-100 flex items-center gap-2">
        <span class="text-indigo-400">{typeIcon(tree.thought?.type)}</span>
        <span>{tree.thought?.title || 'Untitled'}</span>
      </div>
      {#if tree.thought?.summary}
        <div class="text-xs text-neutral-400 mt-1 italic truncate">
          {tree.thought.summary}
        </div>
      {/if}
    </div>

    <!-- Children -->
    {#if tree.children && tree.children.length > 0}
      <div class="ml-4 space-y-2 border-l-2 border-neutral-700 pl-4">
        <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Children ({tree.children.length})
        </div>
        {#each tree.children as child (child.id)}
          <div class="flex items-start gap-2 p-2 rounded bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors">
            <span class="text-neutral-500 flex-shrink-0">{typeIcon(child.type)}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-neutral-200">
                {child.title}
              </div>
              {#if child.ordinal !== undefined}
                <div class="text-xs text-neutral-500">
                  Section {child.ordinal}
                </div>
              {/if}
              {#if child.summary}
                <div class="text-xs text-neutral-400 truncate mt-1">
                  {child.summary}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-xs text-neutral-500 italic">
        No children
      </div>
    {/if}

    <!-- Parent Info (if exists) -->
    {#if tree.parent}
      <div class="mt-4 pt-4 border-t border-neutral-700">
        <div class="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">
          Parent
        </div>
        <div class="flex items-start gap-2 p-2 rounded bg-neutral-800/30">
          <span class="text-neutral-500">{typeIcon(tree.parent.type)}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-neutral-200">
              {tree.parent.title}
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <div class="text-neutral-500 text-sm">
    No tree data available
  </div>
{/if}

<style>
  div {
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
