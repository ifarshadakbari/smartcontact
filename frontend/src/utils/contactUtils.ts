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

  // ۱. اولویت اول: استفاده از نام کاربری واقعی ثبت‌کننده دریافت شده از بک‌اند
  if (contact.created_by_user_name && contact.created_by_user_name.trim() !== '') {
    return contact.created_by_user_name.trim();
  }

  // شناسایی آبجکت کاربر جاری در صورت ارسال
  const user: User | null =
    currentUser ||
    (currentUserOrContacts && typeof currentUserOrContacts === 'object' && 'role' in currentUserOrContacts
      ? (currentUserOrContacts as User)
      : null);

  // ۲. اولویت دوم: اگر کاربر لاگین‌شده همان فرد ایجادکننده باشد
  if (user && contact.created_by_user_id && String(user.id) === String(contact.created_by_user_id)) {
    return user.username || user.name || 'شما';
  }

  // ۳. اولویت سوم: نمایش شناسه عددی کاربر
  if (contact.created_by_user_id) {
    return `کاربر #${contact.created_by_user_id}`;
  }

  return 'کاربر سازمانی';
}


