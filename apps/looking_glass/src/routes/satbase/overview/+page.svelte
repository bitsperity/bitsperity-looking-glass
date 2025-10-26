<script lang="ts">
	import { onMount } from 'svelte';
	import * as satbaseApi from '$lib/api/satbase';
	import { getCachedCoverage, invalidateCache, getCacheRefreshTimeRemaining } from '$lib/stores/satbase-cache';

	let coverage: any = null;
	let topicsSummary: any = null;
	let heatmapData: any = null;
	let healthStatus: any = null;
	let metricsData: any = null;
	let analyticsData: any = null;
	let jobStats: any = null;
	
	let loading = true;
	let topicsLoading = false;
	let heatmapLoading = false;
	let healthLoading = false;
	let metricsLoading = false;
	let error = '';
	let lastUpdated = new Date();
	let cacheTimeRemaining = 0;
	let autoRefreshInterval: NodeJS.Timeout;
	let selectedYear = new Date().getFullYear();

	onMount(async () => {
		try {
			// Load coverage first (from cache, instant)
			coverage = await getCachedCoverage();
			loading = false;
			lastUpdated = new Date();

			// Load additional data in parallel
			healthLoading = true;
			metricsLoading = true;
			topicsLoading = true;
			heatmapLoading = true;

			// Fetch health status
			healthStatus = await satbaseApi.getNewsHealth();
			healthLoading = false;

			// Fetch metrics
			metricsData = await satbaseApi.getNewsMetrics();
			metricsLoading = false;

			// Fetch analytics
			analyticsData = await satbaseApi.getNewsAnalytics({ days: 7 });

			// Fetch job stats
			jobStats = await satbaseApi.getJobStats();

			// Then load topics summary in background
			topicsSummary = await satbaseApi.getTopicsSummary({ 
				limit: 5, 
				days: 365
			});

			// Load heatmap data in background
			const fromDate = `${selectedYear}-01-01`;
			const toDate = `${selectedYear}-12-31`;
			
			const topicsForYear = await satbaseApi.getTopicsAll(fromDate, toDate);
			
			const allTopics = topicsForYear?.topics?.map((t: any) => t.name).join(',') || '';
			if (allTopics) {
				const response = await satbaseApi.getTopicsCoverage(
					allTopics,
					fromDate,
					toDate,
					'month',
					'matrix'
				);

				if (response?.matrix && response?.topics && response?.periods) {
					const transformed: Record<string, Record<number, number>> = {};
					response.topics.forEach((topic: string) => {
						transformed[topic] = {};
					});

					response.matrix.forEach((row: number[], rowIdx: number) => {
						const period = response.periods[rowIdx];
						const monthIndex = parseInt(period.split('-')[1]) - 1;
						
						row.forEach((count: number, topicIdx: number) => {
							const topic = response.topics[topicIdx];
							transformed[topic][monthIndex] = count;
						});
					});

					heatmapData = transformed;
				} else {
					heatmapData = {};
				}
			} else {
				heatmapData = {};
			}
		} catch (err) {
			error = `Failed to load overview: ${err}`;
		} finally {
			topicsLoading = false;
			heatmapLoading = false;
		}

		// Update cache time remaining every second
		autoRefreshInterval = setInterval(() => {
			cacheTimeRemaining = getCacheRefreshTimeRemaining();
		}, 1000);

		return () => {
			if (autoRefreshInterval) clearInterval(autoRefreshInterval);
		};
	});

	async function manualRefresh() {
		try {
			coverage = await getCachedCoverage(true);
			lastUpdated = new Date();
			cacheTimeRemaining = 300; // 5 minutes
		} catch (err) {
			error = `Refresh failed: ${err}`;
		}
	}

	function formatCount(n: number): string {
		if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
		if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
		return n.toString();
	}

	$: qualityPercentage = coverage?.news
		? Math.round((coverage.news.articles_with_bodies / coverage.news.total_articles) * 100)
		: 0;

	$: formattedTime = lastUpdated.toLocaleTimeString();

	// Reload heatmap when year changes
	$: if (selectedYear && topicsSummary?.topics) {
		(async () => {
			try {
				heatmapLoading = true;
				const allTopics = topicsSummary.topics.map((t: any) => t.name).join(',');
				const fromDate = `${selectedYear}-01-01`;
				const toDate = `${selectedYear}-12-31`;
				const response = await satbaseApi.getTopicsCoverage(
					allTopics,
					fromDate,
					toDate,
					'month',
					'matrix'
				);

				// Transform matrix format to {topic: {month_index: count}}
				// Handle sparse periods (e.g., only Sept & Oct, not all 12 months)
				if (response?.matrix && response?.topics && response?.periods) {
					const transformed: Record<string, Record<number, number>> = {};
					response.topics.forEach((topic: string) => {
						transformed[topic] = {};
					});

					// Map each period to its actual month index (0-11)
					response.matrix.forEach((row: number[], rowIdx: number) => {
						const period = response.periods[rowIdx]; // e.g., "2025-09"
						const monthIndex = parseInt(period.split('-')[1]) - 1; // Extract month (1-12) → (0-11)
						
						row.forEach((count: number, topicIdx: number) => {
							const topic = response.topics[topicIdx];
							transformed[topic][monthIndex] = count;
						});
					});

					heatmapData = transformed;
				} else {
					heatmapData = {};
				}
			} catch (err) {
				error = `Failed to load heatmap: ${err}`;
			} finally {
				heatmapLoading = false;
			}
		})();
	}
