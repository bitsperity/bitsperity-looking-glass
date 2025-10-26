import { c as create_ssr_component, v as validate_component, e as escape, f as add_attribute, d as each } from "../../../../chunks/ssr.js";
import { C as Card, B as Button } from "../../../../chunks/Button.js";
import { I as Input } from "../../../../chunks/Input.js";
import { B as Badge } from "../../../../chunks/Badge.js";
function formatDate(isoString) {
  if (!isoString) return "Never";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "Invalid date";
  }
}
function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < /* @__PURE__ */ new Date();
}
function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return Infinity;
  const now = /* @__PURE__ */ new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1e3 * 60 * 60 * 24));
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let filteredWatchlist;
  let filteredTopics;
  let totalSymbols;
  let totalTopics;
  let watchlist = [];
  let topics = [];
  let newSymbols = "";
  let watchlistTtl = 365;
  let watchlistIngest = true;
  let watchlistLoading = false;
  let searchSymbol = "";
  let newTopic = "";
  let topicTtl = 7;
  let topicIngest = true;
  let topicsLoading = false;
  let searchTopic = "";
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    filteredWatchlist = watchlist.filter((item) => item.symbol.toLowerCase().includes(searchSymbol.toLowerCase()));
    filteredTopics = topics.filter((topic) => topic.query.toLowerCase().includes(searchTopic.toLowerCase()));
    totalSymbols = watchlist.length;
    totalTopics = topics.length;
    $$rendered = `<div class="max-w-6xl mx-auto space-y-6 h-full overflow-y-auto p-6"> <div class="flex items-center justify-between"><div data-svelte-h="svelte-zrbbtg"><h1 class="text-2xl font-bold text-neutral-100">Watchlist &amp; Topics</h1> <p class="text-sm text-neutral-400 mt-1">Manage tracked symbols and news queries</p></div> <div class="flex items-center gap-2">${validate_component(Badge, "Badge").$$render($$result, { variant: "primary" }, {}, {
      default: () => {
        return `${escape(totalSymbols)} symbols`;
      }
    })} ${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary" }, {}, {
      default: () => {
        return `${escape(totalTopics)} topics`;
      }
    })}</div></div>  ${validate_component(Card, "Card").$$render($$result, {}, {}, {
      default: () => {
        return `<div class="space-y-4"><div class="flex items-center justify-between"><h2 class="text-lg font-semibold text-neutral-100" data-svelte-h="svelte-vy4pvz">Stock Watchlist</h2> <div class="flex items-center gap-2">${validate_component(Input, "Input").$$render(
          $$result,
          {
            placeholder: "Search symbols...",
            classes: "w-48",
            value: searchSymbol
          },
          {
            value: ($$value) => {
              searchSymbol = $$value;
              $$settled = false;
            }
          },
          {}
        )}</div></div>  <div class="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-neutral-900/50 rounded-lg border border-neutral-700/30"><div class="md:col-span-5">${validate_component(Input, "Input").$$render(
          $$result,
          {
            label: "Symbols (comma-separated)",
            placeholder: "AAPL, MSFT, TSLA",
            disabled: watchlistLoading,
            value: newSymbols
          },
          {
            value: ($$value) => {
              newSymbols = $$value;
              $$settled = false;
            }
          },
          {}
        )}</div> <div class="md:col-span-2">${validate_component(Input, "Input").$$render(
          $$result,
          {
            label: "TTL (days)",
            type: "number",
            disabled: watchlistLoading,
            value: watchlistTtl
          },
          {
            value: ($$value) => {
              watchlistTtl = $$value;
              $$settled = false;
            }
          },
          {}
        )}</div> <div class="md:col-span-2 flex items-end"><label class="flex items-center gap-2 text-sm cursor-pointer h-10"><input type="checkbox" ${""} class="rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50"${add_attribute("checked", watchlistIngest, 1)}> <span class="text-neutral-300" data-svelte-h="svelte-qmpc8g">Auto-ingest</span></label></div> <div class="md:col-span-3 flex items-end">${validate_component(Button, "Button").$$render(
          $$result,
          {
            variant: "primary",
            size: "md",
            loading: watchlistLoading,
            disabled: !newSymbols.trim(),
            classes: "w-full"
          },
          {},
          {
            default: () => {
              return `${escape("Add Symbols")}`;
            }
          }
        )}</div></div>  ${``}  <div class="space-y-2">${filteredWatchlist.length === 0 ? `<div class="text-center py-12 text-neutral-500" data-svelte-h="svelte-fomt87"><svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg> <p class="text-sm">No symbols in watchlist</p> <p class="text-xs text-neutral-600 mt-1">Add symbols above to start tracking</p></div>` : `${each(filteredWatchlist, (item) => {
          return `<div class="flex items-center justify-between p-3 bg-neutral-800/50 hover:bg-neutral-800/70 rounded-lg border border-neutral-700/30 transition-all group"><div class="flex items-center gap-3 flex-1"><a href="${"/satbase/prices?ticker=" + escape(item.symbol, true)}" class="text-lg font-semibold font-mono text-blue-400 hover:text-blue-300 transition-colors">${escape(item.symbol)}</a> <div class="flex items-center gap-2 text-xs text-neutral-500"><span>Added: ${escape(formatDate(item.added_at))}</span> ${item.expires_at ? `${isExpired(item.expires_at) ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "danger", size: "sm" }, {}, {
            default: () => {
              return `Expired`;
            }
          })}` : `<span>· Expires: ${escape(formatDate(item.expires_at))}</span> ${daysUntilExpiry(item.expires_at) <= 7 ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "warning", size: "sm" }, {}, {
            default: () => {
              return `${escape(daysUntilExpiry(item.expires_at))}d left`;
            }
          })}` : ``}`}` : ``} </div></div> ${validate_component(Button, "Button").$$render(
            $$result,
            {
              variant: "danger",
              size: "sm",
              classes: "opacity-0 group-hover:opacity-100 transition-opacity"
            },
            {},
            {
              default: () => {
                return `Remove
              `;
              }
            }
          )} </div>`;
        })}`}</div></div>`;
      }
    })}  ${validate_component(Card, "Card").$$render($$result, {}, {}, {
      default: () => {
        return `<div class="space-y-4"><div class="flex items-center justify-between"><h2 class="text-lg font-semibold text-neutral-100" data-svelte-h="svelte-14gp32z">News Topics</h2> <div class="flex items-center gap-2">${validate_component(Input, "Input").$$render(
          $$result,
          {
            placeholder: "Search topics...",
            classes: "w-48",
            value: searchTopic
          },
          {
            value: ($$value) => {
              searchTopic = $$value;
              $$settled = false;
            }
          },
          {}
        )}</div></div>  <div class="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-neutral-900/50 rounded-lg border border-neutral-700/30"><div class="md:col-span-5">${validate_component(Input, "Input").$$render(
          $$result,
          {
            label: "Search Query",
            placeholder: "e.g., semiconductor, AI, renewable energy",
            disabled: topicsLoading,
            value: newTopic
          },
          {
            value: ($$value) => {
              newTopic = $$value;
              $$settled = false;
            }
          },
          {}
        )}</div> <div class="md:col-span-2">${validate_component(Input, "Input").$$render(
          $$result,
          {
            label: "TTL (days)",
            type: "number",
            disabled: topicsLoading,
            value: topicTtl
          },
          {
            value: ($$value) => {
              topicTtl = $$value;
              $$settled = false;
            }
          },
          {}
        )}</div> <div class="md:col-span-2 flex items-end"><label class="flex items-center gap-2 text-sm cursor-pointer h-10"><input type="checkbox" ${""} class="rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-1 focus:ring-blue-500/50"${add_attribute("checked", topicIngest, 1)}> <span class="text-neutral-300" data-svelte-h="svelte-qmpc8g">Auto-ingest</span></label></div> <div class="md:col-span-3 flex items-end">${validate_component(Button, "Button").$$render(
          $$result,
          {
            variant: "primary",
            size: "md",
            loading: topicsLoading,
            disabled: !newTopic.trim(),
            classes: "w-full"
          },
          {},
          {
            default: () => {
              return `${escape("Add Topic")}`;
            }
          }
        )}</div></div>  ${``}  <div class="space-y-2">${filteredTopics.length === 0 ? `<div class="text-center py-12 text-neutral-500" data-svelte-h="svelte-tffp66"><svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg> <p class="text-sm">No news topics tracked</p> <p class="text-xs text-neutral-600 mt-1">Add topics above to track relevant news</p></div>` : `${each(filteredTopics, (topic) => {
          return `<div class="flex items-center justify-between p-3 bg-neutral-800/50 hover:bg-neutral-800/70 rounded-lg border border-neutral-700/30 transition-all group"><div class="flex items-center gap-3 flex-1"><a href="${"/satbase/news?q=" + escape(encodeURIComponent(topic.query), true)}" class="text-base font-medium text-neutral-100 hover:text-blue-400 transition-colors">${escape(topic.query)}</a> <div class="flex items-center gap-2 text-xs text-neutral-500"><span>Added: ${escape(formatDate(topic.added_at))}</span> ${topic.expires_at ? `${isExpired(topic.expires_at) ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "danger", size: "sm" }, {}, {
            default: () => {
              return `Expired`;
            }
          })}` : `<span>· Expires: ${escape(formatDate(topic.expires_at))}</span> ${daysUntilExpiry(topic.expires_at) <= 3 ? `${validate_component(Badge, "Badge").$$render($$result, { variant: "warning", size: "sm" }, {}, {
            default: () => {
              return `${escape(daysUntilExpiry(topic.expires_at))}d left`;
            }
          })}` : ``}`}` : ``} </div></div> ${validate_component(Button, "Button").$$render(
            $$result,
            {
              variant: "danger",
              size: "sm",
              classes: "opacity-0 group-hover:opacity-100 transition-opacity"
            },
            {},
            {
              default: () => {
                return `Remove
              `;
              }
            }
          )} </div>`;
        })}`}</div></div>`;
      }
    })}</div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};
