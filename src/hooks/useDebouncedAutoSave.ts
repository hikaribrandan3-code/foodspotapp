import { useState, useEffect, useRef, useCallback } from 'react';

interface SaveStatus {
  message: string;
  error?: boolean;
}

/**
 * useDebouncedAutoSave
 *
 * Watches a value, debounces mutations, and auto-saves.
 * Skips save on first mount (hydration) — only fires after actual user mutations.
 * Manages its own saveStatus pill state with auto-hide timer.
 */
export function useDebouncedAutoSave<T>(
  value: T,
  saveFn: (value: T) => Promise<void>,
  delay: number = 1200
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const isMountedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  // Auto-hide saveStatus independently
  useEffect(() => {
    if (!saveStatus) return;
    const timer = setTimeout(() => setSaveStatus(null), saveStatus.error ? 3000 : 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // Watch value changes and debounce save
  useEffect(() => {
    const serialized = JSON.stringify(value);

    // Skip on first mount (hydration)
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      lastSavedRef.current = serialized;
      return;
    }

    // Skip if value hasn't actually changed from last saved
    if (serialized === lastSavedRef.current) {
      return;
    }

    isDirtyRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await saveFn(value);
        lastSavedRef.current = JSON.stringify(value);
        isDirtyRef.current = false;
        setSaveStatus({ message: 'Saved' });
      } catch (err) {
        console.error('[useDebouncedAutoSave] Save failed:', err);
        setSaveStatus({ error: true, message: 'Save failed' });
      }
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, saveFn, delay]);

  const clearStatus = useCallback(() => setSaveStatus(null), []);

  return { saveStatus, clearStatus };
}
