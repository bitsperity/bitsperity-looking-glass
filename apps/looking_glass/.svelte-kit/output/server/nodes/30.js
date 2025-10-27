

export const index = 30;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/manifold/graph/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "csr": true
};
export const universal_id = "src/routes/manifold/graph/+page.ts";
export const imports = ["_app/immutable/nodes/30.D4GA-Lxt.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/dhUKVLUG.js","_app/immutable/chunks/2rpsc7CR.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/UxnmsV0t.js","_app/immutable/chunks/D3kUMk9L.js","_app/immutable/chunks/DRQjhey4.js","_app/immutable/chunks/BnASOZPr.js","_app/immutable/chunks/D0iwhpLH.js","_app/immutable/chunks/CdjKkDCZ.js","_app/immutable/chunks/BUc1kzgc.js"];
export const stylesheets = ["_app/immutable/assets/ThoughtPreviewModal.Bh1OKVEN.css"];
export const fonts = [];
