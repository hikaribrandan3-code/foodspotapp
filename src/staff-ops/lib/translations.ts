export const staffTranslations: Record<string, Record<string, string>> = {
  // Profile labels
  'profile_title': {
    en: 'Profile',
    es: 'Perfil',
    pt: 'Perfil',
  },
  'profile_subtitle': {
    en: 'Account settings & shift management',
    es: 'Configuración de cuenta y gestión de turnos',
    pt: 'Configurações de conta e gerenciamento de turno',
  },
  'on_duty': {
    en: 'On Duty',
    es: 'En Servicio',
    pt: 'Em Serviço',
  },
  'off_duty': {
    en: 'Off Duty',
    es: 'Fuera de Servicio',
    pt: 'Fora de Serviço',
  },
  'shift_management': {
    en: 'Shift Management',
    es: 'Gestión de Turnos',
    pt: 'Gerenciamento de Turno',
  },
  'current_shift': {
    en: 'Current Shift',
    es: 'Turno Actual',
    pt: 'Turno Atual',
  },
  'not_clocked_in': {
    en: 'Not clocked in',
    es: 'No registrado',
    pt: 'Não registrado',
  },
  'driver_info': {
    en: 'Delivery Driver Info',
    es: 'Información del Conductor',
    pt: 'Informações do Motorista',
  },
  'vehicle_contact': {
    en: 'Vehicle & Contact',
    es: 'Vehículo y Contacto',
    pt: 'Veículo e Contato',
  },
  'preferences': {
    en: 'Preferences',
    es: 'Preferencias',
    pt: 'Preferências',
  },
  'theme': {
    en: 'Theme',
    es: 'Tema',
    pt: 'Tema',
  },
  'sound_alerts': {
    en: 'Sound Alerts',
    es: 'Alertas de Sonido',
    pt: 'Alertas de Som',
  },
  'notifications': {
    en: 'Notifications',
    es: 'Notificaciones',
    pt: 'Notificações',
  },
  'auto_sync': {
    en: 'Auto-Sync',
    es: 'Sincronización Automática',
    pt: 'Sincronização Automática',
  },
  'emergency': {
    en: 'Emergency',
    es: 'Emergencia',
    pt: 'Emergência',
  },
  'emergency_contact': {
    en: 'Emergency Contact',
    es: 'Contacto de Emergencia',
    pt: 'Contato de Emergência',
  },
  'system': {
    en: 'System',
    es: 'Sistema',
    pt: 'Sistema',
  },
  'language': {
    en: 'Language',
    es: 'Idioma',
    pt: 'Idioma',
  },
  'privacy_security': {
    en: 'Privacy & Security',
    es: 'Privacidad y Seguridad',
    pt: 'Privacidade e Segurança',
  },
  'reset_pin': {
    en: 'Reset PIN',
    es: 'Restablecer PIN',
    pt: 'Redefinir PIN',
  },
  'end_shift': {
    en: 'End Shift & Sign Out',
    es: 'Terminar Turno y Cerrar Sesión',
    pt: 'Terminar Turno e Sair',
  },
  'sign_out': {
    en: 'Sign Out',
    es: 'Cerrar Sesión',
    pt: 'Sair',
  },
  'since': {
    en: 'Since',
    es: 'Desde',
    pt: 'Desde',
  },
  'on': {
    en: 'On',
    es: 'Activado',
    pt: 'Ligado',
  },
  'off': {
    en: 'Off',
    es: 'Desactivado',
    pt: 'Desligado',
  },
  'dark': {
    en: 'Dark',
    es: 'Oscuro',
    pt: 'Escuro',
  },
  'light': {
    en: 'Light',
    es: 'Claro',
    pt: 'Claro',
  },
  'not_set': {
    en: 'Not set',
    es: 'No establecido',
    pt: 'Não definido',
  },
  'save_btn': {
    en: 'Save',
    es: 'Guardar',
    pt: 'Salvar',
  },
  'clock_in': {
    en: 'Clock In',
    es: 'Marcar Entrada',
    pt: 'Registrar Entrada',
  },
  'clock_out': {
    en: 'Clock Out',
    es: 'Marcar Salida',
    pt: 'Registrar Saída',
  },
  'days_worked': {
    en: 'Days Worked',
    es: 'Días Trabajados',
    pt: 'Dias Trabalhados',
  },
  'total_hours': {
    en: 'Total Hours',
    es: 'Horas Totales',
    pt: 'Horas Totais',
  },
  'shift_timer': {
    en: 'Active Shift',
    es: 'Turno Activo',
    pt: 'Turno Ativo',
  },
};

export function t(key: string, lang: string = 'en'): string {
  return staffTranslations[key]?.[lang] || staffTranslations[key]?.['en'] || key;
}
