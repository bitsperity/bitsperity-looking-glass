<script lang="ts">
	import { page } from '$app/stores';

	const sections = [
		{ label: 'Overview', href: '/satbase/overview', icon: '📊', key: 'overview' },
		{ label: 'Topics', href: '/satbase/topics', icon: '📋', key: 'topics' },
		{ label: 'News', href: '/satbase/news', icon: '📰', key: 'news' },
		{ label: 'Watchlist', href: '/satbase/watchlist', icon: '📈', key: 'watchlist' },
		{ label: 'Prices', href: '/satbase/prices', icon: '💹', key: 'prices' },
		{ label: 'Macro', href: '/satbase/macro', icon: '📊', key: 'macro' },
		{ label: 'Jobs', href: '/satbase/jobs', icon: '🔧', key: 'jobs' }
	];

	function isActive(href: string): boolean {
		return $page.url.pathname === href;
	}
</script>

<nav class="relative flex border-b-2 border-neutral-700/50 mb-6 gap-2">
	{#each sections as section (section.key)}
		<a
			href={section.href}
			class={`relative px-5 py-3 font-medium transition-all duration-200 flex items-center gap-2 group ${
				isActive(section.href)
					? 'text-emerald-400'
					: 'text-neutral-400 hover:text-neutral-200'
			}`}
		>
			<span class="text-xl transition-transform group-hover:scale-110">{section.icon}</span>
			<span>{section.label}</span>
			{#if isActive(section.href)}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-500 shadow-lg shadow-emerald-500/50"></div>
			{/if}
			{#if !isActive(section.href)}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neutral-600 to-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
			{/if}
		</a>
	{/each}
</nav>
