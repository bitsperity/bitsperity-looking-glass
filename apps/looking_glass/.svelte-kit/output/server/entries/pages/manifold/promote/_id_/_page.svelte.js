import { c as create_ssr_component, b as subscribe, e as escape, f as add_attribute } from "../../../../../chunks/ssr.js";
import { p as page } from "../../../../../chunks/stores.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let id = "";
  let auto_mark = true;
  id = $page.params.id;
  $$unsubscribe_page();
  return `<div class="p-6 space-y-4 h-full overflow-auto"><h1 class="text-2xl font-semibold">Promote · ${escape(id)}</h1> <div class="flex items-center gap-2"><label class="flex items-center gap-2 text-sm"><input type="checkbox"${add_attribute("checked", auto_mark, 1)}> auto_mark</label> <button class="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" data-svelte-h="svelte-1otowe2">Prepare</button></div> ${`<div class="text-neutral-400" data-svelte-h="svelte-186sx6p">Loading…</div>`}</div>`;
});
export {
  Page as default
};
