import { c as create_ssr_component, b as subscribe } from "../../../../../chunks/ssr.js";
import { p as page } from "../../../../../chunks/stores.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $page.params.id;
  $$unsubscribe_page();
  return `<div class="flex-1 overflow-auto px-6 pb-6">${`<div class="flex items-center justify-center h-64 text-neutral-400" data-svelte-h="svelte-14aap7n"><div>Loading run details...</div></div>`}</div>`;
});
export {
  Page as default
};
