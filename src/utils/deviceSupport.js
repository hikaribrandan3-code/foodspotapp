// Device Support Utilities
// Silent capability detection for Camera Suite
// Returns flags for conditional UI rendering - no user-facing errors

export async function detectDeviceCapabilities() {
    const capabilities = {
        hasCamera: false,
        hasFrontCamera: false,
        hasBackCamera: false,
        hasMediaRecorder: false,
        canCreateVideoBlob: false,
        hasTorch: false,
        supportsHaptics: false,
    };

    // Test 1: Camera access
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        capabilities.hasCamera = true;
        stream.getTracks().forEach(track => track.stop());
    } catch (e) {
        // Silent failure
    }

    // Test 2: Check for multiple cameras
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        capabilities.hasFrontCamera = videoDevices.some(d => 
            d.label.toLowerCase().includes('front') || d.facingMode === 'user'
        );
        capabilities.hasBackCamera = videoDevices.some(d => 
            d.label.toLowerCase().includes('back') || d.facingMode === 'environment'
        );
        // If we can't determine from labels, assume both if more than one camera
        if (videoDevices.length > 1 && !capabilities.hasFrontCamera && !capabilities.hasBackCamera) {
            capabilities.hasFrontCamera = true;
            capabilities.hasBackCamera = true;
        }
        if (videoDevices.length === 1) {
            capabilities.hasFrontCamera = true;
        }
    } catch (e) {
        // Silent failure
    }

    // Test 3: MediaRecorder support
    try {
        capabilities.hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    } catch (e) {
        // Silent failure
    }

    // Test 4: Video blob creation
    try {
        const testBlob = new Blob([], { type: 'video/webm' });
        capabilities.canCreateVideoBlob = testBlob.size >= 0;
    } catch (e) {
        // Silent failure
    }

    // Test 5: Torch (flash) support - requires active stream
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        const photoCapabilities = await imageCapture.getPhotoCapabilities();
        capabilities.hasTorch = photoCapabilities.fillLightMode?.includes('flash') || false;
        stream.getTracks().forEach(t => t.stop());
    } catch (e) {
        // Silent failure - torch not available
    }

    // Test 6: Haptics support
    try {
        capabilities.supportsHaptics = 'vibrate' in navigator;
    } catch (e) {
        // Silent failure
    }

    return capabilities;
}

// Get camera stream with specific facing mode
export async function getCameraStream(facingMode = 'user', constraints = {}) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode,
                width: { ideal: 1080 },
                height: { ideal: 1920 },
                ...constraints
            },
            audio: false
        });
        return { stream, error: null };
    } catch (e) {
        return { stream: null, error: e.name };
    }
}

// Toggle torch on active stream
export async function setTorch(stream, enabled) {
    try {
        const track = stream.getVideoTracks()[0];
        await track.applyConstraints({
            advanced: [{ torch: enabled }]
        });
        return true;
    } catch (e) {
        return false;
    }
}

// Trigger haptic feedback if supported
export function triggerHaptic(duration = 10) {
    try {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    } catch (e) {
        // Silent failure
    }
}

// Detect ambient light level for auto-flash
export function detectLowLight(videoElement) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(videoElement, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
            // Calculate perceived brightness
            totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        }
        
        const avgBrightness = totalBrightness / (data.length / 4);
        return avgBrightness < 80; // Consider low light if below threshold
    } catch (e) {
        return false;
    }
}
