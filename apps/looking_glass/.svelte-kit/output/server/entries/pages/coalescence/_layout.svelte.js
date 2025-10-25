import { c as create_ssr_component, b as subscribe, d as add_attribute, v as validate_component } from "../../../chunks/ssr.js";
import { p as page } from "../../../chunks/stores.js";
const CoalescenceNav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let current;
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  current = $page.url.pathname.split("/").pop() || "dashboard";
  $$unsubscribe_page();
  return `<nav class="flex border-b border-neutral-700 mb-4 gap-1"><a href="/coalescence"${add_attribute(
    "class",
    `px-4 py-2 border-b-2 transition-colors ${current === "coalescence" || current === "" ? "border-blue-400 text-blue-400" : "border-transparent text-neutral-400 hover:text-neutral-300"}`,
    0
  )}>📊 Dashboard</a> <a href="/coalescence/runs"${add_attribute(
    "class",
    `px-4 py-2 border-b-2 transition-colors ${current === "runs" ? "border-blue-400 text-blue-400" : "border-transparent text-neutral-400 hover:text-neutral-300"}`,
    0
  )}>🏃 Runs</a> <a href="/coalescence/agents"${add_attribute(
    "class",
    `px-4 py-2 border-b-2 transition-colors ${current === "agents" ? "border-blue-400 text-blue-400" : "border-transparent text-neutral-400 hover:text-neutral-300"}`,
    0
  )}>⚙️ Agents</a> <a href="/coalescence/costs"${add_attribute(
    "class",
    `px-4 py-2 border-b-2 transition-colors ${current === "costs" ? "border-blue-400 text-blue-400" : "border-transparent text-neutral-400 hover:text-neutral-300"}`,
    0
  )}>💰 Costs</a></nav>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return ` <div class="flex flex-col h-full overflow-hidden"><div class="px-6 pt-4 flex-shrink-0">${validate_component(CoalescenceNav, "CoalescenceNav").$$render($$result, {}, {}, {})}</div> ${slots.default ? slots.default({}) : ``}</div>`;
});
export {
  Layout as default
};
