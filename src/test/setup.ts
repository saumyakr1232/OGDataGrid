import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement ResizeObserver / IntersectionObserver — stub them so
// MUI + virtualizer don't blow up.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ResizeObserverStub;

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver ??
  IntersectionObserverStub;

// jsdom doesn't have matchMedia (MUI uses it).
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
  })) as typeof window.matchMedia;
}

// jsdom's getBoundingClientRect returns zeros — virtualizer needs a non-zero
// scroll-container height. Patch the prototype to report a sane default when
// the element has no inline size.
const origGetBCR = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function patched(this: Element) {
  const rect = origGetBCR.call(this);
  if (rect.width === 0 && rect.height === 0) {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    } as DOMRect;
  }
  return rect;
};

// Clipboard stub so copySelection tests can assert on what was written.
if (!navigator.clipboard) {
  let buf = '';
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (s: string) => {
        buf = s;
      },
      readText: async () => buf,
    },
  });
}
