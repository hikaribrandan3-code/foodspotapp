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
import { t as translate } from '../lib/translations';
// @ts-ignore
import { supabase } from '../../lib/supabaseClient.js';
// @ts-ignore
import * as audio from '@/lib/audio';

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

  const handleAudioToggle = () => {
    toggleAudio();
    // Play chime if enabling audio
    if (!audioEnabled) {
      try { audio.alertNewOrder?.('high'); } catch {}
    }
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

  const [shiftHistory, setShiftHistory] = useState<any[]>(
    () => getStored('fs_shift_history', [])
  );

  const handleClockInOut = () => {
    if (isOnDuty) {
      // Clock out
      const clockOutTime = new Date().toISOString();
      const updated = {
        ...currentShift,
        clock_out_at: clockOutTime,
      };
      localStorage.removeItem('fs_current_shift');
      const newHistory = [...shiftHistory, updated];
      setShiftHistory(newHistory);
      localStorage.setItem('fs_shift_history', JSON.stringify(newHistory));
    } else {
      // Clock in
      const clockInTime = new Date().toISOString();
      const newShift = {
        id: `shift-${Date.now()}`,
        staff_id: staffMember?.id,
        clock_in_at: clockInTime,
        clock_out_at: null,
      };
      localStorage.setItem('fs_current_shift', JSON.stringify(newShift));
    }
    // Force re-render
    window.location.reload();
  };

  const currentLang = LANGUAGES.find(l => l.code === language)?.label || 'English';
  const driverSummary = driverProfile.transport
    ? [driverProfile.transport, driverProfile.plate].filter(Boolean).join(' · ')
    : translate('not_set', language);

  // Helper to translate using current language state
  const t = (key: string) => translate(key, language);

  return (
    <div className="h-full w-full flex flex-col relative overflow-y-auto scrollbar-hide">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={20} style={{ color: 'var(--text-tertiary)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('profile_title')}</h1>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('profile_subtitle')}</p>
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
                {isOnDuty ? t('on_duty') : t('off_duty')}
              </span>
              {isOnDuty && <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{t('since')} {shiftStart}</span>}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 space-y-4 pb-32">
        <Section title={t('shift_management')}>
          <MenuItem icon={<Clock size={18} />} label={t('current_shift')}
            value={isOnDuty ? `${t('since')} ${shiftStart}` : t('not_clocked_in')} />
        </Section>

        <Section title={t('driver_info')}>
          <MenuItem icon={<Bike size={18} />} label={t('vehicle_contact')}
            value={driverSummary} onClick={() => { setDriverInput(driverProfile); setSheet('driver'); }} />
        </Section>

        <Section title={t('preferences')}>
          <ToggleItem icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            label={t('theme')} value={theme === 'dark' ? t('dark') : t('light')} onClick={toggleTheme} />
          <ToggleItem icon={audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            label={t('sound_alerts')} value={audioEnabled ? t('on') : t('off')} onClick={handleAudioToggle} />
          <ToggleItem icon={notificationsOn ? <Bell size={18} /> : <BellOff size={18} />}
            label={t('notifications')} value={notificationsOn ? t('on') : t('off')} onClick={toggleNotifications} />
          <ToggleItem icon={autoSyncOn ? <Wifi size={18} /> : <WifiOff size={18} />}
            label={t('auto_sync')} value={autoSyncOn ? t('on') : t('off')} onClick={toggleAutoSync} />
        </Section>

        <Section title={t('emergency')}>
          <MenuItem icon={<Phone size={18} />} label={t('emergency_contact')}
            value={emergencyContact || t('not_set')}
            onClick={() => { setEmergencyInput(emergencyContact); setSheet('emergency'); }} />
        </Section>

        <Section title={t('system')}>
          <MenuItem icon={<Settings size={18} />} label={t('language')} value={currentLang}
            onClick={() => setSheet('language')} />
        </Section>

        {/* Clock In / Clock Out Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleClockInOut}
          className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm mt-4"
          style={{
            backgroundColor: isOnDuty ? 'var(--urgency-critical-bg)' : 'var(--reception-bg)',
            border: `1px solid ${isOnDuty ? 'var(--urgency-critical-border)' : 'var(--reception-border)'}`,
            color: isOnDuty ? 'var(--timer-critical)' : 'var(--reception-text)',
          }}
        >
          <Clock size={18} />
          {isOnDuty ? `${t('off_duty')} - ${t('end_shift')}` : t('on_duty')}
        </motion.button>
      </div>

      {/* ── Bottom Sheets ── */}
      <AnimatePresence>
        {sheet === 'emergency' && (
          <Sheet title={t('emergency_contact')} onClose={() => setSheet(null)}>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Phone number to call in an emergency.</p>
            <input type="tel" value={emergencyInput} onChange={e => setEmergencyInput(e.target.value)}
              placeholder="+1 (555) 000-0000" autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
              style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }} />
            <SaveButton onClick={saveEmergency} />
          </Sheet>
        )}

        {sheet === 'language' && (
          <Sheet title={t('language')} onClose={() => setSheet(null)}>
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
          <Sheet title={t('privacy_security')} onClose={() => setSheet(null)}>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Clears your saved credentials. You'll need to log in again with your PIN.
            </p>
            <button onClick={handleResetPin}
              className="w-full py-3 rounded-xl font-semibold text-sm mb-2"
              style={{ backgroundColor: 'var(--signout-bg)', color: 'var(--signout-text)', border: '1px solid var(--signout-border)' }}>
              {t('reset_pin')} & {t('end_shift')}
            </button>
            <button onClick={() => setSheet(null)}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
          </Sheet>
        )}

        {sheet === 'driver' && (
          <Sheet title={t('driver_info')} onClose={() => setSheet(null)}>
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
                  {TRANSPORT_MODES.map(mode => (
                    <button key={mode.id} onClick={() => setDriverInput(p => ({ ...p, transport: mode.id }))}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium"
                      style={{ backgroundColor: driverInput.transport === mode.id ? 'var(--filter-active-bg)' : 'var(--btn-secondary-bg)', color: driverInput.transport === mode.id ? 'var(--filter-active-text)' : 'var(--text-secondary)' }}>
                      {mode.icon}{mode.label}
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
  const language = localStorage.getItem('fs_staff_language') || 'en';
  return (
    <button onClick={onClick}
      className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-1"
      style={{ backgroundColor: 'var(--filter-active-bg)', color: 'var(--filter-active-text)' }}>
      <Check size={16} /> {translate('save_btn', language)}
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
