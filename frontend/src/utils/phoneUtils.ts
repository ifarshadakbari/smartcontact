import { Contact, User, LdapDomain, Department } from '../types';

/**
 * Returns the Persian display name for a contact's domain.
 */
export function getDomainDisplayName(
  contact: Contact,
  domains?: LdapDomain[]
): string {
  if (contact.contact_type === 'external') {
    return contact.company_name || 'برون‌سازمانی';
  }

  const domainList = domains || [];

  // 1. Match by domain_id
  if (contact.domain_id !== undefined && contact.domain_id !== null && contact.domain_id !== '') {
    const found = domainList.find((d) => String(d.id) === String(contact.domain_id));
    if (found) {
      return found.display_name || found.name;
    }
  }

  // 2. Match by domain_name
  const cDom = String(contact.domain || contact.domain_name || '').trim().toLowerCase();
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
  if (contact.domain_id !== undefined && contact.domain_id !== null && contact.domain_id !== '' && String(contact.domain_id) === String(domain.id)) {
    return true;
  }

  const domName = String(domain.name || '').trim().toLowerCase();
  const domDisplay = String(domain.display_name || '').trim().toLowerCase();
  const cDomain = String(contact.domain || contact.domain_name || '').trim().toLowerCase();
  const cDomainId = contact.domain_id !== undefined && contact.domain_id !== null ? String(contact.domain_id).trim().toLowerCase() : '';

  if (cDomain && domName) {
    if (cDomain === domName || cDomain.includes(domName) || domName.includes(cDomain)) return true;
  }
  if (cDomain && domDisplay) {
    if (cDomain.includes(domDisplay) || domDisplay.includes(cDomain)) return true;
  }
  if (cDomainId && domName && cDomainId === domName) return true;

  // If contact has no explicit domain and domain is default
  if (!contact.domain_id && !contact.domain && !contact.domain_name && domain.is_default) {
    return true;
  }

  return false;
}

/**
 * Resolves the LDAP Domain ID that the logged-in user belongs to.
 * Used to set the default selected domain filter tab upon user login or restore.
 */
export function getUserDomainId(
  user: User | null,
  domains: LdapDomain[],
  contacts?: Contact[]
): string | null {
  if (!user || !domains || domains.length === 0) return null;

  // 1. Direct domain_id if present on user
  if (user.domain_id !== undefined && user.domain_id !== null && user.domain_id !== '') {
    const dId = String(user.domain_id);
    const found = domains.find((d) => String(d.id) === dId);
    if (found) return String(found.id);
  }

  // 2. Direct domain name or display name on user
  if (user.domain) {
    const rawDom = user.domain.trim().toLowerCase();
    const found = domains.find(
      (d) =>
        String(d.id) === rawDom ||
        d.name?.toLowerCase() === rawDom ||
        d.display_name?.toLowerCase() === rawDom ||
        (d.base_dn && d.base_dn.toLowerCase().includes(rawDom))
    );
    if (found) return String(found.id);
  }

  // 3. User email domain
  if (user.email && user.email.includes('@')) {
    const emailDomain = user.email.split('@')[1]?.trim().toLowerCase();
    if (emailDomain) {
      const found = domains.find(
        (d) =>
          d.name?.toLowerCase() === emailDomain ||
          emailDomain.includes(d.name?.toLowerCase() || '') ||
          (d.name && d.name.toLowerCase().includes(emailDomain))
      );
      if (found) return String(found.id);
    }
  }

  // 4. Check if user corresponds to a contact in contacts list
  if (contacts && contacts.length > 0) {
    const matchedContact = contacts.find(
      (c) =>
        (c.personnel_code && user.personnel_code && c.personnel_code === user.personnel_code) ||
        (user.username && c.ldap_username && c.ldap_username.toLowerCase() === user.username.toLowerCase()) ||
        (c.email && user.email && c.email.toLowerCase() === user.email.toLowerCase())
    );
    if (matchedContact) {
      for (const dom of domains) {
        if (matchContactToDomain(matchedContact, dom)) {
          return String(dom.id);
        }
      }
    }
  }

  // 5. If user has a default domain or first active domain
  const defaultDom = domains.find((d) => d.is_default && d.is_active) || domains.find((d) => d.is_active);
  return defaultDom ? String(defaultDom.id) : null;
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
    clean === 'dect' ||
    clean === 'radio'
  );
}

