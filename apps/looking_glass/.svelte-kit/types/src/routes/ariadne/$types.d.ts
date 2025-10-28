import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// @ts-ignore
type MatcherParam<M> = M extends (param : string) => param is infer U ? U extends string ? U : string : string;
type RouteParams = {  };
type RouteId = '/ariadne';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type LayoutRouteId = RouteId | "/ariadne/admin" | "/ariadne/context" | "/ariadne/dashboard" | "/ariadne/explore" | "/ariadne/graph" | "/ariadne/hypotheses" | "/ariadne/hypotheses/[id]" | "/ariadne/impact" | "/ariadne/intelligence" | "/ariadne/intelligence/confidence" | "/ariadne/intelligence/impact" | "/ariadne/intelligence/opportunities" | "/ariadne/intelligence/risk" | "/ariadne/learn" | "/ariadne/manage" | "/ariadne/overview" | "/ariadne/patterns" | "/ariadne/patterns/[id]" | "/ariadne/regimes" | "/ariadne/search" | "/ariadne/similar" | "/ariadne/timeline" | "/ariadne/write"
type LayoutParams = RouteParams & { id?: string }
type LayoutParentData = EnsureDefined<import('../$types.js').LayoutData>;

export type LayoutServerData = null;
export type LayoutData = Expand<LayoutParentData>;
export type LayoutProps = { params: LayoutParams; data: LayoutData; children: import("svelte").Snippet }