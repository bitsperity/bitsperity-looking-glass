<script lang="ts">
  import { goto } from '$app/navigation';

  export let thought: any;
  export let relations: any[] = [];

  function getRelationColor(type: string) {
    switch (type) {
      case 'supports': return '#10b981';
      case 'contradicts': return '#ef4444';
      case 'followup': return '#3b82f6';
      default: return '#8b5cf6';
    }
  }

  function getRelationLabel(type: string) {
    switch (type) {
      case 'supports': return '✓ Supports';
      case 'contradicts': return '✗ Contradicts';
      case 'followup': return '→ Followup';
      default: return '◈ Related';
    }
  }

  function navigateToThought(id: string) {
    goto(`/manifold/thoughts/${id}`);
  }
</script>

<div class="space-y-3">
  <h3 class="font-semibold text-sm text-neutral-100">🔗 Related Thoughts ({relations.length})</h3>

  {#if relations.length === 0}
    <div class="text-xs text-neutral-500 italic py-4 text-center bg-neutral-900/50 rounded border border-neutral-700">
      No related thoughts yet
    </div>
  {:else}
    <div class="space-y-2 max-h-64 overflow-y-auto">
      {#each relations as rel, idx (idx)}
        <div class="bg-neutral-900/50 border border-neutral-700 rounded p-3 hover:border-indigo-500/50 transition-colors cursor-pointer" on:click={() => navigateToThought(rel.target_id)}>
          <div class="flex items-start gap-2 mb-2">
            <div 
              class="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" 
              style="background-color: {getRelationColor(rel.type)}"
            />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-neutral-300">{getRelationLabel(rel.type)}</div>
              <div class="text-xs text-neutral-400 truncate">{rel.weight ? `Weight: ${(rel.weight * 100).toFixed(0)}%` : ''}</div>
            </div>
          </div>
          <div class="text-sm font-medium text-neutral-200 truncate">{rel.target_title || 'Untitled'}</div>
        </div>
      {/each}
    </div>

    <!-- Legend -->
    <div class="text-xs space-y-1 text-neutral-400 pt-2 border-t border-neutral-700">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full" style="background-color: #10b981" />
        <span>Supports</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full" style="background-color: #ef4444" />
        <span>Contradicts</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full" style="background-color: #3b82f6" />
        <span>Followup</span>
      </div>
    </div>
  {/if}
</div>

<style>
</style>
