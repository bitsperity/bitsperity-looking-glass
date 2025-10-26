import { c as create_ssr_component, v as validate_component, f as add_attribute, d as each, e as escape } from "../../../../chunks/ssr.js";
import { N as NewsCard } from "../../../../chunks/NewsCard.js";
import { B as Button } from "../../../../chunks/Button.js";
import { I as Input } from "../../../../chunks/Input.js";
import { B as Badge } from "../../../../chunks/Badge.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let items = [];
  let include_body = true;
  const today = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 864e5 * 2).toISOString().slice(0, 10);
  let from = yest;
  let to = today;
  let q = "";
  let tickers = "";
  let loading = false;
  new Date(Date.now() - 864e5 * 30).toISOString().slice(0, 10);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="h-screen flex flex-col overflow-hidden"> <div class="flex-shrink-0 max-w-5xl w-full mx-auto px-6 pt-6 pb-4"><div class="flex items-center justify-between"><div data-svelte-h="svelte-1sfod9p"><h1 class="text-2xl font-bold text-neutral-100">News Feed</h1> <p class="text-sm text-neutral-400 mt-1">Financial news from GDELT and RSS sources</p></div> <div class="flex items-center gap-2">${validate_component(Badge, "Badge").$$render(
      $$result,
      {
        variant: items.length > 0 ? "success" : "secondary"
      },
      {},
      {
        default: () => {
          return `${escape(items.length)} articles`;
        }
      }
    )}</div></div></div>  <div class="flex-shrink-0 max-w-5xl w-full mx-auto px-6 pb-2 border-b border-neutral-700/50"><div class="flex gap-1"><button class="${"px-4 py-2 rounded-t-lg font-medium transition-colors " + escape(
      "bg-neutral-800/60 text-neutral-100 border-b-2 border-blue-500",
      true
    )}">📰 Browse</button> <button class="${"px-4 py-2 rounded-t-lg font-medium transition-colors " + escape(
      "text-neutral-400 hover:text-neutral-200",
      true
    )}">🔍 Quality Check</button></div></div> ${`  <div class="flex-shrink-0 max-w-5xl w-full mx-auto px-6 pb-4 space-y-4"> <div class="bg-neutral-800/30 border border-neutral-700/50 rounded-xl p-5"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">${validate_component(Input, "Input").$$render(
      $$result,
      { label: "From", type: "date", value: from },
      {
        value: ($$value) => {
          from = $$value;
          $$settled = false;
        }
      },
      {}
    )} ${validate_component(Input, "Input").$$render(
      $$result,
      { label: "To", type: "date", value: to },
      {
        value: ($$value) => {
          to = $$value;
          $$settled = false;
        }
      },
      {}
    )} ${validate_component(Input, "Input").$$render(
      $$result,
      {
        label: "Search Query",
        placeholder: "AI, chips, semiconductor",
        value: q
      },
      {
        value: ($$value) => {
          q = $$value;
          $$settled = false;
        }
      },
      {}
    )} ${validate_component(Input, "Input").$$render(
      $$result,
      {
        label: "Filter by Tickers",
        placeholder: "NVDA, AAPL, MSFT",
        value: tickers
      },
      {
        value: ($$value) => {
          tickers = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div> <div class="flex items-center justify-between mt-4 pt-4 border-t border-neutral-700/50"><label class="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer"><input type="checkbox" class="rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-2 focus:ring-blue-500/50"${add_attribute("checked", include_body, 1)}> <span data-svelte-h="svelte-ar7blg">Include article bodies</span></label> <div class="flex gap-2">${validate_component(Button, "Button").$$render($$result, { variant: "secondary", size: "sm" }, {}, {
      default: () => {
        return `${escape("Show")} Backfill`;
      }
    })} ${validate_component(Button, "Button").$$render($$result, { variant: "secondary", size: "sm" }, {}, {
      default: () => {
        return `Fetch Bodies`;
      }
    })} ${validate_component(Button, "Button").$$render($$result, { variant: "primary", size: "sm", loading }, {}, {
      default: () => {
        return `${escape("Refresh")}`;
      }
    })}</div></div></div>  ${``}</div>  ${``}  <div class="flex-1 overflow-y-auto max-w-5xl w-full mx-auto px-6 pb-6"> ${``}  ${``}  ${items.length > 0 ? `<div class="grid gap-4">${each(items, (item) => {
      return `${validate_component(NewsCard, "NewsCard").$$render($$result, { item }, {}, {})}`;
    })}</div>` : `${items.length === 0 ? `<div class="flex flex-col items-center justify-center py-16 text-center" data-svelte-h="svelte-yrt8v8"><svg class="w-16 h-16 text-neutral-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"></path></svg> <h3 class="text-lg font-semibold text-neutral-300 mb-1">No articles found</h3> <p class="text-sm text-neutral-500">Try adjusting your filters or date range</p></div>` : ``}`}</div>`}</div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};
