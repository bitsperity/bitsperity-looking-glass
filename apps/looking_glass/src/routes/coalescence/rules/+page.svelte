<script lang="ts">
  import { onMount } from 'svelte';
  import { coalescenceClient, type Rule } from '$lib/coalescence-client';
  import CoalescenceNav from '$lib/components/coalescence/CoalescenceNav.svelte';

  interface FormData {
    id?: string;
    name: string;
    content: string;
    description: string;
  }

  let rules: Rule[] = [];
  let loading = true;
  let error = '';
  let success = '';
  let showForm = false;
  let formData: FormData = { name: '', content: '', description: '' };
  let editingId: string | null = null;
  let selectedRule: Rule | null = null;
  let searchTerm = '';

  async function loadRules() {
    try {
      loading = true;
      rules = await coalescenceClient.getAllRules();
      error = '';
    } catch (err) {
      error = `Failed to load rules: ${err}`;
      rules = [];
    } finally {
      loading = false;
    }
  }

  async function handleSave() {
    if (!formData.name || !formData.content) {
      error = 'Name and content are required';
      return;
    }

    try {
      if (editingId) {
        await coalescenceClient.updateRule(editingId, {
          name: formData.name,
          content: formData.content,
          description: formData.description || undefined
        });
        success = `Rule "${formData.name}" updated successfully`;
      } else {
        await coalescenceClient.createRule(formData.name, formData.content, formData.description);
        success = `Rule "${formData.name}" created successfully`;
      }

      resetForm();
      await loadRules();
    } catch (err) {
      error = `Failed to save rule: ${err}`;
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete rule "${name}"?`)) return;

    try {
      await coalescenceClient.deleteRule(id);
      success = `Rule "${name}" deleted successfully`;
      if (selectedRule?.id === id) selectedRule = null;
      await loadRules();
    } catch (err) {
      error = `Failed to delete rule: ${err}`;
    }
  }

  function handleEdit(rule: Rule) {
    editingId = rule.id;
    formData = {
      id: rule.id,
      name: rule.name,
      content: rule.content,
      description: rule.description || ''
    };
    showForm = true;
    selectedRule = null;
  }

  function resetForm() {
    showForm = false;
    editingId = null;
    formData = { name: '', content: '', description: '' };
  }

  function selectRule(rule: Rule) {
    selectedRule = selectedRule?.id === rule.id ? null : rule;
  }

  $: filteredRules = rules.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  onMount(() => {
    loadRules();
  });
</script>

<div class="rules-container">
  <CoalescenceNav currentTab="rules" />

  <div class="rules-content">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1>📋 Agent Rules Library</h1>
        <p>Create and manage reusable rules to configure agent behavior across different turns</p>
      </div>
      {#if !showForm}
        <button class="btn-primary" on:click={() => showForm = true}>
          <span>+ New Rule</span>
        </button>
      {/if}
    </div>

    <!-- Error/Success Messages -->
    {#if error}
      <div class="message error">
        <span>❌ {error}</span>
        <button on:click={() => error = ''}>Dismiss</button>
      </div>
    {/if}

    {#if success}
      <div class="message success">
        <span>✅ {success}</span>
        <button on:click={() => success = ''}>Dismiss</button>
      </div>
    {/if}

    <div class="rules-layout">
      <!-- Main Content -->
      <div class="rules-main">
        {#if showForm}
          <div class="rule-editor">
            <div class="editor-header">
              <h3>{editingId ? 'Edit Rule' : 'Create New Rule'}</h3>
              <button class="btn-text" on:click={resetForm}>✕ Close</button>
            </div>

            <div class="form-group">
              <label for="name">Rule Name *</label>
              <input
                id="name"
                type="text"
                bind:value={formData.name}
                placeholder="e.g., Knowledge Graph Guidelines"
                class="input-field"
              />
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <input
                id="description"
                type="text"
                bind:value={formData.description}
                placeholder="What is this rule for?"
                class="input-field"
              />
            </div>

            <div class="form-group">
              <label for="content">Rule Content *</label>
              <textarea
                id="content"
                bind:value={formData.content}
                placeholder="Enter your rule content here (Markdown supported)..."
                class="textarea-field"
                rows="12"
              />
              <div class="textarea-hint">💡 Markdown formatting is supported. Use # for headings, ** for bold, etc.</div>
            </div>

            <div class="form-actions">
              <button class="btn-primary" on:click={handleSave}>
                <span>{editingId ? '💾 Update Rule' : '✨ Create Rule'}</span>
              </button>
              <button class="btn-secondary" on:click={resetForm}>Cancel</button>
            </div>
          </div>
        {/if}

        {#if !showForm}
          <!-- Search -->
          <div class="search-box">
            <input
              type="text"
              placeholder="🔍 Search rules..."
              bind:value={searchTerm}
              class="search-input"
            />
          </div>

          <!-- Rules Grid -->
          {#if loading}
            <div class="loading">Loading rules...</div>
          {:else if filteredRules.length === 0}
            <div class="empty-state">
              <div class="empty-icon">📭</div>
              <h3>No rules {searchTerm ? 'matching your search' : 'yet'}</h3>
              <p>{searchTerm ? 'Try a different search term' : 'Create your first rule to get started'}</p>
            </div>
          {:else}
            <div class="rules-list">
              {#each filteredRules as rule (rule.id)}
                <div
                  class="rule-card"
                  class:selected={selectedRule?.id === rule.id}
                  on:click={() => selectRule(rule)}
                >
                  <div class="rule-header">
                    <h3>{rule.name}</h3>
                    <div class="rule-actions">
                      <button
                        class="btn-icon"
                        title="Edit"
                        on:click={(e) => {
                          e.stopPropagation();
                          handleEdit(rule);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        class="btn-icon danger"
                        title="Delete"
                        on:click={(e) => {
                          e.stopPropagation();
                          handleDelete(rule.id, rule.name);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {#if rule.description}
                    <p class="rule-description">{rule.description}</p>
                  {/if}

                  <div class="rule-meta">
                    <span class="meta-item">📝 {rule.content.length} chars</span>
                    <span class="meta-item">🕐 {new Date(rule.updated_at).toLocaleDateString()}</span>
                  </div>

                  {#if selectedRule?.id === rule.id}
                    <div class="rule-preview">
                      <h4>Preview</h4>
                      <div class="preview-content">
                        {rule.content}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Sidebar Info -->
      {#if !showForm && selectedRule}
        <div class="rules-sidebar">
          <div class="sidebar-card">
            <h3>Rule Details</h3>
            <div class="detail-group">
              <label>Name</label>
              <p>{selectedRule.name}</p>
            </div>
            {#if selectedRule.description}
              <div class="detail-group">
                <label>Description</label>
                <p>{selectedRule.description}</p>
              </div>
            {/if}
            <div class="detail-group">
              <label>Created</label>
              <p>{new Date(selectedRule.created_at).toLocaleString()}</p>
            </div>
            <div class="detail-group">
              <label>Updated</label>
              <p>{new Date(selectedRule.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .rules-container {
    display: flex;
    height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #e2e8f0;
  }

  .rules-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header {
    padding: 2rem;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.5), rgba(30, 41, 59, 0.5));
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .header-left h1 {
    font-size: 1.875rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header-left p {
    margin: 0;
    color: #94a3b8;
    font-size: 0.95rem;
  }

  .message {
    margin: 1rem 2rem;
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.95rem;
  }

  .message.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .message.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #86efac;
  }

  .message button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 0.9rem;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .message button:hover {
    opacity: 1;
  }

  .rules-layout {
    flex: 1;
    display: flex;
    gap: 2rem;
    padding: 2rem;
    overflow: auto;
  }

  .rules-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .rule-editor {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.1);
    border-radius: 0.75rem;
    padding: 2rem;
    backdrop-filter: blur(10px);
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }

  .editor-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #cbd5e1;
  }

  .input-field,
  .textarea-field {
    padding: 0.75rem;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 0.5rem;
    color: #e2e8f0;
    font-family: inherit;
    font-size: 0.95rem;
    transition: all 0.2s;
  }

  .input-field:focus,
  .textarea-field:focus {
    outline: none;
    border-color: #60a5fa;
    background: rgba(30, 41, 59, 0.8);
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
  }

  .textarea-field {
    resize: vertical;
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .textarea-hint {
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 0.25rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(148, 163, 184, 0.1);
  }

  .search-box {
    display: flex;
  }

  .search-input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 0.5rem;
    color: #e2e8f0;
    font-size: 0.95rem;
    transition: all 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: #60a5fa;
    background: rgba(30, 41, 59, 0.8);
  }

  .rules-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .rule-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.1);
    border-radius: 0.75rem;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .rule-card:hover {
    border-color: rgba(96, 165, 250, 0.3);
    background: rgba(30, 41, 59, 0.7);
  }

  .rule-card.selected {
    background: rgba(96, 165, 250, 0.1);
    border-color: rgba(96, 165, 250, 0.5);
  }

  .rule-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .rule-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: #f1f5f9;
  }

  .rule-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.125rem;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .btn-icon:hover {
    opacity: 1;
  }

  .btn-icon.danger:hover {
    color: #fca5a5;
  }

  .rule-description {
    margin: 0 0 0.75rem 0;
    color: #cbd5e1;
    font-size: 0.9rem;
  }

  .rule-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 1rem;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .rule-preview {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(148, 163, 184, 0.1);
  }

  .rule-preview h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    color: #cbd5e1;
  }

  .preview-content {
    background: rgba(15, 23, 42, 0.5);
    padding: 1rem;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    line-height: 1.6;
    color: #cbd5e1;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    background: rgba(30, 41, 59, 0.5);
    border: 1px dashed rgba(148, 163, 184, 0.2);
    border-radius: 0.75rem;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    color: #f1f5f9;
  }

  .empty-state p {
    margin: 0;
    color: #94a3b8;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #94a3b8;
  }

  .rules-sidebar {
    width: 300px;
  }

  .sidebar-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.1);
    border-radius: 0.75rem;
    padding: 1.5rem;
    sticky: 1rem;
  }

  .sidebar-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: #f1f5f9;
  }

  .detail-group {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }

  .detail-group:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .detail-group label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    display: block;
    margin-bottom: 0.5rem;
  }

  .detail-group p {
    margin: 0;
    font-size: 0.9rem;
    color: #cbd5e1;
  }

  /* Buttons */
  .btn-primary,
  .btn-secondary,
  .btn-text {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, #60a5fa, #3b82f6);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
  }

  .btn-secondary {
    background: rgba(148, 163, 184, 0.1);
    color: #cbd5e1;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .btn-secondary:hover {
    background: rgba(148, 163, 184, 0.2);
    border-color: rgba(148, 163, 184, 0.3);
  }

  .btn-text {
    background: none;
    padding: 0.5rem 0.75rem;
    color: #94a3b8;
  }

  .btn-text:hover {
    color: #cbd5e1;
  }

  @media (max-width: 1024px) {
    .rules-layout {
      gap: 1rem;
      padding: 1rem;
    }

    .rules-sidebar {
      width: 250px;
    }
  }

  @media (max-width: 768px) {
    .rules-layout {
      flex-direction: column;
    }

    .rules-sidebar {
      width: 100%;
    }

    .header {
      flex-direction: column;
      gap: 1rem;
    }
  }
</style>
