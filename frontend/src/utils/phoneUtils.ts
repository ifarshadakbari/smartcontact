import { Contact, User, LdapDomain } from '../types';

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
    const found = domainList.find((d) => d.id === contact.domain_id);
    if (found) {
      return found.display_name || found.name;
    }
  }

  // 2. Match by domain_name
  if (contact.domain_name) {
    const cleanContactDomain = contact.domain_name.trim().toLowerCase();
    const found = domainList.find(
      (d) =>
        d.name.toLowerCase() === cleanContactDomain ||
        d.name.toLowerCase().includes(cleanContactDomain) ||
        cleanContactDomain.includes(d.name.toLowerCase())
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
