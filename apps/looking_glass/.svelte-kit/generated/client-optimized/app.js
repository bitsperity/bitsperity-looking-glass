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
	() => import('./nodes/42')
];

export const server_loads = [];

export const dictionary = {
		"/": [4],
		"/ariadne/admin": [5,[2]],
		"/ariadne/context": [6,[2]],
		"/ariadne/dashboard": [7,[2]],
		"/ariadne/graph": [8,[2]],
		"/ariadne/hypotheses": [9,[2]],
		"/ariadne/hypotheses/[id]": [10,[2]],
		"/ariadne/impact": [11,[2]],
		"/ariadne/learn": [12,[2]],
		"/ariadne/patterns": [13,[2]],
		"/ariadne/patterns/[id]": [14,[2]],
		"/ariadne/regimes": [15,[2]],
		"/ariadne/search": [16,[2]],
		"/ariadne/similar": [17,[2]],
		"/ariadne/timeline": [18,[2]],
		"/ariadne/write": [19,[2]],
		"/coalescence": [20,[3]],
		"/coalescence/agents": [21,[3]],
		"/coalescence/costs": [22,[3]],
		"/coalescence/runs": [23,[3]],
		"/coalescence/runs/[id]": [24,[3]],
		"/manifold": [25],
		"/manifold/admin": [26],
		"/manifold/dashboard": [27],
		"/manifold/graph": [28],
		"/manifold/promote/[id]": [29],
		"/manifold/relations/[id]": [30],
		"/manifold/search": [31],
		"/manifold/thoughts": [32],
		"/manifold/thoughts/[id]": [33],
		"/manifold/timeline": [34],
		"/satbase": [35],
		"/satbase/convert": [36],
		"/satbase/jobs": [37],
		"/satbase/macro": [38],
		"/satbase/news": [39],
		"/satbase/prices": [40],
		"/satbase/watchlist": [41],
		"/tesseract": [42]
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