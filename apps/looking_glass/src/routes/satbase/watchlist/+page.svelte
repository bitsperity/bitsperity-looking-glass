<script lang="ts">
	import { onMount } from 'svelte';
	import * as satbaseApi from '$lib/api/satbase';

	// Data
	let items: any[] = [];
	let loading = true;
	let error = '';

	// UI State
	let activeTab: 'browse' | 'add' = 'browse';
	let selectedType: 'stock' | 'topic' | 'macro' | 'all' = 'all';
	let showOnlyActive = true;
	let searchQuery = '';
	let refreshing = false;

	// Add Form State
	let addType: 'stock' | 'topic' | 'macro' = 'stock';
	let addKey = '';
	let addLabel = '';
	let addTtlDays: number | null = null; // null = no expiration
	let addAutoIngest = true;
	let addActiveFrom = '';
	let addActiveTo = '';
	let addLoading = false;

	// Modals
	let selectedItem: any = null;
	let showDetailModal = false;
	let editingItem: any = null;
	let editEnabled: boolean | null = null;
	let editTtlDays: number | null = null;
	let editActiveFrom = '';
	let editActiveTo = '';
	let editLoading = false;

	// Bulk Operations
	let selectedIds = new Set<number>();

	onMount(() => {
		loadItems();
	});

	async function loadItems() {
		loading = true;
		error = '';
		try {
			const typeFilter = selectedType === 'all' ? undefined : selectedType;
			const response = await satbaseApi.getWatchlistItems({
				type: typeFilter,
				active_now: showOnlyActive,
				q: searchQuery || undefined
			});
			items = response.items || [];
		} catch (e) {
			error = `Failed to load items: ${e}`;
		} finally {
			loading = false;
		}
	}

	async function handleAddItems() {
		if (!addKey.trim()) {
			error = 'Key required';
			return;
		}

		addLoading = true;
		error = '';

		try {
			const itemData: any = {
				type: addType,
				key: addKey.toUpperCase(),
				auto_ingest: addAutoIngest
			};

			if (addLabel) itemData.label = addLabel;
			// Only send ttl_days if provided and > 0 (null/0 = no expiration)
			if (addTtlDays !== null && addTtlDays > 0) {
				itemData.ttl_days = addTtlDays;
			}
			if (addActiveFrom) itemData.active_from = addActiveFrom;
			if (addActiveTo) itemData.active_to = addActiveTo;

			await satbaseApi.addWatchlistItems({ items: [itemData] });

			// Reset form
			addKey = '';
			addLabel = '';
			addTtlDays = null;
			addAutoIngest = true;
			addActiveFrom = '';
			addActiveTo = '';
			activeTab = 'browse';

			await loadItems();
		} catch (e) {
			error = `Failed to add item: ${e}`;
		} finally {
			addLoading = false;
		}
	}

	function openDetail(item: any) {
		selectedItem = item;
		editingItem = JSON.parse(JSON.stringify(item));
		editEnabled = item.enabled === 1;
		editTtlDays = null;
		editActiveFrom = item.active_from || '';
		editActiveTo = item.active_to || '';
		showDetailModal = true;
	}

	async function handleUpdate() {
		if (!editingItem) return;

		editLoading = true;
		error = '';

		try {
			const updates: any = {};

			if (editEnabled !== null && editEnabled !== (selectedItem.enabled === 1)) {
				updates.enabled = editEnabled;
			}

			// Handle TTL: null or 0 = no expiration, > 0 = set expiration
			if (editTtlDays !== null) {
				if (editTtlDays === 0) {
					// Explicitly set to null to remove expiration
					updates.expires_at = null;
				} else if (editTtlDays > 0) {
					updates.ttl_days = editTtlDays;
				}
			}

			// Time windows
			if (editEnabled === true && !editActiveFrom && !editActiveTo) {
				// Enabling without windows = clear windows
				updates.active_from = null;
				updates.active_to = null;
			} else if (editActiveFrom || editActiveTo) {
				if (editActiveFrom) updates.active_from = editActiveFrom;
				if (editActiveTo) updates.active_to = editActiveTo;
			}

			if (Object.keys(updates).length > 0) {
				await satbaseApi.updateWatchlistItem(selectedItem.id, updates);
				showDetailModal = false;
				await loadItems();
			}
		} catch (e) {
			error = `Failed to update: ${e}`;
		} finally {
			editLoading = false;
		}
	}

	async function handleDelete(itemId: number) {
		if (!confirm('Delete item?')) return;

		try {
			await satbaseApi.deleteWatchlistItem(itemId);
			await loadItems();
		} catch (e) {
			error = `Failed to delete: ${e}`;
		}
	}

	async function handleRefresh() {
		refreshing = true;
		error = '';

		try {
			const result = await satbaseApi.refreshWatchlist({});
			const jobCount = result.jobs?.length || 0;
			alert(`✅ Triggered ${jobCount} refresh jobs`);
			// Reload after refresh
			await loadItems();
		} catch (e) {
			error = `Failed to refresh: ${e}`;
		} finally {
			refreshing = false;
		}
	}

	async function handleBulkEnable() {
		if (selectedIds.size === 0) return;
		for (const id of selectedIds) {
			await satbaseApi.updateWatchlistItem(id, { enabled: true });
		}
		selectedIds.clear();
		await loadItems();
	}

	async function handleBulkDisable() {
		if (selectedIds.size === 0) return;
		for (const id of selectedIds) {
			await satbaseApi.updateWatchlistItem(id, { enabled: false });
		}
		selectedIds.clear();
		await loadItems();
	}

	async function handleBulkDelete() {
		if (selectedIds.size === 0 || !confirm('Delete selected items?')) return;
		for (const id of selectedIds) {
			await satbaseApi.deleteWatchlistItem(id);
		}
		selectedIds.clear();
		await loadItems();
	}

	function toggleSelection(id: number) {
		if (selectedIds.has(id)) {
			selectedIds.delete(id);
		} else {
			selectedIds.add(id);
		}
		selectedIds = selectedIds;
	}

	function getTypeIcon(type: string) {
		return { stock: '📈', topic: '📰', macro: '📊' }[type] || '📌';
	}

	function getTypeColor(type: string) {
		return {
			stock: '#3b82f6',
			topic: '#8b5cf6',
			macro: '#10b981'
		}[type] || '#6b7280';
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '-';
		try {
			return new Date(dateStr).toLocaleDateString();
		} catch {
			return dateStr;
		}
	}

	function isExpired(expiresAt: string | null) {
		if (!expiresAt) return false;
		return new Date(expiresAt) < new Date();
	}

	function isInactive(item: any) {
		return item.enabled === 0 || item.deleted === 1;
	}

	function filteredItems() {
		return items.filter(item => {
			if (selectedType !== 'all' && item.type !== selectedType) return false;
			if (searchQuery && !item.key.toLowerCase().includes(searchQuery.toLowerCase())) return false;
			return true;
		});
	}
