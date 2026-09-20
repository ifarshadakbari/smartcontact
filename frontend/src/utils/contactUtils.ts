import { Contact, User } from '../types';

/**
 * دریافت نام کاربری یا نام شخص ثبت‌کننده مخاطب برای نمایش در پنل ادمین
 */
export function getContactCreatorLabel(
  contact?: Contact | null,
  currentUserOrContacts?: User | Contact[] | null,
  currentUser?: User | null
): string {
  if (!contact) return '';

  const user: User | null =
    currentUser ||
    (currentUserOrContacts && typeof currentUserOrContacts === 'object' && 'role' in currentUserOrContacts
      ? (currentUserOrContacts as User)
      : null);

  // ۱. اگر کاربر جاری همان ثبت‌کننده باشد
  if (user && contact.created_by_user_id && String(user.id) === String(contact.created_by_user_id)) {
    return 'شما';
  }

  // ۲. اولویت اول: استفاده از نام کاربری واقعی ثبت‌کننده دریافت شده از بک‌اند (در صورتی که با نام مخاطب یکسان نباشد)
  if (
    contact.created_by_user_name &&
    contact.created_by_user_name.trim() !== '' &&
    contact.created_by_user_name.trim() !== contact.name.trim()
  ) {
    return contact.created_by_user_name.trim();
  }

  if (contact.created_by_user_name && contact.created_by_user_name.trim() !== '') {
    return contact.created_by_user_name.trim();
  }

  // ۳. اگر شناسه کاربر ثبت‌کننده مشخص است
  if (contact.created_by_user_id) {
    return `کاربر #${contact.created_by_user_id}`;
  }

  return 'مدیر سیستم';
}


