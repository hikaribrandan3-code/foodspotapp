import React, { lazy, Suspense, useCallback, useState, useEffect } from 'react';
import { useCameraActivation } from '../../hooks/useCameraActivation';
import { supabase } from '../../lib/supabaseClient';

const CameraActivationBanner = lazy(() => import('./CameraActivationBanner'));
const CameraLayer = lazy(() => import('./CameraLayer'));
const EditorLayer = lazy(() => import('./EditorLayer'));
const DualPostScreen = lazy(() => import('./DualPostScreen'));

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

  console.log(`[CameraTrigger] orderId=${orderId}, userId=${userId}, orderType=${orderType}, showBanner=${showBanner}, activationStatus=${activationStatus}`);

  if (!orderId) {
    return <>{children}</>;
  }

  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [postScreenOpen, setPostScreenOpen] = useState(false);

  const openCamera = useCallback(() => {
    setCameraOpen(true);
  }, []);

  const handleCapture = useCallback((blob) => {
    setCapturedBlob(blob);
    setCameraOpen(false);
    setEditorOpen(true);
  }, []);

  const handleEditorDone = useCallback((editedBlob) => {
    setCapturedBlob(editedBlob);
    setEditorOpen(false);
    setPostScreenOpen(true);
  }, []);

  const handleSaveComplete = useCallback(() => {
    onCaptureComplete();
    setPostScreenOpen(false);
    setCapturedBlob(null);
  }, [onCaptureComplete]);

  const handleShareThenClose = useCallback(() => {
    onCaptureComplete();
    setPostScreenOpen(false);
    setCapturedBlob(null);
  }, [onCaptureComplete]);

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

      {/* Full camera flow - lazy loaded */}
      <Suspense fallback={<CameraSkeleton />}>
        {cameraOpen && (
          <CameraLayer
            onCapture={handleCapture}
            onClose={() => setCameraOpen(false)}
          />
        )}

        {editorOpen && (
          <EditorLayer
            imageBlob={capturedBlob}
            onDone={handleEditorDone}
            onClose={() => {
              setEditorOpen(false);
              setCapturedBlob(null);
            }}
          />
        )}

        {postScreenOpen && (
          <DualPostScreen
            imageBlob={capturedBlob}
            orderId={orderId}
            onSaveComplete={handleSaveComplete}
            onShareThenClose={handleShareThenClose}
            onClose={() => {
              setPostScreenOpen(false);
              setCapturedBlob(null);
            }}
          />
        )}
      </Suspense>
    </>
  );
}

function CameraSkeleton() {
  return (
    <div className="camera-skeleton">
      <div className="skeleton-viewfinder" />
    </div>
  );
}
