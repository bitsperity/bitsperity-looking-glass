<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as satbaseApi from '$lib/api/satbase';
	import Card from '$lib/components/shared/Card.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import Badge from '$lib/components/shared/Badge.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import type { SchedulerJob, SchedulerExecution, SchedulerGap, SchedulerStatus } from '$lib/api/satbase';

	// State
	let status: SchedulerStatus | null = null;
	let jobs: SchedulerJob[] = [];
	let executions: SchedulerExecution[] = [];
	let gaps: SchedulerGap[] = [];
	let loading = true;
	let error: string | null = null;
	let autoRefresh = true;
	let refreshInterval = 5000; // 5 seconds
	let timer: NodeJS.Timeout | null = null;
	let activeTab: 'overview' | 'jobs' | 'executions' | 'gaps' = 'overview';
	let expandedJobId: string | null = null;
	let selectedJob: SchedulerJob | null = null;
	let editingJob: SchedulerJob | null = null;
	let actionLoading: Record<string, boolean> = {};
	
	// Edit job form state
	let editMinutes: number = 30;
	let editHours: number = 0;
	let editEnabled: boolean = true;

	// Load data
	async function loadData() {
		try {
			loading = true;
			error = null;

			const [statusRes, jobsRes, executionsRes, gapsRes] = await Promise.all([
				satbaseApi.getSchedulerStatus().catch(() => null),
				satbaseApi.getSchedulerJobs().catch(() => ({ jobs: [] })),
				satbaseApi.getAllExecutions({ limit: 50 }).catch(() => ({ executions: [] })),
				satbaseApi.getSchedulerGaps({ filled: false, limit: 50 }).catch(() => ({ gaps: [] }))
			]);

			status = statusRes;
			jobs = jobsRes.jobs || [];
			executions = executionsRes.executions || [];
			gaps = gapsRes.gaps || [];
		} catch (e: any) {
			error = e?.message || String(e);
		} finally {
			loading = false;
		}
	}

	// Toggle job enabled/disabled
	async function toggleJob(job: SchedulerJob) {
		actionLoading[job.job_id] = true;
		try {
			if (job.enabled) {
				await satbaseApi.disableSchedulerJob(job.job_id);
			} else {
				await satbaseApi.enableSchedulerJob(job.job_id);
			}
			await loadData();
		} catch (e: any) {
			error = `Failed to ${job.enabled ? 'disable' : 'enable'} job: ${e?.message || String(e)}`;
		} finally {
			actionLoading[job.job_id] = false;
		}
	}

	// Trigger job manually
	async function triggerJob(jobId: string) {
		actionLoading[`trigger_${jobId}`] = true;
		try {
			await satbaseApi.triggerSchedulerJob(jobId);
			error = 'Job trigger requested (note: manual trigger requires scheduler HTTP API)';
			setTimeout(() => (error = null), 3000);
			await loadData();
		} catch (e: any) {
			error = `Failed to trigger job: ${e?.message || String(e)}`;
		} finally {
			actionLoading[`trigger_${jobId}`] = false;
		}
	}

	// Format helpers
	function formatDuration(ms: number | null): string {
		if (!ms) return '-';
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	}

	function formatDateTime(iso: string | null): string {
		if (!iso) return '-';
		const date = new Date(iso);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatRelativeTime(iso: string | null): string {
		if (!iso) return '-';
		const date = new Date(iso);
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffMins = Math.round(diffMs / 60000);

		if (Math.abs(diffMins) < 1) return 'now';
		if (diffMins < 0) return `${Math.abs(diffMins)}m ago`;
		return `in ${diffMins}m`;
	}

	function getStatusColor(status: string | null): string {
		switch (status) {
			case 'success':
				return 'text-emerald-400';
			case 'error':
				return 'text-red-400';
			case 'running':
				return 'text-yellow-400';
			default:
				return 'text-neutral-400';
		}
	}

	function getSeverityColor(severity: string): string {
		switch (severity) {
			case 'critical':
				return 'text-red-400 bg-red-500/10 border-red-500/20';
			case 'high':
				return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
			case 'medium':
				return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
			case 'low':
				return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
			default:
				return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20';
		}
	}

	function getTriggerDescription(job: SchedulerJob): string {
		if (job.trigger_type === 'interval') {
			const config = job.trigger_config || {};
			// Support both hours and minutes in trigger_config
			const hours = config.hours || 0;
			const minutes = config.minutes || 0;
			
			// Convert minutes to hours if we have both
			const totalHours = hours + (minutes / 60);
			const totalMinutes = (hours * 60) + minutes;
			
			if (totalHours >= 24) return `Every ${Math.round(totalHours / 24)} day(s)`;
			if (totalHours >= 1) return `Every ${totalHours} hour(s)`;
			if (totalMinutes >= 1) return `Every ${totalMinutes} minute(s)`;
			return `Every ${minutes || 0} minute(s)`;
		}

		// Cron trigger
		const config = job.trigger_config || {};
		if (config.day_of_week) {
			return `Weekly on ${config.day_of_week} at ${config.hour || '?'}:${String(config.minute || '00').padStart(2, '0')} UTC`;
		}
		return `Daily at ${config.hour || '?'}:${String(config.minute || '00').padStart(2, '0')} UTC`;
	}

	// Auto-refresh
	function startAutoRefresh() {
		if (timer) clearInterval(timer);
		if (autoRefresh) {
			timer = setInterval(loadData, refreshInterval);
		}
	}

	onMount(() => {
		loadData();
		startAutoRefresh();
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	$: if (autoRefresh) {
		startAutoRefresh();
	}
</script>

<div class="scheduler-page">
	<!-- Header -->
	<div class="page-header">
		<div>
			<h1>⏰ Scheduler</h1>
			<p>Automated data maintenance and gap management</p>
		</div>
		<div class="header-controls">
			<label class="auto-refresh-toggle">
				<input type="checkbox" bind:checked={autoRefresh} />
				<span>Auto-refresh</span>
			</label>
			<Button variant="secondary" size="sm" on:click={loadData} disabled={loading}>
				{loading ? '⟳' : '↻'} Refresh
			</Button>
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			{error}
		</div>
	{/if}

	{#if loading && !status}
		<div class="loading-grid">
			{#each Array(6) as _}
				<Card padding="p-6">
					<div class="animate-pulse space-y-3">
						<div class="h-4 bg-neutral-700 rounded w-3/4"></div>
						<div class="h-8 bg-neutral-700 rounded w-1/2"></div>
					</div>
				</Card>
			{/each}
		</div>
	{:else if status}
		<!-- Stats Overview -->
		<section class="stats-section">
			<div class="stats-grid">
				<Card padding="p-5" hover={true}>
					<div class="stat-item">
						<div class="stat-icon">⏰</div>
						<div class="stat-content">
							<p class="stat-label">Total Jobs</p>
							<p class="stat-value">{status.stats.total_jobs}</p>
							<p class="stat-subtitle">{status.stats.enabled_jobs} enabled</p>
						</div>
					</div>
				</Card>

				<Card padding="p-5" hover={true}>
					<div class="stat-item">
						<div class="stat-icon">✓</div>
						<div class="stat-content">
							<p class="stat-label">Success Rate</p>
							<p class="stat-value text-emerald-400">
								{status.stats.recent_executions.total > 0
									? Math.round(
											(status.stats.recent_executions.success /
												status.stats.recent_executions.total) *
												100
										)
									: 0}%
							</p>
							<p class="stat-subtitle">
								{status.stats.recent_executions.success} /{' '}
								{status.stats.recent_executions.total}
							</p>
						</div>
					</div>
				</Card>

				<Card padding="p-5" hover={true}>
					<div class="stat-item">
						<div class="stat-icon">⚠️</div>
						<div class="stat-content">
							<p class="stat-label">Errors</p>
							<p class="stat-value text-red-400">
								{status.stats.recent_executions.error}
							</p>
							<p class="stat-subtitle">Recent executions</p>
						</div>
					</div>
				</Card>

				<Card padding="p-5" hover={true}>
					<div class="stat-item">
						<div class="stat-icon">🔍</div>
						<div class="stat-content">
							<p class="stat-label">Unfilled Gaps</p>
							<p class="stat-value text-yellow-400">
								{status.stats.unfilled_gaps.total}
							</p>
							<p class="stat-subtitle">
								{Object.keys(status.stats.unfilled_gaps.by_type).length > 0
									? Object.entries(status.stats.unfilled_gaps.by_type)
											.map(([type, count]) => `${type}: ${count}`)
											.join(', ')
									: 'No gaps detected'}
							</p>
						</div>
					</div>
				</Card>
			</div>
		</section>

		<!-- Tabs -->
		<div class="tabs-container">
			<button
				class="tab {activeTab === 'overview' ? 'active' : ''}"
				on:click={() => (activeTab = 'overview')}
			>
				📊 Overview
			</button>
			<button
				class="tab {activeTab === 'jobs' ? 'active' : ''}"
				on:click={() => (activeTab = 'jobs')}
			>
				⚙️ Jobs ({jobs.length})
			</button>
			<button
				class="tab {activeTab === 'executions' ? 'active' : ''}"
				on:click={() => (activeTab = 'executions')}
			>
				📜 History ({executions.length})
			</button>
			<button
				class="tab {activeTab === 'gaps' ? 'active' : ''}"
				on:click={() => (activeTab = 'gaps')}
			>
				🔍 Gaps ({gaps.length})
			</button>
		</div>

		<!-- Tab Content -->
		{#if activeTab === 'overview'}
			<!-- Jobs Overview -->
			<section class="content-section">
				<h2 class="section-title">Active Jobs</h2>
				<div class="jobs-grid">
					{#each jobs.filter((j) => j.enabled) as job}
						<Card padding="p-4" hover={true}>
							<div class="job-card">
								<div class="job-header">
									<div class="flex items-center gap-3">
										<div
											class="job-status-indicator {job.enabled
												? 'enabled'
												: 'disabled'}"
										></div>
										<div class="flex-1 min-w-0">
											<h3 class="job-name">{job.name}</h3>
											<p class="job-schedule">{getTriggerDescription(job)}</p>
										</div>
									</div>
									<label class="toggle-switch">
										<input
											type="checkbox"
											checked={job.enabled}
											on:change={() => toggleJob(job)}
											disabled={actionLoading[job.job_id]}
										/>
										<span class="toggle-slider"></span>
									</label>
								</div>

								<div class="job-details">
									<div class="detail-row">
										<span class="detail-label">Last Run:</span>
										<span class="detail-value {getStatusColor(job.last_run_status)}">
											{job.last_run_status || 'Never'}
										</span>
									</div>
									{#if job.last_run_time}
										<div class="detail-row">
											<span class="detail-label">Duration:</span>
											<span class="detail-value">
												{formatDuration(job.last_run_duration_ms)}
											</span>
										</div>
									{/if}
									{#if job.next_run_time}
										<div class="detail-row">
											<span class="detail-label">Next Run:</span>
											<span class="detail-value">
												{formatRelativeTime(job.next_run_time)}
											</span>
										</div>
									{/if}
									{#if job.last_error}
										<div class="detail-row">
											<span class="detail-label text-red-400">Error:</span>
											<span class="detail-value text-red-300 text-xs line-clamp-1">
												{job.last_error}
											</span>
										</div>
									{/if}
								</div>

								<div class="job-actions">
									<Button
										variant="ghost"
										size="sm"
										on:click={() => {
											selectedJob = job;
											activeTab = 'executions';
										}}
									>
										📜 History
									</Button>
									<Button
										variant="ghost"
										size="sm"
										on:click={() => openEditJob(job)}
									>
										⚙️ Edit
									</Button>
									<Button
										variant="ghost"
										size="sm"
										on:click={() => triggerJob(job.job_id)}
										disabled={actionLoading[`trigger_${job.job_id}`]}
									>
										⚡ Trigger
									</Button>
								</div>
							</div>
						</Card>
					{/each}
				</div>
			</section>
		{:else if activeTab === 'jobs'}
			<!-- All Jobs -->
			<section class="content-section">
				<div class="section-header">
					<h2 class="section-title">All Jobs</h2>
					<div class="filter-controls">
						<label class="filter-toggle">
							<input
								type="checkbox"
								checked={true}
								on:change={(e) => {
									// Toggle filter logic
								}}
							/>
							<span>Show disabled</span>
						</label>
					</div>
				</div>

				<div class="jobs-list">
					{#each jobs as job}
						<Card padding="p-4" hover={true}>
							<div class="job-row">
								<div class="flex items-center gap-4 flex-1">
									<div
										class="job-status-indicator {job.enabled ? 'enabled' : 'disabled'}"
									></div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 mb-1">
											<h3 class="job-name">{job.name}</h3>
											{#if !job.enabled}
												<Badge variant="secondary" size="sm">Disabled</Badge>
											{/if}
										</div>
										<p class="job-schedule text-sm">{getTriggerDescription(job)}</p>
										<div class="job-meta">
											<span class="meta-item">ID: {job.job_id}</span>
											{#if job.last_run_status}
												<span class="meta-item {getStatusColor(job.last_run_status)}">
													Last: {job.last_run_status}
												</span>
											{/if}
										</div>
									</div>
									<div class="job-controls">
										<label class="toggle-switch">
											<input
												type="checkbox"
												checked={job.enabled}
												on:change={() => toggleJob(job)}
												disabled={actionLoading[job.job_id]}
											/>
											<span class="toggle-slider"></span>
										</label>
										<Button
											variant="ghost"
											size="sm"
											on:click={() => {
												expandedJobId = expandedJobId === job.job_id ? null : job.job_id;
											}}
										>
											{expandedJobId === job.job_id ? '▼' : '▶'} Details
										</Button>
									</div>
								</div>

								{#if expandedJobId === job.job_id}
									<div class="job-expanded">
										<div class="expanded-grid">
											<div>
												<div class="expanded-label">Job Function</div>
												<div class="expanded-value font-mono text-xs">{job.job_func}</div>
											</div>
											<div>
												<div class="expanded-label">Max Instances</div>
												<div class="expanded-value">{job.max_instances}</div>
											</div>
											<div>
												<div class="expanded-label">Next Run</div>
												<div class="expanded-value">
													{job.next_run_time
														? formatDateTime(job.next_run_time)
														: 'Not scheduled'}
												</div>
											</div>
											<div>
												<div class="expanded-label">Last Run</div>
												<div class="expanded-value">
													{job.last_run_time ? formatDateTime(job.last_run_time) : 'Never'}
												</div>
											</div>
										</div>
										{#if job.last_error}
											<div class="error-box">
												<div class="error-label">Last Error</div>
												<div class="error-message">{job.last_error}</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</Card>
					{/each}
				</div>
			</section>
		{:else if activeTab === 'executions'}
			<!-- Execution History -->
			<section class="content-section">
				<div class="section-header">
					<h2 class="section-title">Execution History</h2>
					{#if selectedJob}
						<Button
							variant="ghost"
							size="sm"
							on:click={() => (selectedJob = null)}
						>
							Clear Filter
						</Button>
					{/if}
				</div>

				{#if executions.length === 0}
					<Card padding="p-12">
						<div class="empty-state">
							<div class="empty-icon">📜</div>
							<p class="empty-text">No executions yet</p>
						</div>
					</Card>
				{:else}
					<div class="executions-list">
						{#each executions as execution}
							<Card padding="p-4" hover={true}>
								<div class="execution-row">
									<div class="flex items-center gap-4 flex-1">
										<div class="execution-status {execution.status}">
											{#if execution.status === 'success'}
												✓
											{:else if execution.status === 'error'}
												✗
											{:else if execution.status === 'running'}
												⟳
											{:else}
												⊗
											{/if}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2 mb-1">
												<span class="execution-job-id">{execution.job_id}</span>
												<Badge variant={execution.status === 'success' ? 'success' : execution.status === 'error' ? 'error' : 'secondary'} size="sm">
													{execution.status}
												</Badge>
											</div>
											<div class="execution-meta">
												<span class="meta-item">
													Started: {formatDateTime(execution.started_at)}
												</span>
												{#if execution.finished_at}
													<span class="meta-item">
														Duration: {formatDuration(execution.duration_ms)}
													</span>
												{/if}
											</div>
											{#if execution.error_message}
												<div class="error-preview">{execution.error_message}</div>
											{/if}
											{#if execution.result_summary}
												<div class="result-preview">
													{JSON.stringify(execution.result_summary).slice(0, 100)}...
												</div>
											{/if}
										</div>
									</div>
								</div>
							</Card>
						{/each}
					</div>
				{/if}
			</section>
		{:else if activeTab === 'gaps'}
			<!-- Gaps -->
			<section class="content-section">
				<div class="section-header">
					<h2 class="section-title">Data Gaps</h2>
					<div class="filter-controls">
						<Button variant="ghost" size="sm" on:click={loadData}>Refresh</Button>
					</div>
				</div>

				{#if gaps.length === 0}
					<Card padding="p-12">
						<div class="empty-state">
							<div class="empty-icon">✅</div>
							<p class="empty-text">No unfilled gaps detected</p>
						</div>
					</Card>
				{:else}
					<div class="gaps-list">
						{#each gaps as gap}
							<Card padding="p-4" hover={true}>
								<div class="gap-row">
									<div class="flex items-center gap-4 flex-1">
										<Badge variant="error" size="md" classes={getSeverityColor(gap.severity)}>
											{gap.severity}
										</Badge>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2 mb-1">
												<span class="gap-type">{gap.gap_type}</span>
												{#if gap.ticker}
													<Badge variant="secondary" size="sm">{gap.ticker}</Badge>
												{/if}
												{#if gap.series_id}
													<Badge variant="secondary" size="sm">{gap.series_id}</Badge>
												{/if}
											</div>
											<div class="gap-meta">
												<span class="meta-item">
													{gap.from_date} → {gap.to_date}
												</span>
												<span class="meta-item">
													Priority: {gap.priority}
												</span>
												<span class="meta-item">
													Detected: {formatDateTime(gap.detected_at)}
												</span>
											</div>
										</div>
									</div>
								</div>
							</Card>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	{/if}
</div>

<!-- Edit Job Modal -->
{#if editingJob}
	<div class="modal-overlay" on:click={closeEditJob}>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h2 class="modal-title">Edit Job: {editingJob.name}</h2>
				<button class="modal-close" on:click={closeEditJob}>×</button>
			</div>
			
			<div class="modal-body">
				{#if editingJob.trigger_type === 'interval'}
					<div class="form-group">
						<label class="form-label">Schedule Interval</label>
						<div class="form-row">
							<div class="form-field">
								<label class="field-label">Hours</label>
								<Input
									type="number"
									bind:value={editHours}
									min="0"
									placeholder="0"
								/>
							</div>
							<div class="form-field">
								<label class="field-label">Minutes</label>
								<Input
									type="number"
									bind:value={editMinutes}
									min="0"
									max="59"
									placeholder="30"
								/>
							</div>
						</div>
						<p class="form-help">Will run every {editHours > 0 ? `${editHours} hour(s) ` : ''}{editMinutes > 0 ? `${editMinutes} minute(s)` : editHours === 0 ? '0 minutes' : ''}</p>
					</div>
				{:else}
					<div class="form-group">
						<label class="form-label">Schedule</label>
						<p class="text-neutral-400 text-sm">
							Cron-based schedules cannot be edited via UI. Please edit the scheduler configuration directly.
						</p>
					</div>
				{/if}
				
				<div class="form-group">
					<label class="form-label">Status</label>
					<label class="toggle-switch">
						<input
							type="checkbox"
							bind:checked={editEnabled}
						/>
						<span class="toggle-slider"></span>
						<span class="toggle-label">{editEnabled ? 'Enabled' : 'Disabled'}</span>
					</label>
				</div>
				
				<div class="form-warning">
					⚠️ Note: Schedule changes require scheduler restart to take effect.
				</div>
			</div>
			
			<div class="modal-footer">
				<Button variant="ghost" on:click={closeEditJob}>Cancel</Button>
				<Button
					variant="primary"
					on:click={saveJobConfig}
					disabled={actionLoading[`edit_${editingJob.job_id}`]}
				>
					{actionLoading[`edit_${editingJob.job_id}`] ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	.scheduler-page {
		max-width: 90rem;
		margin: 0 auto;
		padding: 0 1.5rem 2rem;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.3);
	}

	.page-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: rgb(248, 250, 252);
		margin-bottom: 0.25rem;
	}

	.page-header p {
		font-size: 0.875rem;
		color: rgb(148, 163, 184);
	}

	.header-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.auto-refresh-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: rgb(148, 163, 184);
		cursor: pointer;
	}

	.auto-refresh-toggle input {
		cursor: pointer;
	}

	.error-banner {
		padding: 1rem;
		margin-bottom: 1.5rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
		color: rgb(252, 165, 165);
		font-size: 0.875rem;
	}

	.loading-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.stats-section {
		margin-bottom: 2rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.stat-content {
		flex: 1;
		min-width: 0;
	}

	.stat-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		font-weight: 600;
		color: rgb(148, 163, 184);
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.875rem;
		font-weight: 700;
		color: rgb(248, 250, 252);
		line-height: 1.2;
	}

	.stat-subtitle {
		font-size: 0.75rem;
		color: rgb(100, 116, 139);
		margin-top: 0.25rem;
	}

	.tabs-container {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid rgba(71, 85, 105, 0.3);
	}

	.tab {
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgb(148, 163, 184);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab:hover {
		color: rgb(248, 250, 252);
	}

	.tab.active {
		color: rgb(16, 185, 129);
		border-bottom-color: rgb(16, 185, 129);
	}

	.content-section {
		margin-bottom: 2rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: rgb(248, 250, 252);
	}

	.filter-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: rgb(148, 163, 184);
		cursor: pointer;
	}

	.jobs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1rem;
	}

	.job-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.job-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.job-status-indicator {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.job-status-indicator.enabled {
		background: rgb(34, 197, 211);
		box-shadow: 0 0 8px rgba(34, 197, 211, 0.5);
	}

	.job-status-indicator.disabled {
		background: rgb(100, 116, 139);
	}

	.job-name {
		font-size: 1rem;
		font-weight: 600;
		color: rgb(248, 250, 252);
		margin-bottom: 0.25rem;
	}

	.job-schedule {
		font-size: 0.875rem;
		color: rgb(148, 163, 184);
	}

	.job-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(71, 85, 105, 0.3);
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	.detail-label {
		color: rgb(148, 163, 184);
	}

	.detail-value {
		color: rgb(248, 250, 252);
		font-weight: 500;
	}

	.job-actions {
		display: flex;
		gap: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(71, 85, 105, 0.3);
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 2.75rem;
		height: 1.5rem;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgb(51, 65, 85);
		transition: 0.2s;
		border-radius: 1.5rem;
	}

	.toggle-slider:before {
		position: absolute;
		content: '';
		height: 1.125rem;
		width: 1.125rem;
		left: 0.1875rem;
		bottom: 0.1875rem;
		background-color: white;
		transition: 0.2s;
		border-radius: 50%;
	}

	.toggle-switch input:checked + .toggle-slider {
		background-color: rgb(16, 185, 129);
	}

	.toggle-switch input:checked + .toggle-slider:before {
		transform: translateX(1.25rem);
	}

	.toggle-switch input:disabled + .toggle-slider {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.jobs-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.job-row {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.job-meta {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: rgb(100, 116, 139);
	}

	.meta-item {
		font-family: ui-monospace, monospace;
	}

	.job-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.job-expanded {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(71, 85, 105, 0.3);
	}

	.expanded-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.expanded-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		font-weight: 600;
		color: rgb(148, 163, 184);
		margin-bottom: 0.25rem;
	}

	.expanded-value {
		font-size: 0.875rem;
		color: rgb(248, 250, 252);
	}

	.error-box {
		padding: 0.75rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
	}

	.error-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgb(252, 165, 165);
		margin-bottom: 0.25rem;
	}

	.error-message {
		font-size: 0.875rem;
		color: rgb(254, 202, 202);
		font-family: ui-monospace, monospace;
	}

	.executions-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.execution-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.execution-status {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		flex-shrink: 0;
	}

	.execution-status.success {
		background: rgba(16, 185, 129, 0.2);
		color: rgb(16, 185, 129);
	}

	.execution-status.error {
		background: rgba(239, 68, 68, 0.2);
		color: rgb(239, 68, 68);
	}

	.execution-status.running {
		background: rgba(251, 146, 60, 0.2);
		color: rgb(251, 146, 60);
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.execution-job-id {
		font-size: 0.875rem;
		font-weight: 600;
		color: rgb(248, 250, 252);
		font-family: ui-monospace, monospace;
	}

	.execution-meta {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: rgb(100, 116, 139);
	}

	.error-preview {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: rgba(239, 68, 68, 0.1);
		border-radius: 0.375rem;
		font-size: 0.75rem;
		color: rgb(252, 165, 165);
	}

	.result-preview {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: rgba(51, 65, 85, 0.5);
		border-radius: 0.375rem;
		font-size: 0.75rem;
		color: rgb(148, 163, 184);
		font-family: ui-monospace, monospace;
	}

	.gaps-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.gap-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.gap-type {
		font-size: 0.875rem;
		font-weight: 600;
		color: rgb(248, 250, 252);
		text-transform: capitalize;
	}

	.gap-meta {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: rgb(100, 116, 139);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-text {
		font-size: 0.875rem;
		color: rgb(148, 163, 184);
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: rgb(30, 41, 59);
		border: 1px solid rgb(51, 65, 85);
		border-radius: 0.5rem;
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 1px solid rgb(51, 65, 85);
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: rgb(248, 250, 252);
		margin: 0;
	}

	.modal-close {
		background: none;
		border: none;
		color: rgb(148, 163, 184);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition: all 0.2s;
	}

	.modal-close:hover {
		background: rgb(51, 65, 85);
		color: rgb(248, 250, 252);
	}

	.modal-body {
		padding: 1.5rem;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid rgb(51, 65, 85);
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgb(248, 250, 252);
		margin-bottom: 0.5rem;
	}

	.form-row {
		display: flex;
		gap: 1rem;
	}

	.form-field {
		flex: 1;
	}

	.field-label {
		display: block;
		font-size: 0.75rem;
		color: rgb(148, 163, 184);
		margin-bottom: 0.25rem;
	}

	.form-help {
		font-size: 0.75rem;
		color: rgb(148, 163, 184);
		margin-top: 0.5rem;
	}

	.form-warning {
		padding: 0.75rem;
		background: rgba(251, 191, 36, 0.1);
		border: 1px solid rgba(251, 191, 36, 0.3);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		color: rgb(251, 191, 36);
		margin-top: 1rem;
	}

	.toggle-label {
		margin-left: 0.5rem;
		font-size: 0.875rem;
		color: rgb(248, 250, 252);
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.jobs-grid {
			grid-template-columns: 1fr;
		}

		.tabs-container {
			overflow-x: auto;
		}
	}
</style>

