import { useState, useCallback, type Dispatch, type SetStateAction } from "react";

export function usePersisted<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersisted = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    setValue((prev) => {
      const next = typeof action === "function" ? (action as (prev: T) => T)(prev) : action;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  return [value, setPersisted];
}
