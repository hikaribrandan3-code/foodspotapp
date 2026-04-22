import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BusinessProvider } from './contexts/BusinessContext.tsx';

// ── Suppress Supabase realtime errors during page unload ────────────────────
// The staff-ops realtime subscriptions can cause null reference errors in the
// minified Supabase library when the page unloads. Suppress these gracefully.
window.addEventListener('error', (e) => {
  if (typeof e.message === 'string' && e.message.includes('null is not an object')) {
    e.preventDefault();
  }
});
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('null is not an object') || e.reason?.toString?.().includes('null is not an object')) {
    e.preventDefault();
  }
});

// ── Read context from URL params (set by main app when redirecting) ──────────
const params = new URLSearchParams(window.location.search);
const businessId = params.get('bid') || localStorage.getItem('fs_business_id') || '';
const tenantSlug = params.get('slug') || localStorage.getItem('fs_last_active_slug') || '';

// ── Persist for page refresh ─────────────────────────────────────────────────
if (businessId) localStorage.setItem('fs_business_id', businessId);
if (tenantSlug) localStorage.setItem('fs_last_active_slug', tenantSlug);

// ── Auth guard — staff must be logged in ─────────────────────────────────────
const staffMember = (() => {
  try {
    const raw = localStorage.getItem('fs_staff_member');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
})();

if (!staffMember || !businessId) {
  // Not authenticated — send back to staff login
  const loginUrl = tenantSlug ? `/${tenantSlug}/staff` : '/login/staff';
  window.location.replace(loginUrl);
} else {
  createRoot(document.getElementById('root')!).render(
    <BusinessProvider businessId={businessId} tenantSlug={tenantSlug}>
      <App />
    </BusinessProvider>,
  );
}
