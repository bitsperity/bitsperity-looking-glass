import { c as create_ssr_component, g as createEventDispatcher, v as validate_component, e as escape, f as add_attribute, d as each } from "./ssr.js";
import { C as Card } from "./Button.js";
import { B as Badge } from "./Badge.js";
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = /* @__PURE__ */ new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 6e4);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}
const NewsCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { item } = $$props;
  createEventDispatcher();
  if ($$props.item === void 0 && $$bindings.item && item !== void 0) $$bindings.item(item);
  return `${validate_component(Card, "Card").$$render($$result, { padding: "p-0", hover: true }, {}, {
    default: () => {
      return `<div class="p-5 cursor-pointer"> <div class="flex items-start justify-between gap-3 mb-3"><div class="flex items-center gap-2 text-xs text-neutral-400">${validate_component(Badge, "Badge").$$render($$result, { variant: "secondary" }, {}, {
        default: () => {
          return `${escape(item.source)}`;
        }
      })} <span data-svelte-h="svelte-7hh8jk">•</span> <span class="font-mono">${escape(extractDomain(item.url))}</span> <span data-svelte-h="svelte-7hh8jk">•</span> <time>${escape(formatDate(item.published_at))}</time></div> <button ${""} class="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-50" title="Delete article">${`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`}</button></div>  <a${add_attribute("href", item.url, 0)} target="_blank" rel="noopener noreferrer" class="block group"><h3 class="text-lg font-semibold text-neutral-100 mb-2 leading-snug group-hover:text-blue-400 transition-colors">${escape(item.title)} <svg class="inline-block w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></h3></a>  ${item.text ? `<p class="text-sm text-neutral-400 leading-relaxed line-clamp-2 mb-3">${escape(item.text)}</p>` : ``}  ${item.content_text || item.content_html ? `<div class="mt-3 pt-3 border-t border-neutral-700/50">${` <p class="text-sm text-neutral-300 leading-relaxed line-clamp-3">${escape(item.content_text || "Content available")}</p> <button class="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1" data-svelte-h="svelte-1ixvjqv"><span>Read full article</span> <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>`}</div>` : ``}  ${item.tickers && item.tickers.length > 0 ? `<div class="flex flex-wrap gap-1.5 mt-4">${each(item.tickers, (ticker) => {
        return `${validate_component(Badge, "Badge").$$render($$result, { variant: "primary", size: "sm" }, {}, {
          default: () => {
            return `${escape(ticker)}`;
          }
        })}`;
      })}</div>` : ``}</div>`;
    }
  })}`;
});
export {
  NewsCard as N
};
