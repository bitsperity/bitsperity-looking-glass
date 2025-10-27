import { c as create_ssr_component, e as escape, v as validate_component, b as each, d as add_attribute } from "./ssr.js";
const TypeBadge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let colorClass;
  let { type } = $$props;
  const colorMap = {
    observation: "bg-blue-900 text-blue-200",
    hypothesis: "bg-purple-900 text-purple-200",
    analysis: "bg-green-900 text-green-200",
    decision: "bg-orange-900 text-orange-200",
    reflection: "bg-pink-900 text-pink-200",
    question: "bg-yellow-900 text-yellow-200"
  };
  if ($$props.type === void 0 && $$bindings.type && type !== void 0) $$bindings.type(type);
  colorClass = colorMap[type] || "bg-neutral-800 text-neutral-200";
  return `<span class="${"text-xs px-2 py-0.5 rounded " + escape(colorClass, true)}">${escape(type)}</span>`;
});
const StatusBadge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let colorClass;
  let { status } = $$props;
  const colorMap = {
    active: "bg-green-900 text-green-200",
    validated: "bg-blue-900 text-blue-200",
    invalidated: "bg-red-900 text-red-200",
    archived: "bg-neutral-800 text-neutral-400",
    deleted: "bg-neutral-800 text-neutral-500",
    quarantined: "bg-yellow-900 text-yellow-200"
  };
  if ($$props.status === void 0 && $$bindings.status && status !== void 0) $$bindings.status(status);
  colorClass = colorMap[status] || "bg-neutral-800 text-neutral-200";
  return `<span class="${"text-xs px-2 py-0.5 rounded " + escape(colorClass, true)}">${escape(status)}</span>`;
});
const ThoughtCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { thought } = $$props;
  let { onOpen = null } = $$props;
  let { onDelete = null } = $$props;
  let { onPreview = null } = $$props;
  let { showActions = true } = $$props;
  if ($$props.thought === void 0 && $$bindings.thought && thought !== void 0) $$bindings.thought(thought);
  if ($$props.onOpen === void 0 && $$bindings.onOpen && onOpen !== void 0) $$bindings.onOpen(onOpen);
  if ($$props.onDelete === void 0 && $$bindings.onDelete && onDelete !== void 0) $$bindings.onDelete(onDelete);
  if ($$props.onPreview === void 0 && $$bindings.onPreview && onPreview !== void 0) $$bindings.onPreview(onPreview);
  if ($$props.showActions === void 0 && $$bindings.showActions && showActions !== void 0) $$bindings.showActions(showActions);
  return `<div class="bg-neutral-900 rounded p-4 border border-neutral-800 hover:border-neutral-700 transition-colors"><div class="flex items-center gap-2 mb-2">${validate_component(TypeBadge, "TypeBadge").$$render($$result, { type: thought.type }, {}, {})} ${validate_component(StatusBadge, "StatusBadge").$$render($$result, { status: thought.status }, {}, {})} ${thought.confidence_score ? `<span class="text-xs text-neutral-500">confidence: ${escape(Math.round(thought.confidence_score * 100))}%</span>` : ``}</div> <div class="text-lg font-semibold mb-1">${escape(thought.title)}</div> <div class="text-sm text-neutral-300 line-clamp-3">${escape(thought.content)}</div> ${thought.tickers && thought.tickers.length > 0 ? `<div class="flex flex-wrap gap-1 mt-2">${each(thought.tickers, (ticker) => {
    return `<span class="text-xs bg-neutral-800 px-2 py-0.5 rounded">${escape(ticker)}</span>`;
  })}</div>` : ``} ${showActions ? `<div class="mt-3 flex gap-2">${onOpen ? `<button class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" data-svelte-h="svelte-1e3rufg">Open</button>` : `<a class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm"${add_attribute("href", `/manifold/thoughts/${thought.id}`, 0)}>Open</a>`} ${onPreview ? `<button class="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sm" data-svelte-h="svelte-1ozgcim">Preview</button>` : ``} ${onDelete ? `<button class="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-sm" data-svelte-h="svelte-1m0z2ob">Delete</button>` : ``}</div>` : ``}</div>`;
});
export {
  ThoughtCard as T
};
