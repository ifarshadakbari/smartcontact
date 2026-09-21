import { Contact, User } from '../types';

/**
 * دریافت نام یا نام کاربری شخص ثبت‌کننده مخاطب برای نمایش در جدول و کارت‌های سامانه
 */
export function getContactCreatorLabel(
  contact?: Contact | null,
  currentUserOrContacts?: User | Contact[] | null,
  contactsOrUser?: User | Contact[] | null
): string {
  if (!contact) return '';

  // استخراج کاربر جاری و فهرست کامل مخاطبین از آرگومان‌ها
  let user: User | null = null;
  let allContacts: Contact[] | null = null;

  if (currentUserOrContacts) {
    if (Array.isArray(currentUserOrContacts)) {
      allContacts = currentUserOrContacts;
    } else if (typeof currentUserOrContacts === 'object' && 'role' in currentUserOrContacts) {
      user = currentUserOrContacts as User;
    }
  }

  if (contactsOrUser) {
    if (Array.isArray(contactsOrUser)) {
      allContacts = contactsOrUser;
    } else if (typeof contactsOrUser === 'object' && 'role' in contactsOrUser) {
      user = contactsOrUser as User;
    }
  }

  // ۱. اگر کاربر جاری همان ثبت‌کننده باشد
  if (
    user &&
    user.id != null &&
    contact.created_by_user_id != null &&
    Number(contact.created_by_user_id) !== 0 &&
    String(user.id) === String(contact.created_by_user_id)
  ) {
    return 'شما';
  }

  const contactFullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();

  // ۲. جستجو در فهرست مخاطبین جهت یافتن نام کامل ثبت‌کننده بر اساس ID
  if (allContacts && contact.created_by_user_id && Number(contact.created_by_user_id) !== 0) {
    const creatorContact = allContacts.find(
      (c) =>
        String(c.id) === String(contact.created_by_user_id) &&
        String(c.id) !== String(contact.id)
    );
    if (creatorContact) {
      const creatorName = `${creatorContact.first_name || ''} ${creatorContact.last_name || ''}`.trim();
      if (creatorName) {
        return creatorName;
      }
    }
  }

  // ۳. بررسی نام کاربری ثبت‌کننده دریافتی از سرور بک‌اند
  if (contact.created_by_user_name && contact.created_by_user_name.trim() !== '') {
    const cleanCreatorName = contact.created_by_user_name.trim();

    // تطبیق نام کاربری دریافتی با اشخاص ثبت شده در دفترچه تلفن
    if (allContacts) {
      const matched = allContacts.find(
        (c) =>
          String(c.id) !== String(contact.id) &&
          ((c.ldap_username && c.ldap_username.toLowerCase() === cleanCreatorName.toLowerCase()) ||
            (c.email && c.email.toLowerCase() === cleanCreatorName.toLowerCase()) ||
            `${c.first_name} ${c.last_name}`.trim().toLowerCase() === cleanCreatorName.toLowerCase())
      );
      if (matched) {
        return `${matched.first_name} ${matched.last_name}`.trim();
      }
    }

    // اگر با نام خود این مخاطب اشتباهاً یکی نبود، همان عنوان ثبت‌کننده را نمایش بده
    if (cleanCreatorName !== contactFullName) {
      return cleanCreatorName;
    }
  }

  // ۴. در صورتی که فقط شناسه عددی معتبر وجود دارد
  if (contact.created_by_user_id && Number(contact.created_by_user_id) !== 0) {
    return `کاربر #${contact.created_by_user_id}`;
  }

  return '';
}



