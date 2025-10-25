import { c as create_ssr_component, e as escape, v as validate_component } from "../../chunks/ssr.js";
const css = {
  code: "html{color-scheme:dark}",
  map: `{"version":3,"file":"Sidebar.svelte","sources":["Sidebar.svelte"],"sourcesContent":["<script lang=\\"ts\\">export let current = \\"\\";\\n<\/script>\\n\\n<nav class=\\"w-64 bg-neutral-950 text-neutral-200 h-screen p-4\\">\\n  <div class=\\"text-lg font-semibold mb-6\\">LookingGlass</div>\\n  <ul class=\\"space-y-2\\">\\n    <li>\\n      <a href=\\"/coalescence\\" class=\\"block px-3 py-2 rounded hover:bg-neutral-800 {current==='coalescence' ? 'bg-neutral-800' : ''}\\">Coalescence</a>\\n    </li>\\n    <li>\\n      <a href=\\"/satbase\\" class=\\"block px-3 py-2 rounded hover:bg-neutral-800 {current==='satbase' ? 'bg-neutral-800' : ''}\\">Satbase</a>\\n    </li>\\n    <li>\\n      <a href=\\"/tesseract\\" class=\\"block px-3 py-2 rounded hover:bg-neutral-800 {current==='tesseract' ? 'bg-neutral-800' : ''}\\">Tesseract</a>\\n    </li>\\n    <li>\\n      <a href=\\"/manifold/dashboard\\" class=\\"block px-3 py-2 rounded hover:bg-neutral-800 {current==='manifold' ? 'bg-neutral-800' : ''}\\">Manifold</a>\\n    </li>\\n    <li>\\n      <a href=\\"/ariadne/dashboard\\" class=\\"block px-3 py-2 rounded hover:bg-neutral-800 {current==='ariadne' ? 'bg-neutral-800' : ''}\\">Ariadne</a>\\n    </li>\\n  </ul>\\n</nav>\\n\\n<style>\\n  :global(html){ color-scheme: dark; }\\n</style>\\n\\n"],"names":[],"mappings":"AAyBU,IAAK,CAAE,YAAY,CAAE,IAAM"}`
};
const Sidebar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { current = "" } = $$props;
  if ($$props.current === void 0 && $$bindings.current && current !== void 0) $$bindings.current(current);
  $$result.css.add(css);
  return `<nav class="w-64 bg-neutral-950 text-neutral-200 h-screen p-4"><div class="text-lg font-semibold mb-6" data-svelte-h="svelte-qid6nm">LookingGlass</div> <ul class="space-y-2"><li><a href="/coalescence" class="${"block px-3 py-2 rounded hover:bg-neutral-800 " + escape(current === "coalescence" ? "bg-neutral-800" : "", true)}">Coalescence</a></li> <li><a href="/satbase" class="${"block px-3 py-2 rounded hover:bg-neutral-800 " + escape(current === "satbase" ? "bg-neutral-800" : "", true)}">Satbase</a></li> <li><a href="/tesseract" class="${"block px-3 py-2 rounded hover:bg-neutral-800 " + escape(current === "tesseract" ? "bg-neutral-800" : "", true)}">Tesseract</a></li> <li><a href="/manifold/dashboard" class="${"block px-3 py-2 rounded hover:bg-neutral-800 " + escape(current === "manifold" ? "bg-neutral-800" : "", true)}">Manifold</a></li> <li><a href="/ariadne/dashboard" class="${"block px-3 py-2 rounded hover:bg-neutral-800 " + escape(current === "ariadne" ? "bg-neutral-800" : "", true)}">Ariadne</a></li></ul> </nav>`;
});
const Topbar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { apiBase = "" } = $$props;
  if ($$props.apiBase === void 0 && $$bindings.apiBase && apiBase !== void 0) $$bindings.apiBase(apiBase);
  return `<header class="w-full h-12 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between px-4"><div class="text-sm text-neutral-300">API: ${escape(apiBase)}</div> <div class="text-sm text-neutral-400" data-svelte-h="svelte-1thtk1i">LookingGlass · Satbase</div></header>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  return `<div class="flex bg-neutral-900 text-neutral-100 h-screen overflow-hidden">${validate_component(Sidebar, "Sidebar").$$render($$result, { current: data.section || "" }, {}, {})} <div class="flex-1 flex flex-col overflow-hidden">${validate_component(Topbar, "Topbar").$$render($$result, { apiBase: data.apiBase }, {}, {})} <main class="flex-1 overflow-hidden">${slots.default ? slots.default({}) : ``}</main></div></div>`;
});
export {
  Layout as default
};
