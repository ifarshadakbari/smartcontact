import { Contact, User } from '../types';

/**
 * Returns a readable Persian label indicating who created the contact.
 */
export function getContactCreatorLabel(contact: Contact, currentUser: User | null): string {
  if (currentUser && contact.created_by_user_id && String(contact.created_by_user_id) === String(currentUser.id)) {
    return 'شما';
  }
  if (contact.created_by_user_name && contact.created_by_user_name.trim().length > 0) {
    return contact.created_by_user_name.trim();
  }
  if (contact.created_by_user_id) {
    return `کاربر کد ${contact.created_by_user_id}`;
  }
  return 'سیستم';
}
