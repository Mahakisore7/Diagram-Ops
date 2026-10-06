import { useCallback, useState } from 'react';

// useState that survives reloads. Storage can be unavailable (private
// windows, blocked site data), so every access is guarded and the hook
// degrades to plain in-memory state rather than throwing.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initialValue : JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* ignore - in-memory value still updates */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
