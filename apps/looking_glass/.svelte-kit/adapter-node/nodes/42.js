import * as universal from '../entries/pages/tesseract/_page.ts.js';

export const index = 42;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/tesseract/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/tesseract/+page.ts";
export const imports = ["_app/immutable/nodes/42.50qT8uL5.js","_app/immutable/chunks/DnBpi1Qd.js","_app/immutable/chunks/B5jFdsvg.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/CVsajYnk.js","_app/immutable/chunks/BG5brVvb.js"];
export const stylesheets = ["_app/immutable/assets/42.PXbgQJ3B.css"];
export const fonts = [];
