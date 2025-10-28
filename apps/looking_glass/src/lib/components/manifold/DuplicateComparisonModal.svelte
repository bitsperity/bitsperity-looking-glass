<script lang="ts">
  import { goto } from '$app/navigation';

  export let open: boolean = false;
  export let duplicate: any = null;
  export let onLink: (id1: string, id2: string) => void = () => {};
  export let onDelete: (id: string) => void = () => {};
  export let onClose: () => void = () => {};

  let isProcessing = false;

  // Handle both naming conventions: thought1 or thought_1
  $: t1 = duplicate?.thought1 || duplicate?.thought_1;
  $: t2 = duplicate?.thought2 || duplicate?.thought_2;
  $: similarity = duplicate?.similarity ? (duplicate.similarity * 100).toFixed(1) : '?';

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
</script>

{#if open && (t1 || t2)}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
    <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-neutral-900 border border-amber-500/30 rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl my-auto">
      
      <!-- Header -->
      <div class="border-b border-amber-500/20 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-transparent flex-shrink-0">
        <div>
          <h2 class="text-lg font-bold text-neutral-100">🔍 Duplicate Comparison</h2>
          <p class="text-xs text-amber-400 mt-1">{similarity}% similarity - All info to decide</p>
        </div>
        <button
          on:click={onClose}
          class="text-2xl text-neutral-400 hover:text-neutral-300 transition-colors"
          disabled={isProcessing}
        >
          ✕
        </button>
      </div>

      <!-- Content Area - 2 Columns with Full Content -->
      <div class="flex-1 overflow-auto">
        <div class="grid grid-cols-2 gap-4 p-6">
          <!-- LEFT: Thought 1 -->
          <div class="space-y-4 bg-neutral-900/50 border border-indigo-500/30 rounded-lg p-4">
            <div class="space-y-2 pb-3 border-b border-indigo-500/20">
              <div class="text-xs font-semibold text-indigo-400">THOUGHT 1</div>
              <h3 class="text-base font-bold text-neutral-100">{t1?.title || 'Untitled'}</h3>
              <div class="flex gap-2 flex-wrap">
                <span class="px-2 py-1 text-xs rounded bg-indigo-950/50 border border-indigo-500/30 text-indigo-300">
                  {t1?.type || 'thought'}
                </span>
                {#if t1?.status}
                  <span class="px-2 py-1 text-xs rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                    {t1.status}
                  </span>
                {/if}
                {#if t1?.confidence_level}
                  <span class="px-2 py-1 text-xs rounded bg-purple-950/50 border border-purple-500/30 text-purple-300">
                    {t1.confidence_level}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Summary -->
            {#if t1?.summary}
              <div>
                <div class="text-xs font-semibold text-indigo-400 mb-2">Summary</div>
                <div class="text-sm text-neutral-300 bg-neutral-800/50 rounded p-3 leading-relaxed">
                  {t1.summary}
                </div>
              </div>
            {/if}

            <!-- Content -->
            {#if t1?.content}
              <div>
                <div class="text-xs font-semibold text-indigo-400 mb-2">Content</div>
                <div class="text-sm text-neutral-300 bg-neutral-800/50 rounded p-3 leading-relaxed max-h-[35vh] overflow-y-auto whitespace-pre-wrap">
                  {t1.content}
                </div>
              </div>
            {/if}

            <!-- Metadata -->
            <div class="space-y-1 text-xs text-neutral-400 pt-2 border-t border-indigo-500/20">
              {#if t1?.id}
                <div><span class="text-neutral-500">ID:</span> <code class="text-indigo-300">{t1.id}</code></div>
              {/if}
              {#if t1?.created_at}
                <div><span class="text-neutral-500">Created:</span> <span class="text-neutral-300">{new Date(t1.created_at).toLocaleDateString()}</span></div>
              {/if}
              {#if t1?.session_id}
                <div><span class="text-neutral-500">Session:</span> <span class="text-neutral-300">{t1.session_id}</span></div>
              {/if}
            </div>
          </div>

          <!-- RIGHT: Thought 2 -->
          <div class="space-y-4 bg-neutral-900/50 border border-amber-500/30 rounded-lg p-4">
            <div class="space-y-2 pb-3 border-b border-amber-500/20">
              <div class="text-xs font-semibold text-amber-400">THOUGHT 2 (Potential Duplicate)</div>
              <h3 class="text-base font-bold text-neutral-100">{t2?.title || 'Untitled'}</h3>
              <div class="flex gap-2 flex-wrap">
                <span class="px-2 py-1 text-xs rounded bg-amber-950/50 border border-amber-500/30 text-amber-300">
                  {t2?.type || 'thought'}
                </span>
                {#if t2?.status}
                  <span class="px-2 py-1 text-xs rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                    {t2.status}
                  </span>
                {/if}
                {#if t2?.confidence_level}
                  <span class="px-2 py-1 text-xs rounded bg-purple-950/50 border border-purple-500/30 text-purple-300">
                    {t2.confidence_level}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Summary -->
            {#if t2?.summary}
              <div>
                <div class="text-xs font-semibold text-amber-400 mb-2">Summary</div>
                <div class="text-sm text-neutral-300 bg-neutral-800/50 rounded p-3 leading-relaxed">
                  {t2.summary}
                </div>
              </div>
            {/if}

            <!-- Content -->
            {#if t2?.content}
              <div>
                <div class="text-xs font-semibold text-amber-400 mb-2">Content</div>
                <div class="text-sm text-neutral-300 bg-neutral-800/50 rounded p-3 leading-relaxed max-h-[35vh] overflow-y-auto whitespace-pre-wrap">
                  {t2.content}
                </div>
              </div>
            {/if}

            <!-- Metadata -->
            <div class="space-y-1 text-xs text-neutral-400 pt-2 border-t border-amber-500/20">
              {#if t2?.id}
                <div><span class="text-neutral-500">ID:</span> <code class="text-amber-300">{t2.id}</code></div>
              {/if}
              {#if t2?.created_at}
                <div><span class="text-neutral-500">Created:</span> <span class="text-neutral-300">{new Date(t2.created_at).toLocaleDateString()}</span></div>
              {/if}
              {#if t2?.session_id}
                <div><span class="text-neutral-500">Session:</span> <span class="text-neutral-300">{t2.session_id}</span></div>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="border-t border-amber-500/20 bg-neutral-900/80 px-6 py-4 flex gap-3 flex-shrink-0">
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
