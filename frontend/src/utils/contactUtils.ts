import { Contact } from '../types';

/**
 * دریافت نام کاربری یا نام شخص ثبت‌کننده مخاطب برای نمایش در پنل ادمین
 */
export function getContactCreatorLabel(contact?: Contact | null, allContacts?: Contact[]): string {
  if (!contact) return '';

  // تلاش برای یافتن نام کاربر از روی شناسه ثبت‌کننده در میان مخاطبین سازمانی
  if (contact.created_by_user_id && allContacts && allContacts.length > 0) {
    const matched = allContacts.find(
      (c) =>
        String(c.id) === String(contact.created_by_user_id) ||
        (c.has_ldap_account && c.ldap_username && String(c.id) === String(contact.created_by_user_id))
    );
    if (matched) {
      if (matched.ldap_username) return matched.ldap_username;
      const fullName = [matched.first_name, matched.last_name].filter(Boolean).join(' ').trim();
      if (fullName && fullName !== '-') return fullName;
    }
  }

  if (contact.created_by_user_id) {
    return `کاربر #${contact.created_by_user_id}`;
  }

  return 'کاربر سازمانی';
}

