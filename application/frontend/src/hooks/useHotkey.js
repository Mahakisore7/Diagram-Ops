import { useEffect, useRef } from 'react';

// Registers a keyboard shortcut like "mod+k", "mod+s", "mod+enter" or "?".
// "mod" is Cmd on macOS and Ctrl elsewhere. The handler is kept in a ref so
// callers can pass inline functions without re-binding the listener.
export function useHotkey(combo, handler, { enabled = true, allowInInputs = false } = {}) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return undefined;
    const parts = combo.toLowerCase().split('+');
    const key = parts.pop();
    const needsMod = parts.includes('mod');
    const needsShift = parts.includes('shift');

    function onKeyDown(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (needsMod !== mod) return;
      if (needsShift && !e.shiftKey) return;
      if (e.key.toLowerCase() !== key) return;

      const target = e.target;
      const inInput =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      // Modifier shortcuts (Ctrl+S) should work while typing; bare keys
      // like "?" must not hijack normal text entry.
      if (inInput && !needsMod && !allowInInputs) return;

      e.preventDefault();
      handlerRef.current(e);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [combo, enabled, allowInInputs]);
}
