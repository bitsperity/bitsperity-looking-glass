<script lang="ts">
	import { onMount } from 'svelte';
	import * as satbaseApi from '$lib/api/satbase';
	import Button from '$lib/components/shared/Button.svelte';
	import Input from '$lib/components/shared/Input.svelte';

	interface Topic {
		name: string;
		count: number;
		trend?: number;
	}

	let topics: Topic[] = [];
	let analyticsData: any = null;
	let healthStatus: any = null;
	let jobStats: any = null;
	let activeJob: any = null;

	let loading = true;
	let error = '';
	let activeTab: 'list' | 'analytics' | 'operations' = 'list';
	
	let showBackfillForm = false;
	let backfillTopic = '';
	let backfillFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	let backfillTo = new Date().toISOString().slice(0, 10);
	let backfillMaxArticlesPerDay = 100;
	let backfilling = false;
	let backfillMessage = '';

	let deleteTopic = '';
	let deleteConfirm = false;
	let deleting = false;

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
			const [topicsRes, analyticsRes, healthRes, jobsRes] = await Promise.all([
				satbaseApi.getTopicsAll(),
				satbaseApi.getNewsAnalytics({ days: 7 }),
				satbaseApi.getNewsHealth(),
				satbaseApi.getJobStats()
			]);

			const lastWeekRes = await satbaseApi.getNewsAnalytics({ days: 14 });
			
			topics = (topicsRes.topics || []).map((t: any) => {
				const thisWeek = t.count;
				const lastWeek = lastWeekRes?.total_articles ? Math.round(lastWeekRes.total_articles / 2) : thisWeek;
				const trend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
				
				return {
					name: t.name,
					count: t.count,
					trend
				};
			});

			analyticsData = analyticsRes;
			healthStatus = healthRes;
			jobStats = jobsRes;
		} catch (err) {
			error = `Failed to load topics: ${err}`;
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

	async function handleBackfill() {
		backfilling = true;
		backfillMessage = '';
		try {
			const response = await fetch('http://localhost:8080/v1/ingest/news/backfill', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: backfillTopic,
					from: backfillFrom,
					to: backfillTo,
					topic: backfillTopic,
					max_articles_per_day: backfillMaxArticlesPerDay
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

	async function handleDelete() {
		if (!deleteConfirm) {
			deleteConfirm = true;
			return;
		}

		deleting = true;
		try {
			const response = await fetch(`http://localhost:8080/v1/admin/articles/batch?topic=${deleteTopic}`, {
				method: 'DELETE'
			});

			const data = await response.json();
			error = `✅ Deleted ${data.deleted_count} articles from topic "${deleteTopic}"`;
			deleteTopic = '';
			deleteConfirm = false;
			setTimeout(() => loadData(), 1000);
		} catch (e) {
			error = `❌ Error deleting: ${e}`;
		} finally {
			deleting = false;
		}
	}

	function getTrendIndicator(trend: number) {
		if (trend > 10) return '↑';
		if (trend < -10) return '↓';
		return '→';
	}

	function getTrendColor(trend: number) {
		if (trend > 10) return '#10b981';
		if (trend < -10) return '#ef4444';
		return '#6b7280';
	}

	function openBackfillForTopic(topicName: string) {
		backfillTopic = topicName;
		activeTab = 'operations';
		showBackfillForm = true;
	}
</script>

<div class="page-header">
	<h1>🏷️ Topics Management</h1>
	<p>Configure and monitor news topics</p>
</div>

{#if error}
	<div class="alert alert-info" style="margin-bottom: 1.5rem;">
		{error}
		<button on:click={() => (error = '')} style="float: right; background: none; border: none; cursor: pointer; font-size: 1.2rem;">×</button>
	</div>
{/if}

<div class="quick-stats">
	<div class="stat-item">
		<span class="stat-label">Total Topics</span>
		<span class="stat-value">{topics.length}</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Total Articles</span>
		<span class="stat-value">{topics.reduce((sum, t) => sum + t.count, 0)}</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">System Health</span>
		<span class="stat-value" style="color: {healthStatus?.status === 'healthy' ? '#10b981' : '#ef4444'};">
			{healthStatus?.status === 'healthy' ? '🟢 Healthy' : '🔴 ' + healthStatus?.status}
		</span>
	</div>
	<div class="stat-item">
		<span class="stat-label">Active Jobs</span>
		<span class="stat-value">{jobStats?.stats?.running || 0}</span>
	</div>
</div>

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

<div class="tab-navigation">
	<button class="tab-button" class:active={activeTab === 'list'} on:click={() => (activeTab = 'list')}>
		📋 List
	</button>
	<button class="tab-button" class:active={activeTab === 'analytics'} on:click={() => (activeTab = 'analytics')}>
		📈 Analytics
	</button>
	<button class="tab-button" class:active={activeTab === 'operations'} on:click={() => (activeTab = 'operations')}>
		⚙️ Operations
	</button>
</div>

{#if activeTab === 'list'}
	<section class="tab-content">
		{#if loading}
			<div class="loading">Loading topics...</div>
		{:else if topics.length > 0}
			<div class="topics-grid">
				{#each topics as topic (topic.name)}
					<div class="topic-card">
						<div class="card-header">
							<h3>{topic.name}</h3>
							<span class="trend-badge" style="color: {getTrendColor(topic.trend || 0)};">
								{getTrendIndicator(topic.trend || 0)} {topic.trend || 0}%
							</span>
						</div>
						<div class="card-stats">
							<div class="stat">
								<span class="label">Articles</span>
								<span class="value">{topic.count}</span>
							</div>
							<div class="stat">
								<span class="label">Weekly Change</span>
								<span class="value">{topic.trend || 0}%</span>
							</div>
						</div>
						<div class="card-actions">
							<button class="action-btn" on:click={() => { activeTab = 'analytics'; }}>
								📊 Analytics
							</button>
							<button class="action-btn backfill" on:click={() => openBackfillForTopic(topic.name)}>
								📥 Backfill
							</button>
							<button class="action-btn delete" on:click={() => { deleteTopic = topic.name; deleteConfirm = false; }}>
								🗑️ Delete
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="no-data">No topics found</div>
		{/if}
	</section>
				{/if}

{#if activeTab === 'analytics'}
	<section class="tab-content">
		{#if analyticsData}
			<div class="analytics-container">
				<div class="metric">
					<span class="metric-label">Trend (Last 7 Days)</span>
					<span class="metric-value">{analyticsData.trend}</span>
				</div>
				<div class="metric">
					<span class="metric-label">Total Articles</span>
					<span class="metric-value">{analyticsData.total_articles}</span>
									</div>
				<div class="metric">
					<span class="metric-label">Avg Per Day</span>
					<span class="metric-value">{analyticsData.avg_per_day}</span>
								</div>
				<div class="metric">
					<span class="metric-label">Max/Day</span>
					<span class="metric-value">{analyticsData.max_day}</span>
									</div>
								</div>

			<div class="daily-breakdown">
				<h3>Daily Article Counts (Last 7 Days)</h3>
				<div class="chart">
					{#each analyticsData.daily_counts as day}
						<div class="bar-item">
							<div class="bar" style="height: {Math.min(day.count / 5, 100)}%; background: linear-gradient(135deg, #22c55e, #06b6d4);"></div>
							<div class="date">{new Date(day.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
							<div class="count">{day.count}</div>
								</div>
						{/each}
					</div>
			</div>
		{:else}
			<div class="no-data">Loading analytics...</div>
		{/if}
	</section>
		{/if}

{#if activeTab === 'operations'}
	<section class="tab-content">
		<div class="operation-section">
			<h3>📥 Backfill by Topic</h3>
			{#if showBackfillForm}
				<div class="form-card">
					<div class="form-group">
						<label for="topic-input">Topic</label>
						<Input bind:value={backfillTopic} placeholder="Topic name" />
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="from-date">From Date</label>
							<input id="from-date" type="date" bind:value={backfillFrom} />
							</div>
						<div class="form-group">
							<label for="to-date">To Date</label>
							<input id="to-date" type="date" bind:value={backfillTo} />
						</div>
					</div>
					<div class="form-group">
						<label for="max-articles">Max Articles per Day</label>
						<input id="max-articles" type="number" min="1" max="1000" bind:value={backfillMaxArticlesPerDay} />
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
				<Button on:click={() => (showBackfillForm = true)}>➕ Start Backfill</Button>
									{/if}
		</div>

		<div class="operation-section">
			<h3>🗑️ Delete by Topic</h3>
			<div class="form-card">
				<div class="form-group">
					<label for="delete-topic-select">Topic to Delete</label>
					<select id="delete-topic-select" bind:value={deleteTopic}>
						<option value="">Select topic...</option>
						{#each topics as topic}
							<option value={topic.name}>{topic.name} ({topic.count} articles)</option>
							{/each}
					</select>
				</div>
				{#if deleteTopic}
					{#if deleteConfirm}
						<div class="warning-box">
							⚠️ This will delete all {topics.find(t => t.name === deleteTopic)?.count || 0} articles with topic "{deleteTopic}". This cannot be undone!
						</div>
						<div class="form-actions">
							<Button on:click={handleDelete} loading={deleting}>
								Yes, Delete All
							</Button>
							<button on:click={() => (deleteConfirm = false)} class="btn-secondary">Cancel</button>
						</div>
													{:else}
						<Button on:click={handleDelete}>Confirm Delete</Button>
													{/if}
				{/if}
			</div>
		</div>
	</section>
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

	.alert-info {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.3);
		color: #3b82f6;
	}

	.quick-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.topics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.topic-card {
		padding: 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		transition: all 0.3s ease;
	}

	.topic-card:hover {
		border-color: var(--color-accent);
		box-shadow: 0 0 20px rgba(34, 197, 211, 0.1);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.2);
	}

	.card-header h3 {
		margin: 0;
		font-size: 1.125rem;
		color: var(--color-text);
	}

	.trend-badge {
		font-weight: 700;
		font-size: 1rem;
	}

	.card-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat .label {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat .value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-accent);
	}

	.card-actions {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
	}

	.action-btn {
		padding: 0.5rem;
		background: transparent;
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}

	.action-btn.delete:hover {
		border-color: #ef4444;
		color: #ef4444;
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

	.operation-section {
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
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

	.form-group input,
	.form-group select {
		padding: 0.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-family: inherit;
	}

	.form-group small {
		display: block;
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

	.warning-box {
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
		color: #ef4444;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.no-data {
		text-align: center;
		padding: 2rem;
		color: var(--color-text-secondary);
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: var(--color-text-secondary);
	}

	.message {
		padding: 0.5rem;
		margin-bottom: 1rem;
		border-radius: var(--radius-md);
		background: rgba(34, 197, 211, 0.1);
		color: #06b6d4;
		font-size: 0.875rem;
	}
</style>
