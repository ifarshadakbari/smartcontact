import {
  Contact,
  User,
  UserBlfPermission,
  BlfExtensionInfo,
  BlfState,
  LdapDomain,
} from '../types';
import { isAdminOnlyLandline, matchContactToDomain } from '../utils/phoneUtils';

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

/**
 * Safely extracts internal extension number from a landline record,
 * handling schemas with .extension, .number, or short .phone
 */
export function extractExtensionFromLandline(item: any): string {
  if (!item || typeof item !== 'object') return '';
  if (item.extension && String(item.extension).trim() !== '') {
    return String(item.extension).trim();
  }
  if (item.number && String(item.number).trim() !== '') {
    const num = String(item.number).trim();
    // Typical internal PBX extension: 2 to 5 digits, not starting with 0
    if (num.length <= 5 && !num.startsWith('0')) {
      return num;
    }
    // Also if title indicates internal extension
    const title = String(item.title || '');
    if (title.includes('داخلی') || title.toLowerCase().includes('ext')) {
      return num;
    }
  }
  if (item.phone && String(item.phone).trim() !== '') {
    const ph = String(item.phone).trim();
    if (ph.length <= 5 && !ph.startsWith('0')) {
      return ph;
    }
  }
  return '';
}

export function getAllAvailableInternalExtensions(
  allContacts: Contact[],
  currentUser?: User | null,
  ldapDomains?: LdapDomain[]
): InternalExtensionMeta[] {
  const result: InternalExtensionMeta[] = [];
  const seen = new Set<string>();
  const isAdmin = currentUser?.role === 'admin';

  (allContacts || []).forEach((c) => {
    if (c.contact_type !== 'internal') return;
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'بدون نام';

    // Resolve domain info accurately
    let resolvedDomainId = c.domain_id != null && c.domain_id !== '' ? String(c.domain_id) : '';
    let resolvedDomainName = c.domain_name || c.domain || '';

    if (ldapDomains && ldapDomains.length > 0) {
      const matchedDom = ldapDomains.find((d) => matchContactToDomain(c, d));
      if (matchedDom) {
        resolvedDomainId = String(matchedDom.id);
        resolvedDomainName = matchedDom.display_name || matchedDom.name;
      }
    }

    if (Array.isArray(c.landlines)) {
      c.landlines.forEach((l) => {
        if (!isAdmin && isAdminOnlyLandline(l)) {
          return;
        }
        const ext = extractExtensionFromLandline(l);
        if (ext && !seen.has(ext)) {
          seen.add(ext);
          result.push({
            extension: ext,
            name: fullName,
            department: c.department || '',
            domainId: resolvedDomainId,
            domainName: resolvedDomainName,
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
      domainId: '1',
      domainName: 'دامین مرکزی (پارس زرآسا)',
      monitoredExtensions: ['101', '102', '103', '104', '105', '201', '202'],
      canViewBlf: true,
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
    const cleanExt = String(ext).trim();
    const matchedContact = contacts.find((c) =>
      c.landlines?.some((l) => extractExtensionFromLandline(l) === cleanExt) ||
      (c.personnel_code && String(c.personnel_code).trim() === cleanExt)
    );

    const stateInfo = blfStates[cleanExt] || { state: 'idle' };
    const name = matchedContact
      ? `${matchedContact.first_name} ${matchedContact.last_name}`.trim()
      : `داخلی ${cleanExt}`;

    return {
      extension: cleanExt,
      state: stateInfo.state || 'idle',
      name,
      department: matchedContact?.department || '',
      jobTitle: matchedContact?.job_title || '',
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
