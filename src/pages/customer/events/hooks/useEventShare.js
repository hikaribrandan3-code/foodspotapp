import { useRef, useState, useCallback } from 'react';

/**
 * useEventShare — captures the hidden EventShareCard via html2canvas
 * and shares it via the native Web Share API (mobile) or downloads (desktop)
 *
 * Usage:
 *   const { shareCardRef, shareEvent, isSharing } = useEventShare(event);
 *   <EventShareCard ref={shareCardRef} event={event} />
 *   <button onClick={shareEvent}>Share</button>
 */
export function useEventShare(event) {
  const shareCardRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  const shareEvent = useCallback(async () => {
    if (isSharing || !shareCardRef.current || !event) return;
    setIsSharing(true);

    try {
      // Dynamically import html2canvas — avoids bundle weight until needed
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2.7,           // 400px × 2.7 = 1080px wide — full story res
        useCORS: true,        // required for Supabase Storage cross-origin images
        allowTaint: false,
        logging: false,
        backgroundColor: '#0f172a',
        imageTimeout: 8000,
      });

      // Convert canvas → JPEG blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
          'image/jpeg',
          0.92
        );
      });

      const fileName = `${(event.name || 'event').replace(/\s+/g, '-').toLowerCase()}-story.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Mobile — native share sheet (opens Instagram, Messages, etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: event.name || 'Event' });
        return;
      }

      // Desktop fallback — download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (err) {
      // AbortError = user dismissed share sheet, not a real error
      if (err?.name !== 'AbortError') {
        console.error('[EventShare] Error:', err);
      }
    } finally {
      setIsSharing(false);
    }
  }, [event, isSharing]);

  return { shareCardRef, shareEvent, isSharing };
}
