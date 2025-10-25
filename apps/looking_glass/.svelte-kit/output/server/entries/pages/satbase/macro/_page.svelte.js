import { c as create_ssr_component, o as onDestroy, d as add_attribute, e as escape, v as validate_component, f as each } from "../../../../chunks/ssr.js";
import { Chart, registerables } from "chart.js";
import "chartjs-adapter-date-fns";
import { B as Badge, C as Card, a as Button } from "../../../../chunks/Badge.js";
import { I as Input } from "../../../../chunks/Input.js";
const LineChart = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  Chart.register(...registerables);
  let { data = [] } = $$props;
  let { title = "" } = $$props;
  let { yLabel = "Value" } = $$props;
  let { height = "400px" } = $$props;
  let canvas;
  onDestroy(() => {
  });
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0) $$bindings.title(title);
  if ($$props.yLabel === void 0 && $$bindings.yLabel && yLabel !== void 0) $$bindings.yLabel(yLabel);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0) $$bindings.height(height);
  return `<div style="${"height: " + escape(height, true) + "; position: relative;"}"><canvas${add_attribute("this", canvas, 0)}></canvas></div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let chartData;
  let totalDataPoints;
  const PRESETS = [
    {
      id: "CPIAUCSL",
      name: "CPI (Inflation)",
      description: "Consumer Price Index"
    },
    {
      id: "UNRATE",
      name: "Unemployment",
      description: "Unemployment Rate %"
    },
    {
      id: "GDP",
      name: "GDP",
      description: "Gross Domestic Product"
    },
    {
      id: "FEDFUNDS",
      name: "Fed Funds Rate",
      description: "Federal Funds Rate %"
    },
    {
      id: "DGS10",
      name: "10Y Treasury",
      description: "10-Year Treasury Yield %"
    },
    {
      id: "DEXUSEU",
      name: "USD/EUR",
      description: "US Dollar to Euro Exchange Rate"
    }
  ];
  let activeSeries = /* @__PURE__ */ new Set(["CPIAUCSL"]);
  let customSeriesId = "";
  let seriesData = /* @__PURE__ */ new Map();
  let loading = /* @__PURE__ */ new Set();
  let errors = /* @__PURE__ */ new Map();
  let searchLoading = false;
  const today = /* @__PURE__ */ (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 864e5).toISOString().slice(0, 10);
  let from = fiveYearsAgo;
  let to = today;
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    chartData = Array.from(seriesData.entries()).flatMap(([seriesId, items]) => items.map((item) => ({
      time: item.date,
      value: item.value,
      series: PRESETS.find((p) => p.id === seriesId)?.name || seriesId
    })));
    totalDataPoints = Array.from(seriesData.values()).reduce((sum, items) => sum + items.length, 0);
    $$rendered = `<div class="max-w-7xl mx-auto space-y-6"> <div class="flex items-center justify-between"><div data-svelte-h="svelte-l3t9wh"><h1 class="text-2xl font-bold text-neutral-100">Macroeconomic Indicators</h1> <p class="text-sm text-neutral-400 mt-1">FRED Economic Data Series</p></div> <div class="flex items-center gap-2">${validate_component(Badge, "Badge").$$render(
      $$result,
      {
        variant: activeSeries.size > 0 ? "success" : "secondary"
      },
      {},
      {
        default: () => {
          return `${escape(activeSeries.size)} series`;
        }
      }
    )} ${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary" }, {}, {
      default: () => {
        return `${escape(totalDataPoints)} points`;
      }
    })}</div></div>  ${validate_component(Card, "Card").$$render(
      $$result,
      {
        classes: "relative z-20 overflow-visible"
      },
      {},
      {
        default: () => {
          return `<div class="space-y-4"><div class="grid grid-cols-1 md:grid-cols-3 gap-4">${validate_component(Input, "Input").$$render(
            $$result,
            {
              label: "From",
              type: "date",
              max: today,
              value: from
            },
            {
              value: ($$value) => {
                from = $$value;
                $$settled = false;
              }
            },
            {}
          )} ${validate_component(Input, "Input").$$render(
            $$result,
            {
              label: "To",
              type: "date",
              max: today,
              value: to
            },
            {
              value: ($$value) => {
                to = $$value;
                $$settled = false;
              }
            },
            {}
          )} <div class="flex items-end">${validate_component(Button, "Button").$$render(
            $$result,
            {
              variant: "primary",
              size: "md",
              loading: loading.size > 0,
              disabled: activeSeries.size === 0
            },
            {},
            {
              default: () => {
                return `${escape(loading.size > 0 ? "Loading..." : "Refresh All")}`;
              }
            }
          )}</div></div> <div class="pt-4 border-t border-neutral-700/50"><label class="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2 block" data-svelte-h="svelte-1iufbwr">Search &amp; Add Series</label> <div class="relative"><div class="flex gap-2"><input type="text" placeholder="Search FRED series (e.g., inflation, GDP, unemployment)" class="flex-1 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"${add_attribute("value", customSeriesId, 0)}> <button ${!customSeriesId.trim() || searchLoading ? "disabled" : ""} class="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold text-lg transition-all">${`+`}</button></div>  ${``}</div></div></div>`;
        }
      }
    )}  ${validate_component(Card, "Card").$$render($$result, {}, {}, {
      default: () => {
        return `<div class="space-y-3"><h3 class="text-sm font-semibold text-neutral-300 uppercase tracking-wide" data-svelte-h="svelte-cp7e0q">Popular Series</h3> <div class="grid grid-cols-2 md:grid-cols-3 gap-3">${each(PRESETS, (preset) => {
          return `<button class="${"text-left p-3 rounded-lg border transition-all " + escape(
            activeSeries.has(preset.id) ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-neutral-800/30 border-neutral-700/30 text-neutral-300 hover:bg-neutral-800/50 hover:border-neutral-600/50",
            true
          )}"><div class="flex items-start justify-between"><div class="flex-1 min-w-0"><div class="font-semibold text-sm truncate">${escape(preset.name)}</div> <div class="text-xs text-neutral-500 mt-0.5 truncate">${escape(preset.description)}</div></div> ${loading.has(preset.id) ? `<svg class="animate-spin h-4 w-4 ml-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>` : `${activeSeries.has(preset.id) ? `<svg class="h-5 w-5 ml-2 flex-shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>` : ``}`}</div> </button>`;
        })}</div></div>`;
      }
    })}  ${Array.from(activeSeries).some((id) => !PRESETS.find((p) => p.id === id)) ? `${validate_component(Card, "Card").$$render($$result, {}, {}, {
      default: () => {
        return `<div class="space-y-3"><h3 class="text-sm font-semibold text-neutral-300 uppercase tracking-wide" data-svelte-h="svelte-1q3g8b2">Custom Series</h3> <div class="flex flex-wrap gap-2">${each(Array.from(activeSeries).filter((id) => !PRESETS.find((p) => p.id === id)), (seriesId) => {
          return `<div class="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 border border-neutral-700/50 rounded-lg"><span class="text-sm font-mono text-neutral-300">${escape(seriesId)}</span> <button class="text-neutral-500 hover:text-red-400 transition-colors" title="${"Remove " + escape(seriesId, true)}">×</button> </div>`;
        })}</div></div>`;
      }
    })}` : ``}  ${errors.size > 0 ? `${validate_component(Card, "Card").$$render($$result, {}, {}, {
      default: () => {
        return `<div class="space-y-2">${each(Array.from(errors.entries()), ([seriesId, error]) => {
          return `<div class="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"><svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg> <div class="flex-1 min-w-0"><div class="text-sm font-semibold text-red-300">${escape(seriesId)}</div> <div class="text-xs text-red-400/80 mt-0.5">${escape(error)}</div></div> </div>`;
        })}</div>`;
      }
    })}` : ``}  ${chartData.length > 0 ? `${validate_component(Card, "Card").$$render($$result, { padding: "p-6" }, {}, {
      default: () => {
        return `${validate_component(LineChart, "LineChart").$$render(
          $$result,
          {
            data: chartData,
            title: "Economic Indicators Time Series",
            yLabel: "Value",
            height: "500px"
          },
          {},
          {}
        )}`;
      }
    })}` : `${activeSeries.size === 0 ? `${validate_component(Card, "Card").$$render($$result, {}, {}, {
      default: () => {
        return `<div class="flex flex-col items-center justify-center py-16 text-center" data-svelte-h="svelte-oip4q"><svg class="w-16 h-16 text-neutral-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg> <h3 class="text-lg font-semibold text-neutral-300 mb-1">No series selected</h3> <p class="text-sm text-neutral-500">Select a series from the popular list or add a custom FRED series ID</p></div>`;
      }
    })}` : `${loading.size > 0 ? `${validate_component(Card, "Card").$$render($$result, {}, {}, {
      default: () => {
        return `<div class="flex items-center justify-center py-12" data-svelte-h="svelte-n68fmn"><div class="flex flex-col items-center gap-3"><svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <p class="text-sm text-neutral-400">Loading economic data...</p></div></div>`;
      }
    })}` : ``}`}`}</div>`;
  } while (!$$settled);
  return $$rendered;
});
export {
  Page as default
};
