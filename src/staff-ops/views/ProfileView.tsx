import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Settings, Bell, BellOff, Shield, Clock, Phone, LogOut,
  ChevronRight, Moon, Sun, Wifi, WifiOff, Volume2, VolumeX,
  X, Check, Bike, Car, Truck,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAudioPref } from '@/hooks/useAudioPref';
import { useBusiness } from '@/contexts/BusinessContext';
// @ts-ignore
import { supabase } from '../../lib/supabaseClient.js';

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function formatTime(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
];

const TRANSPORT_MODES = [
  { id: 'bicycle', label: 'Bicycle', icon: <Bike size={18} /> },
  { id: 'motorcycle', label: 'Motorcycle', icon: <Bike size={18} /> },
  { id: 'car', label: 'Car', icon: <Car size={18} /> },
  { id: 'scooter', label: 'Scooter', icon: <Truck size={18} /> },
  { id: 'other', label: 'Other', icon: <Truck size={18} /> },
];

export default function ProfileView() {
  const { theme, toggleTheme } = useTheme();
  const [audioEnabled, toggleAudio] = useAudioPref();
  const { tenantSlug } = useBusiness();

  const staffMember = getStored<any>('fs_staff_member', null);
  const currentShift = getStored<any>('fs_current_shift', null);
  const staffName = staffMember?.name || 'Staff Member';
  const staffRole = staffMember?.role || 'Staff';
  const shiftStart = formatTime(currentShift?.clock_in_at);
  const isOnDuty = !!currentShift;

  const [notificationsOn, setNotificationsOn] = useState(
    () => localStorage.getItem('fs_staff_notifications') !== 'off'
  );
  const [autoSyncOn, setAutoSyncOn] = useState(
    () => localStorage.getItem('fs_staff_autosync') !== 'off'
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem('fs_staff_language') || 'en'
  );
  const [emergencyContact, setEmergencyContact] = useState(
    () => localStorage.getItem('fs_staff_emergency') || ''
  );
  const [driverProfile, setDriverProfile] = useState(() =>
    getStored('fs_driver_profile', {
      contact: '', plate: '', transport: '', make: '', year: '', model: '',
    })
  );

  const [sheet, setSheet] = useState<null | 'emergency' | 'language' | 'resetPin' | 'driver'>(null);
  const [emergencyInput, setEmergencyInput] = useState(emergencyContact);
  const [driverInput, setDriverInput] = useState(driverProfile);

  const toggleNotifications = () => {
    const next = !notificationsOn;
    setNotificationsOn(next);
    localStorage.setItem('fs_staff_notifications', next ? 'on' : 'off');
  };
  const toggleAutoSync = () => {
    const next = !autoSyncOn;
    setAutoSyncOn(next);
    localStorage.setItem('fs_staff_autosync', next ? 'on' : 'off');
  };
  const saveLanguage = (code: string) => {
    setLanguage(code);
    localStorage.setItem('fs_staff_language', code);
    setSheet(null);
  };
  const saveEmergency = () => {
    setEmergencyContact(emergencyInput);
    localStorage.setItem('fs_staff_emergency', emergencyInput);
    setSheet(null);
  };
  const saveDriverProfile = () => {
    setDriverProfile(driverInput);
    localStorage.setItem('fs_driver_profile', JSON.stringify(driverInput));
    setSheet(null);
  };

  const handleSignOut = async () => {
    // Gracefully disconnect realtime before navigation to prevent crash
    try { await supabase.realtime.disconnect(); } catch {}
    localStorage.removeItem('fs_staff_member');
    localStorage.removeItem('fs_current_shift');
    localStorage.removeItem('x-staff-id');
    window.location.replace(tenantSlug ? `/${tenantSlug}/staff` : '/login/staff');
  };

  const handleResetPin = async () => {
    try { await supabase.realtime.disconnect(); } catch {}
    localStorage.removeItem('fs_staff_member');
    localStorage.removeItem('fs_current_shift');
    localStorage.removeItem('x-staff-id');
    window.location.replace(tenantSlug ? `/${tenantSlug}/staff` : '/login/staff');
  };

  const currentLang = LANGUAGES.find(l => l.code === language)?.label || 'English';
  const driverSummary = driverProfile.transport
    ? [driverProfile.transport, driverProfile.plate].filter(Boolean).join(' · ')
    : 'Not set';

  return (
    <div className="h-full w-full flex flex-col relative overflow-y-auto scrollbar-hide">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={20} style={{ color: 'var(--text-tertiary)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Profile</h1>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Account settings & shift management</p>
      </div>

      <div className="px-4 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl p-4 flex items-center gap-4"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--filter-active-bg)' }}>
            <User size={28} style={{ color: 'var(--status-icon-prep)' }} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{staffName}</h2>
            <p className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{staffRole}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                style={{ backgroundColor: isOnDuty ? 'var(--reception-bg)' : 'var(--btn-secondary-bg)', color: isOnDuty ? 'var(--reception-text)' : 'var(--text-secondary)' }}>
                {isOnDuty ? 'On Duty' : 'Off Duty'}
              </span>
              {isOnDuty && <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Since {shiftStart}</span>}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 space-y-4 pb-32">
        <Section title="Shift Management">
          <MenuItem icon={<Clock size={18} />} label="Current Shift"
            value={isOnDuty ? `Since ${shiftStart}` : 'Not clocked in'} />
        </Section>

        <Section title="Delivery Driver Info">
          <MenuItem icon={<Bike size={18} />} label="Vehicle & Contact"
            value={driverSummary} onClick={() => { setDriverInput(driverProfile); setSheet('driver'); }} />
        </Section>

        <Section title="Preferences">
          <ToggleItem icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            label="Theme" value={theme === 'dark' ? 'Dark' : 'Light'} onClick={toggleTheme} />
          <ToggleItem icon={audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            label="Sound Alerts" value={audioEnabled ? 'On' : 'Off'} onClick={toggleAudio} />
          <ToggleItem icon={notificationsOn ? <Bell size={18} /> : <BellOff size={18} />}
            label="Notifications" value={notificationsOn ? 'On' : 'Off'} onClick={toggleNotifications} />
          <ToggleItem icon={autoSyncOn ? <Wifi size={18} /> : <WifiOff size={18} />}
            label="Auto-Sync" value={autoSyncOn ? 'On' : 'Off'} onClick={toggleAutoSync} />
        </Section>

        <Section title="Emergency">
          <MenuItem icon={<Phone size={18} />} label="Emergency Contact"
            value={emergencyContact || 'Not set'}
            onClick={() => { setEmergencyInput(emergencyContact); setSheet('emergency'); }} />
        </Section>

        <Section title="System">
          <MenuItem icon={<Settings size={18} />} label="Language" value={currentLang}
            onClick={() => setSheet('language')} />
          <MenuItem icon={<Shield size={18} />} label="Privacy & Security" value="Reset PIN"
            onClick={() => setSheet('resetPin')} />
        </Section>

        <motion.button whileTap={{ scale: 0.98 }} onClick={handleSignOut}
          className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm mt-2"
          style={{ backgroundColor: 'var(--signout-bg)', border: '1px solid var(--signout-border)', color: 'var(--signout-text)' }}>
          <LogOut size={18} /> End Shift & Sign Out
        </motion.button>
      </div>

      {/* ── Bottom Sheets ── */}
      <AnimatePresence>
        {sheet === 'emergency' && (
          <Sheet title="Emergency Contact" onClose={() => setSheet(null)}>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Phone number to call in an emergency.</p>
            <input type="tel" value={emergencyInput} onChange={e => setEmergencyInput(e.target.value)}
              placeholder="+1 (555) 000-0000" autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
              style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }} />
            <SaveButton onClick={saveEmergency} />
          </Sheet>
        )}

        {sheet === 'language' && (
          <Sheet title="Language" onClose={() => setSheet(null)}>
            <div className="space-y-2">
              {LANGUAGES.map(lang => (
                <button key={lang.code} onClick={() => saveLanguage(lang.code)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: language === lang.code ? 'var(--filter-active-bg)' : 'var(--btn-secondary-bg)', color: language === lang.code ? 'var(--filter-active-text)' : 'var(--text-primary)' }}>
                  {lang.label}
                  {language === lang.code && <Check size={16} />}
                </button>
              ))}
            </div>
          </Sheet>
        )}

        {sheet === 'resetPin' && (
          <Sheet title="Privacy & Security" onClose={() => setSheet(null)}>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Clears your saved credentials. You'll need to log in again with your PIN.
            </p>
            <button onClick={handleResetPin}
              className="w-full py-3 rounded-xl font-semibold text-sm mb-2"
              style={{ backgroundColor: 'var(--signout-bg)', color: 'var(--signout-text)', border: '1px solid var(--signout-border)' }}>
              Reset PIN & Sign Out
            </button>
            <button onClick={() => setSheet(null)}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
          </Sheet>
        )}

        {sheet === 'driver' && (
          <Sheet title="Delivery Driver Info" onClose={() => setSheet(null)}>
            <div className="space-y-3">
              <Field label="Contact Number">
                <input type="tel" value={driverInput.contact}
                  onChange={e => setDriverInput(p => ({ ...p, contact: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }} />
              </Field>

              <Field label="Mode of Transport">
                <div className="grid grid-cols-3 gap-2">
                  {TRANSPORT_MODES.map(t => (
                    <button key={t.id} onClick={() => setDriverInput(p => ({ ...p, transport: t.id }))}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium"
                      style={{ backgroundColor: driverInput.transport === t.id ? 'var(--filter-active-bg)' : 'var(--btn-secondary-bg)', color: driverInput.transport === t.id ? 'var(--filter-active-text)' : 'var(--text-secondary)' }}>
                      {t.icon}{t.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Plate Number (optional)">
                <input type="text" value={driverInput.plate}
                  onChange={e => setDriverInput(p => ({ ...p, plate: e.target.value.toUpperCase() }))}
                  placeholder="ABC-1234"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }} />
              </Field>

              {['car', 'motorcycle', 'scooter'].includes(driverInput.transport) && (
                <Field label="Vehicle Details (recommended)">
                  <div className="flex gap-2">
                    <input type="text" value={driverInput.make}
                      onChange={e => setDriverInput(p => ({ ...p, make: e.target.value }))}
                      placeholder="Make" className="flex-1 px-3 py-3 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }} />
                    <input type="text" value={driverInput.year}
                      onChange={e => setDriverInput(p => ({ ...p, year: e.target.value }))}
                      placeholder="Year" className="w-20 px-3 py-3 rounded-xl text-sm outline-none"
                      style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }} />
                  </div>
                  <input type="text" value={driverInput.model}
                    onChange={e => setDriverInput(p => ({ ...p, model: e.target.value }))}
                    placeholder="Model" className="w-full px-3 py-3 rounded-xl text-sm outline-none mt-2"
                    style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }} />
                </Field>
              )}

              <SaveButton onClick={saveDriverProfile} />
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>{title}</h3>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--section-bg)', border: '1px solid var(--section-border)' }}>
        {children}
      </div>
    </motion.div>
  );
}

