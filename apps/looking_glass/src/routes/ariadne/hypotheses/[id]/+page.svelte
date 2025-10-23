<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { fetchHypothesisDetail, addHypothesisEvidence, validateHypothesis } from '$lib/services/ariadneService';
  import ConfidenceBadge from '$lib/components/ariadne/ConfidenceBadge.svelte';
  import type { HypothesisDetail } from '$lib/types/ariadne';
  
  $: id = $page.params.id;
  
  let loading = false;
  let error: string | null = null;
  let data: HypothesisDetail | null = null;
  
  // Evidence Form
  let showEvidenceForm = false;
  let evidenceType: 'supporting' | 'contradicting' = 'supporting';
  let evidenceSourceId = '';
  let evidenceSourceType = 'observation';
  let evidenceConfidence = 0.8;
  let evidenceNotes = '';
  let evidenceAnnotatedBy = 'user';
  let evidenceSaving = false;
  
  // Validation Form
  let showValidationForm = false;
  let validationDecision: 'validate' | 'invalidate' | 'defer' = 'validate';
  let validationReasoning = '';
  let validationValidatedBy = 'user';
  let validationCreatePattern = false;
  let validationSaving = false;
  
  async function load() {
    loading = true;
    error = null;
    try {
      data = await fetchHypothesisDetail(id);
    } catch (e: any) {
      error = e?.message ?? 'Failed to load hypothesis';
    } finally {
      loading = false;
    }
  }
  
  async function submitEvidence() {
    if (!data) return;
    
    evidenceSaving = true;
    try {
      await addHypothesisEvidence(id, {
        hypothesis_id: id,
        evidence_type: evidenceType,
        evidence_source_id: evidenceSourceId,
        evidence_source_type: evidenceSourceType,
        confidence: evidenceConfidence,
        notes: evidenceNotes || undefined,
        annotated_by: evidenceAnnotatedBy,
      });
      showEvidenceForm = false;
      // Reload
      await load();
    } catch (e: any) {
      alert(`Failed to add evidence: ${e?.message ?? 'Unknown error'}`);
    } finally {
      evidenceSaving = false;
    }
  }
  
  async function submitValidation() {
    if (!data) return;
    
    validationSaving = true;
    try {
      await validateHypothesis(id, {
        hypothesis_id: id,
        decision: validationDecision,
        reasoning: validationReasoning,
        validated_by: validationValidatedBy,
        create_pattern: validationCreatePattern,
      });
      showValidationForm = false;
      // Reload
      await load();
    } catch (e: any) {
      alert(`Failed to validate: ${e?.message ?? 'Unknown error'}`);
    } finally {
      validationSaving = false;
    }
  }
  
  onMount(() => {
    load();
  });
</script>

