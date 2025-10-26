<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	const sections = [
		{ label: '📊 Overview', href: '/satbase/overview', icon: '📊' },
		{ label: '📋 Topics', href: '/satbase/topics', icon: '📋' },
		{ label: '📰 News', href: '/satbase/news', icon: '📰' },
		{ label: '📈 Watchlist', href: '/satbase/watchlist', icon: '📈' },
		{ label: '💹 Prices', href: '/satbase/prices', icon: '💹' },
		{ label: '📊 Macro', href: '/satbase/macro', icon: '📊' },
		{ label: '🔧 Jobs', href: '/satbase/jobs', icon: '🔧' }
	];

	let activeIndex = 0;
	let underlineStyle = '';

	function isActive(href: string): boolean {
		return $page.url.pathname === href;
	}

	function updateUnderline(index: number) {
		activeIndex = index;
		// Animation via CSS will handle the visual transition
	}

	onMount(() => {
		// Find active tab on mount
		const active = sections.findIndex((s) => isActive(s.href));
		if (active >= 0) {
			activeIndex = active;
		}
	});

	$: {
		// Reactive: update when page changes
		const active = sections.findIndex((s) => isActive(s.href));
		if (active >= 0) {
			activeIndex = active;
		}
	}
</script>

<nav class="satbase-nav" role="navigation" aria-label="Satbase sections">
	<div class="nav-container">
		<div class="nav-content">
			<!-- Animated underline indicator -->
			<div class="underline-track">
				<div class="underline" style="--active-index: {activeIndex}" />
			</div>

			<!-- Tab list -->
			{#each sections as section, i (i)}
				<a
					href={section.href}
					class="nav-tab"
					class:active={isActive(section.href)}
					on:click={() => updateUnderline(i)}
					role="tab"
					aria-selected={isActive(section.href)}
				>
					<span class="tab-label">{section.label}</span>
				</a>
			{/each}
		</div>
	</div>
</nav>

<style>
	.satbase-nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.8) 100%);
		border-bottom: 1px solid rgba(71, 85, 105, 0.3);
		backdrop-filter: blur(12px);
		z-index: 100;
		padding: 0;
	}

	.nav-container {
		max-width: 90rem;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.nav-content {
		position: relative;
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		overflow-y: hidden;
		scroll-behavior: smooth;
		scroll-snap-type: x mandatory;
		padding: 0;
		margin: 0;
	}

	/* Hide scrollbar */
	.nav-content::-webkit-scrollbar {
		display: none;
	}
	.nav-content {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.underline-track {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: transparent;
		pointer-events: none;
	}

	.underline {
		position: absolute;
		bottom: 0;
		height: 3px;
		background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
		width: calc(100% / 7); /* 7 tabs */
		left: calc(var(--active-index, 0) * (100% / 7));
		transition: left var(--duration-300) var(--easing);
		box-shadow: 0 0 12px rgba(34, 197, 211, 0.5);
	}

	.nav-tab {
		flex-shrink: 0;
		padding: 1rem 1.25rem;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		border: none;
		background: transparent;
		cursor: pointer;
		transition: color var(--duration-200) var(--easing);
		scroll-snap-align: start;
		white-space: nowrap;
		border-bottom: 3px solid transparent;
		position: relative;
	}

	.nav-tab:hover {
		color: var(--color-text);
	}

	.nav-tab.active {
		color: var(--color-accent);
	}

	.tab-label {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	@media (max-width: 768px) {
		.nav-container {
			padding: 0 1rem;
		}

		.nav-tab {
			padding: 0.875rem 1rem;
			font-size: 0.8125rem;
		}
	}
</style>
