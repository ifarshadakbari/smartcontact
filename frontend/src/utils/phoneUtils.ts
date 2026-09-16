import { Contact, User, LdapDomain, Department } from '../types';

/**
 * Returns the Persian display name for a contact's domain.
 */
export function getDomainDisplayName(
  contact: Contact,
  domains?: LdapDomain[]
): string {
  if (contact.contact_type === 'external') {
    return contact.company_name || 'شرکت طرف قرارداد';
  }

  const domainList = domains || [];

  // 1. Match by domain_id
  if (contact.domain_id) {
    const found = domainList.find((d) => String(d.id) === String(contact.domain_id));
    if (found) {
      return found.display_name || found.name;
    }
  }

  // 2. Match by domain_name
  const cDom = (contact.domain || contact.domain_name || '').trim().toLowerCase();
  if (cDom) {
    const found = domainList.find(
      (d) =>
        (d.name && d.name.toLowerCase() === cDom) ||
        (d.name && (d.name.toLowerCase().includes(cDom) || cDom.includes(d.name.toLowerCase()))) ||
        (d.display_name && (d.display_name.toLowerCase().includes(cDom) || cDom.includes(d.display_name.toLowerCase())))
    );
    if (found) {
      return found.display_name || found.name;
    }
  }

  // 3. Fallback to domain_name or first available domain
  if (contact.domain_name) {
    return contact.domain_name;
  }

  return domainList[0]?.display_name || domainList[0]?.name || 'دامین پیش‌فرض';
}

/**
 * Checks if a contact belongs to a specific LDAP Domain:
 * Checks domain_id, domain name, or display name with fallback.
 */
export function matchContactToDomain(contact: Contact, domain: LdapDomain): boolean {
  if (contact.contact_type === 'external') return false;
  if (contact.domain_id && String(contact.domain_id) === String(domain.id)) return true;

  const domName = (domain.name || '').trim().toLowerCase();
  const domDisplay = (domain.display_name || '').trim().toLowerCase();
  const cDomain = (contact.domain || contact.domain_name || '').trim().toLowerCase();

  if (cDomain && domName) {
    if (cDomain === domName || cDomain.includes(domName) || domName.includes(cDomain)) return true;
  }
  if (cDomain && domDisplay) {
    if (cDomain.includes(domDisplay) || domDisplay.includes(cDomain)) return true;
  }
  if (contact.domain_id && domName && contact.domain_id.toLowerCase() === domName) return true;

  // If contact has no explicit domain and domain is default
  if (!contact.domain_id && !contact.domain && !contact.domain_name && domain.is_default) {
    return true;
  }

  return false;
}

/**
 * Detects if a landline entry title refers to a wireless line (بی سیم / بیسیم):
 * Checks for "بی سیم", "بیسیم", "بی‌سیم", "wireless", etc.
 * Supports string, array of landlines, or single landline object safely.
 */
export function isWirelessLine(titleOrLandlines?: any): boolean {
  if (!titleOrLandlines) return false;
  if (Array.isArray(titleOrLandlines)) {
    return titleOrLandlines.some((l) => l && isWirelessLine(l.title));
  }
  if (typeof titleOrLandlines === 'object' && titleOrLandlines !== null) {
    return isWirelessLine(titleOrLandlines.title);
  }
  if (typeof titleOrLandlines !== 'string') return false;
  const clean = titleOrLandlines
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  return (
    clean === 'بیسیم' ||
    clean.includes('بیسیم') ||
    clean === 'wireless' ||
    clean === 'radio'
  );
}

/**
 * Normalizes organizational department name to detect duplicates
 * (e.g. "مرکزطراحی مهندسی" vs "مرکز طراحی مهندسی" vs "مرکز‌طراحی مهندسی")
 */
export function normalizeDeptName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u064A\u0649]/g, 'ی')
    .replace(/[\u0643]/g, 'ک')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * Deduplicates departments list, merging variants like "مرکزطراحی مهندسی" into "مرکز طراحی مهندسی"
 */
