import { c as create_ssr_component, o as onDestroy, f as add_attribute, e as escape, v as validate_component, d as each } from "../../../../chunks/ssr.js";
import { Chart, registerables } from "chart.js";
import "chartjs-adapter-date-fns";
import { B as Badge } from "../../../../chunks/Badge.js";
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
function formatDateDiff(dateStr) {
  if (!dateStr) return "N/A";
  const then = new Date(dateStr).getTime();
  const now = /* @__PURE__ */ (/* @__PURE__ */ new Date()).getTime();
  const days = Math.floor((now - then) / (1e3 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let chartData;
  let filteredSeries;
  let selectedSeries = "CPIAUCSL";
  let activeSeries = /* @__PURE__ */ new Set(["CPIAUCSL"]);
  let seriesData = /* @__PURE__ */ new Map();
  let seriesStatus = /* @__PURE__ */ new Map();
  let loading = /* @__PURE__ */ new Set();
  let errors = /* @__PURE__ */ new Map();
  let categories = [];
  let searchQuery = "";
  let selectedCategory = "All";
  let watchlistMacro = [];
  chartData = Array.from(activeSeries).flatMap((seriesId) => {
    const items = seriesData.get(seriesId) || [];
    return items.map((item) => ({
      time: item.date,
      value: item.value,
      series: seriesId
    }));
  });
  filteredSeries = categories.flatMap((c) => c.series);
  return `<div class="flex flex-col overflow-hidden bg-neutral-950" style="height: calc(100vh - 180px);"> <div class="flex-shrink-0 p-3 border-b border-neutral-800 bg-neutral-900/50"><div class="flex items-center justify-between"><h1 class="text-lg font-bold text-neutral-100" data-svelte-h="svelte-1gw3wwz">📊 Macro (FRED)</h1> <div class="flex items-center gap-2">${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary" }, {}, {
    default: () => {
      return `${escape(activeSeries.size)} series`;
    }
  })} ${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary" }, {}, {
    default: () => {
      return `${escape(chartData.length)} points`;
    }
  })}</div></div></div>  <div class="flex-shrink-0 px-4 py-2 border-b border-neutral-800 bg-neutral-900/30 relative z-10"><div class="flex gap-2"><input type="text" placeholder="Search FRED series..." class="flex-1 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"${add_attribute("value", searchQuery, 0)}></div> ${``}</div>  <div class="flex-shrink-0 px-4 py-1.5 border-b border-neutral-800 bg-neutral-900/30"><div class="flex gap-1 flex-wrap">${each(categories, (category) => {
    return `<button class="${"px-2 py-0.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap " + escape(
      selectedCategory === category.name ? "bg-blue-600 text-white" : "bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800",
      true
    )}">${escape(category.name)} </button>`;
  })}</div></div>  <div class="flex-1 flex overflow-hidden gap-3 p-3 min-h-0"> <div class="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 flex flex-col overflow-hidden min-h-0">${chartData.length > 0 ? `${validate_component(LineChart, "LineChart").$$render(
    $$result,
    {
      data: chartData,
      title: `${Array.from(activeSeries).join(", ")}`,
      yLabel: "Value",
      height: "100%"
    },
    {},
    {}
  )}` : `${activeSeries.size === 0 ? `<div class="flex flex-col items-center justify-center h-full text-center gap-4" data-svelte-h="svelte-177p3ei"><div><div class="text-neutral-600 mb-2 text-4xl">📊</div> <div class="text-sm text-neutral-400">Select series to display</div></div> <div class="text-xs text-neutral-600 max-w-xs">Browse categories above or search for FRED series to add them to the chart</div></div>` : `<div class="flex items-center justify-center h-full text-center" data-svelte-h="svelte-kkb7xx"><div><div class="text-neutral-600 mb-2">⏳</div> <div class="text-sm text-neutral-400">Loading data...</div></div></div>`}`}</div>  <div class="w-80 flex-shrink-0 flex flex-col gap-2 overflow-hidden min-h-0"> ${seriesStatus.get(selectedSeries) ? (() => {
    let status = seriesStatus.get(selectedSeries);
    return ` <div class="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 space-y-2 flex-shrink-0"><div class="text-xs"><div class="text-neutral-500 uppercase text-xs font-semibold" data-svelte-h="svelte-1uufyz3">Selected</div> <div class="font-mono text-sm font-bold text-blue-400 mt-0.5">${escape(selectedSeries)}</div> <div class="text-xs text-neutral-500 mt-0.5 line-clamp-2">${escape(status.title)}</div></div> <div class="grid grid-cols-2 gap-2 text-xs"><div class="bg-neutral-800/30 p-2 rounded"><div class="text-neutral-600 text-xs" data-svelte-h="svelte-dnbuw9">Latest</div> <div class="font-semibold text-neutral-100 text-sm">${escape(status.latest_value?.toFixed(2) || "N/A")}</div> <div class="text-neutral-600 text-xs">${escape(formatDateDiff(status.latest_date))}</div></div> <div class="bg-neutral-800/30 p-2 rounded"><div class="text-neutral-600 text-xs" data-svelte-h="svelte-10cxwxu">Obs</div> <div class="font-semibold text-neutral-100 text-sm">${escape(status.observation_count)}</div> <div class="text-neutral-600 text-xs">${escape(status.frequency)}</div></div></div> <div class="bg-neutral-800/20 p-2 rounded text-xs line-clamp-2"><div class="text-neutral-600 text-xs" data-svelte-h="svelte-n489jt">Units</div> <div class="text-neutral-300 text-xs">${escape(status.units || "N/A")}</div></div></div>`;
  })() : ``}  ${filteredSeries.length > 0 ? `<div class="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 space-y-2 flex-shrink-0 overflow-hidden flex-1 min-h-0 flex flex-col"><div class="text-xs font-semibold text-neutral-400 uppercase" data-svelte-h="svelte-rerwng">Series</div> <div class="space-y-1 overflow-y-auto flex-1 min-h-0">${each(filteredSeries, (series) => {
    return `<button class="${"w-full text-left px-2 py-1.5 text-xs rounded transition-colors " + escape(
      activeSeries.has(series.id) ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "hover:bg-neutral-800/50 text-neutral-400 border border-transparent",
      true
    )}"><div class="flex items-center justify-between gap-2"><span class="font-mono truncate flex-1">${escape(series.id)}</span> ${series.available ? `<span class="text-xs text-neutral-500 flex-shrink-0">${escape(series.observations)}</span>` : `<span class="text-xs text-red-500 flex-shrink-0" data-svelte-h="svelte-oe4cx1">—</span>`}</div> ${series.latest_value !== null ? `<div class="text-xs text-neutral-500 truncate">${escape(series.latest_value.toFixed(2))}</div>` : ``} </button>`;
  })}</div></div>` : ``}  <div class="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 space-y-2 flex-shrink-0"><button ${watchlistMacro.some((w) => w.key === selectedSeries) ? "disabled" : ""} class="${"w-full text-sm font-semibold px-3 py-2 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed " + escape(
    watchlistMacro.some((w) => w.key === selectedSeries) ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-700",
    true
  )}">⭐ ${escape(watchlistMacro.some((w) => w.key === selectedSeries) ? "In List" : "Add")}</button> <button ${loading.has(selectedSeries) ? "disabled" : ""} class="w-full text-sm font-semibold px-3 py-2 rounded transition-all disabled:opacity-50 bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600">${escape(loading.has(selectedSeries) ? "⏳ Fetch..." : "⬇️ Refetch")}</button></div>  ${watchlistMacro.length > 0 ? `<div class="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 space-y-2 flex-shrink-0 flex flex-col overflow-hidden max-h-40"><div class="text-xs font-semibold text-neutral-400 uppercase" data-svelte-h="svelte-vjtz0y">Watchlist</div> <div class="space-y-1 overflow-y-auto flex-1 min-h-0">${each(watchlistMacro, (item) => {
    return `<div class="flex items-center justify-between gap-1 p-1.5 bg-neutral-800/30 rounded group hover:bg-neutral-800/50 transition-colors"><button class="flex-1 text-left min-w-0"><div class="font-mono text-xs font-semibold text-blue-400 truncate">${escape(item.key)}</div> <div class="text-xs text-neutral-500 line-clamp-1">${escape(item.label)}</div></button> <button class="text-neutral-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 text-xs font-bold" data-svelte-h="svelte-yb04yy">✕</button> </div>`;
  })}</div></div>` : ``}  ${errors.size > 0 ? `<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1 flex-shrink-0 overflow-hidden max-h-32"><div class="overflow-y-auto flex-1 min-h-0 space-y-1">${each(Array.from(errors.entries()), ([seriesId, error]) => {
    return `<div class="text-xs"><div class="font-semibold text-red-400 truncate">${escape(seriesId)}</div> <div class="text-red-300/80 text-xs line-clamp-2">${escape(error)}</div> </div>`;
  })}</div></div>` : ``}</div></div></div>`;
});
export {
  Page as default
};
