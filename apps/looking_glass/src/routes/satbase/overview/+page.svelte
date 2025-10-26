<script lang="ts">
	import { onMount } from 'svelte';
	import * as satbaseApi from '$lib/api/satbase';
	import { getCachedCoverage, invalidateCache, getCacheRefreshTimeRemaining } from '$lib/stores/satbase-cache';

	let coverage: any = null;
	let topicsSummary: any = null;
	let loading = true;
	let topicsLoading = false;
	let error = '';
	let lastUpdated = new Date();
	let cacheTimeRemaining = 0;
	let autoRefreshInterval: NodeJS.Timeout;

	onMount(async () => {
		try {
			// Load coverage first (from cache, instant)
			coverage = await getCachedCoverage();
			loading = false;
			lastUpdated = new Date();

			// Then load topics summary in background
			topicsLoading = true;
			topicsSummary = await satbaseApi.getTopicsSummary({ 
				limit: 5, 
				days: 30 
			});
		} catch (err) {
			error = `Failed to load overview: ${err}`;
		} finally {
			topicsLoading = false;
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
</style>
