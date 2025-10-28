<script lang="ts">
  import * as api from '$lib/api/manifold';
  import GlassPanel from './GlassPanel.svelte';

  export let open: boolean = false;
  export let onSuccess: () => void = () => {};

  let loading = false;
  let error: string | null = null;
  let form = {
    title: '',
    summary: '',
    content: '',
    type: 'analysis',
    session_id: 'default',
    status: 'active',
    confidence_level: 'medium'
  };

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = null;

    try {
      const body = {
        title: form.title,
        summary: form.summary,
        content: form.content,
        type: form.type,
        session_id: form.session_id,
        status: form.status,
        confidence_level: form.confidence_level
      };

      const result = await api.createThought(body);

      if (result.status === 'ok' || result.thought_id) {
        // Reset form
        form = {
          title: '',
          summary: '',
          content: '',
          type: 'analysis',
          session_id: 'default',
          status: 'active',
          confidence_level: 'medium'
        };
        open = false;
        onSuccess();
      } else {
        error = 'Failed to create thought';
      }
    } catch (e: any) {
      error = e?.message ?? 'Error creating thought';
    } finally {
      loading = false;
    }
  }

  function closeModal() {
    open = false;
    error = null;
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <GlassPanel class="w-full max-w-2xl max-h-[90vh] overflow-auto">
      <div class="space-y-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-neutral-100">✨ Create New Thought</h2>
          <button
            on:click={closeModal}
            class="text-2xl text-neutral-400 hover:text-neutral-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {#if error}
          <div class="p-3 rounded bg-red-950/30 border border-red-500/50 text-sm text-red-300">
            {error}
          </div>
        {/if}

        <form on:submit={handleSubmit} class="space-y-4">
          <!-- Title -->
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1 block">Title *</label>
            <input
              type="text"
              bind:value={form.title}
              required
              placeholder="Enter thought title"
              class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <!-- Summary -->
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1 block">Summary</label>
            <textarea
              bind:value={form.summary}
              placeholder="Brief summary..."
              rows="2"
              class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <!-- Content -->
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1 block">Content</label>
            <textarea
              bind:value={form.content}
              placeholder="Full thought content..."
              rows="4"
              class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <!-- Type, Session, Status -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label class="text-xs font-medium text-neutral-400 mb-1 block">Type</label>
              <select
                bind:value={form.type}
                class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="observation">Observation</option>
                <option value="analysis">Analysis</option>
                <option value="hypothesis">Hypothesis</option>
                <option value="decision">Decision</option>
                <option value="reflection">Reflection</option>
                <option value="question">Question</option>
                <option value="summary">Summary</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-medium text-neutral-400 mb-1 block">Status</label>
              <select
                bind:value={form.status}
                class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="active">Active</option>
                <option value="validated">Validated</option>
                <option value="invalidated">Invalidated</option>
              </select>
            </div>

            <div>
              <label class="text-xs font-medium text-neutral-400 mb-1 block">Confidence</label>
              <select
                bind:value={form.confidence_level}
                class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <!-- Session ID -->
          <div>
            <label class="text-sm font-medium text-neutral-300 mb-1 block">Session ID</label>
            <input
              type="text"
              bind:value={form.session_id}
              placeholder="default"
              class="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <!-- Buttons -->
          <div class="flex gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              on:click={closeModal}
              class="flex-1 px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-sm font-medium text-white transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.title}
              class="flex-1 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-600 text-sm font-medium text-white transition-all duration-150 shadow-lg hover:shadow-indigo-500/50 active:scale-95"
            >
              {loading ? 'Creating…' : 'Create Thought'}
            </button>
          </div>
        </form>
      </div>
    </GlassPanel>
  </div>
{/if}

<style>
</style>
