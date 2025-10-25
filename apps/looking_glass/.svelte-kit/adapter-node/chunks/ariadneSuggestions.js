import { c as create_ssr_component, g as createEventDispatcher, d as add_attribute } from "./ssr.js";
const ARIADNE_BASE = "http://127.0.0.1:8082";
async function http(path, init) {
  const resp = await fetch(`${ARIADNE_BASE}${path}`, init);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${txt}`);
  }
  return await resp.json();
}
const getTickerSuggestions = () => http(`/v1/kg/suggestions/tickers`);
const getTopicSuggestions = () => http(`/v1/kg/suggestions/topics`);
const getEventNameSuggestions = () => http("/v1/kg/suggestions/event-names");
const getPatternCategorySuggestions = () => http("/v1/kg/suggestions/pattern-categories");
const AutocompleteInput = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { value = "" } = $$props;
  let { placeholder = "" } = $$props;
  let { suggestions = [] } = $$props;
  let { fetchSuggestions = null } = $$props;
  let { minChars = 1 } = $$props;
  let { maxSuggestions = 10 } = $$props;
  let { loading = false } = $$props;
  let { disabled = false } = $$props;
  createEventDispatcher();
  let showDropdown = false;
  let inputEl;
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  if ($$props.placeholder === void 0 && $$bindings.placeholder && placeholder !== void 0) $$bindings.placeholder(placeholder);
  if ($$props.suggestions === void 0 && $$bindings.suggestions && suggestions !== void 0) $$bindings.suggestions(suggestions);
  if ($$props.fetchSuggestions === void 0 && $$bindings.fetchSuggestions && fetchSuggestions !== void 0) $$bindings.fetchSuggestions(fetchSuggestions);
  if ($$props.minChars === void 0 && $$bindings.minChars && minChars !== void 0) $$bindings.minChars(minChars);
  if ($$props.maxSuggestions === void 0 && $$bindings.maxSuggestions && maxSuggestions !== void 0) $$bindings.maxSuggestions(maxSuggestions);
  if ($$props.loading === void 0 && $$bindings.loading && loading !== void 0) $$bindings.loading(loading);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0) $$bindings.disabled(disabled);
  return `<div class="relative"><input type="text"${add_attribute("placeholder", placeholder, 0)} ${disabled ? "disabled" : ""} class="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" autocomplete="off" role="combobox" aria-autocomplete="list"${add_attribute("aria-expanded", showDropdown, 0)} aria-controls="suggestions-list"${add_attribute("this", inputEl, 0)}${add_attribute("value", value, 0)}> ${loading ? `<div class="absolute right-3 top-1/2 transform -translate-y-1/2" data-svelte-h="svelte-1cem4lw"><div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>` : ``} ${``}</div>`;
});
let tickersCache = null;
let topicsCache = null;
let eventNamesCache = null;
let patternCategoriesCache = null;
async function fetchTickerSuggestions() {
  if (tickersCache) return tickersCache;
  try {
    const response = await getTickerSuggestions();
    tickersCache = response.tickers;
    return tickersCache;
  } catch (e) {
    console.error("Failed to fetch ticker suggestions:", e);
    return [];
  }
}
async function fetchTopicSuggestions(query) {
  if (!topicsCache) {
    try {
      const response = await getTopicSuggestions();
      topicsCache = response.topics;
    } catch (e) {
      console.error("Failed to fetch topic suggestions:", e);
      topicsCache = [];
    }
  }
  if (!query) return topicsCache || [];
  return (topicsCache || []).filter(
    (t) => t.toLowerCase().includes(query.toLowerCase())
  );
}
async function fetchEventNameSuggestions(query) {
  if (!eventNamesCache) {
    try {
      const response = await getEventNameSuggestions();
      eventNamesCache = response.events;
    } catch (e) {
      console.error("Failed to fetch event name suggestions:", e);
      eventNamesCache = [];
    }
  }
  if (!query) return (eventNamesCache || []).map((e) => e.name);
  return (eventNamesCache || []).filter((e) => e.name.toLowerCase().includes(query.toLowerCase())).map((e) => e.name);
}
async function fetchPatternCategorySuggestions(query) {
  if (!patternCategoriesCache) {
    try {
      const response = await getPatternCategorySuggestions();
      patternCategoriesCache = response.categories;
    } catch (e) {
      console.error("Failed to fetch pattern category suggestions:", e);
      patternCategoriesCache = [];
    }
  }
  if (!query) return patternCategoriesCache || [];
  return (patternCategoriesCache || []).filter(
    (c) => c.toLowerCase().includes(query.toLowerCase())
  );
}
export {
  AutocompleteInput as A,
  fetchTickerSuggestions as a,
  fetchEventNameSuggestions as b,
  fetchPatternCategorySuggestions as c,
  fetchTopicSuggestions as f
};
