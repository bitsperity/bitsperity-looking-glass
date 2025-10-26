<script lang="ts">
	import SatbaseNav from '$lib/components/satbase/SatbaseNav.svelte';
	import { page } from '$app/stores';
</script>

<div class="satbase-layout">
	<!-- Global Background -->
	<div class="background-gradient" />
	
	<!-- Navigation -->
	<SatbaseNav />
	
	<!-- Main Content -->
	<main class="satbase-main">
		<div class="container">
			<slot />
		</div>
	</main>
</div>

<style>
	:global(:root) {
		/* Colors */
		--color-primary: rgb(16, 185, 129); /* emerald-500 */
		--color-primary-light: rgb(209, 250, 229); /* emerald-100 */
		--color-accent: rgb(34, 197, 211); /* cyan-500 */
		--color-accent-light: rgb(165, 243, 252); /* cyan-100 */
		
		--color-bg-dark: rgb(15, 23, 42); /* slate-950 */
		--color-bg-darker: rgb(2, 6, 23); /* slate-990 custom */
		--color-bg-card: rgba(51, 65, 85, 0.5); /* slate-700/50 */
		--color-border: rgb(71, 85, 105); /* slate-600 */
		--color-border-light: rgb(148, 163, 184); /* slate-400 */
		
		--color-text: rgb(248, 250, 252); /* slate-50 */
		--color-text-secondary: rgb(148, 163, 184); /* slate-400 */
		--color-text-tertiary: rgb(100, 116, 139); /* slate-500 */
		
		/* Status Colors */
		--color-success: rgb(34, 197, 211); /* cyan-500 */
		--color-warning: rgb(251, 146, 60); /* orange-500 */
		--color-error: rgb(239, 68, 68); /* red-500 */
		
		/* Spacing & Sizing */
		--radius-sm: 0.375rem;
		--radius-md: 0.5rem;
		--radius-lg: 0.75rem;
		--radius-xl: 1rem;
		
		--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
		
		/* Transitions */
		--duration-75: 75ms;
		--duration-100: 100ms;
		--duration-200: 200ms;
		--duration-300: 300ms;
		--duration-500: 500ms;
		--easing: cubic-bezier(0.4, 0, 0.2, 1);
	}

	.satbase-layout {
		position: relative;
		min-height: 100vh;
		background: linear-gradient(to bottom, rgb(15, 23, 42), rgb(2, 6, 23));
		overflow-x: hidden;
	}

	.background-gradient {
		position: fixed;
		inset: 0;
		background: 
			radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%),
			radial-gradient(circle at 80% 80%, rgba(34, 197, 211, 0.03) 0%, transparent 50%);
		pointer-events: none;
		z-index: 0;
	}

	:global(main.satbase-main) {
		position: relative;
		z-index: 1;
		padding-top: 4rem; /* Space below nav */
		padding-bottom: 4rem;
	}

	.container {
		max-width: 90rem; /* 1440px */
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	@media (max-width: 768px) {
		.container {
			padding: 0 1rem;
		}
	}
</style>
