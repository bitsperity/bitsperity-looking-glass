import { c as create_ssr_component, a as subscribe, e as escape } from "../../../../../chunks/ssr.js";
import { p as page } from "../../../../../chunks/stores.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let id = "";
  id = $page.params.id;
  $$unsubscribe_page();
  return `<div class="p-6 space-y-4 h-full overflow-auto"><h1 class="text-2xl font-semibold">Thought · ${escape(id)}</h1> ${`<div class="text-neutral-400" data-svelte-h="svelte-186sx6p">Loading…</div>`}</div>`;
});
export {
  Page as default
};
