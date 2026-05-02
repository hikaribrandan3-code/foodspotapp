import React, { lazy, Suspense, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCameraActivation } from '../../hooks/useCameraActivation';
import { supabase } from '../../lib/supabaseClient';

const CameraActivationBanner = lazy(() => import('./CameraActivationBanner'));

/**
 * CameraTrigger wraps a customer-facing page and conditionally renders:
 *   1. The activation banner (post-delivery + delay)
 *   2. The camera capture flow (on banner tap)
 *
 * Props:
 *   - orderId: string
 *   - orderType: 'delivery' | 'dine_in' | 'takeout'
 *   - delayMs: number (45000, 60000, 90000 for variants)
 *   - children: ReactNode (the page content)
 */
export default function CameraTrigger({
  orderId,
  orderType = 'delivery',
  delayMs = 60000,
  children,
}) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  const {
    showBanner,
    dismissBanner,
    onCaptureComplete,
    activationStatus,
  } = useCameraActivation(orderId, userId, orderType, delayMs);

  // Navigate home when user dismisses banner
  useEffect(() => {
    if (activationStatus === 'dismissed') {
      const timer = setTimeout(() => {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const slug = pathSegments[0];
        navigate(`/${slug}`);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activationStatus, navigate]);

  if (!orderId) {
    return <>{children}</>;
  }

  const openCamera = useCallback(() => {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const slug = pathSegments[0];
    navigate(`/${slug}/camera`);
  }, [navigate]);


  return (
    <>
      {children}

      {/* Banner - appears after delay */}
      <Suspense fallback={null}>
        {showBanner && (
          <CameraActivationBanner
            onCapture={openCamera}
            onDismiss={dismissBanner}
          />
        )}
      </Suspense>

    </>
  );
}
