import { BlfState, BlfExtensionInfo, UserBlfPermission, Contact } from '../types';

const STORAGE_KEY_BLF_PERMISSIONS = 'enterprise_phonebook_blf_permissions_v1';
const STORAGE_KEY_BLF_STATES = 'enterprise_phonebook_blf_states_v1';

export const DEFAULT_BLF_PERMISSIONS: UserBlfPermission[] = [];

const INITIAL_BLF_STATES: Record<string, { state: BlfState; durationSec?: number; lastChanged: string }> = {};

// Listeners for live BLF event changes
type BlfListener = (states: Record<string, { state: BlfState; durationSec?: number; lastChanged: string }>) => void;
const listeners: Set<BlfListener> = new Set();

export const getStoredBlfPermissions = (): UserBlfPermission[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLF_PERMISSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading BLF permissions', e);
  }
  return DEFAULT_BLF_PERMISSIONS;
};

export const saveStoredBlfPermissions = (perms: UserBlfPermission[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_BLF_PERMISSIONS, JSON.stringify(perms));
  } catch (e) {
    console.error('Error saving BLF permissions', e);
  }
};

export const getStoredBlfStates = (): Record<string, { state: BlfState; durationSec?: number; lastChanged: string }> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLF_STATES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading BLF states', e);
  }
  return INITIAL_BLF_STATES;
};

export const saveStoredBlfStates = (
  states: Record<string, { state: BlfState; durationSec?: number; lastChanged: string }>
): void => {
  try {
    localStorage.setItem(STORAGE_KEY_BLF_STATES, JSON.stringify(states));
  } catch (e) {
    console.error('Error saving BLF states', e);
  }
  // Notify listeners
  listeners.forEach((l) => l(states));
};

export const subscribeToBlfUpdates = (listener: BlfListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Simulate or ingest an Asterisk AMI ExtensionStatus event
 * Only 3 explicit states: 'idle' (0), 'busy' (1/2), 'offline' (4/-1)
 */
export const updateExtensionBlfState = (extension: string, newState: BlfState): void => {
  const current = getStoredBlfStates();
  current[extension] = {
    state: newState,
    durationSec: newState === 'busy' ? (current[extension]?.durationSec || 1) : 0,
    lastChanged: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  saveStoredBlfStates(current);
};

/**
 * Compile a list of BlfExtensionInfo given contacts and the user's monitored extension list.
 * STRICT DOMAIN ISOLATION:
 * When userDomainId is provided, any extension belonging to a different domain will NOT be included.
 */
export const getMonitoredExtensionsData = (
  monitoredList: string[],
  allContacts: Contact[],
  currentStates: Record<string, { state: BlfState; durationSec?: number; lastChanged: string }>,
  userDomainId?: string
): BlfExtensionInfo[] => {
  // Map all contacts by their extensions
  const extensionToContact = new Map<string, { contact: Contact; extension: string }>();

  allContacts.forEach((c) => {
    if (c.landlines && Array.isArray(c.landlines)) {
      c.landlines.forEach((l) => {
        if (l.extension?.trim()) {
          const ext = l.extension.trim();
          if (!extensionToContact.has(ext)) {
            extensionToContact.set(ext, { contact: c, extension: ext });
          }
        }
      });
    }
  });

  const result: BlfExtensionInfo[] = [];

  monitoredList.forEach((ext) => {
    const matched = extensionToContact.get(ext);
    const liveState = currentStates[ext] || { state: 'idle', durationSec: 0, lastChanged: 'آماده' };

    if (matched) {
      const { contact } = matched;
      // Strict domain boundary check:
      // If userDomainId is provided, prevent displaying extensions from other domains
      if (userDomainId && contact.domain_id && contact.domain_id !== userDomainId) {
        return;
      }

      result.push({
        extension: ext,
        name: `${contact.first_name} ${contact.last_name}`,
        contactId: contact.id,
        department: contact.department,
        jobTitle: contact.job_title,
        state: liveState.state,
        domainId: contact.domain_id,
        durationSec: liveState.durationSec,
        lastChanged: liveState.lastChanged,
      });
    } else {
      // If userDomainId is specified, do not display untracked unknown extensions
      if (!userDomainId) {
        result.push({
          extension: ext,
          name: `داخلی ${ext}`,
          state: liveState.state,
          durationSec: liveState.durationSec,
          lastChanged: liveState.lastChanged,
        });
      }
    }
  });

  return result;
};

export interface InternalExtensionMeta {
  extension: string;
  name: string;
  department?: string;
  jobTitle?: string;
  domainId?: string;
  domainName?: string;
  contactId?: number | string;
}

/**
 * Get all available internal extensions from contacts, including their LDAP domain metadata
 */
export const getAllAvailableInternalExtensions = (contacts: Contact[]): InternalExtensionMeta[] => {
  const map = new Map<string, InternalExtensionMeta>();

  contacts.forEach((c) => {
    if (c.contact_type !== 'external' && c.landlines) {
      c.landlines.forEach((l) => {
        if (l.extension?.trim()) {
          const ext = l.extension.trim();
          if (!map.has(ext)) {
            map.set(ext, {
              extension: ext,
              name: `${c.first_name} ${c.last_name}`,
              department: c.department,
              jobTitle: c.job_title,
              domainId: c.domain_id,
              domainName: c.domain_name,
              contactId: c.id,
            });
          }
        }
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.extension.localeCompare(b.extension));
};

/**
 * Get internal extensions belonging strictly to a specific domain
 */
export const getInternalExtensionsForDomain = (
  contacts: Contact[],
  domainId: string
): InternalExtensionMeta[] => {
  const allExts = getAllAvailableInternalExtensions(contacts);
  return allExts.filter((e) => e.domainId === domainId);
};
