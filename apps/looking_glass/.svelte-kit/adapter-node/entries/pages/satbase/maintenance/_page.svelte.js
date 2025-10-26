import { c as create_ssr_component, v as validate_component, f as add_attribute, e as escape } from "../../../../chunks/ssr.js";
import { C as Card, B as Button } from "../../../../chunks/Button.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let loading = false;
  const today = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
  let dateFrom = oneYearAgo;
  let dateTo = today;
  let minArticlesPerDay = 10;
  return `<div class="space-y-6 p-6 max-w-7xl mx-auto"> <div class="flex items-center justify-between" data-svelte-h="svelte-91uk51"><div><h1 class="text-3xl font-bold text-neutral-100">Data Maintenance</h1> <p class="text-sm text-neutral-400 mt-1">Detect coverage gaps and trigger intelligent backfill</p></div></div> ${``}  ${validate_component(Card, "Card").$$render($$result, {}, {}, {
    default: () => {
      return `<div class="space-y-4"><h2 class="text-lg font-semibold text-neutral-100" data-svelte-h="svelte-lisw0u">Find Coverage Gaps</h2> <div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div><label class="block text-sm font-medium text-neutral-300 mb-2" data-svelte-h="svelte-1tvg5k0">From Date</label> <input type="date" class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-100"${add_attribute("value", dateFrom, 0)}></div> <div><label class="block text-sm font-medium text-neutral-300 mb-2" data-svelte-h="svelte-14xqr43">To Date</label> <input type="date" class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-100"${add_attribute("value", dateTo, 0)}></div> <div><label class="block text-sm font-medium text-neutral-300 mb-2" data-svelte-h="svelte-1eln6g6">Min Articles/Day</label> <input type="number" min="1" max="100" class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-100"${add_attribute("value", minArticlesPerDay, 0)}></div> <div class="flex items-end">${validate_component(Button, "Button").$$render(
        $$result,
        {
          variant: "primary",
          loading,
          classes: "w-full"
        },
        {},
        {
          default: () => {
            return `${escape("Detect Gaps")}`;
          }
        }
      )}</div></div></div>`;
    }
  })} ${``} ${``}</div>`;
});
export {
  Page as default
};