</script>

<div class="watchlist-container">
	<!-- Header -->
	<div class="watchlist-header">
		<div class="header-title">
			<h1>📈 Watchlist Manager</h1>
			<p>Manage stocks, topics, and macro series for continuous monitoring</p>
		</div>

		<div class="header-stats">
			<div class="stat">
				<strong>{items.length}</strong> Items
			</div>
			<div class="stat">
				<strong>{items.filter(i => i.enabled === 1 && i.deleted === 0).length}</strong> Active
			</div>
			<div class="stat">
				<strong>{items.filter(i => i.enabled === 0 || i.deleted === 1).length}</strong> Inactive
			</div>
		</div>

		<button
			class="btn-refresh"
			on:click={handleRefresh}
			disabled={refreshing || items.length === 0}
		>
			{#if refreshing}
				⏳ Refreshing...
			{:else}
				🔄 Refresh Now
			{/if}
		</button>
	</div>

	<!-- Tab Navigation -->
	<div class="tabs">
		<button
			class="tab"
			class:active={activeTab === 'browse'}
			on:click={() => (activeTab = 'browse')}
		>
			📋 Browse & Manage
		</button>
		<button
			class="tab"
			class:active={activeTab === 'add'}
			on:click={() => (activeTab = 'add')}
		>
			➕ Add Item
		</button>
	</div>

	<!-- Browse Tab -->
	{#if activeTab === 'browse'}
		<div class="browse-container">
			<!-- Filters -->
			<div class="filters">
				<input
					type="text"
					placeholder="🔍 Search keys..."
					bind:value={searchQuery}
					on:input={loadItems}
					class="search-input"
				/>

				<select bind:value={selectedType} on:change={loadItems} class="type-filter">
					<option value="all">📌 All Types</option>
					<option value="stock">📈 Stocks</option>
					<option value="topic">📰 Topics</option>
					<option value="macro">📊 Macro</option>
				</select>

				<label class="filter-toggle">
					<input type="checkbox" bind:checked={showOnlyActive} on:change={loadItems} />
					Active Only
				</label>
			</div>

			<!-- Bulk Actions -->
			{#if selectedIds.size > 0}
				<div class="bulk-actions">
					<span>{selectedIds.size} selected</span>
					<button class="btn-small btn-enable" on:click={handleBulkEnable}>
						✅ Enable
					</button>
					<button class="btn-small btn-disable" on:click={handleBulkDisable}>
						❌ Disable
					</button>
					<button class="btn-small btn-delete" on:click={handleBulkDelete}>
						🗑️ Delete
					</button>
				</div>
			{/if}

			<!-- Items Grid -->
			<div class="items-grid">
				{#if loading}
					<div class="loading">Loading items...</div>
				{:else if error}
					<div class="error">{error}</div>
				{:else if filteredItems().length === 0}
					<div class="empty">
						<p>No watchlist items found</p>
						<p>Click "Add Item" to get started</p>
					</div>
				{:else}
					{#each filteredItems() as item (item.id)}
						<div
							class="item-card"
							class:inactive={isInactive(item)}
							class:expired={isExpired(item.expires_at)}
						>
							<!-- Checkbox -->
							<input
								type="checkbox"
								checked={selectedIds.has(item.id)}
								on:change={() => toggleSelection(item.id)}
								class="item-checkbox"
							/>

							<!-- Header -->
							<div class="item-header">
								<div class="item-type-badge" style="background-color: {getTypeColor(item.type)}">
									{getTypeIcon(item.type)} {item.type.toUpperCase()}
								</div>

								<div class="item-key">
									<strong>{item.key}</strong>
									{#if item.label}
										<span class="item-label">{item.label}</span>
									{/if}
								</div>

								<div class="item-status">
									{#if item.deleted === 1}
										<span class="badge badge-deleted">🗑️ Deleted</span>
									{:else if item.enabled === 0}
										<span class="badge badge-inactive">⏸️ Inactive</span>
									{:else if isExpired(item.expires_at)}
										<span class="badge badge-expired">⏱️ Expired</span>
									{:else}
										<span class="badge badge-active">✅ Active</span>
									{/if}
								</div>
							</div>

							<!-- Metadata -->
							<div class="item-meta">
								<div class="meta-row">
									<span class="label">Added:</span>
									<span>{formatDate(item.added_at)}</span>
								</div>

								<div class="meta-row">
									<span class="label">Expires:</span>
									<span>{item.expires_at ? formatDate(item.expires_at) : 'Never'}</span>
								</div>

								{#if item.active_from || item.active_to}
									<div class="meta-row">
										<span class="label">Window:</span>
										<span>
											{item.active_from ? new Date(item.active_from).toLocaleString().slice(0, 16) : 'Any'}
											→
											{item.active_to ? new Date(item.active_to).toLocaleString().slice(0, 16) : 'Any'}
										</span>
									</div>
								{/if}

								<div class="meta-row">
									<span class="label">Auto-Ingest:</span>
									<span>{item.auto_ingest === 1 ? '✅' : '❌'}</span>
								</div>

								{#if item.last_refresh_at}
									<div class="meta-row">
										<span class="label">Last Refresh:</span>
										<span>{new Date(item.last_refresh_at).toLocaleString().slice(0, 16)}</span>
									</div>
								{/if}
							</div>

							<!-- Actions -->
							<div class="item-actions">
								<button class="btn-action" on:click={() => openDetail(item)}>
									⚙️ Edit
								</button>
								<button
									class="btn-action btn-danger"
									on:click={() => handleDelete(item.id)}
								>
									🗑️ Delete
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<!-- Add Tab -->
	{#if activeTab === 'add'}
		<div class="add-container">
			<div class="add-form">
				<!-- Type Selection -->
				<div class="form-group">
					<label>Item Type</label>
					<div class="type-selector">
						<button
							class="type-btn"
							class:active={addType === 'stock'}
							on:click={() => (addType = 'stock')}
						>
							📈 Stock
						</button>
						<button
							class="type-btn"
							class:active={addType === 'topic'}
							on:click={() => (addType = 'topic')}
						>
							📰 Topic
						</button>
						<button
							class="type-btn"
							class:active={addType === 'macro'}
							on:click={() => (addType = 'macro')}
						>
							📊 Macro
						</button>
					</div>
				</div>

				<!-- Key -->
				<div class="form-group">
					<label>
						{addType === 'stock' ? 'Stock Symbol' : addType === 'topic' ? 'Topic Name' : 'FRED Series ID'}
						<span class="required">*</span>
					</label>
					<input
						type="text"
						placeholder={addType === 'stock' ? 'e.g., AAPL' : addType === 'topic' ? 'e.g., AI' : 'e.g., GDP'}
						bind:value={addKey}
						class="input"
					/>
				</div>

				<!-- Label (optional) -->
				<div class="form-group">
					<label>Label (optional)</label>
					<input
						type="text"
						placeholder="e.g., Apple Inc."
						bind:value={addLabel}
						class="input"
					/>
				</div>

				<!-- TTL -->
				<div class="form-group">
					<label>Time-to-Live (days, optional)</label>
					<input
						type="number"
						min="0"
						placeholder="Leave empty for no expiration"
						bind:value={addTtlDays}
						class="input"
					/>
					<p class="hint">Leave empty or set to 0 for items that never expire</p>
				</div>

				<!-- Auto-Ingest -->
				<div class="form-group">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={addAutoIngest} />
						Auto-Ingest (scheduler will refresh automatically)
					</label>
				</div>

				<!-- Time Windows (optional) -->
				<div class="form-group">
					<label>Active Time Window (optional)</label>
					<p class="hint">Leave empty for always active</p>
					<div class="time-inputs">
						<input
							type="datetime-local"
							placeholder="From"
							bind:value={addActiveFrom}
							class="input time-input"
						/>
						<span class="separator">→</span>
						<input
							type="datetime-local"
							placeholder="To"
							bind:value={addActiveTo}
							class="input time-input"
						/>
					</div>
				</div>

				<!-- Actions -->
				<div class="form-actions">
					<button
						class="btn-primary"
						on:click={handleAddItems}
						disabled={addLoading}
					>
						{#if addLoading}
							⏳ Adding...
						{:else}
							✨ Add Item
						{/if}
					</button>
					<button
						class="btn-secondary"
						on:click={() => {
							activeTab = 'browse';
							addKey = '';
							addLabel = '';
							addActiveFrom = '';
							addActiveTo = '';
						}}
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Detail Modal -->
	{#if showDetailModal && selectedItem}
		<div class="modal-overlay" on:click={() => (showDetailModal = false)}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h2>{selectedItem.type.toUpperCase()}: {selectedItem.key}</h2>
					<button class="btn-close" on:click={() => (showDetailModal = false)}>✕</button>
				</div>

				<div class="modal-body">
					<!-- Enabled Toggle -->
					<div class="form-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								checked={editEnabled || false}
								on:change={(e) => (editEnabled = e.currentTarget.checked)}
							/>
							Enabled
						</label>
						<p class="hint">Disabled items won't be included in refresh operations</p>
					</div>

					<!-- TTL -->
					<div class="form-group">
						<label>Time-to-Live (days, optional)</label>
						<input
							type="number"
							min="0"
							placeholder="Leave empty or 0 for no expiration"
							bind:value={editTtlDays}
							class="input"
						/>
						<p class="hint">Set to 0 or leave empty to remove expiration</p>
					</div>

					<!-- Time Windows -->
					<div class="form-group">
						<label>Active Time Window</label>
						<p class="hint">Leave empty to remove window</p>
						<div class="time-inputs">
							<input
								type="datetime-local"
								bind:value={editActiveFrom}
								class="input time-input"
							/>
							<span class="separator">→</span>
							<input
								type="datetime-local"
								bind:value={editActiveTo}
								class="input time-input"
							/>
						</div>
					</div>

					<!-- Current Status -->
					<div class="form-group">
						<label>Current Status</label>
						<div class="status-display">
							<p><strong>Added:</strong> {formatDate(selectedItem.added_at)}</p>
							<p><strong>Expires:</strong> {selectedItem.expires_at ? formatDate(selectedItem.expires_at) : 'Never'}</p>
							{#if selectedItem.last_refresh_at}
								<p><strong>Last Refresh:</strong> {new Date(selectedItem.last_refresh_at).toLocaleString()}</p>
							{/if}
						</div>
					</div>
				</div>

				<div class="modal-footer">
					<button
						class="btn-primary"
						on:click={handleUpdate}
						disabled={editLoading}
					>
						{#if editLoading}
							⏳ Saving...
						{:else}
							💾 Save Changes
						{/if}
					</button>
					<button class="btn-secondary" on:click={() => (showDetailModal = false)}>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.watchlist-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.watchlist-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding: 1.5rem;
		background: linear-gradient(135deg, #1e293b, #0f172a);
		border-radius: 0.75rem;
		border: 1px solid rgba(71, 85, 105, 0.2);
	}

	.header-title {
		flex: 1;
	}

	.header-title h1 {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: #e2e8f0;
	}

	.header-title p {
		margin: 0;
		color: #94a3b8;
		font-size: 0.9rem;
	}

	.header-stats {
		display: flex;
		gap: 1.5rem;
	}

	.stat {
		text-align: center;
		padding: 0.75rem 1.25rem;
		background: rgba(71, 85, 105, 0.1);
		border-radius: 0.5rem;
	}

	.stat strong {
		display: block;
		font-size: 1.5rem;
		color: #06b6d4;
	}

	.stat {
		color: #94a3b8;
		font-size: 0.8rem;
	}

	.btn-refresh {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn-refresh:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
	}

	.btn-refresh:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tabs {
		display: flex;
		gap: 1rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.2);
	}

	.tab {
		padding: 1rem 1.5rem;
		background: none;
		border: none;
		color: #94a3b8;
		font-weight: 600;
		cursor: pointer;
		border-bottom: 3px solid transparent;
		transition: all 0.2s ease;
	}

	.tab:hover {
		color: #cbd5e1;
	}

	.tab.active {
		color: #06b6d4;
		border-bottom-color: #06b6d4;
	}

	.browse-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.filters {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.search-input {
		flex: 1;
		min-width: 250px;
		padding: 0.75rem 1rem;
		background: rgba(71, 85, 105, 0.1);
		border: 1px solid rgba(71, 85, 105, 0.2);
		border-radius: 0.5rem;
		color: #e2e8f0;
		font-size: 0.9rem;
	}

	.search-input::placeholder {
		color: #64748b;
	}

	.type-filter {
		padding: 0.75rem 1rem;
		background: rgba(71, 85, 105, 0.1);
		border: 1px solid rgba(71, 85, 105, 0.2);
		border-radius: 0.5rem;
		color: #e2e8f0;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.filter-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #94a3b8;
		cursor: pointer;
	}

	.filter-toggle input {
		cursor: pointer;
	}

	.bulk-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 0.5rem;
	}

	.bulk-actions span {
		flex: 1;
		color: #94a3b8;
		font-weight: 500;
	}

	.btn-small {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.btn-enable {
		background: rgba(16, 185, 129, 0.2);
		color: #10b981;
	}

	.btn-disable {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.btn-delete {
		background: rgba(107, 114, 128, 0.2);
		color: #6b7280;
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.item-card {
		padding: 1.5rem;
		background: rgba(30, 41, 59, 0.5);
		border: 1px solid rgba(71, 85, 105, 0.2);
		border-radius: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		transition: all 0.2s ease;
	}

	.item-card:hover {
		border-color: rgba(71, 85, 105, 0.4);
		background: rgba(30, 41, 59, 0.7);
	}

	.item-card.inactive {
		opacity: 0.6;
	}

	.item-card.expired {
		border-color: rgba(239, 68, 68, 0.3);
	}

	.item-checkbox {
		cursor: pointer;
		width: 1.25rem;
		height: 1.25rem;
	}

	.item-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.item-type-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		color: white;
		font-weight: 600;
		font-size: 0.8rem;
	}

	.item-key {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.item-key strong {
		color: #e2e8f0;
		font-size: 1.1rem;
	}

	.item-label {
		color: #94a3b8;
		font-size: 0.85rem;
	}

	.item-status {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.badge {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.badge-active {
		background: rgba(16, 185, 129, 0.2);
		color: #10b981;
	}

	.badge-inactive {
		background: rgba(107, 114, 128, 0.2);
		color: #6b7280;
	}

	.badge-expired {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.badge-deleted {
		background: rgba(71, 85, 105, 0.2);
		color: #94a3b8;
		text-decoration: line-through;
	}

	.item-meta {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 0;
		border-top: 1px solid rgba(71, 85, 105, 0.1);
		border-bottom: 1px solid rgba(71, 85, 105, 0.1);
	}

	.meta-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
	}

	.meta-row .label {
		color: #94a3b8;
		font-weight: 600;
	}

	.meta-row span {
		color: #cbd5e1;
	}

	.item-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn-action {
		flex: 1;
		padding: 0.5rem 1rem;
		background: rgba(71, 85, 105, 0.1);
		border: 1px solid rgba(71, 85, 105, 0.2);
		color: #e2e8f0;
		border-radius: 0.375rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-action:hover {
		background: rgba(71, 85, 105, 0.2);
		border-color: rgba(71, 85, 105, 0.3);
	}

	.btn-action.btn-danger:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.3);
	}

	.loading,
	.error,
	.empty {
		padding: 3rem 2rem;
		text-align: center;
		color: #94a3b8;
	}

	.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 0.5rem;
		color: #ef4444;
	}

	.empty p {
		margin: 0.5rem 0;
	}

	.add-container {
		display: flex;
		justify-content: center;
		padding: 2rem;
	}

	.add-form {
		width: 100%;
		max-width: 600px;
		padding: 2rem;
		background: rgba(30, 41, 59, 0.5);
		border: 1px solid rgba(71, 85, 105, 0.2);
		border-radius: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		color: #e2e8f0;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.required {
		color: #ef4444;
	}

	.hint {
		margin: 0;
		color: #94a3b8;
		font-size: 0.8rem;
	}

	.type-selector {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.75rem;
	}

	.type-btn {
		padding: 0.75rem;
		background: rgba(71, 85, 105, 0.1);
		border: 2px solid rgba(71, 85, 105, 0.2);
		color: #94a3b8;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.type-btn:hover {
		border-color: rgba(71, 85, 105, 0.4);
	}

	.type-btn.active {
		background: rgba(59, 130, 246, 0.2);
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.input {
		padding: 0.75rem 1rem;
		background: rgba(71, 85, 105, 0.1);
		border: 1px solid rgba(71, 85, 105, 0.2);
		border-radius: 0.5rem;
		color: #e2e8f0;
		font-size: 0.9rem;
	}

	.input::placeholder {
		color: #64748b;
	}

	.time-inputs {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0.75rem;
		align-items: center;
	}

	.time-input {
		flex: 1;
	}

	.separator {
		color: #94a3b8;
		text-align: center;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: #e2e8f0;
		font-weight: 600;
		cursor: pointer;
	}

	.checkbox-label input {
		cursor: pointer;
		width: 1rem;
		height: 1rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
	}

	.btn-primary {
		flex: 1;
		padding: 0.75rem;
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		flex: 1;
		padding: 0.75rem;
		background: rgba(71, 85, 105, 0.1);
		color: #e2e8f0;
		border: 1px solid rgba(71, 85, 105, 0.2);
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-secondary:hover {
		background: rgba(71, 85, 105, 0.2);
		border-color: rgba(71, 85, 105, 0.3);
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		width: 90%;
		max-width: 500px;
		background: #0f172a;
		border-radius: 0.75rem;
		border: 1px solid rgba(71, 85, 105, 0.2);
		display: flex;
		flex-direction: column;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.2);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.modal-header h2 {
		margin: 0;
		color: #e2e8f0;
		font-size: 1.25rem;
	}

	.btn-close {
		background: none;
		border: none;
		color: #94a3b8;
		font-size: 1.5rem;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.btn-close:hover {
		color: #e2e8f0;
	}

	.modal-body {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.status-display {
		padding: 1rem;
		background: rgba(71, 85, 105, 0.1);
		border-radius: 0.5rem;
	}

	.status-display p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: #cbd5e1;
	}

	.modal-footer {
		padding: 1.5rem;
		border-top: 1px solid rgba(71, 85, 105, 0.2);
		display: flex;
		gap: 1rem;
	}
</style>

