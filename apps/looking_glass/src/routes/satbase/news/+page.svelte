<script lang="ts">
	import { onMount } from 'svelte';
	import * as satbaseApi from '$lib/api/satbase';
	import Button from '$lib/components/shared/Button.svelte';
	import Input from '$lib/components/shared/Input.svelte';

	// Article data
	let articles: any[] = [];
	let loading = true;
	let error = '';

	// Filters
	let searchQuery = '';
	let selectedTopics: string[] = [];
	let selectedTickers = '';
	let fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	let toDate = new Date().toISOString().slice(0, 10);
	let sortBy: 'date' | 'relevance' = 'date';
	let sortDir: 'asc' | 'desc' = 'desc';

	// Pagination
	let currentPage = 1;
	let pageSize = 50;
	let totalArticles = 0;

	// Stats & Status
	let healthStatus: any = null;
	let jobStats: any = null;
	let analyticsData: any = null;
	let activeJob: any = null;
	let allTopics: any[] = [];

	// UI State
	let activeTab: 'browse' | 'analytics' | 'backfill' | 'quality' = 'browse';
	let showBackfillForm = false;
	let backfillQuery = '';
	let backfillFrom = fromDate;
	let backfillTo = toDate;
	let backfillMaxPerDay = 100;
	let backfilling = false;
	let backfillMessage = '';

	// Preview state
	let selectedArticleId: string | null = null;

	// Modal state for article details
	let showArticleModal = false;
	let selectedArticle: any = null;
	let editingBody = false;
	let editedBody = '';

	// Bulk operations
	let selectedArticleIds: Set<string> = new Set();

	let jobPollingInterval: any;

	onMount(() => {
		loadData();
		startJobPolling();
		return () => {
			if (jobPollingInterval) clearInterval(jobPollingInterval);
		};
	});

	async function loadData() {
		loading = true;
		error = '';
		try {
			const q = searchQuery || undefined;
			const [articlesRes, healthRes, jobsRes, topicsRes, analyticsRes] = await Promise.all([
				satbaseApi.listNews({
					from: fromDate,
					to: toDate,
					q,
					tickers: selectedTickers || undefined,
					limit: pageSize,
					offset: (currentPage - 1) * pageSize,
					include_body: true
				}).catch(() => ({ items: [], total: 0 })),
				satbaseApi.getNewsHealth().catch(() => null),
				satbaseApi.getJobStats().catch(() => null),
				satbaseApi.getTopicsAll().catch(() => ({ topics: [] })),
				satbaseApi.getNewsAnalytics({ days: 7 }).catch(() => null)
			]);

			articles = (articlesRes.items || []).map((a: any) => ({
				...a,
				source: a.source_name || a.source || a.publisher || 'Unknown',
				content_text: a.body_text || a.content_text || a.text || a.body || ''
			}));
			totalArticles = articlesRes.total || 0;
			healthStatus = healthRes;
			jobStats = jobsRes;
			analyticsData = analyticsRes;
			allTopics = (topicsRes.topics || []).map((t: any) => t.name);
		} catch (err) {
			error = `Failed to load data: ${err}`;
		} finally {
			loading = false;
		}
	}

	async function startJobPolling() {
		jobPollingInterval = setInterval(async () => {
			try {
				const jobs = await satbaseApi.getJobsList();
				activeJob = jobs.jobs?.find((j: any) => j.status === 'running');
				if (activeJob && activeJob.progress_total && activeJob.progress_total > 0) {
					activeJob.progress_pct = Math.round((activeJob.progress_current / activeJob.progress_total) * 100);
				}
			} catch (e) {
				// Silent fail
			}
		}, 2000);
	}

	async function handleSearch() {
		currentPage = 1;
		await loadData();
	}

	async function handleBackfill() {
		backfilling = true;
		backfillMessage = '';
		try {
			const response = await fetch('http://localhost:8080/v1/ingest/news/backfill', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: backfillQuery,
					from: backfillFrom,
					to: backfillTo,
					topic: backfillQuery,
					max_articles_per_day: backfillMaxPerDay
				})
			});

			const data = await response.json();
			backfillMessage = `✅ Backfill started! Job ID: ${data.job_id}`;
			showBackfillForm = false;
			setTimeout(() => loadData(), 1000);
		} catch (e) {
			backfillMessage = `❌ Error: ${e}`;
		} finally {
			backfilling = false;
		}
	}

	function toggleArticleSelection(id: string) {
		if (selectedArticleIds.has(id)) {
			selectedArticleIds.delete(id);
		} else {
			selectedArticleIds.add(id);
		}
		selectedArticleIds = selectedArticleIds;
	}

	function toggleAllArticles() {
		if (selectedArticleIds.size === articles.length) {
			selectedArticleIds.clear();
		} else {
			articles.forEach(a => selectedArticleIds.add(a.id));
		}
		selectedArticleIds = selectedArticleIds;
	}

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (hours < 1) return 'just now';
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function formatSize(text: string | undefined) {
		if (!text) return '0KB';
		const bytes = text.length;
		if (bytes < 1024) return `${bytes}B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
	}

	async function deleteArticle(id: string) {
		if (!confirm('Delete this article?')) return;
		try {
			await fetch(`http://localhost:8080/v1/admin/articles/batch?article_ids=${id}`, {
				method: 'DELETE'
			});
			articles = articles.filter(a => a.id !== id);
		} catch (e) {
			error = `Failed to delete: ${e}`;
		}
	}

	function openArticleModal(article: any) {
		selectedArticle = article;
		editedBody = article.content_text || article.body_text || '';
		editingBody = false;
		showArticleModal = true;
	}

	function closeArticleModal() {
		showArticleModal = false;
		selectedArticle = null;
		editingBody = false;
	}

	async function saveEditedBody() {
		if (!selectedArticle) return;
		try {
			const response = await fetch(`http://localhost:8080/v1/news/${selectedArticle.id}/update-body`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					body_text: editedBody
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update body');
			}

			const result = await response.json();
			
			// Update local article with new body
			selectedArticle.body_text = editedBody;
			selectedArticle.content_text = editedBody;
			
			// Update article in list
			const articleIndex = articles.findIndex(a => a.id === selectedArticle.id);
			if (articleIndex >= 0) {
				articles[articleIndex] = selectedArticle;
			}

			editingBody = false;
			error = '';
			alert('✅ Body updated successfully!');
		} catch (e) {
			error = `Failed to update body: ${e.message || e}`;
		}
	}

	function getPreview(text: string | undefined, maxLength = 150) {
		if (!text) return '';
		return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
	}
