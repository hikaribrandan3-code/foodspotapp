import { useState, useEffect, useRef, useCallback } from 'react';

interface SaveStatus {
  message: string;
  error?: boolean;
}

interface UseDebouncedAutoSaveReturn {
  saveStatus: SaveStatus | null;
  clearStatus: () => void;
  syncLastSaved: (value: unknown) => void;
  silence: (ms: number) => void;
}

/**
 * useDebouncedAutoSave
 *
 * Watches a value, debounces mutations, and auto-saves.
 * Skips save on first mount (hydration) — only fires after actual user mutations.
 * Manages its own saveStatus pill state with auto-hide timer.
 *
 * syncLastSaved(value): Call after an external/manual save to reset the
 *   "last known good" reference. Prevents false-positive auto-saves when
 *   the parent re-hydrates from DB.
 *
 * silence(ms): Temporarily disables the hook for N milliseconds.
 *   Useful when a manual save is in flight.
 */
export function useDebouncedAutoSave<T>(
  value: T,
  saveFn: (value: T) => Promise<any>,
  delay: number = 1200,
  enabled: boolean = true
): UseDebouncedAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const isMountedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const silencedUntilRef = useRef<number>(0);

  // Auto-hide saveStatus independently
  useEffect(() => {
    if (!saveStatus) return;
    const timer = setTimeout(() => setSaveStatus(null), saveStatus.error ? 3000 : 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // Watch value changes and debounce save
  useEffect(() => {
    const serialized = JSON.stringify(value);

    // Skip while disabled (waiting for async hydration)
    if (!enabled) {
      lastSavedRef.current = serialized;
      return;
    }

    // Skip on first mount (hydration)
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      lastSavedRef.current = serialized;
      return;
    }

    // Skip if silenced (e.g. manual save in flight)
    if (Date.now() < silencedUntilRef.current) {
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
        const result = await saveFn(value);
        if (!result) throw new Error('Save returned no data');
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

  const syncLastSaved = useCallback((nextValue: unknown) => {
    lastSavedRef.current = JSON.stringify(nextValue);
    isDirtyRef.current = false;
  }, []);

  const silence = useCallback((ms: number) => {
    silencedUntilRef.current = Date.now() + ms;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  return { saveStatus, clearStatus, syncLastSaved, silence };
}
