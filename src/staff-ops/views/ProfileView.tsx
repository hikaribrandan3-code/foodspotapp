import { motion } from 'framer-motion';
import { User, Settings, Bell, Shield, Clock, Phone, LogOut, ChevronRight, Moon, Sun, Wifi, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAudioPref } from '@/hooks/useAudioPref';
import { useBusiness } from '@/contexts/BusinessContext';

function getStoredStaff() {
  try {
    const raw = localStorage.getItem('fs_staff_member');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getStoredShift() {
  try {
    const raw = localStorage.getItem('fs_current_shift');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function formatShiftTime(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ProfileView() {
  const { theme, toggleTheme } = useTheme();
  const [audioEnabled, toggleAudio] = useAudioPref();
  const { tenantSlug } = useBusiness();
  const staffMember = getStoredStaff();
  const currentShift = getStoredShift();

  const staffName = staffMember?.name || 'Staff Member';
  const staffRole = staffMember?.role || 'Staff';
  const shiftStart = formatShiftTime(currentShift?.clock_in_at);
  const isOnDuty = !!currentShift;

  const handleSignOut = () => {
    localStorage.removeItem('fs_staff_member');
    localStorage.removeItem('fs_current_shift');
    localStorage.removeItem('fs_business_id');
    localStorage.removeItem('x-staff-id');
    window.location.href = `/${tenantSlug}/staff`;
  };

  return (
    <div className="h-full w-full flex flex-col relative overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={20} style={{ color: 'var(--text-tertiary)' }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Profile</h1>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Account settings & shift management</p>
      </div>

      {/* User card */}
      <div className="px-4 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl p-4 flex items-center gap-4"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--filter-active-bg)' }}
          >
            <User size={28} style={{ color: 'var(--status-icon-prep)' }} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{staffName}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{staffRole}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                style={{ backgroundColor: isOnDuty ? 'var(--reception-bg)' : 'var(--btn-secondary-bg)', color: isOnDuty ? 'var(--reception-text)' : 'var(--text-secondary)' }}
              >
                {isOnDuty ? 'On Duty' : 'Off Duty'}
              </span>
              {isOnDuty && <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Since {shiftStart}</span>}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sections */}
      <div className="px-4 space-y-4 pb-24">
        <Section title="Shift Management">
          <MenuItem icon={<Clock size={18} />} label="Current Shift" value={isOnDuty ? `Since ${shiftStart}` : 'Not clocked in'} />
          <MenuItem icon={<Bell size={18} />} label="Break Reminder" value="In 2h 14m" />
        </Section>

        <Section title="Preferences">
          <ThemeToggleItem
            icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            label="Theme"
            value={theme === 'dark' ? 'Dark' : 'Light'}
            onClick={toggleTheme}
          />
          <AudioToggleItem
            icon={audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            label="Sound Alerts"
            value={audioEnabled ? 'On' : 'Off'}
            onClick={toggleAudio}
          />
          <MenuItem icon={<Bell size={18} />} label="Notifications" value="Enabled" />
          <MenuItem icon={<Wifi size={18} />} label="Auto-Sync" value="On" />
        </Section>

        <Section title="Emergency">
          <MenuItem icon={<Phone size={18} />} label="Emergency Contact" value="+1 (555) 019-2834" />
          <MenuItem icon={<ShieldAlert size={18} />} label="Report Incident" value="" danger />
        </Section>

        <Section title="System">
          <MenuItem icon={<Settings size={18} />} label="App Settings" value="" />
          <MenuItem icon={<Shield size={18} />} label="Privacy & Security" value="" />
        </Section>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSignOut}
          className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm mt-2"
          style={{
            backgroundColor: 'var(--signout-bg)',
            border: '1px solid var(--signout-border)',
            color: 'var(--signout-text)',
          }}
        >
          <LogOut size={18} />
          End Shift & Sign Out
        </motion.button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>{title}</h3>
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--section-bg)', border: '1px solid var(--section-border)' }}
      >
        {children}
      </div>
    </motion.div>
  );
}

function MenuItem({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity border-b last:border-0"
      style={{ borderColor: 'var(--card-border)' }}
    >
      <span style={{ color: danger ? 'var(--danger-item)' : 'var(--text-tertiary)' }}>{icon}</span>
      <span className={`text-sm font-medium flex-1 text-left ${danger ? '' : ''}`} style={{ color: danger ? 'var(--danger-item)' : 'var(--text-primary)' }}>
        {label}
      </span>
      {value && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{value}</span>}
      <ChevronRight size={16} style={{ color: 'var(--card-border-strong)' }} />
    </button>
  );
}

function ThemeToggleItem({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity border-b last:border-0"
      style={{ borderColor: 'var(--card-border)' }}
    >
      <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-secondary)' }}>
        {value}
      </span>
      <ChevronRight size={16} style={{ color: 'var(--card-border-strong)' }} />
    </button>
  );
}

function AudioToggleItem({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70 transition-opacity border-b last:border-0"
      style={{ borderColor: 'var(--card-border)' }}
    >
      <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-secondary)' }}>
        {value}
      </span>
      <ChevronRight size={16} style={{ color: 'var(--card-border-strong)' }} />
    </button>
  );
}
