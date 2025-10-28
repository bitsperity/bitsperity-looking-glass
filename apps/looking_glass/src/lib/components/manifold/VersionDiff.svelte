<script lang="ts">
  export let thought: any;
  
  $: versions = thought?.versions || [];

  function formatDate(dateStr?: string): string {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  }

  function formatValue(value: any): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toFixed(2);
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }
</script>

{#if versions.length === 0}
  <div class="text-neutral-500 text-sm italic">
    No version history available
  </div>
{:else}
  <div class="space-y-3">
    {#each versions.slice().reverse() as version, i (i)}
      <div class="bg-neutral-900 rounded-lg p-4 border border-neutral-800 hover:border-neutral-700 transition-colors">
        <!-- Version Header -->
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded">
              v{version.version}
            </span>
            {#if i === 0}
              <span class="text-xs font-medium text-emerald-400">Current</span>
            {/if}
          </div>
          <div class="text-xs text-neutral-500">
            {formatDate(version.updated_at)}
          </div>
        </div>

        <!-- Version Details -->
        <div class="space-y-2">
          {#if version.updated_by}
            <div class="text-xs text-neutral-400">
              <span class="font-medium">Updated by:</span> {version.updated_by}
            </div>
          {/if}

          {#if version.change_reason}
            <div class="text-xs text-neutral-400">
              <span class="font-medium">Reason:</span> {version.change_reason}
            </div>
          {/if}

          <!-- Changes/Snapshot -->
          {#if version.changes}
            <div class="mt-3 space-y-1">
              <div class="text-xs font-medium text-neutral-300">Changes:</div>
              {#each Object.entries(version.changes) as [field, change] (field)}
                <div class="text-xs font-mono bg-neutral-950/50 rounded px-2 py-1 space-y-0.5">
                  <div class="text-neutral-400">
                    <span class="font-medium">{field}</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="text-red-400">−</span>
                    <span class="text-red-300 line-through">
                      {formatValue(change.old)}
                    </span>
                  </div>
                  <div class="flex items-start gap-2">
                    <span class="text-emerald-400">+</span>
                    <span class="text-emerald-300">
                      {formatValue(change.new)}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Snapshot (if no changes) -->
          {#if !version.changes && version.snapshot}
            <div class="text-xs text-neutral-400 italic">
              Snapshot stored (no explicit changes tracked)
            </div>
          {/if}
        </div>
      </div>
    {/each}
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
