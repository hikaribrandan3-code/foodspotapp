import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'foodspot_audio_enabled';

export function useAudioPref(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch { /* noop */ }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled(prev => !prev), []);

  return [enabled, toggle];
}