</script>

<div class="page-header">
	<div class="flex items-center justify-between">
		<div>
			<h1>📊 Overview</h1>
			<p>Satbase data health and coverage at a glance</p>
		</div>
		<div class="refresh-controls">
			<button on:click={manualRefresh} class="refresh-button" title="Force refresh (bypasses cache)">
				🔄 Refresh
			</button>
			<div class="cache-status">
				<span class="status-text">Updated {formattedTime}</span>
				{#if cacheTimeRemaining > 0}
					<span class="cache-age">Fresh for {cacheTimeRemaining}s</span>
				{/if}
			</div>
		</div>
	</div>
</div>

{#if loading}
	<div class="skeleton-grid">
		{#each Array(6) as _}
			<div class="skeleton-card" />
		{/each}
	</div>
{:else if error}
	<div class="error-box">
		<p>{error}</p>
	</div>
{:else}
	<!-- KPI Deck -->
	<section class="kpi-section">
		<h2>Key Metrics</h2>
		<div class="kpi-grid">
			<!-- Total Articles -->
			<div class="kpi-card">
				<div class="kpi-icon">📰</div>
				<div class="kpi-content">
					<p class="kpi-label">Total Articles</p>
					<p class="kpi-value">{formatCount(coverage?.news?.total_articles || 0)}</p>
					<p class="kpi-subtitle">across all sources</p>
				</div>
			</div>

			<!-- Bodies Fetched -->
			<div class="kpi-card">
				<div class="kpi-icon">📥</div>
				<div class="kpi-content">
					<p class="kpi-label">Content Fetched</p>
					<p class="kpi-value">{qualityPercentage}%</p>
					<p class="kpi-subtitle">{formatCount(coverage?.news?.articles_with_bodies || 0)} articles</p>
				</div>
			</div>

			<!-- Tickers -->
			<div class="kpi-card">
				<div class="kpi-icon">📊</div>
				<div class="kpi-content">
					<p class="kpi-label">Tickers</p>
					<p class="kpi-value">{coverage?.news?.tickers_mentioned || 0}</p>
					<p class="kpi-subtitle">mentioned in news</p>
				</div>
			</div>

			<!-- Topics -->
			<div class="kpi-card">
				<div class="kpi-icon">🏷️</div>
				<div class="kpi-content">
					<p class="kpi-label">Topics</p>
					<p class="kpi-value">{topicsSummary?.total_unique_topics || 0}</p>
					<p class="kpi-subtitle">configured for tracking</p>
				</div>
			</div>

			<!-- Date Range -->
			<div class="kpi-card">
				<div class="kpi-icon">📅</div>
				<div class="kpi-content">
					<p class="kpi-label">Coverage Period</p>
					<p class="kpi-value">{coverage?.news?.date_range?.from || 'N/A'}</p>
					<p class="kpi-subtitle">to {coverage?.news?.date_range?.to || 'N/A'}</p>
				</div>
			</div>

			<!-- Sources -->
			<div class="kpi-card">
				<div class="kpi-icon">🔗</div>
				<div class="kpi-content">
					<p class="kpi-label">Sources</p>
					<p class="kpi-value">{Object.keys(coverage?.news?.sources || {}).length}</p>
					<p class="kpi-subtitle">active feeds</p>
				</div>
			</div>
		</div>
	</section>

	<!-- System Status Card - NEW -->
	<section class="system-status-section">
		<div class="status-grid">
			{#if healthLoading}
				<div class="skeleton-card" />
			{:else if healthStatus}
				<div class="status-card" class:status-healthy={healthStatus.status === 'healthy'} class:status-degraded={healthStatus.status === 'degraded'} class:status-stale={healthStatus.status === 'stale'}>
					<div class="status-header">
						<span class="status-badge" class:badge-healthy={healthStatus.status === 'healthy'} class:badge-degraded={healthStatus.status === 'degraded'} class:badge-stale={healthStatus.status === 'stale'}>
							{healthStatus.status === 'healthy' ? '🟢' : healthStatus.status === 'stale' ? '🟡' : '🔴'} {healthStatus.status.toUpperCase()}
						</span>
					</div>
					<div class="status-content">
						<div class="status-item">
							<span class="status-label">Last Ingestion</span>
							<span class="status-value">{healthStatus.staleness_hours ? healthStatus.staleness_hours + 'h ago' : 'just now'}</span>
						</div>
						<div class="status-item">
							<span class="status-label">24h Crawl Rate</span>
							<span class="status-value">{healthStatus.crawl_success_rate}%</span>
						</div>
						<div class="status-item">
							<span class="status-label">Today's Articles</span>
							<span class="status-value">{healthStatus.articles_today}</span>
						</div>
					</div>
				</div>
			{/if}
			
			{#if metricsLoading}
				<div class="skeleton-card" />
			{:else if metricsData}
				<div class="quality-card">
					<h3>Data Quality Scorecard</h3>
					<div class="quality-grid">
						<div class="quality-item">
							<span class="quality-label">Body Coverage</span>
							<span class="quality-value">{Math.round((metricsData.total_articles / (metricsData.total_articles + metricsData.duplicate_count || 1)) * 100)}%</span>
						</div>
						<div class="quality-item">
							<span class="quality-label">Duplicates</span>
							<span class="quality-value">{metricsData.duplicate_count || 0}</span>
						</div>
						<div class="quality-item">
							<span class="quality-label">Languages</span>
							<span class="quality-value">{Object.keys(metricsData.languages || {}).length}</span>
						</div>
						<div class="quality-item">
							<span class="quality-label">Avg Size</span>
							<span class="quality-value">{metricsData.body_text?.avg_length ? Math.round(metricsData.body_text.avg_length / 1024) + 'KB' : 'N/A'}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Top Topics -->
	<section class="section-card">
		<h2>📋 Trending Topics (Last 30 Days)</h2>
		{#if topicsLoading}
			<div class="topics-skeleton">
				<div class="skeleton-item" />
				<div class="skeleton-item" />
				<div class="skeleton-item" />
			</div>
		{:else if topicsSummary?.topics && topicsSummary.topics.length > 0}
			<div class="topics-list">
				{#each topicsSummary.topics.slice(0, 5) as topic}
					<div class="topic-item">
						<span class="topic-name">{topic.name}</span>
						<span class="topic-count">{formatCount(topic.count)}</span>
					</div>
				{/each}
			</div>
			<a href="/satbase/topics" class="link-button">View all topics →</a>
		{:else}
			<p class="no-data">No topics found in the last 30 days</p>
		{/if}
	</section>

	<!-- Topic Heatmap -->
	<section class="section-card">
		<div class="heatmap-header-section">
			<div>
				<h2>🔥 Topic Heatmap</h2>
				<p class="heatmap-subtitle">Coverage by month and topic</p>
			</div>
			<div class="year-selector">
				<button on:click={() => (selectedYear -= 1)} title="Previous year">←</button>
				<span class="year-display">{selectedYear}</span>
				<button on:click={() => (selectedYear += 1)} title="Next year">→</button>
			</div>
		</div>

		{#if heatmapLoading}
			<div class="heatmap-skeleton">
				<div class="skeleton-bar" />
				<div class="skeleton-bar" />
				<div class="skeleton-bar" />
			</div>
		{:else if heatmapData && Object.keys(heatmapData).length > 0}
			<div class="heatmap-wrapper">
				<table class="heatmap-table">
					<thead>
						<tr class="header-row">
							<th class="topic-header">Topic</th>
							{#each ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as month}
								<th class="month-header">{month}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each Object.entries(heatmapData) as [topic, monthData]}
							<tr class="data-row">
								<td class="topic-cell">{topic}</td>
								{#each Array(12) as _, monthIdx}
									<td 
										class="heatmap-cell" 
										style="--intensity: {Math.min((monthData[monthIdx] || 0) / 50, 1)}"
										title="{monthData[monthIdx] || 0} articles"
									>
										<span class="cell-value">{monthData[monthIdx] > 0 ? monthData[monthIdx] : ''}</span>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="no-data">No heatmap data available</p>
		{/if}
	</section>

	<!-- Data Health -->
	<section class="section-card">
		<h2>🏥 Data Health</h2>
		<div class="health-grid">
			<div class="health-item">
				<span class="health-label">Content Quality</span>
				<div class="health-bar">
					<div class="health-fill" style="width: {qualityPercentage}%" />
				</div>
				<span class="health-value">{qualityPercentage}%</span>
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

	.flex {
		display: flex;
	}

	.items-center {
		align-items: center;
	}

	.justify-between {
		justify-content: space-between;
	}

	.refresh-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.refresh-button {
		padding: 0.5rem 1rem;
		background: linear-gradient(135deg, var(--color-accent), var(--color-primary));
		border: none;
		border-radius: var(--radius-md);
		color: white;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--duration-200) var(--easing);
		font-size: 0.875rem;
	}

	.refresh-button:hover {
		box-shadow: 0 0 12px rgba(34, 197, 211, 0.3);
		transform: translateY(-1px);
	}

	.cache-status {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
	}

	.status-text {
		color: var(--color-text-secondary);
	}

	.cache-age {
		color: var(--color-accent);
		font-weight: 500;
	}

	.error-box {
		padding: 1.5rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-lg);
		color: var(--color-error);
		text-align: center;
	}

	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.skeleton-card {
		height: 150px;
		background: linear-gradient(90deg, var(--color-bg-card), var(--color-border));
		border-radius: var(--radius-lg);
		animation: pulse 2s var(--easing) infinite;
	}

	.topics-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-item {
		height: 40px;
		background: linear-gradient(90deg, var(--color-bg-card), var(--color-border));
		border-radius: var(--radius-md);
		animation: pulse 2s var(--easing) infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	.kpi-section,
	.section-card {
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 1rem;
	}

	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.kpi-card {
		display: flex;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		transition: all var(--duration-300) var(--easing);
		backdrop-filter: blur(10px);
	}

	.kpi-card:hover {
		border-color: rgba(34, 197, 211, 0.5);
		background: rgba(51, 65, 85, 0.7);
		box-shadow: 0 0 20px rgba(34, 197, 211, 0.1);
	}

	.kpi-icon {
		font-size: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.kpi-content {
		flex: 1;
	}

	.kpi-label {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.kpi-value {
		font-size: 1.875rem;
		font-weight: 700;
		background: linear-gradient(135deg, var(--color-accent), var(--color-primary));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0;
	}

	.kpi-subtitle {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		margin: 0.25rem 0 0 0;
	}

	.section-card {
		padding: 2rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(10px);
	}

	.topics-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.topic-item {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem;
		background: rgba(16, 185, 129, 0.05);
		border-radius: var(--radius-md);
		border-left: 3px solid var(--color-primary);
	}

	.topic-name {
		color: var(--color-text);
		font-weight: 500;
	}

	.topic-count {
		color: var(--color-accent);
		font-weight: 600;
	}

	.no-data {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-align: center;
		padding: 2rem;
	}

	.link-button {
		display: inline-block;
		color: var(--color-accent);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: color var(--duration-200) var(--easing);
	}

	.link-button:hover {
		color: var(--color-primary);
	}

	.health-grid {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.health-item {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.health-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.health-bar {
		width: 100%;
		height: 8px;
		background: rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	.health-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
		transition: width var(--duration-500) var(--easing);
	}

	.health-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-accent);
	}

	@media (max-width: 768px) {
		.page-header h1 {
			font-size: 1.5rem;
		}

		.kpi-grid {
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
			gap: 1rem;
		}

		.section-card {
			padding: 1.5rem;
		}

		.refresh-controls {
			flex-direction: column;
			gap: 0.5rem;
			align-items: flex-end;
		}
	}

	/* Heatmap Styles */
	.year-selector {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: var(--color-bg-card);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md);
		border: 1px solid rgba(71, 85, 105, 0.3);
	}

	.year-selector button {
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 1.1rem;
		transition: color 200ms ease;
	}

	.year-selector button:hover {
		color: var(--color-accent);
	}

	.year-display {
		font-weight: 600;
		color: var(--color-text);
		min-width: 60px;
		text-align: center;
	}

	.heatmap-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-bar {
		height: 30px;
		background: linear-gradient(90deg, var(--color-bg-card), var(--color-border));
		border-radius: var(--radius-md);
		animation: pulse 2s var(--easing) infinite;
	}

	.heatmap-wrapper {
		overflow-x: auto;
		border: 1px solid rgba(71, 85, 105, 0.2);
		border-radius: var(--radius-md);
		padding: 1rem;
		background: var(--color-bg-card);
	}

	.heatmap-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.heatmap-table thead {
		background: rgba(71, 85, 105, 0.3);
		border-bottom: 2px solid rgba(71, 85, 105, 0.4);
	}

	.header-row th {
		padding: 0.75rem 0.5rem;
		text-align: center;
		font-weight: 600;
		color: var(--color-text-secondary);
		border-right: 1px solid rgba(71, 85, 105, 0.2);
	}

	.topic-header {
		text-align: left;
		width: 100px;
	}

	.month-header {
		width: 50px;
		font-size: 0.75rem;
	}

	.data-row {
		border-bottom: 1px solid rgba(71, 85, 105, 0.1);
		transition: background-color 150ms ease;
	}

	.data-row:hover {
		background: rgba(71, 85, 105, 0.15);
	}

	.topic-cell {
		padding: 0.75rem 1rem;
		font-weight: 600;
		color: var(--color-text);
		border-right: 1px solid rgba(71, 85, 105, 0.2);
		width: 100px;
		text-align: left;
	}

	.heatmap-cell {
		padding: 0.5rem;
		text-align: center;
		border-right: 1px solid rgba(71, 85, 105, 0.1);
		background: linear-gradient(
			135deg,
			hsla(270, 100%, 70%, calc(var(--intensity) * 0.3)),
			hsla(200, 100%, 60%, calc(var(--intensity) * 0.5))
		);
		transition: all 150ms ease;
		cursor: pointer;
	}

	.heatmap-cell:hover {
		transform: scale(1.05);
		box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.3);
	}

	.cell-value {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		display: block;
	}

	/* New styles for System Status Card */
	.system-status-section {
		margin-bottom: 2rem;
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.status-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(10px);
		transition: all var(--duration-300) var(--easing);
	}

	.status-card:hover {
		border-color: rgba(34, 197, 211, 0.5);
		background: rgba(51, 65, 85, 0.7);
		box-shadow: 0 0 20px rgba(34, 197, 211, 0.1);
	}

	.status-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.2);
	}

	.status-badge {
		font-size: 1.25rem;
		font-weight: 700;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md);
		color: white;
		flex-shrink: 0;
	}

	.badge-healthy {
		background: linear-gradient(135deg, var(--color-success), var(--color-primary));
	}

	.badge-degraded {
		background: linear-gradient(135deg, var(--color-warning), var(--color-primary));
	}

	.badge-stale {
		background: linear-gradient(135deg, var(--color-info), var(--color-primary));
	}

	.status-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.status-item {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.status-label {
		font-weight: 500;
	}

	.status-value {
		font-weight: 600;
		color: var(--color-accent);
	}

	.quality-card {
		padding: 1.5rem;
		background: var(--color-bg-card);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(10px);
	}

	.quality-card h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 1rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.2);
		padding-bottom: 0.75rem;
	}

	.quality-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.quality-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.quality-label {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.quality-value {
		font-size: 1.25rem;
		font-weight: 700;
		background: linear-gradient(135deg, var(--color-accent), var(--color-primary));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
</style>
