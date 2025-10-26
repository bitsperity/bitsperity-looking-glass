export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26'),
	() => import('./nodes/27'),
	() => import('./nodes/28'),
	() => import('./nodes/29'),
	() => import('./nodes/30'),
	() => import('./nodes/31'),
	() => import('./nodes/32'),
	() => import('./nodes/33'),
	() => import('./nodes/34'),
	() => import('./nodes/35'),
	() => import('./nodes/36'),
	() => import('./nodes/37'),
	() => import('./nodes/38'),
	() => import('./nodes/39'),
	() => import('./nodes/40'),
	() => import('./nodes/41'),
	() => import('./nodes/42'),
	() => import('./nodes/43'),
	() => import('./nodes/44'),
	() => import('./nodes/45'),
	() => import('./nodes/46'),
	() => import('./nodes/47')
];

export const server_loads = [];

export const dictionary = {
		"/": [5],
		"/ariadne/admin": [6,[2]],
		"/ariadne/context": [7,[2]],
		"/ariadne/dashboard": [8,[2]],
		"/ariadne/graph": [9,[2]],
		"/ariadne/hypotheses": [10,[2]],
		"/ariadne/hypotheses/[id]": [11,[2]],
		"/ariadne/impact": [12,[2]],
		"/ariadne/learn": [13,[2]],
		"/ariadne/patterns": [14,[2]],
		"/ariadne/patterns/[id]": [15,[2]],
		"/ariadne/regimes": [16,[2]],
		"/ariadne/search": [17,[2]],
		"/ariadne/similar": [18,[2]],
		"/ariadne/timeline": [19,[2]],
		"/ariadne/write": [20,[2]],
		"/coalescence": [21,[3]],
		"/coalescence/agents": [22,[3]],
		"/coalescence/costs": [23,[3]],
		"/coalescence/rules": [24,[3]],
		"/coalescence/runs": [25,[3]],
		"/coalescence/runs/[id]": [26,[3]],
		"/manifold": [27],
		"/manifold/admin": [28],
		"/manifold/dashboard": [29],
		"/manifold/graph": [30],
		"/manifold/promote/[id]": [31],
		"/manifold/relations/[id]": [32],
		"/manifold/search": [33],
		"/manifold/thoughts": [34],
		"/manifold/thoughts/[id]": [35],
		"/manifold/timeline": [36],
		"/satbase": [37,[4]],
		"/satbase/convert": [38,[4]],
		"/satbase/jobs": [39,[4]],
		"/satbase/macro": [40,[4]],
		"/satbase/maintenance": [41,[4]],
		"/satbase/news": [42,[4]],
		"/satbase/overview": [43,[4]],
		"/satbase/prices": [44,[4]],
		"/satbase/topics": [45,[4]],
		"/satbase/watchlist": [46,[4]],
		"/tesseract": [47]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.svelte';