export const fadeInSlide = (el: Element, { duration = 300 } = {}) => ({
  duration,
  css: (t: number) => `
    opacity: ${t};
    transform: translateY(${(1 - t) * 8}px);
  `,
});

export const tabSwitch = (el: Element, { duration = 200 } = {}) => ({
  duration,
  css: (t: number) => `opacity: ${t};`,
});

export const modalEntrance = (el: Element, { duration = 250 } = {}) => ({
  duration,
  css: (t: number) => `
    opacity: ${t};
    transform: scale(${0.95 + t * 0.05});
  `,
});
