<script lang="ts">
	import { page } from '$app/stores';

	const sections = [
		{ label: '📊 Overview', href: '/satbase/overview' },
		{ label: '📋 Topics', href: '/satbase/topics' },
		{ label: '📰 News', href: '/satbase/news' },
		{ label: '📈 Watchlist', href: '/satbase/watchlist' },
		{ label: '💹 Prices', href: '/satbase/prices' },
		{ label: '📊 Macro', href: '/satbase/macro' },
		{ label: '🔧 Jobs', href: '/satbase/jobs' }
	];

	function isActive(href: string): boolean {
		return $page.url.pathname === href;
	}
</script>

<nav class="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
	<div class="mx-auto max-w-7xl px-4">
		<div class="flex gap-1 overflow-x-auto">
			{#each sections as section, i (i)}
				<a
					href={section.href}
					class={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
						isActive(section.href)
							? 'text-emerald-400 border-b-2 border-emerald-400'
							: 'text-slate-400 hover:text-slate-300'
					}`}
				>
					{section.label}
				</a>
			{/each}
		</div>
	</div>
</nav>
