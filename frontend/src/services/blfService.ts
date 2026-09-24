import {
  Contact,
  UserBlfPermission,
  BlfExtensionInfo,
  BlfState,
} from '../types';

export interface InternalExtensionMeta {
  extension: string;
  name: string;
  department?: string;
  domainId?: string;
  domainName?: string;
  contactId?: number | string;
}

const STORAGE_KEY_BLF_PERMISSIONS = 'enterprise_phonebook_blf_permissions';
const STORAGE_KEY_BLF_STATES = 'enterprise_phonebook_blf_states';

export function getAllAvailableInternalExtensions(allContacts: Contact[]): InternalExtensionMeta[] {
  const result: InternalExtensionMeta[] = [];
  const seen = new Set<string>();

  (allContacts || []).forEach((c) => {
    if (c.contact_type !== 'internal') return;
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'بدون نام';

    if (Array.isArray(c.landlines)) {
      c.landlines.forEach((l) => {
        const ext = (l.extension || '').trim();
        if (ext && !seen.has(ext)) {
          seen.add(ext);
          result.push({
            extension: ext,
            name: fullName,
            department: c.department || '',
            domainId: c.domain_id ? String(c.domain_id) : c.domain ? String(c.domain) : '',
            domainName: c.domain_name || c.domain || '',
            contactId: c.id,
          });
        }
      });
    }
  });

  return result;
}

export function getStoredBlfPermissions(): UserBlfPermission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLF_PERMISSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load BLF permissions', e);
  }

  // Default permissions for Administrator
  return [
    {
      userId: 1,
      userName: 'مدیر ارشد سامانه (Admin)',
      department: 'فناوری اطلاعات و زیرساخت',
      domainId: 'dom-1',
      domainName: 'دامین مرکزی (پارس زرآسا)',
      monitoredExtensions: ['101', '102', '103', '104', '105', '201', '202'],
      canViewAll: true,
      role: 'admin',
    },
  ];
}

export function saveStoredBlfPermissions(permissions: UserBlfPermission[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BLF_PERMISSIONS, JSON.stringify(permissions));
  } catch (e) {
    console.error('Failed to save BLF permissions', e);
  }
}

export function getStoredBlfStates(): Record<string, { state: BlfState; durationSec?: number; callerNumber?: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLF_STATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.error('Failed to load BLF states', e);
  }

  return {
    '101': { state: 'idle' },
    '102': { state: 'idle' },
    '103': { state: 'idle' },
    '104': { state: 'idle' },
    '105': { state: 'offline' },
    '201': { state: 'idle' },
    '202': { state: 'idle' },
  };
}

export function saveStoredBlfStates(states: Record<string, { state: BlfState; durationSec?: number; callerNumber?: string }>): void {
  try {
    localStorage.setItem(STORAGE_KEY_BLF_STATES, JSON.stringify(states));
  } catch (e) {
    console.error('Failed to save BLF states', e);
  }
}

export function getMonitoredExtensionsData(
  monitoredExtensions: string[],
  contacts: Contact[],
  blfStates: Record<string, any>,
  domainId?: string | number
): BlfExtensionInfo[] {
  if (!Array.isArray(monitoredExtensions)) return [];

  return monitoredExtensions.map((ext) => {
    const matchedContact = contacts.find((c) =>
      c.landlines?.some((l) => (l.extension || '').trim() === ext.trim())
    );

    const stateInfo = blfStates[ext] || { state: 'idle' };
    const name = matchedContact
      ? `${matchedContact.first_name} ${matchedContact.last_name}`.trim()
      : `داخلی ${ext}`;

    return {
      extension: ext,
      state: stateInfo.state || 'idle',
      name,
      department: matchedContact?.department || '',
      contactId: matchedContact?.id,
      domain_id: matchedContact?.domain_id || domainId,
      durationSec: stateInfo.durationSec || 0,
      isDnd: Boolean(stateInfo.isDnd),
    };
  });
}

type BlfListener = (states: Record<string, { state: BlfState; durationSec?: number; callerNumber?: string }>) => void;
const blfListeners = new Set<BlfListener>();

export function subscribeToBlfUpdates(callback: BlfListener): () => void {
  blfListeners.add(callback);
  callback(getStoredBlfStates());

  return () => {
    blfListeners.delete(callback);
  };
}