</script>

<div class="page-header">
	<h1>📰 News Command Center</h1>
	<p>Advanced news discovery and management with full control</p>
</div>

{#if error}
	<div class="alert alert-error" style="margin-bottom: 1.5rem;">
		{error}
		<button on:click={() => (error = '')} style="float: right; background: none; border: none; cursor: pointer; font-size: 1.2rem;">×</button>
	</div>
{/if}

<!-- Quick Stats Bar -->
<div class="quick-stats">
	<div class="stat-item">
		<span class="stat-label">Total Articles</span>
		<span class="stat-value">{totalArticles}</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Today</span>
		<span class="stat-value">{healthStatus?.articles_today || 0}</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Health</span>
		<span class="stat-value" style="color: {healthStatus?.status === 'healthy' ? '#10b981' : '#ef4444'};">
			{healthStatus?.status === 'healthy' ? '🟢 Healthy' : '🔴 ' + healthStatus?.status}
		</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Active Jobs</span>
		<span class="stat-value">{jobStats?.stats?.running || 0}</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Crawl Success</span>
		<span class="stat-value">{healthStatus?.crawl_success_rate || 0}%</span>
	</div>
</div>

<!-- Active Backfill Widget -->
{#if activeJob}
	<div class="active-backfill-widget">
		<div class="widget-header">
			<span>🔄 RUNNING: {activeJob.payload?.topic || 'Backfill'}</span>
			<span class="progress-pct">{activeJob.progress_pct || 0}%</span>
		</div>
		<div class="progress-bar">
			<div class="progress-fill" style="width: {activeJob.progress_pct || 0}%"></div>
		</div>
		<div class="widget-stats">
			<div>📊 Ingested: {activeJob.items_processed || 0}</div>
			<div>⚠️ Discarded: {activeJob.items_failed || 0}</div>
			<div>🟢 Health: Healthy</div>
		</div>
	</div>
{/if}

<!-- Tab Navigation -->
<div class="tab-navigation">
	<button class="tab-button" class:active={activeTab === 'browse'} on:click={() => (activeTab = 'browse')}>
		📋 Browse
	</button>
	<button class="tab-button" class:active={activeTab === 'analytics'} on:click={() => (activeTab = 'analytics')}>
		📈 Analytics
	</button>
	<button class="tab-button" class:active={activeTab === 'backfill'} on:click={() => (activeTab = 'backfill')}>
		📥 Backfill & Maintenance
	</button>
	<button class="tab-button" class:active={activeTab === 'quality'} on:click={() => (activeTab = 'quality')}>
		✅ Data Quality
	</button>
</div>

<!-- TAB: BROWSE -->
{#if activeTab === 'browse'}
	<section class="tab-content">
		<!-- Search & Filters -->
		<div class="search-filters">
			<div class="filter-row">
				<Input
					bind:value={searchQuery}
					placeholder="Search articles..."
					on:keydown={(e) => {
						if (e.key === 'Enter') handleSearch();
					}}
				/>
				<Button on:click={handleSearch} loading={loading}>Search</Button>
			</div>

			<div class="filter-row">
				<div class="filter-group">
					<label for="from-date">From Date</label>
					<input id="from-date" type="date" bind:value={fromDate} />
				</div>
				<div class="filter-group">
					<label for="to-date">To Date</label>
					<input id="to-date" type="date" bind:value={toDate} />
				</div>
				<div class="filter-group">
					<label for="tickers">Tickers</label>
					<Input bind:value={selectedTickers} placeholder="AAPL, MSFT, NVDA" />
				</div>
				<div class="filter-group">
					<label for="sort">Sort By</label>
					<select id="sort" bind:value={sortBy}>
						<option value="date">Date</option>
						<option value="relevance">Relevance</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Pagination - TOP (moved here) -->
		{#if totalArticles > pageSize}
			<div class="pagination pagination-top">
				<span>Page {currentPage} of {Math.ceil(totalArticles / pageSize)} ({totalArticles} total)</span>
				<div class="pagination-controls">
					<Button
						disabled={currentPage === 1}
						on:click={() => {
							currentPage = Math.max(1, currentPage - 1);
							loadData();
						}}
					>
						← Previous
					</Button>
					<Button
						disabled={currentPage >= Math.ceil(totalArticles / pageSize)}
						on:click={() => {
							currentPage = Math.min(Math.ceil(totalArticles / pageSize), currentPage + 1);
							loadData();
						}}
					>
						Next →
					</Button>
				</div>
			</div>
		{/if}

		<!-- Article List - SCROLLABLE -->
		{#if loading}
			<div class="loading">Loading articles...</div>
		{:else if articles.length > 0}
			<div class="article-list-wrapper">
				<div class="article-list">
					<div class="article-header">
						<div class="col-checkbox">
							<input
								type="checkbox"
								checked={selectedArticleIds.size === articles.length && articles.length > 0}
								on:change={toggleAllArticles}
							/>
						</div>
						<div class="col-topic">Topic</div>
						<div class="col-title">Title</div>
						<div class="col-date">Date</div>
						<div class="col-source">Source</div>
						<div class="col-size">Size</div>
						<div class="col-actions">Actions</div>
					</div>

					{#each articles as article (article.id)}
						<div class="article-row" class:selected={selectedArticleId === article.id} on:click={() => openArticleModal(article)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && openArticleModal(article)}>
							<div class="col-checkbox" on:click={(e) => e.stopPropagation()}>
								<input
									type="checkbox"
									checked={selectedArticleIds.has(article.id)}
									on:change={() => toggleArticleSelection(article.id)}
								/>
							</div>
							<div class="col-topic">
								{#if article.topics && article.topics.length > 0}
									<span class="topic-badge">{article.topics[0]}</span>
								{/if}
							</div>
							<div class="col-title">
								<a href={article.url} target="_blank" rel="noopener" on:click={(e) => e.stopPropagation()}>
									{article.title}
								</a>
							</div>
							<div class="col-date">
								{formatDate(article.published_at)}
							</div>
							<div class="col-source">
								{article.source}
							</div>
							<div class="col-size">
								{formatSize(article.content_text)}
							</div>
							<div class="col-actions" on:click={(e) => e.stopPropagation()}>
								<button
									class="action-icon"
									title="Delete"
									on:click={() => deleteArticle(article.id)}
								>
									🗑️
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Pagination - BOTTOM -->
			{#if totalArticles > pageSize}
				<div class="pagination pagination-bottom">
					<span>Page {currentPage} of {Math.ceil(totalArticles / pageSize)} ({totalArticles} total)</span>
					<div class="pagination-controls">
						<Button
							disabled={currentPage === 1}
							on:click={() => {
								currentPage = Math.max(1, currentPage - 1);
								loadData();
							}}
						>
							← Previous
						</Button>
						<Button
							disabled={currentPage >= Math.ceil(totalArticles / pageSize)}
							on:click={() => {
								currentPage = Math.min(Math.ceil(totalArticles / pageSize), currentPage + 1);
								loadData();
							}}
						>
							Next →
						</Button>
					</div>
				</div>
			{/if}
		{:else}
			<div class="no-data">No articles found. Try adjusting your filters.</div>
		{/if}
	</section>
{/if}

<!-- TAB: ANALYTICS -->
{#if activeTab === 'analytics'}
	<section class="tab-content">
		{#if analyticsData}
			<div class="analytics-container">
				<div class="metric">
					<span class="metric-label">Trend (Last 7 Days)</span>
					<span class="metric-value">{analyticsData.trend || 'N/A'}</span>
				</div>
				<div class="metric">
					<span class="metric-label">Total Articles</span>
					<span class="metric-value">{analyticsData.total_articles || 0}</span>
				</div>
				<div class="metric">
					<span class="metric-label">Avg Per Day</span>
					<span class="metric-value">{(analyticsData.avg_per_day || 0).toFixed(1)}</span>
				</div>
				<div class="metric">
					<span class="metric-label">Max/Day</span>
					<span class="metric-value">{analyticsData.max_day || 0}</span>
				</div>
			</div>

			{#if analyticsData.daily_counts && analyticsData.daily_counts.length > 0}
				<div class="daily-breakdown">
					<h3>Daily Article Counts (Last 7 Days)</h3>
					<div class="chart">
						{#each analyticsData.daily_counts as day}
							<div class="bar-item">
								<div class="bar" style="height: {Math.min((day.count / 5), 100)}%; background: linear-gradient(135deg, #22c55e, #06b6d4);"></div>
								<div class="date">{new Date(day.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
								<div class="count">{day.count}</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="no-data">No daily breakdown data available</div>
			{/if}
		{:else}
			<div class="coming-soon">
				📈 Analytics loading...
				<br />
				<small>Showing coverage trends, daily counts, and article statistics</small>
			</div>
		{/if}
	</section>
{/if}

<!-- TAB: BACKFILL & MAINTENANCE -->
{#if activeTab === 'backfill'}
	<section class="tab-content">
		<div class="operation-section">
			<h3>📥 Start New Backfill</h3>
			{#if showBackfillForm}
				<div class="form-card">
					<div class="form-group">
						<label for="backfill-query">Query</label>
						<Input bind:value={backfillQuery} placeholder="e.g., AI, semiconductor" />
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="backfill-from">From Date</label>
							<input id="backfill-from" type="date" bind:value={backfillFrom} />
						</div>
						<div class="form-group">
							<label for="backfill-to">To Date</label>
							<input id="backfill-to" type="date" bind:value={backfillTo} />
						</div>
					</div>
					<div class="form-group">
						<label for="backfill-max">Max Articles per Day</label>
						<input id="backfill-max" type="number" min="1" max="1000" bind:value={backfillMaxPerDay} />
						<small style="color: var(--color-text-tertiary); margin-top: 0.25rem;">Limits API load and crawling resources</small>
					</div>
					{#if backfillMessage}
						<div class="message">{backfillMessage}</div>
					{/if}
					<div class="form-actions">
						<Button on:click={handleBackfill} loading={backfilling}>Start Backfill</Button>
						<button on:click={() => (showBackfillForm = false)} class="btn-secondary">Cancel</button>
					</div>
				</div>
			{:else}
				<Button on:click={() => (showBackfillForm = true)}>➕ New Backfill</Button>
			{/if}
		</div>
	</section>
{/if}

<!-- TAB: DATA QUALITY -->
{#if activeTab === 'quality'}
	<section class="tab-content">
		<div class="coming-soon">
			✅ Data Quality Tab (Phase 2)
			<br />
			<small>Quality scores, link validation, duplicate detection coming soon...</small>
		</div>
	</section>
{/if}

<!-- Article Detail Modal -->
{#if showArticleModal && selectedArticle}
	<div class="modal-overlay" role="dialog" aria-modal="true" on:click={closeArticleModal}>
		<div class="modal-content" on:click={(e) => e.stopPropagation()}>
			<!-- Modal Header -->
			<div class="modal-header">
				<div class="modal-title-section">
					<span class="modal-topic">{selectedArticle.topics?.[0] || 'News'}</span>
					<h2>{selectedArticle.title}</h2>
					<div class="modal-meta">
						<span>📅 {formatDate(selectedArticle.published_at)}</span>
						<span>📰 {selectedArticle.source || 'Unknown'}</span>
						<span>📏 {formatSize(selectedArticle.content_text)}</span>
						<span class="body-status" class:has-body={selectedArticle.body_available || selectedArticle.content_text}>
							{selectedArticle.body_available || selectedArticle.content_text ? '✅ Body' : '⚠️ Summary Only'}
						</span>
					</div>
				</div>
				<button class="modal-close" on:click={closeArticleModal}>✕</button>
			</div>

			<!-- Modal Tabs -->
			<div class="modal-tabs">
				<button class="modal-tab" class:active={!editingBody} on:click={() => (editingBody = false)}>
					📖 Content
				</button>
				<button class="modal-tab" class:active={editingBody} on:click={() => (editingBody = true)}>
					✏️ Edit Body
				</button>
				<a href={selectedArticle.url} target="_blank" rel="noopener" class="modal-tab">
					🔗 Original Source
				</a>
			</div>

			<!-- Content View -->
			{#if !editingBody}
				<div class="modal-body-view">
					<div class="article-content">
						{#if selectedArticle.description}
							<div class="section">
								<h4>📝 Summary</h4>
								<p>{selectedArticle.description}</p>
							</div>
						{/if}

						<div class="section">
							<h4>📄 Full Content ({selectedArticle.content_text?.length || 0} chars)</h4>
							<div class="content-text">
								{selectedArticle.content_text || selectedArticle.body_text || 'No content available'}
							</div>
						</div>

						<div class="section meta-info">
							<h4>ℹ️ Metadata</h4>
							<div class="meta-grid">
								<div><strong>Language:</strong> {selectedArticle.language || '-'}</div>
								<div><strong>Category:</strong> {selectedArticle.category || '-'}</div>
								<div><strong>Country:</strong> {selectedArticle.country || '-'}</div>
								<div><strong>Author:</strong> {selectedArticle.author || '-'}</div>
								<div><strong>Fetched:</strong> {selectedArticle.fetched_at || '-'}</div>
								<div><strong>Published:</strong> {selectedArticle.published_at || '-'}</div>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<!-- Edit View -->
				<div class="modal-body-edit">
					<textarea bind:value={editedBody} class="edit-textarea"></textarea>
					<div class="edit-actions">
						<button class="save-btn" on:click={saveEditedBody}>💾 Save Changes</button>
						<button class="cancel-btn" on:click={() => (editingBody = false)}>Cancel</button>
					</div>
				</div>
			{/if}

			<!-- Modal Footer -->
			<div class="modal-footer">
				<div class="footer-actions">
					<button class="action-btn danger" on:click={() => { deleteArticle(selectedArticle.id); closeArticleModal(); }}>
						🗑️ Delete Article
					</button>
					<button class="action-btn" on:click={closeArticleModal}>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.page-header p {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.alert {
		padding: 1rem;
		border-radius: var(--radius-md);
		border: 1px solid;
	}

	.alert-error {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.quick-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-md);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-accent);
	}

	.active-backfill-widget {
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid var(--color-accent);
		border-radius: var(--radius-lg);
	}

	.widget-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 1rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.progress-pct {
		color: var(--color-accent);
		font-size: 1.25rem;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-xl);
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
		transition: width 0.3s ease;
	}

	.widget-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.tab-navigation {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.2);
	}

	.tab-button {
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--color-text-secondary);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tab-button:hover {
		color: var(--color-text);
	}

	.tab-button.active {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}

	.tab-content {
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.search-filters {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
	}

	.filter-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		align-items: end;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-group label {
		font-weight: 500;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.filter-group input,
	.filter-group select {
		padding: 0.5rem;
		background: rgba(71, 85, 105, 0.2);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-family: inherit;
	}

	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.pagination-top {
		margin-bottom: 2rem;
	}

	.pagination-bottom {
		margin-top: 2rem;
	}

	.pagination-controls {
		display: flex;
		gap: 1rem;
	}

	.article-list-wrapper {
		margin: 2rem 0;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		max-height: 600px;
	}

	.article-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.article-header {
		display: grid;
		grid-template-columns: 40px 80px 1fr 100px 100px 80px 80px;
		gap: 1rem;
		padding: 1rem 1.5rem;
		background: rgba(71, 85, 105, 0.2);
		border-bottom: 1px solid rgba(71, 85, 105, 0.3);
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		align-items: center;
		flex-shrink: 0;
	}

	.article-row {
		display: grid;
		grid-template-columns: 40px 80px 1fr 100px 100px 80px 80px;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.15);
		align-items: center;
		transition: background 0.2s ease;
		cursor: pointer;
	}

	.article-row:hover {
		background: rgba(71, 85, 105, 0.15);
		box-shadow: inset 0 0 10px rgba(34, 197, 211, 0.1);
	}

	.article-row.selected {
		background: rgba(34, 197, 211, 0.1);
	}

	.col-checkbox {
		display: flex;
		justify-content: center;
	}

	.col-checkbox input {
		cursor: pointer;
	}

	.col-topic {
		display: flex;
		align-items: center;
	}

	.topic-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: rgba(34, 197, 211, 0.2);
		color: #06b6d4;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.col-title {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.col-title a {
		color: var(--color-accent);
		text-decoration: none;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.col-title a:hover {
		text-decoration: underline;
	}

	.col-date,
	.col-source,
	.col-size {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.col-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.action-icon {
		background: none;
		border: none;
		font-size: 1rem;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.2s ease;
		padding: 0.25rem;
	}

	.action-icon:hover {
		opacity: 1;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: var(--color-text-secondary);
	}

	.no-data {
		text-align: center;
		padding: 2rem;
		color: var(--color-text-secondary);
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
	}

	.coming-soon {
		text-align: center;
		padding: 3rem 2rem;
		color: var(--color-text-secondary);
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		font-size: 1.125rem;
		font-weight: 500;
	}

	.coming-soon small {
		display: block;
		font-size: 0.875rem;
		margin-top: 0.5rem;
		opacity: 0.7;
	}

	.operation-section {
		padding: 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		margin-bottom: 2rem;
	}

	.operation-section h3 {
		margin-bottom: 1rem;
		color: var(--color-text);
	}

	.form-card {
		padding: 1rem;
		background: rgba(71, 85, 105, 0.1);
		border-radius: var(--radius-md);
	}

	.form-group {
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-weight: 500;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.form-group input {
		padding: 0.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-family: inherit;
	}

	.form-group small {
		display: block;
		color: var(--color-text-tertiary);
		margin-top: 0.25rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-secondary:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.message {
		padding: 0.5rem;
		margin-bottom: 1rem;
		border-radius: var(--radius-md);
		background: rgba(34, 197, 211, 0.1);
		color: #06b6d4;
		font-size: 0.875rem;
	}

	.analytics-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.metric {
		padding: 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.metric-label {
		display: block;
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.metric-value {
		display: block;
		font-size: 2rem;
		font-weight: 700;
		background: linear-gradient(135deg, var(--color-accent), var(--color-primary));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.daily-breakdown {
		margin-bottom: 2rem;
	}

	.daily-breakdown h3 {
		margin-bottom: 1rem;
		color: var(--color-text);
	}

	.chart {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0.75rem;
		padding: 2rem 1rem 1rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
	}

	.bar-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.bar {
		width: 100%;
		min-height: 20px;
		border-radius: var(--radius-sm);
		transition: all 0.2s ease;
	}

	.bar:hover {
		transform: scale(1.05);
	}

	.date {
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
		text-align: center;
	}

	.count {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-accent);
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		background: var(--color-bg-card);
		border-radius: var(--radius-lg);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		width: 90%;
		max-width: 800px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.2);
		background: rgba(71, 85, 105, 0.1);
	}

	.modal-title-section {
		flex: 1;
		margin-right: 1rem;
	}

	.modal-topic {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: rgba(34, 197, 211, 0.2);
		color: #06b6d4;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.modal-meta {
		font-size: 0.875rem;
		color: var(--color-text-tertiary);
		margin-top: 0.5rem;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.modal-close:hover {
		color: var(--color-text);
	}

	.modal-tabs {
		display: flex;
		border-bottom: 1px solid rgba(71, 85, 105, 0.2);
		margin-bottom: 1.5rem;
	}

	.modal-tab {
		flex: 1;
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--color-text-secondary);
		font-weight: 500;
		cursor: pointer;
		text-align: center;
		transition: all 0.2s ease;
		text-decoration: none;
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}

	.modal-tab:hover {
		color: var(--color-text);
	}

	.modal-tab.active {
		border-bottom-color: var(--color-accent);
	}

	.modal-body-view,
	.modal-body-edit {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.modal-body-view .section,
	.modal-body-edit .section {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.1);
	}

	.modal-body-view .section:last-child,
	.modal-body-edit .section:last-child {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	.modal-body-view h4,
	.modal-body-edit h4 {
		margin-bottom: 0.75rem;
		color: var(--color-text);
	}

	.modal-body-view p,
	.modal-body-edit p {
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin-bottom: 0.75rem;
	}

	.modal-body-view .content-text,
	.modal-body-edit .edit-textarea {
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-md);
		padding: 1rem;
		color: var(--color-text);
		font-family: inherit;
		min-height: 150px;
		resize: vertical;
		font-size: 0.9rem;
	}

	.edit-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.save-btn {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.save-btn:hover {
		background: linear-gradient(135deg, #2563eb, #1d4ed8);
		transform: translateY(-2px);
	}

	.cancel-btn {
		padding: 0.75rem 1.5rem;
		background: rgba(71, 85, 105, 0.2);
		color: var(--color-text-secondary);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-md);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-btn:hover {
		background: rgba(71, 85, 105, 0.3);
		border-color: rgba(71, 85, 105, 0.5);
	}

	.modal-body-view .meta-info,
	.modal-body-edit .meta-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.modal-body-view .meta-info div,
	.modal-body-edit .meta-info div {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.modal-body-view .meta-info strong,
	.modal-body-edit .meta-info strong {
		color: var(--color-text);
	}

	.modal-footer {
		padding: 1.5rem;
		border-top: 1px solid rgba(71, 85, 105, 0.2);
		background: rgba(71, 85, 105, 0.1);
	}

	.footer-actions {
		display: flex;
		gap: 1rem;
	}

	.action-btn {
		flex: 1;
		padding: 0.75rem 1.5rem;
		background: none;
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-btn:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.action-btn.danger {
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.action-btn.danger:hover {
		border-color: rgba(239, 68, 68, 0.5);
		color: #ef4444;
	}

	.body-status {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background: rgba(34, 197, 211, 0.2);
		color: #06b6d4;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		margin-left: 1rem;
	}

	.body-status.has-body {
		background: rgba(34, 197, 211, 0.2);
		color: #06b6d4;
	}
</style>
