import { c as create_ssr_component, b as subscribe, e as escape, v as validate_component } from "../../../chunks/ssr.js";
import { p as page } from "../../../chunks/stores.js";
const AriadneNav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let current;
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  current = $page.url.pathname;
  $$unsubscribe_page();
  return `<nav class="border-b border-neutral-800 bg-neutral-950"><div class="flex gap-1 px-4 py-2 overflow-x-auto"><a href="/ariadne/dashboard" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/dashboard" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Dashboard</a> <a href="/ariadne/search" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/search" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Search</a> <a href="/ariadne/context" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/context" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Context</a> <a href="/ariadne/graph" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/graph" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Graph</a> <a href="/ariadne/timeline" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/timeline" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Timeline</a> <a href="/ariadne/impact" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/impact" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Impact</a> <a href="/ariadne/similar" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/similar" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Similar</a> <a href="/ariadne/patterns" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current.startsWith("/ariadne/patterns") ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Patterns</a> <a href="/ariadne/regimes" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/regimes" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Regimes</a> <a href="/ariadne/hypotheses" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current.startsWith("/ariadne/hypotheses") ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Hypotheses</a> <a href="/ariadne/write" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/write" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Write</a> <a href="/ariadne/learn" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/learn" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Learn</a> <a href="/ariadne/admin" class="${"px-3 py-2 rounded text-sm whitespace-nowrap " + escape(
    current === "/ariadne/admin" ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900",
    true
  )}">Admin</a></div></nav>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="flex flex-col h-screen bg-neutral-950 text-neutral-100">${validate_component(AriadneNav, "AriadneNav").$$render($$result, {}, {}, {})} <div class="flex-1 overflow-y-auto">${slots.default ? slots.default({}) : ``}</div></div>`;
});
export {
  Layout as default
};
