import { c as create_ssr_component, e as escape } from "./ssr.js";
const ConfidenceBadge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { confidence } = $$props;
  let colorClass = "bg-neutral-600 text-neutral-100";
  if (confidence >= 0.8) {
    colorClass = "bg-green-700 text-green-100";
  } else if (confidence >= 0.6) {
    colorClass = "bg-yellow-700 text-yellow-100";
  } else if (confidence >= 0.4) {
    colorClass = "bg-orange-700 text-orange-100";
  } else {
    colorClass = "bg-red-700 text-red-100";
  }
  if ($$props.confidence === void 0 && $$bindings.confidence && confidence !== void 0) $$bindings.confidence(confidence);
  return `<span class="${"inline-block px-2 py-0.5 rounded text-xs font-medium " + escape(colorClass, true)}">${escape(Math.round(confidence * 100))}%</span>`;
});
export {
  ConfidenceBadge as C
};
