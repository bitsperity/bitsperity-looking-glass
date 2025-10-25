<script lang="ts">
  import { onMount } from 'svelte';
  import { coalescenceClient } from '$lib/coalescence-client';

  let yamlContent = '';
  let loading = true;
  let error: string | null = null;
  let saving = false;
  let useFormView = false;
  let successMessage = '';

  async function loadConfig() {
    try {
      loading = true;
      error = null;
      const config = await coalescenceClient.getConfigAgents();
      yamlContent = config.content;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load configuration';
    } finally {
      loading = false;
    }
  }

  async function saveConfig() {
    try {
      saving = true;
      error = null;
      successMessage = '';
      await coalescenceClient.saveConfigAgents(yamlContent);
      successMessage = '✅ Configuration saved successfully';
      setTimeout(() => {
        successMessage = '';
      }, 3000);
      await coalescenceClient.reloadAgents();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save configuration';
    } finally {
      saving = false;
    }
  }

  async function reloadAgents() {
    try {
      error = null;
      await coalescenceClient.reloadAgents();
      successMessage = '✅ Agents reloaded';
      setTimeout(() => {
        successMessage = '';
      }, 3000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to reload agents';
    }
  }

  onMount(() => {
    loadConfig();
  });
</script>

<div class="flex-1 overflow-auto px-6 pb-6">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold">Agents Configuration</h1>
    <div class="flex items-center gap-2">
      <label class="text-sm text-neutral-400 flex items-center gap-2">
        <input
          type="checkbox"
          bind:checked={useFormView}
          class="rounded"
        />
        Form View (coming soon)
      </label>
    </div>
  </div>

  <!-- Messages -->
  {#if successMessage}
    <div class="bg-green-900/30 border border-green-700 rounded p-4 mb-4 text-green-400">
      {successMessage}
    </div>
  {/if}
  {#if error}
    <div class="bg-red-900/30 border border-red-700 rounded p-4 mb-4 text-red-400">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center h-64 text-neutral-400">
      <div>Loading configuration...</div>
    </div>
  {:else}
    <div class="space-y-4">
      <!-- YAML Editor -->
      <div class="bg-neutral-800 border border-neutral-700 rounded p-4">
        <label class="block text-sm font-semibold mb-3">YAML Configuration</label>
        <textarea
          bind:value={yamlContent}
          rows={20}
          class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded font-mono text-xs focus:outline-none focus:border-blue-500"
          disabled={saving}
        />
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          on:click={saveConfig}
          disabled={saving}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 rounded font-semibold transition-colors"
        >
          {saving ? 'Saving...' : '💾 Save Configuration'}
        </button>
        <button
          on:click={reloadAgents}
          disabled={saving}
          class="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 rounded font-semibold transition-colors"
        >
          🔄 Reload Agents
        </button>
        <button
          on:click={loadConfig}
          disabled={saving}
          class="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 rounded font-semibold transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      <!-- Info -->
      <div class="bg-neutral-800/50 border border-neutral-700 rounded p-4 text-sm text-neutral-400">
        <p>
          Edit the agent configuration in YAML format. Changes are applied immediately when saved. The form view for easier
          configuration will be available soon.
        </p>
      </div>
    </div>
  {/if}
</div>
