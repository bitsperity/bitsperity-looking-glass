import { c as create_ssr_component, e as escape, d as add_attribute } from "./ssr.js";
const Input = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { label = null } = $$props;
  let { placeholder = "" } = $$props;
  let { value = "" } = $$props;
  let { type = "text" } = $$props;
  if ($$props.label === void 0 && $$bindings.label && label !== void 0) $$bindings.label(label);
  if ($$props.placeholder === void 0 && $$bindings.placeholder && placeholder !== void 0) $$bindings.placeholder(placeholder);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  if ($$props.type === void 0 && $$bindings.type && type !== void 0) $$bindings.type(type);
  return `<div class="flex flex-col gap-1.5">${label ? `<label class="text-xs font-medium text-neutral-400 uppercase tracking-wide">${escape(label)}</label>` : ``} ${type === "date" ? `<input type="date"${add_attribute("placeholder", placeholder, 0)} class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"${add_attribute("value", value, 0)}>` : `${type === "number" ? `<input type="number"${add_attribute("placeholder", placeholder, 0)} class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"${add_attribute("value", value, 0)}>` : `<input type="text"${add_attribute("placeholder", placeholder, 0)} class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"${add_attribute("value", value, 0)}>`}`}</div>`;
});
export {
  Input as I
};
