import { c as create_ssr_component, d as add_attribute } from "../../../../chunks/ssr.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let useFormView = false;
  return `<div class="flex-1 overflow-auto px-6 pb-6"> <div class="flex items-center justify-between mb-6"><h1 class="text-2xl font-bold" data-svelte-h="svelte-ekgrv0">Agents Configuration</h1> <div class="flex items-center gap-2"><label class="text-sm text-neutral-400 flex items-center gap-2"><input type="checkbox" class="rounded"${add_attribute("checked", useFormView, 1)}>
        Form View (coming soon)</label></div></div>  ${``} ${``} ${`<div class="flex items-center justify-center h-64 text-neutral-400" data-svelte-h="svelte-1ksb7bo"><div>Loading configuration...</div></div>`}</div>`;
});
export {
  Page as default
};