/**
 * Checks if a title is purely indicating that the line is wireless (e.g. "بی سیم", "بیسیم", "بی‌سیم", "تلفن بی‌سیم")
 * so that we don't display "بی سیم" twice when a wireless badge is present.
 */
export function isPureWirelessTitle(title?: string | null): boolean {
  if (!title || typeof title !== 'string') return false;
  const clean = title
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  return (
    clean === 'بیسیم' ||
    clean === 'تلفنبیسیم' ||
    clean === 'خطبیسیم' ||
    clean === 'داخلیبیسیم' ||
    clean === 'گوشیبیسیم' ||
    clean === 'wireless' ||
    clean === 'dect' ||
    clean === 'radio'
  );
}

/**
 * Detects if a landline entry title refers to a remote line (ریموت / دورکار):
 * Checks for "ریموت", "remote", "دورکار", "دورکاری", "vpn", etc.
 */
export function isRemoteLine(titleOrLandlines?: any): boolean {
  if (!titleOrLandlines) return false;
  if (Array.isArray(titleOrLandlines)) {
    return titleOrLandlines.some((l) => l && isRemoteLine(l.title));
  }
  if (typeof titleOrLandlines === 'object' && titleOrLandlines !== null) {
    return isRemoteLine(titleOrLandlines.title);
  }
  if (typeof titleOrLandlines !== 'string') return false;
  const clean = titleOrLandlines
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  return (
    clean === 'ریموت' ||
    clean.includes('ریموت') ||
    clean === 'remote' ||
    clean.includes('remote') ||
    clean === 'دورکار' ||
    clean.includes('دورکار') ||
    clean.includes('دورکاری') ||
    clean === 'vpn'
  );
}

/**
 * Checks if a title is purely indicating that the line is remote (e.g. "ریموت", "remote", "دورکار", "تلفن ریموت")
 */
export function isPureRemoteTitle(title?: string | null): boolean {
  if (!title || typeof title !== 'string') return false;
  const clean = title
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
  return (
    clean === 'ریموت' ||
    clean === 'تلفنریموت' ||
    clean === 'خطرremote' ||
    clean === 'خطریموت' ||
    clean === 'داخلیرremote' ||
    clean === 'داخلایریموت' ||
    clean === 'داخلیرریموت' ||
    clean === 'remote' ||
    clean === 'remoteline' ||
    clean === 'دورکار' ||
    clean === 'دورکاری'
  );
}

/**
 * Extracts non-wireless & non-remote descriptive parts from a title (e.g. "انبار - بی‌سیم" -> "انبار", "مهندسی - ریموت" -> "مهندسی")
 */
export function getNonWirelessTitle(title?: string | null): string {
  if (!title || typeof title !== 'string') return '';
  if (isPureWirelessTitle(title) || isPureRemoteTitle(title)) return '';
  return title
    .replace(/(?:تلفن\s*)?(?:بی[\s‌-]*سیم|بیسیم|wireless|dect|ریموت|remote|دورکار|دورکاری)/gi, '')
    .replace(/^[\s\-–—:،,]+|[\s\-–—:،,]+$/g, '')
    .trim();
}

/**
 * Determines the specific line type for visual badge styling
 */
export function getLineBadgeType(title?: string | null): 'wireless' | 'remote' | 'other' {
  if (isWirelessLine(title)) return 'wireless';
  if (isRemoteLine(title)) return 'remote';
  return 'other';
}

/**
 * Filters visible landlines for a contact based on Admin/Staff privacy permissions:
 * Lines marked as is_admin_only are hidden from non-admin users.
 */
export function getVisibleLandlines(contact: Contact, currentUser: User | null): any[] {
  const landlines = Array.isArray(contact.landlines) ? contact.landlines : [];
  const isAdmin = currentUser?.role === 'admin';

  return landlines.filter((item) => {
    if (!item) return false;
    const hasData = Boolean(item.phone?.trim() || item.extension?.trim());
    if (!hasData) return false;

    // If marked as admin only, hide for regular users and guests
    if (item.is_admin_only && !isAdmin) {
      return false;
    }
    return true;
  });
}

/**
 * Checks if VoIP click-to-call is enabled and configured on a domain
 */
export function isDomainVoipEnabled(domain?: LdapDomain | null): boolean {
  if (!domain) return false;
  // If explicitly disabled as false, 0 or '0'
  if (domain.voip_enabled === false || (domain.voip_enabled as any) === 0 || (domain.voip_enabled as any) === '0') {
    return false;
  }
  // If explicitly enabled
  if (domain.voip_enabled === true || (domain.voip_enabled as any) === 1 || (domain.voip_enabled as any) === '1') {
    return true;
  }
  // If not explicitly set, check if a VoIP server host is configured
  return Boolean(domain.voip_server_host && domain.voip_server_host.trim() !== '');
}

