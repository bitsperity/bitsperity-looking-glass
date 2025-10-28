<script lang="ts">
  import { goto } from '$app/navigation';

  export let open: boolean = false;
  export let duplicate: any = null;
  export let onLink: (id1: string, id2: string) => void = () => {};
  export let onDelete: (id: string) => void = () => {};
  export let onClose: () => void = () => {};

  let isProcessing = false;
  let loadingContent = false;
  let thought1Full: any = null;
  let thought2Full: any = null;

  // Handle both naming conventions: thought1 or thought_1
  $: t1 = duplicate?.thought1 || duplicate?.thought_1;
  $: t2 = duplicate?.thought2 || duplicate?.thought_2;
  $: similarity = duplicate?.similarity ? (duplicate.similarity * 100).toFixed(1) : '?';

  // Load full content when modal opens
  $: if (open && (t1 || t2) && !thought1Full) {
    loadFullContent();
  }

  async function loadFullContent() {
    loadingContent = true;
    try {
      // Try to fetch full content if we only have IDs
      const ids = [];
      if (t1?.id) ids.push(t1.id);
      if (t2?.id) ids.push(t2.id);
      
      // For now, assume the duplicate object might have full content already
      // In a real app, we'd fetch from /v1/memory/thoughts/{id}
      thought1Full = t1;
      thought2Full = t2;
    } finally {
      loadingContent = false;
    }
  }

  async function handleLink() {
    isProcessing = true;
    try {
      await onLink(t1?.id, t2?.id);
      onClose();
    } finally {
      isProcessing = false;
    }
  }

  async function handleDelete() {
    if (!confirm('🗑️ Delete the second thought? This cannot be undone.')) return;
    isProcessing = true;
    try {
      await onDelete(t2?.id);
      onClose();
    } finally {
      isProcessing = false;
    }
  }

  function resetContent() {
    thought1Full = null;
    thought2Full = null;
  }

  $: if (!open) {
    resetContent();
  }
</script>

{#if open && (t1 || t2)}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-neutral-900 border border-amber-500/30 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
      
      <!-- Header -->
      <div class="border-b border-amber-500/20 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-transparent">
        <div>
          <h2 class="text-lg font-bold text-neutral-100">🔍 Duplicate Comparison</h2>
          <p class="text-xs text-amber-400 mt-1">{similarity}% similarity - Make an informed decision</p>
        </div>
        <button
          on:click={onClose}
          class="text-2xl text-neutral-400 hover:text-neutral-300 transition-colors"
          disabled={isProcessing}
        >
          ✕
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-auto">
        <div class="grid grid-cols-2 gap-4 p-6">
          <!-- LEFT: Thought 1 -->
          <div class="space-y-3 bg-neutral-900/50 border border-indigo-500/30 rounded-lg p-4">
            <div class="space-y-1">
              <div class="text-xs font-semibold text-indigo-400">THOUGHT 1</div>
              <h3 class="text-sm font-bold text-neutral-100 line-clamp-2">{t1?.title || 'Untitled'}</h3>
            </div>

            <div class="flex gap-2 flex-wrap">
              <span class="px-2 py-1 text-xs rounded bg-indigo-950/50 border border-indigo-500/30 text-indigo-300">
                {t1?.type || 'thought'}
              </span>
              {#if t1?.status}
                <span class="px-2 py-1 text-xs rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                  {t1.status}
                </span>
              {/if}
            </div>

            {#if thought1Full?.summary || t1?.summary}
              <div>
                <div class="text-xs text-neutral-400 mb-1">Summary:</div>
                <div class="text-sm text-neutral-300 bg-neutral-800/50 rounded p-2 min-h-[60px] max-h-[100px] overflow-y-auto">
                  {thought1Full?.summary || t1?.summary || 'No summary'}
                </div>
              </div>
            {/if}

            {#if thought1Full?.content || t1?.content}
              <div>
                <div class="text-xs text-neutral-400 mb-1">Content:</div>
                <div class="text-xs text-neutral-300 bg-neutral-800/50 rounded p-2 min-h-[120px] max-h-[180px] overflow-y-auto whitespace-pre-wrap">
                  {thought1Full?.content || t1?.content || 'No content'}
                </div>
              </div>
            {/if}

            {#if t1?.id}
              <button
                on:click={() => goto(`/manifold/thoughts/${t1.id}`)}
                class="w-full px-3 py-1.5 text-xs rounded bg-indigo-600/20 border border-indigo-500/50 hover:bg-indigo-600/40 text-indigo-300 transition-all"
              >
                → View Full Thought
              </button>
            {/if}
          </div>

          <!-- RIGHT: Thought 2 -->
          <div class="space-y-3 bg-neutral-900/50 border border-amber-500/30 rounded-lg p-4">
            <div class="space-y-1">
              <div class="text-xs font-semibold text-amber-400">THOUGHT 2 (Potential Duplicate)</div>
              <h3 class="text-sm font-bold text-neutral-100 line-clamp-2">{t2?.title || 'Untitled'}</h3>
            </div>

            <div class="flex gap-2 flex-wrap">
              <span class="px-2 py-1 text-xs rounded bg-amber-950/50 border border-amber-500/30 text-amber-300">
                {t2?.type || 'thought'}
              </span>
              {#if t2?.status}
                <span class="px-2 py-1 text-xs rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                  {t2.status}
                </span>
              {/if}
            </div>

            {#if thought2Full?.summary || t2?.summary}
              <div>
                <div class="text-xs text-neutral-400 mb-1">Summary:</div>
                <div class="text-sm text-neutral-300 bg-neutral-800/50 rounded p-2 min-h-[60px] max-h-[100px] overflow-y-auto">
                  {thought2Full?.summary || t2?.summary || 'No summary'}
                </div>
              </div>
            {/if}

            {#if thought2Full?.content || t2?.content}
              <div>
                <div class="text-xs text-neutral-400 mb-1">Content:</div>
                <div class="text-xs text-neutral-300 bg-neutral-800/50 rounded p-2 min-h-[120px] max-h-[180px] overflow-y-auto whitespace-pre-wrap">
                  {thought2Full?.content || t2?.content || 'No content'}
                </div>
              </div>
            {/if}

            {#if t2?.id}
              <button
                on:click={() => goto(`/manifold/thoughts/${t2.id}`)}
                class="w-full px-3 py-1.5 text-xs rounded bg-amber-600/20 border border-amber-500/50 hover:bg-amber-600/40 text-amber-300 transition-all"
              >
                → View Full Thought
              </button>
            {/if}
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="border-t border-amber-500/20 bg-neutral-900/80 px-6 py-4 flex gap-3">
        <button
          on:click={onClose}
          disabled={isProcessing}
          class="flex-1 px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 text-sm font-medium text-neutral-200 transition-all"
        >
          Cancel
        </button>
        <button
          on:click={handleLink}
          disabled={isProcessing || !t1?.id || !t2?.id}
          class="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 text-sm font-medium text-white transition-all shadow-lg hover:shadow-indigo-500/50 active:scale-95"
        >
          {isProcessing ? '🔗 Linking...' : '🔗 Link as Related'}
        </button>
        <button
          on:click={handleDelete}
          disabled={isProcessing || !t2?.id}
          class="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 text-sm font-medium text-white transition-all shadow-lg hover:shadow-red-500/50 active:scale-95"
        >
          {isProcessing ? '🗑️ Deleting...' : '🗑️ Delete Thought 2'}
        </button>
      </div>
    </div>
  </div>
{/if}