<div class="max-w-7xl mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold text-neutral-100">Hypothesis Detail</h1>
    <a href="/ariadne/hypotheses" class="text-sm text-indigo-400 hover:text-indigo-300">← Back to List</a>
  </div>

  {#if loading}
    <div class="text-neutral-400">Loading...</div>
  {:else if error}
    <div class="text-red-400">Error: {error}</div>
  {:else if data}
    <!-- Hypothesis Info -->
    <div class="mb-6 bg-neutral-900 rounded border border-neutral-800 p-6">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h2 class="text-2xl font-semibold text-neutral-100 mb-2">{data.hypothesis.statement}</h2>
          <div class="text-sm text-neutral-400 mb-2">
            {data.hypothesis.relation_type}: {data.hypothesis.source_entity_id} → {data.hypothesis.target_entity_id}
          </div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <ConfidenceBadge confidence={data.hypothesis.confidence} />
          <span class="inline-block px-2 py-0.5 rounded text-xs font-medium {data.hypothesis.status === 'pending_validation' ? 'bg-yellow-800 text-yellow-100' : data.hypothesis.status === 'validated' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}">
            {data.hypothesis.status}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div>
          <span class="text-neutral-500">Evidence:</span>
          <strong class="text-neutral-100 ml-1">{data.hypothesis.evidence_count}</strong>
        </div>
        <div>
          <span class="text-neutral-500">Contradictions:</span>
          <strong class="text-neutral-100 ml-1">{data.hypothesis.contradiction_count}</strong>
        </div>
        <div>
          <span class="text-neutral-500">Threshold:</span>
          <strong class="text-neutral-100 ml-1">{data.hypothesis.validation_threshold}</strong>
        </div>
        <div>
          <span class="text-neutral-500">Created:</span>
          <strong class="text-neutral-100 ml-1">{new Date(data.hypothesis.created_at).toLocaleDateString()}</strong>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="mb-4">
        <div class="text-xs text-neutral-500 mb-1">Validation Progress</div>
        <div class="w-full h-2 bg-neutral-800 rounded overflow-hidden">
          <div 
            class="h-full bg-green-600"
            style="width: {Math.min(100, (data.hypothesis.evidence_count / data.hypothesis.validation_threshold) * 100)}%"
          ></div>
        </div>
        <div class="text-xs text-neutral-500 mt-1">
          {data.hypothesis.evidence_count} / {data.hypothesis.validation_threshold} 
          {data.hypothesis.evidence_count >= data.hypothesis.validation_threshold ? '✓ Ready for validation' : ''}
        </div>
      </div>

      {#if data.hypothesis.manifold_thought_id}
        <div class="text-xs text-neutral-600">
          <a href="/manifold/thoughts/{data.hypothesis.manifold_thought_id}" class="hover:text-indigo-400">
            → Manifold Thought: {data.hypothesis.manifold_thought_id}
          </a>
        </div>
      {/if}
    </div>

    <!-- Actions -->
    <div class="mb-6 flex gap-3">
      <button
        on:click={() => showEvidenceForm = !showEvidenceForm}
        class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        + Add Evidence
      </button>
      {#if data.hypothesis.evidence_count >= data.hypothesis.validation_threshold}
        <button
          on:click={() => showValidationForm = !showValidationForm}
          class="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white"
        >
          Validate / Invalidate
        </button>
      {/if}
    </div>

    <!-- Evidence Form -->
    {#if showEvidenceForm}
      <div class="mb-6 bg-neutral-900 rounded border border-neutral-800 p-6">
        <h3 class="text-lg font-semibold text-neutral-100 mb-4">Add Evidence</h3>
        <form on:submit|preventDefault={submitEvidence} class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-300 mb-1">Type</label>
              <select
                bind:value={evidenceType}
                class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
              >
                <option value="supporting">Supporting</option>
                <option value="contradicting">Contradicting</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-300 mb-1">Source Type</label>
              <input
                type="text"
                bind:value={evidenceSourceType}
                placeholder="e.g., observation, news"
                class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1">Source ID</label>
            <input
              type="text"
              bind:value={evidenceSourceId}
              required
              placeholder="Node elementId or external ID"
              class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1">Confidence</label>
            <input
              type="number"
              bind:value={evidenceConfidence}
              min="0"
              max="1"
              step="0.1"
              class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1">Notes</label>
            <textarea
              bind:value={evidenceNotes}
              rows="3"
              class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1">Annotated By</label>
            <input
              type="text"
              bind:value={evidenceAnnotatedBy}
              class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
            />
          </div>

          <div class="flex gap-2">
            <button
              type="submit"
              disabled={evidenceSaving}
              class="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
            >
              {evidenceSaving ? 'Saving...' : 'Submit Evidence'}
            </button>
            <button
              type="button"
              on:click={() => showEvidenceForm = false}
              class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    {/if}

    <!-- Validation Form -->
    {#if showValidationForm}
      <div class="mb-6 bg-neutral-900 rounded border border-neutral-800 p-6">
        <h3 class="text-lg font-semibold text-neutral-100 mb-4">Validate Hypothesis</h3>
        <form on:submit|preventDefault={submitValidation} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1">Decision</label>
            <select
              bind:value={validationDecision}
              class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
            >
              <option value="validate">Validate</option>
              <option value="invalidate">Invalidate</option>
              <option value="defer">Defer</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1">Reasoning</label>
            <textarea
              bind:value={validationReasoning}
              required
              rows="3"
              class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-300 mb-1">Validated By</label>
            <input
              type="text"
              bind:value={validationValidatedBy}
              class="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100"
            />
          </div>

          {#if validationDecision === 'validate'}
            <div>
              <label class="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  bind:checked={validationCreatePattern}
                  class="rounded bg-neutral-950 border-neutral-700"
                />
                Create Pattern from validated hypothesis
              </label>
            </div>
          {/if}

          <div class="flex gap-2">
            <button
              type="submit"
              disabled={validationSaving}
              class="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              {validationSaving ? 'Saving...' : 'Submit Decision'}
            </button>
            <button
              type="button"
              on:click={() => showValidationForm = false}
              class="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    {/if}

    <!-- Supporting Evidence -->
    <div class="mb-6">
      <h3 class="text-xl font-semibold text-neutral-200 mb-3">Supporting Evidence ({data.supporting_evidence.length})</h3>
      {#if data.supporting_evidence.length === 0}
        <div class="text-neutral-400">No supporting evidence yet</div>
      {:else}
        <div class="space-y-2">
          {#each data.supporting_evidence as ev}
            <div class="bg-neutral-900 rounded border border-neutral-800 p-4">
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <div class="text-sm font-medium text-neutral-100">
                    {ev.source_type}: {ev.source_name || ev.source_id}
                  </div>
                  {#if ev.notes}
                    <div class="text-xs text-neutral-400 mt-1">{ev.notes}</div>
                  {/if}
                </div>
                <ConfidenceBadge confidence={ev.confidence} />
              </div>
              {#if ev.annotated_by}
                <div class="text-xs text-neutral-600">By: {ev.annotated_by}</div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Contradictions -->
    <div>
      <h3 class="text-xl font-semibold text-neutral-200 mb-3">Contradictions ({data.contradictions.length})</h3>
      {#if data.contradictions.length === 0}
        <div class="text-neutral-400">No contradictions</div>
      {:else}
        <div class="space-y-2">
          {#each data.contradictions as ev}
            <div class="bg-neutral-900 rounded border border-red-900/30 p-4">
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <div class="text-sm font-medium text-neutral-100">
                    {ev.source_type}: {ev.source_name || ev.source_id}
                  </div>
                  {#if ev.notes}
                    <div class="text-xs text-neutral-400 mt-1">{ev.notes}</div>
                  {/if}
                </div>
                <ConfidenceBadge confidence={ev.confidence} />
              </div>
              {#if ev.annotated_by}
                <div class="text-xs text-neutral-600">By: {ev.annotated_by}</div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

