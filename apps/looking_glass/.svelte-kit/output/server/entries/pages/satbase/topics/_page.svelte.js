import { c as create_ssr_component, f as add_attribute, v as validate_component, d as each, e as escape } from "../../../../chunks/ssr.js";
import { B as Button, C as Card } from "../../../../chunks/Button.js";
function formatCount(count) {
  if (count >= 1e6) return (count / 1e6).toFixed(1) + "M";
  if (count >= 1e3) return (count / 1e3).toFixed(1) + "K";
  return count.toString();
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let allTopics = [];
  new Date(Date.now() - 365 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
  (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="mx-auto max-w-7xl px-4 py-8"> <div class="mb-8" data-svelte-h="svelte-1fttjhu"><h1 class="text-4xl font-bold text-white mb-2">📋 Topics</h1> <p class="text-slate-400">Manage news topics and analyze coverage trends</p></div>  <div class="mb-8 flex gap-4 border-b border-slate-700"><button${add_attribute(
      "class",
      `pb-3 px-1 font-semibold transition-colors ${"text-emerald-400 border-b-2 border-emerald-400"}`,
      0
    )}>📊 Topics List</button> <button${add_attribute(
      "class",
      `pb-3 px-1 font-semibold transition-colors ${"text-slate-400 hover:text-slate-300"}`,
      0
    )}>📈 Analytics</button></div>  ${``}  ${`<div class="space-y-6"> ${`<div class="mb-4">${validate_component(Button, "Button").$$render($$result, { variant: "primary" }, {}, {
      default: () => {
        return `<span class="w-4 h-4 mr-2" data-svelte-h="svelte-8u3lfv">➕</span>
							Add Topic`;
      }
    })}</div>`}  ${`${allTopics.length === 0 ? `${validate_component(Card, "Card").$$render(
      $$result,
      {
        padding: "p-12",
        classes: "bg-slate-900/50 border-slate-700 text-center"
      },
      {},
      {
        default: () => {
          return `<span class="w-12 h-12 mx-auto text-slate-600 mb-4" data-svelte-h="svelte-kb9mng">🗑️</span> <p class="text-slate-400 mb-4" data-svelte-h="svelte-9kvuxa">No topics yet. Create one to get started.</p>`;
        }
      }
    )}` : `<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">${each(allTopics, (topic) => {
      return `${validate_component(Card, "Card").$$render(
        $$result,
        {
          padding: "p-6",
          classes: "bg-slate-900/50 border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-emerald-900/20"
        },
        {},
        {
          default: () => {
            return `<div class="flex items-start justify-between mb-4"><div><h3 class="text-lg font-semibold text-white">${escape(topic.name)}</h3> <p class="text-sm text-slate-400" data-svelte-h="svelte-y18okb">News Articles</p></div> ${validate_component(Button, "Button").$$render($$result, { variant: "ghost" }, {}, {
              default: () => {
                return `<span class="w-4 h-4" data-svelte-h="svelte-1a1o3id">🗑️</span> `;
              }
            })}</div> <div class="space-y-2"><div class="flex items-center gap-2"><span class="w-4 h-4 text-slate-500" data-svelte-h="svelte-1293scr">🔗</span> <span class="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">${escape(formatCount(topic.count))} </span></div> <p class="text-xs text-slate-500" data-svelte-h="svelte-1kj8zus">articles covered</p></div> <div class="mt-4 pt-4 border-t border-slate-700">${validate_component(Button, "Button").$$render($$result, { variant: "ghost" }, {}, {
              default: () => {
                return `<span class="w-4 h-4 mr-2" data-svelte-h="svelte-6jvdnn">📈</span>
										View Trends
									`;
              }
            })}</div> `;
          }
        }
      )}`;
    })}</div>`}`}</div>`}  ${``}</div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};