function MenuItem({ icon, label, value, onClick, danger }: {
  icon: React.ReactNode; label: string; value?: string; onClick?: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity border-b last:border-0"
      style={{ borderColor: 'var(--card-border)' }}>
      <span style={{ color: danger ? 'var(--danger-item)' : 'var(--text-tertiary)' }}>{icon}</span>
      <span className="text-sm font-medium flex-1 text-left" style={{ color: danger ? 'var(--danger-item)' : 'var(--text-primary)' }}>{label}</span>
      {value && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{value}</span>}
      <ChevronRight size={16} style={{ color: 'var(--card-border-strong)' }} />
    </button>
  );
}

function ToggleItem({ icon, label, value, onClick }: {
  icon: React.ReactNode; label: string; value: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity border-b last:border-0"
      style={{ borderColor: 'var(--card-border)' }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <span className="text-xs font-semibold px-2 py-1 rounded-md"
        style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-secondary)' }}>{value}</span>
      <ChevronRight size={16} style={{ color: 'var(--card-border-strong)' }} />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 px-1"
        style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      {children}
    </div>
  );
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-1"
      style={{ backgroundColor: 'var(--filter-active-bg)', color: 'var(--filter-active-text)' }}>
      <Check size={16} /> Save
    </button>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      {/* Backdrop — above nav (z-50) */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 150 }}
        onClick={onClose} />
      {/* Sheet — above backdrop */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl px-4 pt-5"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          zIndex: 160,
          paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </>
  );
}
