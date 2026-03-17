import { useRef, useEffect, useCallback } from 'react';

/**
 * 🛡️ useBlobUrlTracker
 * 
 * A specialized hook to track and automatically revoke blob URLs created during 
 * image uploads/previews. This preventing memory leaks and WebKit crashes in 
 * production environments.
 */
export function useBlobUrlTracker() {
    const blobUrlsRef = useRef([]);

    const createBlobUrl = useCallback((file) => {
        if (!file) return null;
        const url = URL.createObjectURL(file);
        blobUrlsRef.current.push(url);
        return url;
    }, []);

    const revokeBlobUrl = useCallback((url) => {
        if (!url) return;
        try {
            URL.revokeObjectURL(url);
            blobUrlsRef.current = blobUrlsRef.current.filter(u => u !== url);
        } catch (e) {
            console.warn('[useBlobUrlTracker] Failed to revoke blob URL:', e);
        }
    }, []);

    const revokeAllBlobUrls = useCallback(() => {
        blobUrlsRef.current.forEach(url => {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {
                console.warn('[useBlobUrlTracker] Cleanup error:', e);
            }
        });
        blobUrlsRef.current = [];
    }, []);

    // Also auto-cleanup on unmount
    useEffect(() => {
        return () => {
            revokeAllBlobUrls();
        };
    }, [revokeAllBlobUrls]);

    return {
        createBlobUrl,
        revokeBlobUrl,
        revokeAllBlobUrls
    };
}
