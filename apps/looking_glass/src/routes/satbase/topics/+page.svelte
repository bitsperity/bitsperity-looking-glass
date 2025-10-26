<script lang="ts">
	import { onMount } from 'svelte';
	import SatbaseNav from '$lib/components/satbase/SatbaseNav.svelte';
	import * as satbaseApi from '$lib/api/satbase';
	import Button from '$lib/components/shared/Button.svelte';
	import Input from '$lib/components/shared/Input.svelte';
	import Card from '$lib/components/shared/Card.svelte';

	interface Topic {
		name: string;
		count: number;
	}

	interface TopicWithStats {
		name: string;
		count: number;
		trend?: number; // percentage change
	}

	let allTopics: Topic[] = [];
	let selectedTopics: string[] = [];
	let loading = false;
	let error = '';
	let newTopic = '';
	let showAddForm = false;
	let viewMode: 'list' | 'analytics' = 'list';
	let granularity: 'month' | 'year' = 'month';
	let fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
	let toDate = new Date().toISOString().split('T')[0];
	let chartData: any[] = [];
	let selectedTopicsForChart: string[] = [];
	let chartLoading = false;

	onMount(async () => {
		await loadTopics();
	});

	async function loadTopics() {
		loading = true;
		error = '';
		try {
			const response = await satbaseApi.getTopicsAll(fromDate, toDate);
			allTopics = response.topics || [];
		} catch (err) {
			error = `Failed to load topics: ${err}`;
		} finally {
			loading = false;
		}
	}

	async function loadChartData() {
		if (selectedTopicsForChart.length === 0) {
			error = 'Select at least one topic for analytics';
			return;
		}

		chartLoading = true;
		error = '';
		try {
			const topicsStr = selectedTopicsForChart.join(',');
			const response = await satbaseApi.getTopicsCoverage(topicsStr, fromDate, toDate, granularity, 'flat');
			chartData = response.data || [];
		} catch (err) {
			error = `Failed to load analytics: ${err}`;
		} finally {
			chartLoading = false;
		}
	}

	function toggleTopicForChart(topic: string) {
		if (selectedTopicsForChart.includes(topic)) {
			selectedTopicsForChart = selectedTopicsForChart.filter((t) => t !== topic);
		} else {
			selectedTopicsForChart = [...selectedTopicsForChart, topic];
		}
	}

	async function addTopic() {
		if (!newTopic.trim()) return;

		const topicName = newTopic.trim().toUpperCase();
		if (allTopics.some((t) => t.name === topicName)) {
			error = 'Topic already exists';
			return;
		}

		loading = true;
		error = '';
		try {
			await satbaseApi.addTopic(topicName);
			newTopic = '';
			showAddForm = false;
			await loadTopics();
		} catch (err) {
			error = `Failed to add topic: ${err}`;
		} finally {
			loading = false;
		}
	}

	async function deleteTopic(topicName: string) {
		if (!confirm(`Delete topic "${topicName}"? This will not remove existing articles tagged with this topic.`))
			return;

		loading = true;
		error = '';
		try {
			await satbaseApi.deleteTopic(topicName);
			await loadTopics();
		} catch (err) {
			error = `Failed to delete topic: ${err}`;
		} finally {
			loading = false;
		}
	}

	function formatCount(count: number): string {
		if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
		if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
		return count.toString();
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
	<SatbaseNav />

	<div class="mx-auto max-w-7xl px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-white mb-2">📋 Topics</h1>
			<p class="text-slate-400">Manage news topics and analyze coverage trends</p>
		</div>

		<!-- Tab Navigation -->
		<div class="mb-8 flex gap-4 border-b border-slate-700">
			<button
				on:click={() => (viewMode = 'list')}
				class={`pb-3 px-1 font-semibold transition-colors ${
					viewMode === 'list'
						? 'text-emerald-400 border-b-2 border-emerald-400'
						: 'text-slate-400 hover:text-slate-300'
				}`}
			>
				📊 Topics List
			</button>
			<button
				on:click={() => (viewMode = 'analytics')}
				class={`pb-3 px-1 font-semibold transition-colors ${
					viewMode === 'analytics'
						? 'text-emerald-400 border-b-2 border-emerald-400'
						: 'text-slate-400 hover:text-slate-300'
				}`}
			>
				📈 Analytics
			</button>
		</div>

		<!-- Error -->
		{#if error}
			<div class="mb-6 rounded-lg bg-red-900/20 border border-red-600/50 p-4 text-red-200">
				{error}
			</div>
		{/if}

		<!-- VIEW: Topics List -->
		{#if viewMode === 'list'}
			<div class="space-y-6">
				<!-- Add Topic Form -->
				{#if showAddForm}
					<Card padding="p-6" classes="bg-slate-900/50 border-slate-700">
						<div class="mb-4">
							<h3 class="text-lg font-semibold text-white">Add New Topic</h3>
						</div>
						<div class="space-y-4">
							<div class="flex gap-2">
								<Input
									bind:value={newTopic}
									placeholder="e.g., AI, semiconductor, renewable-energy"
									type="text"
								/>
								<Button on:click={addTopic} variant="primary">
									<span class="w-4 h-4 mr-2">➕</span>
									Add
								</Button>
								<Button on:click={() => (showAddForm = false)} variant="ghost">
									Cancel
								</Button>
							</div>
						</div>
					</Card>
				{:else}
					<div class="mb-4">
						<Button on:click={() => (showAddForm = true)} variant="primary">
							<span class="w-4 h-4 mr-2">➕</span>
							Add Topic
						</Button>
					</div>
				{/if}

				<!-- Topics Grid -->
				{#if loading}
					<div class="text-center text-slate-400 py-8">Loading topics...</div>
				{:else if allTopics.length === 0}
					<Card padding="p-12" classes="bg-slate-900/50 border-slate-700 text-center">
						<span class="w-12 h-12 mx-auto text-slate-600 mb-4">🗑️</span>
						<p class="text-slate-400 mb-4">No topics yet. Create one to get started.</p>
					</Card>
				{:else}
					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each allTopics as topic (topic.name)}
							<Card padding="p-6" classes="bg-slate-900/50 border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-emerald-900/20">
								<div class="flex items-start justify-between mb-4">
									<div>
										<h3 class="text-lg font-semibold text-white">{topic.name}</h3>
										<p class="text-sm text-slate-400">News Articles</p>
									</div>
									<Button
										on:click={() => deleteTopic(topic.name)}
										variant="ghost"
									>
										<span class="w-4 h-4">🗑️</span>
									</Button>
								</div>

								<div class="space-y-2">
									<div class="flex items-center gap-2">
										<span class="w-4 h-4 text-slate-500">🔗</span>
										<span class="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
											{formatCount(topic.count)}
										</span>
									</div>
									<p class="text-xs text-slate-500">articles covered</p>
								</div>

								<div class="mt-4 pt-4 border-t border-slate-700">
									<Button
										on:click={() => {
											selectedTopicsForChart = [topic.name];
											viewMode = 'analytics';
										}}
										variant="ghost"
									>
										<span class="w-4 h-4 mr-2">📈</span>
										View Trends
									</Button>
								</div>
							</Card>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- VIEW: Analytics -->
		{#if viewMode === 'analytics'}
			<div class="space-y-6">
				<!-- Filters -->
				<Card padding="p-6" classes="bg-slate-900/50 border-slate-700">
					<div class="mb-4">
						<h3 class="text-lg font-semibold text-white">Analytics Filters</h3>
					</div>
					<div class="space-y-4">
						<div class="grid gap-4 md:grid-cols-3">
							<div>
								<label for="fromDate" class="block text-sm font-medium text-slate-300 mb-2">From Date</label>
								<Input
									type="date"
									bind:value={fromDate}
									id="fromDate"
								/>
							</div>
							<div>
								<label for="toDate" class="block text-sm font-medium text-slate-300 mb-2">To Date</label>
								<Input
									type="date"
									bind:value={toDate}
									id="toDate"
								/>
							</div>
							<div>
								<label for="granularity" class="block text-sm font-medium text-slate-300 mb-2">Granularity</label>
								<select
									bind:value={granularity}
									id="granularity"
									class="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
								>
									<option value="month">Monthly</option>
									<option value="year">Yearly</option>
								</select>
							</div>
						</div>
					</div>
				</Card>

				<!-- Topic Selection -->
				<Card padding="p-6" classes="bg-slate-900/50 border-slate-700">
					<div class="mb-4">
						<h3 class="text-lg font-semibold text-white">Select Topics for Analysis</h3>
						<p class="text-slate-400 text-sm">Choose topics to compare in the chart below</p>
					</div>
					<div class="space-y-4">
						<div class="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
							{#each allTopics as topic (topic.name)}
								<button
									on:click={() => toggleTopicForChart(topic.name)}
									class={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
										selectedTopicsForChart.includes(topic.name)
											? 'bg-emerald-600 text-white'
											: 'bg-slate-800 text-slate-300 hover:bg-slate-700'
									}`}
								>
									{topic.name}
									{#if selectedTopicsForChart.includes(topic.name)}
										<span class="ml-2">✓</span>
									{/if}
								</button>
							{/each}
						</div>

						<div class="flex gap-2">
							<Button
								on:click={loadChartData}
								disabled={chartLoading || selectedTopicsForChart.length === 0}
								variant="primary"
							>
								<span class="w-4 h-4 mr-2">📈</span>
								Load Analytics
							</Button>
							{#if selectedTopicsForChart.length > 0}
								<Button
									on:click={() => (selectedTopicsForChart = [])}
									variant="ghost"
								>
									Clear Selection
								</Button>
							{/if}
						</div>
					</div>
				</Card>

				<!-- Chart Data -->
				{#if chartLoading}
					<div class="text-center text-slate-400 py-8">Loading analytics data...</div>
				{:else if chartData.length > 0}
					<Card padding="p-6" classes="bg-slate-900/50 border-slate-700">
						<div class="mb-4">
							<h3 class="text-lg font-semibold text-white">Coverage Over Time</h3>
						</div>
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-slate-700">
										<th class="px-4 py-2 text-left text-slate-300 font-semibold">Period</th>
										{#each selectedTopicsForChart as topic (topic)}
											<th class="px-4 py-2 text-right text-slate-300 font-semibold">{topic}</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each [...new Set(chartData.map((d) => d.period))].sort() as period}
										<tr class="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
											<td class="px-4 py-2 text-slate-300">{period}</td>
											{#each selectedTopicsForChart as topic (topic)}
												<td class="px-4 py-2 text-right">
													{#if chartData.find((d) => d.period === period && d.topic === topic)}
														<span class="text-emerald-400 font-semibold">
															{chartData.find((d) => d.period === period && d.topic === topic)?.count || 0}
														</span>
													{:else}
														<span class="text-slate-600">0</span>
													{/if}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</Card>
				{:else if selectedTopicsForChart.length > 0 && !chartLoading}
					<Card padding="p-8" classes="bg-slate-900/50 border-slate-700 text-center">
						<p class="text-slate-400">No data available for selected topics in this date range</p>
					</Card>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		background: linear-gradient(to bottom, rgb(15, 23, 42), rgb(2, 6, 23));
	}
</style>
