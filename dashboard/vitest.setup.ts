import "@testing-library/jest-dom/vitest";

// jsdom não implementa matchMedia nem ResizeObserver — Recharts
// (ResponsiveContainer) e useThemeMode dependem deles em runtime.
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }

  if (!("ResizeObserver" in window)) {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // @ts-expect-error polyfill para ambiente de teste jsdom
    window.ResizeObserver = ResizeObserverMock;
    global.ResizeObserver = ResizeObserverMock;
  }
}
