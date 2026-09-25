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
 * handling schemas with .extension, .number, short .phone, or string/number
 */
export function extractExtensionFromLandline(item: any): string {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string' || typeof item === 'number') {
    const s = String(item).trim();
    if (s.length <= 5 && !s.startsWith('0')) return s;
    return s;
  }
  if (typeof item !== 'object') return '';
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
    return num;
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

export function findBlfStateForExtension(
  blfStates: Record<string, any>,
  ext: string
): { state: BlfState; durationSec?: number; callerNumber?: string; isDnd?: boolean } {
  if (!blfStates || typeof blfStates !== 'object') return { state: 'idle', durationSec: 0 };
  const clean = String(ext).trim();

  // ۱. بررسی مستقیم کلید در مپ
  let rawVal = blfStates[clean];

  // ۲. بررسی در صورت وجود پیشوند تکنولوژی یا نام کانتکست (مانند SIP/101 یا 101@from-internal)
  if (!rawVal) {
    for (const [key, val] of Object.entries(blfStates)) {
      const cleanKey = key
        .replace(/^(SIP|PJSIP|IAX2|DAHDI|Local)\//i, '')
        .replace(/@[^:]+$/, '')
        .replace(/-[0-9a-fA-F]+$/, '')
        .trim();
      if (cleanKey === clean) {
        rawVal = val;
        break;
      }
    }
  }

  if (!rawVal) return { state: 'idle', durationSec: 0 };

  const rawStateStr = String(
    (typeof rawVal === 'object' && rawVal !== null
      ? rawVal.state || rawVal.Status || rawVal.StatusText || rawVal.status
      : rawVal) || 'idle'
  ).toLowerCase().trim();

  let state: BlfState = 'idle';
  if (
    rawStateStr === 'busy' ||
    rawStateStr === 'inuse' ||
    rawStateStr === 'hold' ||
    rawStateStr === 'onhold' ||
    rawStateStr === 'talking' ||
    rawStateStr === '1' ||
    rawStateStr === '2' ||
    rawStateStr === '9' ||
    rawStateStr === '16'
  ) {
    state = 'busy';
  } else if (rawStateStr === 'ringing' || rawStateStr === 'ring' || rawStateStr === '8') {
    state = 'busy';
  } else if (
    rawStateStr === 'offline' ||
    rawStateStr === 'unavailable' ||
    rawStateStr === '4' ||
    rawStateStr === '-1'
  ) {
    state = 'offline';
  }

  const durationSec =
    typeof rawVal === 'object' && typeof rawVal.durationSec === 'number'
      ? rawVal.durationSec
      : state === 'busy'
      ? 1
      : 0;

  return {
    state,
    durationSec,
    callerNumber: typeof rawVal === 'object' ? rawVal.callerNumber : undefined,
    isDnd: typeof rawVal === 'object' ? Boolean(rawVal.isDnd) : false,
  };
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

    const stateInfo = findBlfStateForExtension(blfStates, cleanExt);
    let name = `داخلی ${cleanExt}`;
    if (matchedContact) {
      const lName =
        matchedContact.prefix_title === 'location' && matchedContact.last_name === '-'
          ? ''
          : (matchedContact.last_name || '');
      name = [matchedContact.first_name, lName].filter(Boolean).join(' ').trim() || matchedContact.company_name || `داخلی ${cleanExt}`;
    }

    return {
      extension: cleanExt,
      state: stateInfo.state,
      name,
      department: matchedContact?.department || '',
      jobTitle: matchedContact?.job_title || '',
      contactId: matchedContact?.id,
      domain_id: matchedContact?.domain_id || domainId,
      durationSec: stateInfo.durationSec || 0,
      callerNumber: stateInfo.callerNumber,
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

export function setExtensionBlfState(
  ext: string,
  state: BlfState,
  durationSec: number = 0,
  callerNumber?: string
): void {
  const current = getStoredBlfStates();
  const cleanExt = String(ext).trim();
  const updated = {
    ...current,
    [cleanExt]: {
      state,
      durationSec: state === 'busy' ? durationSec : 0,
      callerNumber,
    },
  };
  saveStoredBlfStates(updated);
  blfListeners.forEach((fn) => fn(updated));
}

export function mergeBlfStates(
  incoming: Record<string, { state: BlfState; durationSec?: number; callerNumber?: string }>
): Record<string, { state: BlfState; durationSec?: number; callerNumber?: string }> {
  const current = getStoredBlfStates();
  const next = { ...current };

  Object.entries(incoming).forEach(([ext, info]) => {
    if (!info) return;
    const cleanExt = String(ext).trim();
    const prev = next[cleanExt] || { state: 'idle' };
    next[cleanExt] = {
      ...prev,
      ...info,
      state: info.state || prev.state || 'idle',
      durationSec: typeof info.durationSec === 'number' ? info.durationSec : (info.state === 'busy' ? (prev.durationSec || 0) : 0),
    };
  });

  saveStoredBlfStates(next);
  blfListeners.forEach((fn) => fn(next));
  return next;
}
