
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/ariadne" | "/ariadne/admin" | "/ariadne/context" | "/ariadne/dashboard" | "/ariadne/explore" | "/ariadne/graph" | "/ariadne/hypotheses" | "/ariadne/hypotheses/[id]" | "/ariadne/impact" | "/ariadne/intelligence" | "/ariadne/intelligence/confidence" | "/ariadne/intelligence/impact" | "/ariadne/intelligence/opportunities" | "/ariadne/intelligence/risk" | "/ariadne/learn" | "/ariadne/manage" | "/ariadne/overview" | "/ariadne/patterns" | "/ariadne/patterns/[id]" | "/ariadne/regimes" | "/ariadne/search" | "/ariadne/similar" | "/ariadne/timeline" | "/ariadne/write" | "/coalescence" | "/coalescence/agents" | "/coalescence/costs" | "/coalescence/rules" | "/coalescence/runs" | "/coalescence/runs/[id]" | "/manifold" | "/manifold/admin" | "/manifold/analytics" | "/manifold/dashboard" | "/manifold/graph" | "/manifold/promote" | "/manifold/promote/[id]" | "/manifold/relations" | "/manifold/relations/[id]" | "/manifold/search" | "/manifold/thoughts" | "/manifold/thoughts/[id]" | "/manifold/timeline" | "/satbase" | "/satbase/convert" | "/satbase/jobs" | "/satbase/macro" | "/satbase/maintenance" | "/satbase/news" | "/satbase/overview" | "/satbase/prices" | "/satbase/topics" | "/satbase/watchlist" | "/tesseract";
		RouteParams(): {
			"/ariadne/hypotheses/[id]": { id: string };
			"/ariadne/patterns/[id]": { id: string };
			"/coalescence/runs/[id]": { id: string };
			"/manifold/promote/[id]": { id: string };
			"/manifold/relations/[id]": { id: string };
			"/manifold/thoughts/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/ariadne": { id?: string };
			"/ariadne/admin": Record<string, never>;
			"/ariadne/context": Record<string, never>;
			"/ariadne/dashboard": Record<string, never>;
			"/ariadne/explore": Record<string, never>;
			"/ariadne/graph": Record<string, never>;
			"/ariadne/hypotheses": { id?: string };
			"/ariadne/hypotheses/[id]": { id: string };
			"/ariadne/impact": Record<string, never>;
			"/ariadne/intelligence": Record<string, never>;
			"/ariadne/intelligence/confidence": Record<string, never>;
			"/ariadne/intelligence/impact": Record<string, never>;
			"/ariadne/intelligence/opportunities": Record<string, never>;
			"/ariadne/intelligence/risk": Record<string, never>;
			"/ariadne/learn": Record<string, never>;
			"/ariadne/manage": Record<string, never>;
			"/ariadne/overview": Record<string, never>;
			"/ariadne/patterns": { id?: string };
			"/ariadne/patterns/[id]": { id: string };
			"/ariadne/regimes": Record<string, never>;
			"/ariadne/search": Record<string, never>;
			"/ariadne/similar": Record<string, never>;
			"/ariadne/timeline": Record<string, never>;
			"/ariadne/write": Record<string, never>;
			"/coalescence": { id?: string };
			"/coalescence/agents": Record<string, never>;
			"/coalescence/costs": Record<string, never>;
			"/coalescence/rules": Record<string, never>;
			"/coalescence/runs": { id?: string };
			"/coalescence/runs/[id]": { id: string };
			"/manifold": { id?: string };
			"/manifold/admin": Record<string, never>;
			"/manifold/analytics": Record<string, never>;
			"/manifold/dashboard": Record<string, never>;
			"/manifold/graph": Record<string, never>;
			"/manifold/promote": { id?: string };
			"/manifold/promote/[id]": { id: string };
			"/manifold/relations": { id?: string };
			"/manifold/relations/[id]": { id: string };
			"/manifold/search": Record<string, never>;
			"/manifold/thoughts": { id?: string };
			"/manifold/thoughts/[id]": { id: string };
			"/manifold/timeline": Record<string, never>;
			"/satbase": Record<string, never>;
			"/satbase/convert": Record<string, never>;
			"/satbase/jobs": Record<string, never>;
			"/satbase/macro": Record<string, never>;
			"/satbase/maintenance": Record<string, never>;
			"/satbase/news": Record<string, never>;
			"/satbase/overview": Record<string, never>;
			"/satbase/prices": Record<string, never>;
			"/satbase/topics": Record<string, never>;
			"/satbase/watchlist": Record<string, never>;
			"/tesseract": Record<string, never>
		};
		Pathname(): "/" | "/ariadne" | "/ariadne/" | "/ariadne/admin" | "/ariadne/admin/" | "/ariadne/context" | "/ariadne/context/" | "/ariadne/dashboard" | "/ariadne/dashboard/" | "/ariadne/explore" | "/ariadne/explore/" | "/ariadne/graph" | "/ariadne/graph/" | "/ariadne/hypotheses" | "/ariadne/hypotheses/" | `/ariadne/hypotheses/${string}` & {} | `/ariadne/hypotheses/${string}/` & {} | "/ariadne/impact" | "/ariadne/impact/" | "/ariadne/intelligence" | "/ariadne/intelligence/" | "/ariadne/intelligence/confidence" | "/ariadne/intelligence/confidence/" | "/ariadne/intelligence/impact" | "/ariadne/intelligence/impact/" | "/ariadne/intelligence/opportunities" | "/ariadne/intelligence/opportunities/" | "/ariadne/intelligence/risk" | "/ariadne/intelligence/risk/" | "/ariadne/learn" | "/ariadne/learn/" | "/ariadne/manage" | "/ariadne/manage/" | "/ariadne/overview" | "/ariadne/overview/" | "/ariadne/patterns" | "/ariadne/patterns/" | `/ariadne/patterns/${string}` & {} | `/ariadne/patterns/${string}/` & {} | "/ariadne/regimes" | "/ariadne/regimes/" | "/ariadne/search" | "/ariadne/search/" | "/ariadne/similar" | "/ariadne/similar/" | "/ariadne/timeline" | "/ariadne/timeline/" | "/ariadne/write" | "/ariadne/write/" | "/coalescence" | "/coalescence/" | "/coalescence/agents" | "/coalescence/agents/" | "/coalescence/costs" | "/coalescence/costs/" | "/coalescence/rules" | "/coalescence/rules/" | "/coalescence/runs" | "/coalescence/runs/" | `/coalescence/runs/${string}` & {} | `/coalescence/runs/${string}/` & {} | "/manifold" | "/manifold/" | "/manifold/admin" | "/manifold/admin/" | "/manifold/analytics" | "/manifold/analytics/" | "/manifold/dashboard" | "/manifold/dashboard/" | "/manifold/graph" | "/manifold/graph/" | "/manifold/promote" | "/manifold/promote/" | `/manifold/promote/${string}` & {} | `/manifold/promote/${string}/` & {} | "/manifold/relations" | "/manifold/relations/" | `/manifold/relations/${string}` & {} | `/manifold/relations/${string}/` & {} | "/manifold/search" | "/manifold/search/" | "/manifold/thoughts" | "/manifold/thoughts/" | `/manifold/thoughts/${string}` & {} | `/manifold/thoughts/${string}/` & {} | "/manifold/timeline" | "/manifold/timeline/" | "/satbase" | "/satbase/" | "/satbase/convert" | "/satbase/convert/" | "/satbase/jobs" | "/satbase/jobs/" | "/satbase/macro" | "/satbase/macro/" | "/satbase/maintenance" | "/satbase/maintenance/" | "/satbase/news" | "/satbase/news/" | "/satbase/overview" | "/satbase/overview/" | "/satbase/prices" | "/satbase/prices/" | "/satbase/topics" | "/satbase/topics/" | "/satbase/watchlist" | "/satbase/watchlist/" | "/tesseract" | "/tesseract/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}