/**
 * Checks if a call can be initiated from desktop IP Phone for this contact
 */
export function isContactVoipCallable(
  contact: Contact,
  domains?: LdapDomain[],
  currentUser?: User | null
): { callable: boolean; reason?: string } {
  if (!currentUser) {
    return { callable: false, reason: 'جهت برقراری تماس تلفنی لطفاً ابتدا وارد حساب کاربری خود شوید.' };
  }
  if (!currentUser.extension || currentUser.extension.trim() === '') {
    return { callable: false, reason: 'برای حساب کاربری شما شماره داخلی در Active Directory ثبت نشده است.' };
  }

  // 1. Check if the current user's own domain has VoIP disabled
  if (domains && domains.length > 0) {
    const userDomain = domains.find(
      (d) =>
        (currentUser.domain_id && String(d.id) === String(currentUser.domain_id)) ||
        (currentUser.domain && (
          d.name.toLowerCase() === currentUser.domain.toLowerCase() ||
          d.display_name.toLowerCase() === currentUser.domain.toLowerCase()
        ))
    );
    if (userDomain && !isDomainVoipEnabled(userDomain)) {
      return {
        callable: false,
        reason: `سرویس VoIP برای دامین شما («${userDomain.display_name || userDomain.name}») غیرفعال است.`,
      };
    }
  }

  // 2. If internal contact, verify contact's domain VoIP status
  if (contact.contact_type !== 'external' && domains && domains.length > 0) {
    const matchedDomain = domains.find(
      (d) =>
        (contact.domain_id && String(d.id) === String(contact.domain_id)) ||
        (contact.domain && (
          d.name.toLowerCase() === contact.domain.toLowerCase() ||
          d.display_name.toLowerCase() === contact.domain.toLowerCase()
        )) ||
        (contact.domain_name && (
          d.name.toLowerCase() === contact.domain_name.toLowerCase() ||
          d.display_name.toLowerCase() === contact.domain_name.toLowerCase()
        ))
    );
    if (matchedDomain && !isDomainVoipEnabled(matchedDomain)) {
      return {
        callable: false,
        reason: `قابلیت VoIP بر روی دامین «${matchedDomain.display_name || matchedDomain.name}» غیرفعال است.`,
      };
    }
  }

  return { callable: true };
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
      const existing = seen.get(key)!;
      const cleanName = (!existing.name.includes(' ') && d.name.includes(' ')) ? d.name.trim() : existing.name;
      seen.set(key, {
        ...existing,
        name: cleanName,
        domain_id: d.domain_id !== undefined ? d.domain_id : existing.domain_id,
        domain_name: d.domain_name || existing.domain_name,
        code: d.code || existing.code,
      });
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
  const isCreator = Boolean(currentUser && String(contact.created_by_user_id) === String(currentUser.id));
  const isExternal = contact.contact_type === 'external';

  const officialMobiles = (contact.mobiles || []).filter(Boolean);

  if (isExternal) {
    officialMobiles.forEach((m) => {
      list.push({
        phone: m,
        type: 'external',
        label: 'تلفن همراه',
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
  if (currentUser && contact.personal_mobiles) {
    let personalMap: Record<string | number, string[]> = {};
    if (typeof contact.personal_mobiles === 'string') {
      try {
        personalMap = JSON.parse(contact.personal_mobiles);
      } catch {}
    } else if (typeof contact.personal_mobiles === 'object') {
      personalMap = contact.personal_mobiles;
    }

    const currentIdStr = String(currentUser.id);
    const currentIdNum = Number(currentUser.id);
    const personalList =
      (personalMap && (personalMap[currentIdStr] || personalMap[currentIdNum])) || [];

    if (Array.isArray(personalList)) {
      personalList.forEach((m) => {
        if (!m || typeof m !== 'string' || !m.trim()) return;
        const norm = normalizePhoneNumber(m);
        // Avoid duplicate display if already in list
        if (!list.some((item) => normalizePhoneNumber(item.phone) === norm)) {
          list.push({
            phone: m.trim(),
            type: 'personal_overlay',
            label: 'شماره همراه در دفترچه شخصی شما',
            isPersonal: true,
          });
        }
      });
    }
  }

  return list;
}
