import { c as create_ssr_component, a as subscribe, b as each, d as add_attribute, e as escape, v as validate_component } from "../../../chunks/ssr.js";
import { p as page } from "../../../chunks/stores.js";
function getActiveSection(pathname) {
  const pathParts = pathname.split("/").filter((p) => p);
  return pathParts[1] || "dashboard";
}
function isActive(key, pathname) {
  return key === getActiveSection(pathname);
}
const CoalescenceNav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const navItems = [
    {
      href: "/coalescence",
      label: "Dashboard",
      icon: "📊",
      key: "dashboard"
    },
    {
      href: "/coalescence/runs",
      label: "Runs",
      icon: "🏃",
      key: "runs"
    },
    {
      href: "/coalescence/agents",
      label: "Agents",
      icon: "⚙️",
      key: "agents"
    },
    {
      href: "/coalescence/rules",
      label: "Rules",
      icon: "📋",
      key: "rules"
    },
    {
      href: "/coalescence/costs",
      label: "Costs",
      icon: "💰",
      key: "costs"
    }
  ];
  $$unsubscribe_page();
  return `<nav class="relative flex border-b-2 border-neutral-700/50 mb-6 gap-2">${each(navItems, (item) => {
    return `<a${add_attribute("href", item.href, 0)}${add_attribute(
      "class",
      `relative px-5 py-3 font-medium transition-all duration-200 flex items-center gap-2 group ${isActive(item.key, $page.url.pathname) ? "text-blue-400" : "text-neutral-400 hover:text-neutral-200"}`,
      0
    )}><span class="text-xl transition-transform group-hover:scale-110">${escape(item.icon)}</span> <span>${escape(item.label)}</span> ${isActive(item.key, $page.url.pathname) ? `<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg shadow-blue-500/50"></div>` : ``} ${!isActive(item.key, $page.url.pathname) ? `<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neutral-600 to-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>` : ``} </a>`;
  })}</nav>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return ` <div class="flex flex-col h-full overflow-hidden"><div class="px-6 pt-4 flex-shrink-0">${validate_component(CoalescenceNav, "CoalescenceNav").$$render($$result, {}, {}, {})}</div> ${slots.default ? slots.default({}) : ``}</div>`;
});
export {
  Layout as default
};
