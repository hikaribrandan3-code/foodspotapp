/**
 * CameraIcons.jsx - Camera Icon Options
 * 
 * SINGLE SOURCE OF TRUTH for camera icons.
 * Used by: BottomNav.jsx, DemoBackend.jsx (icon selector)
 * 
 * Options:
 * - default: Original stroke-based camera
 * - camera: Phosphor Regular camera
 * - aperture: Phosphor Regular aperture
 * - webcam: Phosphor Regular webcam
 */

// DEFAULT: Original stroke-based camera (unchanged from BottomNav)
export const DefaultCameraIcon = () => (
    <svg className="camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
    </svg>
)

// CAMERA: Phosphor Regular
export const CameraPhosphorIcon = () => (
    <svg className="camera-icon" viewBox="0 0 256 256" fill="currentColor">
        <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z" />
    </svg>
)

// APERTURE: Phosphor Regular
export const ApertureIcon = () => (
    <svg className="camera-icon" viewBox="0 0 256 256" fill="currentColor">
        <path d="M201.54,54.46A104,104,0,0,0,54.46,201.54,104,104,0,0,0,201.54,54.46ZM190.23,65.78a88.18,88.18,0,0,1,11,13.48L167.55,119,139.63,40.78A87.34,87.34,0,0,1,190.23,65.78ZM155.59,133l-18.16,21.37-27.59-5L100.41,123l18.16-21.37,27.59,5ZM65.77,65.78a87.34,87.34,0,0,1,56.66-25.59l17.51,49L58.3,74.32A88,88,0,0,1,65.77,65.78ZM46.65,161.54a88.41,88.41,0,0,1,2.53-72.62l51.21,9.35Zm19.12,28.68a88.18,88.18,0,0,1-11-13.48L88.45,137l27.92,78.18A87.34,87.34,0,0,1,65.77,190.22Zm124.46,0a87.34,87.34,0,0,1-56.66,25.59l-17.51-49,81.64,14.91A88,88,0,0,1,190.23,190.22Zm-34.62-32.49,53.74-63.27a88.41,88.41,0,0,1-2.53,72.62Z" />
    </svg>
)

// WEBCAM: Phosphor Regular
export const WebcamIcon = () => (
    <svg className="camera-icon" viewBox="0 0 256 256" fill="currentColor">
        <path d="M168,104a40,40,0,1,0-40,40A40,40,0,0,0,168,104Zm-64,0a24,24,0,1,1,24,24A24,24,0,0,1,104,104Zm120,96H136V183.6a80,80,0,1,0-16,0V200H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM64,104a64,64,0,1,1,64,64A64.07,64.07,0,0,1,64,104Z" />
    </svg>
)

// Icon map for dynamic lookup
export const CAMERA_ICONS = {
    default: DefaultCameraIcon,
    camera: CameraPhosphorIcon,
    aperture: ApertureIcon,
    webcam: WebcamIcon
}

// Labels for selector UI
export const CAMERA_ICON_LABELS = {
    default: 'Default',
    camera: 'Camera',
    aperture: 'Aperture',
    webcam: 'Webcam'
}

/**
 * Get the appropriate camera icon component
 * @param {string} iconId - 'default' | 'camera' | 'aperture' | 'webcam'
 * @returns {Function} React component
 */
export function getCameraIcon(iconId) {
    return CAMERA_ICONS[iconId] || DefaultCameraIcon
}
