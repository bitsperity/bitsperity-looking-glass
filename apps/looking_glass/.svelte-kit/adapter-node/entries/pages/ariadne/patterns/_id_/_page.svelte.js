import { c as create_ssr_component, a as subscribe } from "../../../../../chunks/ssr.js";
import { p as page } from "../../../../../chunks/stores.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $page.params.id;
  $$unsubscribe_page();
  return `<div class="max-w-7xl mx-auto p-6"><div class="flex items-center justify-between mb-6" data-svelte-h="svelte-1uvlm8x"><h1 class="text-3xl font-bold text-neutral-100">Pattern Detail</h1> <a href="/ariadne/patterns" class="text-sm text-indigo-400 hover:text-indigo-300">← Back to List</a></div> ${`${`${``}`}`}</div>`;
});
export {
  Page as default
};
