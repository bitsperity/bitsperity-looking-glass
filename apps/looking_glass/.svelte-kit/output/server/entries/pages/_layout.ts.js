const load = async ({ url }) => {
  const first = url.pathname.split("/")[1] || "satbase";
  const section = ["coalescence", "satbase", "tesseract", "manifold", "ariadne"].includes(first) ? first : "satbase";
  return {
    section,
    apiBase: "http://127.0.0.1:8080",
    apiBaseAriadne: "http://127.0.0.1:8082"
  };
};
export {
  load
};
