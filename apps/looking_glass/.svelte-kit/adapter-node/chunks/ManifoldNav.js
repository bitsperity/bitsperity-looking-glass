import { c as create_ssr_component, b as subscribe, d as each, f as add_attribute, e as escape } from "./ssr.js";
import { p as page } from "./stores.js";
const ManifoldNav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let current;
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const links = [
    {
      href: "/manifold/dashboard",
      label: "Dashboard"
    },
    {
      href: "/manifold/search",
      label: "Search"
    },
    {
      href: "/manifold/timeline",
      label: "Timeline"
    },
    {
      href: "/manifold/thoughts",
      label: "Thoughts"
    },
    { href: "/manifold/graph", label: "Graph" },
    { href: "/manifold/admin", label: "Admin" }
  ];
  current = $page.url.pathname;
  $$unsubscribe_page();
  return `<div class="flex gap-2 border-b border-neutral-800 pb-3 mb-4">${each(links, (link) => {
    return `<a${add_attribute("href", link.href, 0)} class="${"px-3 py-1.5 rounded text-sm " + escape(
      current.startsWith(link.href) ? "bg-indigo-600 text-white" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700",
      true
    )}">${escape(link.label)} </a>`;
  })}</div>`;
});
export {
  ManifoldNav as M
};
