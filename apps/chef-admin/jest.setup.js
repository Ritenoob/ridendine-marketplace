// jsdom does not implement window.matchMedia. Components that read
// `prefers-reduced-motion` (e.g. the kitchen prep countdown) call it during
// render, so polyfill a no-op matcher for jsdom-environment test suites.
// Node-environment suites have no `window`, so the guard skips them.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = function matchMedia(query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    };
  };
}
