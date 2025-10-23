<script lang="ts">
  import { saveFact, saveObservation, saveHypothesis } from '$lib/services/ariadneService';
  import AutocompleteInput from '$lib/components/shared/AutocompleteInput.svelte';
  import { fetchTickerSuggestions, fetchCompanyNameSuggestions, fetchLabelSuggestions, fetchRelTypeSuggestions } from '$lib/services/ariadneSuggestions';

  let activeForm: 'fact' | 'observation' | 'hypothesis' = 'fact';
  let saving = false;
  let successMessage = '';
  let errorMessage = '';

  // Fact Form
  let fact = {
    source_label: 'Company',
    source_id: '',
    target_label: 'Company',
    target_id: '',
    rel_type: 'SUPPLIES_TO',
    valid_from: new Date().toISOString().slice(0, 16),
    confidence: 0.9,
    source: 'manual',
  };

  // Observation Form
  let observation = {
    date: new Date().toISOString().slice(0, 16),
    content: '',
    tags: '',
    related_tickers: '',
    confidence: 0.9,
  };

  // Hypothesis Form
  let hypothesis = {
    source_id: '',
    source_label: 'Company',
    target_id: '',
    target_label: 'Company',
    hypothesis: '',
    confidence: 0.7,
  };

  async function submitFact() {
    saving = true;
    errorMessage = '';
    successMessage = '';
    try {
      await saveFact(fact);
      successMessage = 'Fact created successfully';
    } catch (e: any) {
      errorMessage = e?.message ?? 'Failed to create fact';
    } finally {
      saving = false;
    }
  }

  async function submitObservation() {
    saving = true;
    errorMessage = '';
    successMessage = '';
    try {
      await saveObservation({
        ...observation,
        tags: observation.tags.split(',').map((t) => t.trim()).filter((t) => t),
        related_tickers: observation.related_tickers
          ? observation.related_tickers.split(',').map((t) => t.trim()).filter((t) => t)
          : undefined,
      });
      successMessage = 'Observation created successfully';
    } catch (e: any) {
      errorMessage = e?.message ?? 'Failed to create observation';
    } finally {
      saving = false;
    }
  }

  async function submitHypothesis() {
    saving = true;
    errorMessage = '';
    successMessage = '';
    try {
      await saveHypothesis(hypothesis);
      successMessage = 'Hypothesis created successfully';
    } catch (e: any) {
      errorMessage = e?.message ?? 'Failed to create hypothesis';
    } finally {
      saving = false;
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-neutral-100 mb-6">Write to Knowledge Graph</h1>

  <!-- Form Selector -->
  <div class="flex gap-2 mb-6 border-b border-neutral-800">
    <button
      class="px-4 py-2 {activeForm === 'fact' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-neutral-400'}"
      on:click={() => (activeForm = 'fact')}
    >
      Fact
    </button>
    <button
      class="px-4 py-2 {activeForm === 'observation' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-neutral-400'}"
      on:click={() => (activeForm = 'observation')}
    >
      Observation
    </button>
    <button
      class="px-4 py-2 {activeForm === 'hypothesis' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-neutral-400'}"
      on:click={() => (activeForm = 'hypothesis')}
    >
      Hypothesis
    </button>
  </div>

  {#if successMessage}
    <div class="mb-4 p-3 bg-green-900/30 border border-green-700 rounded text-green-300">
      {successMessage}
    </div>
  {/if}

  {#if errorMessage}
    <div class="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300">
      {errorMessage}
    </div>
  {/if}

  <!-- Fact Form -->
  {#if activeForm === 'fact'}
    <form on:submit|preventDefault={submitFact} class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Source Label</label>
          <input
            type="text"
            bind:value={fact.source_label}
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Source ID (elementId)</label>
          <input
            type="text"
            bind:value={fact.source_id}
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Target Label</label>
          <input
            type="text"
            bind:value={fact.target_label}
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Target ID (elementId)</label>
          <input
            type="text"
            bind:value={fact.target_id}
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Relation Type</label>
          <input
            type="text"
            bind:value={fact.rel_type}
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Confidence</label>
          <input
            type="number"
            bind:value={fact.confidence}
            min="0"
            max="1"
            step="0.1"
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Valid From</label>
        <input
          type="datetime-local"
          bind:value={fact.valid_from}
          required
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
      >
        {saving ? 'Creating...' : 'Create Fact'}
      </button>
    </form>
  {/if}

  <!-- Observation Form -->
  {#if activeForm === 'observation'}
    <form on:submit|preventDefault={submitObservation} class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Date</label>
        <input
          type="datetime-local"
          bind:value={observation.date}
          required
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Content</label>
        <textarea
          bind:value={observation.content}
          required
          rows="4"
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          bind:value={observation.tags}
          placeholder="e.g., technical, momentum"
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Related Tickers (comma-separated)</label>
        <AutocompleteInput
          bind:value={observation.related_tickers}
          fetchSuggestions={fetchTickerSuggestions}
          placeholder="e.g., NVDA, AMD"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Confidence</label>
        <input
          type="number"
          bind:value={observation.confidence}
          min="0"
          max="1"
          step="0.1"
          required
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
      >
        {saving ? 'Creating...' : 'Create Observation'}
      </button>
    </form>
  {/if}

  <!-- Hypothesis Form -->
  {#if activeForm === 'hypothesis'}
    <form on:submit|preventDefault={submitHypothesis} class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Hypothesis Statement</label>
        <textarea
          bind:value={hypothesis.hypothesis}
          required
          rows="3"
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Source Label</label>
          <input
            type="text"
            bind:value={hypothesis.source_label}
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Source ID (elementId)</label>
          <input
            type="text"
            bind:value={hypothesis.source_id}
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Target Label</label>
          <input
            type="text"
            bind:value={hypothesis.target_label}
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-300 mb-1">Target ID (elementId)</label>
          <input
            type="text"
            bind:value={hypothesis.target_id}
            required
            class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-neutral-300 mb-1">Confidence</label>
        <input
          type="number"
          bind:value={hypothesis.confidence}
          min="0"
          max="1"
          step="0.1"
          required
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
      >
        {saving ? 'Creating...' : 'Create Hypothesis'}
      </button>
    </form>
  {/if}
</div>