export function deduplicateDepartments(departments: Department[]): Department[] {
  const seen = new Map<string, Department>();

  for (const d of departments) {
    if (!d || !d.name) continue;
    if (d.id === 'all') {
      seen.set('all', d);
      continue;
    }

    const key = normalizeDeptName(d.name);
    if (!seen.has(key)) {
      let cleanName = d.name.trim();
      // Fix known concatenated Persian phrasing
      if (cleanName.includes('مرکزطراحی')) {
        cleanName = cleanName.replace('مرکزطراحی', 'مرکز طراحی');
      }
      seen.set(key, { ...d, name: cleanName });
    } else {
      // If the duplicate has space, prefer the name with space
      const existing = seen.get(key)!;
      if (!existing.name.includes(' ') && d.name.includes(' ')) {
        seen.set(key, { ...existing, name: d.name.trim() });
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Formats any Iranian mobile number into standard 11-digit format starting with 09 (e.g. 09121234567):
 * - Converts Persian & Arabic numerals to English digits
 * - Strips spaces, dashes, parentheses, dots and international prefixes (+98, 0098, 98)
 * - Prepends 0 if entered as 10 digits starting with 9
 */
export function formatIranianMobile(input: string): string {
  if (!input) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let cleaned = input.trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }

  // Remove all non-digits
  cleaned = cleaned.replace(/\D/g, '');

  if (cleaned.startsWith('0098')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('98') && cleaned.length >= 12) {
    cleaned = cleaned.slice(2);
  }

  // If user entered 9xxxxxxxxx (10 digits without leading 0), add 0
  if (cleaned.startsWith('9') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * Validates if the given string represents a valid Iranian 11-digit mobile starting with 09
 */
export function isValidIranianMobile(phone: string): boolean {
  const formatted = formatIranianMobile(phone);
  return /^09\d{9}$/.test(formatted);
}

/**
 * Normalizes Persian/Arabic text and digits for robust intelligent search:
 * - Unifies Arabic 'ي' to Persian 'ی' and Arabic 'ك' to 'ک'
 * - Replaces half-space / ZWNJ (\u200C) with standard space
 * - Converts Persian & Arabic numerals to English digits
 * - Lowercases and trims extra whitespace
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let res = text.trim().toLowerCase();
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }

  return res
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .replaceAll('ة', 'ه')
    .replaceAll('\u200c', ' ')
    .replaceAll('\u200e', '')
    .replaceAll('\u200f', '')
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes a phone number for comparison:
 * - Converts Persian and Arabic digits to English digits
 * - Strips spaces, dashes, parentheses, dots
 * - Strips leading +98, 0098, or 0
 * Example: '۰۹۱۲-۱۱۱-۲۲۳۳' -> '9121112233'
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let cleaned = phone.trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }

  // Remove all non-digits
  cleaned = cleaned.replace(/\D/g, '');

  // Strip international prefix
  if (cleaned.startsWith('0098')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('98') && cleaned.length >= 11) {
    cleaned = cleaned.slice(2);
  }

  // Strip leading zero for standard Iranian 10-digit mobile representation (e.g. 9121234567)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  return cleaned;
}

export interface VisibleMobileItem {
  phone: string;
  type: 'public' | 'admin_confidential' | 'personal_overlay' | 'external';
  label: string;
  isPersonal: boolean;
}

/**
 * Resolves the visible mobile numbers for a contact according to enterprise privacy rules:
 * - External contacts: all mobiles are public business numbers.
 * - Internal contacts:
 *    - If contact.is_mobile_public is true: visible to everyone.
 *    - If confidential (default): visible to Admin and the contact creator.
 *    - If the current logged-in user has added this number to their personal notebook (personal_mobiles), it is visible to them with badge.
 *    - Regular users and guests do not see confidential internal numbers.
 */
export function getVisibleMobiles(
  contact: Contact,
  currentUser: User | null
): VisibleMobileItem[] {
  const list: VisibleMobileItem[] = [];
  const isAdmin = currentUser?.role === 'admin';
  const isCreator = Boolean(currentUser && contact.created_by_user_id === currentUser.id);
  const isExternal = contact.contact_type === 'external';

  const officialMobiles = (contact.mobiles || []).filter(Boolean);

  if (isExternal) {
    officialMobiles.forEach((m) => {
      list.push({
        phone: m,
        type: 'external',
        label: 'همراه طرف قرارداد',
        isPersonal: false,
      });
    });
  } else {
    // Internal Staff
    const isPublic = contact.is_mobile_public === true;

    if (isPublic) {
      officialMobiles.forEach((m) => {
        list.push({
          phone: m,
          type: 'public',
          label: 'همراه عمومی سازمانی',
          isPersonal: false,
        });
      });
    } else {
      // Official mobile is confidential
      if (isAdmin || isCreator) {
        officialMobiles.forEach((m) => {
          list.push({
            phone: m,
            type: 'admin_confidential',
            label: isAdmin ? 'همراه سازمانی (محرمانه / دسترسی ادمین)' : 'همراه ثبت‌شده توسط شما',
            isPersonal: false,
          });
        });
      }
    }
  }

  // Check personal overlay mobiles for currentUser
  if (currentUser && contact.personal_mobiles && contact.personal_mobiles[currentUser.id]) {
    const personalList = contact.personal_mobiles[currentUser.id] || [];
    personalList.forEach((m) => {
      if (!m.trim()) return;
      const norm = normalizePhoneNumber(m);
      // Avoid duplicate display if already in list
      if (!list.some((item) => normalizePhoneNumber(item.phone) === norm)) {
        list.push({
          phone: m,
          type: 'personal_overlay',
          label: 'شماره همراه در دفترچه شخصی شما',
          isPersonal: true,
        });
      }
    });
  }

  return list;
}
