import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Phone,
  Smartphone,
  Mail,
  MapPin,
  Building2,
  Briefcase,
  Copy,
  Check,
  Edit2,
  Trash2,
  Save,
  Star,
  Plus,
  Upload,
  UserCheck,
  Globe,
  Lock,
  Image as ImageIcon,
  PhoneCall,
  Network,
  Shield,
  AlertCircle,
  BookmarkCheck,
  Sparkles,
  Radio,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Contact, LandlineEntry, PrefixTitle, User, Department, LdapDomain } from '../types';
import { Avatar } from './Avatar';
import { CordlessPhoneIcon } from './CordlessPhoneIcon';
import { resizeAvatarImage, getBase64SizeInKb } from '../utils/imageUtils';
import {
  getVisibleMobiles,
  normalizePhoneNumber,
  getDomainDisplayName,
  formatIranianMobile,
  isValidIranianMobile,
  normalizeSearchText,
  isWirelessLine,
  deduplicateDepartments,
} from '../utils/phoneUtils';

interface ContactModalProps {
  contact: Contact | null;
  allContacts?: Contact[];
  isOpen: boolean;
  isCreateMode?: boolean;
  initialContactType?: 'internal' | 'external';
  initialCompanyName?: string;
  currentUser: User | null;
  departments?: Department[];
  ldapDomains?: LdapDomain[];
  onClose: () => void;
  onSave: (contact: Contact) => Promise<void> | void;
  onDelete?: (id: number | string) => void;
  onToggleFavorite?: (id: number | string) => void;
  onInitiateCall?: (targetNumber: string, contact: Contact, title?: string) => void;
  onRequireLoginForCall?: () => void;
  onSelectContact?: (contact: Contact) => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  contact,
  allContacts = [],
  isOpen,
  isCreateMode = false,
  initialContactType,
  initialCompanyName,
  currentUser,
  departments,
  ldapDomains = [],
  onClose,
  onSave,
  onDelete,
  onToggleFavorite,
  onInitiateCall,
  onRequireLoginForCall,
  onSelectContact,
}) => {
  const isAdmin = currentUser ? currentUser.role === 'admin' : false;
  const isOwner = contact && currentUser ? String(contact.created_by_user_id) === String(currentUser.id) : false;
  // مخاطبینی که ثبت‌کننده مشخص ندارند (مانند مخاطبین سیستمی/LDAP/نمونه اولیه)، توسط ادمین یا کاربر واردشده قابل ویرایش هستند
  const isSystemContact = !contact?.created_by_user_id;
  const canEdit = isCreateMode
    ? Boolean(currentUser)
    : Boolean(currentUser && (isAdmin || isOwner || isSystemContact));
  const canDelete = !isCreateMode && Boolean(currentUser && (isAdmin || isOwner));
  const canEditPersonnelCode = isCreateMode ? true : (isAdmin || isOwner || isSystemContact);

  const effectiveDepartments =
    departments && departments.length > 0
      ? deduplicateDepartments(departments.filter((d) => d.id !== 'all'))
      : [];

  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  const [contactType, setContactType] = useState<'internal' | 'external'>('internal');
  const [domainId, setDomainId] = useState<string>(ldapDomains[0]?.id || '');
  const [companyName, setCompanyName] = useState<string>('');
  const [hasLdapAccount, setHasLdapAccount] = useState<boolean>(true);
  const [ldapUsername, setLdapUsername] = useState<string>('');

  const [prefixTitle, setPrefixTitle] = useState<PrefixTitle>('mr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [mobiles, setMobiles] = useState<string[]>(['']);
  const [isMobilePublic, setIsMobilePublic] = useState(false);
  const [landlines, setLandlines] = useState<LandlineEntry[]>([
    { id: '1', phone: '', extension: '', title: '' },
  ]);
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [personnelCode, setPersonnelCode] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(() => Boolean(contact?.is_favorite));

  // Personal Overlay Form State (Detail View)
  const [showPersonalOverlayForm, setShowPersonalOverlayForm] = useState(false);
  const [newPersonalMobile, setNewPersonalMobile] = useState('');
  const [personalOverlayError, setPersonalOverlayError] = useState<string | null>(null);
  const [personalOverlaySuccess, setPersonalOverlaySuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValidationError(null);
    setAvatarError(null);
    setIsProcessingAvatar(false);
    setIsDraggingAvatar(false);
    setPersonalOverlayError(null);
    setPersonalOverlaySuccess(null);
    setShowPersonalOverlayForm(false);
    setNewPersonalMobile('');

    if (contact) {
      setContactType(contact.contact_type || 'internal');
      const foundDom = ldapDomains.find(
        (d) =>
          (contact.domain_id !== undefined && contact.domain_id !== null && contact.domain_id !== '' && String(d.id) === String(contact.domain_id)) ||
          (contact.domain && (String(d.id) === String(contact.domain) || d.name?.toLowerCase() === String(contact.domain).toLowerCase())) ||
          (contact.domain_name && (d.name?.toLowerCase() === String(contact.domain_name).toLowerCase() || d.display_name === contact.domain_name))
      );
      setDomainId(foundDom ? String(foundDom.id) : (contact.domain_id ? String(contact.domain_id) : (contact.domain ? String(contact.domain) : (ldapDomains[0]?.id ? String(ldapDomains[0].id) : ''))));
      setCompanyName(contact.company_name || '');
      setHasLdapAccount(contact.has_ldap_account ?? true);
      setLdapUsername(contact.ldap_username || '');

      setPrefixTitle(contact.prefix_title || 'mr');
      setFirstName(contact.first_name || '');
      const initialLastName = (contact.prefix_title === 'location' && contact.last_name === '-') ? '' : (contact.last_name || '');
      setLastName(initialLastName);
      setJobTitle(contact.job_title || '');
      setDepartment(contact.department || '');
      setLocation(contact.location || '');
      setMobiles(contact.mobiles && contact.mobiles.length > 0 ? contact.mobiles : ['']);
      setIsMobilePublic(contact.is_mobile_public ?? false);

      const normalizedLandlines: LandlineEntry[] =
        contact.landlines && contact.landlines.length > 0
          ? contact.landlines.map((l: any, idx: number) => {
              let phone = String(l?.phone || '').trim();
              let extension = String(l?.extension || '').trim();
              if (!phone && !extension && l?.number) {
                const num = String(l.number).trim();
                if (num.length <= 4 && !num.startsWith('0')) {
                  extension = num;
                } else {
                  phone = num;
                }
              }
              return {
                id: String(l?.id || idx + 1),
                phone,
                extension,
                title: l?.title ? String(l.title).trim() : '',
              };
            })
          : [{ id: '1', phone: '', extension: '', title: '' }];
      setLandlines(normalizedLandlines);
      setEmail(contact.email || '');
      setDescription(contact.description || '');
      setAvatar(contact.avatar);
      setPersonnelCode(contact.personnel_code || '');
      setIsPublic(contact.is_public ?? true);
      setIsFavorite(Boolean(contact.is_favorite));
      setIsEditing(isCreateMode);
    } else if (isCreateMode) {
      const defaultType = initialContactType || 'internal';
      setContactType(defaultType);
      setDomainId(ldapDomains[0]?.id || '');
      setCompanyName(initialCompanyName || '');
      setHasLdapAccount(isAdmin ? true : false);
      setLdapUsername('');

      setPrefixTitle('mr');
      setFirstName('');
      setLastName('');
      setJobTitle('');
      setDepartment(defaultType === 'external' ? 'پیمانکار / طرف قرارداد' : (effectiveDepartments[0]?.name || ''));
      setLocation('');
      setMobiles(['']);
      setIsMobilePublic(defaultType === 'external'); // شماره‌های افراد برون‌سازمانی عموماً شماره کاری عمومی است
      setLandlines([{ id: '1', phone: '', extension: '', title: '' }]);
      setEmail('');
      setDescription('');
      setAvatar(undefined);
      setPersonnelCode('');
      setIsPublic(true);
      setIsEditing(true);
    }
  }, [contact, isCreateMode, isAdmin, ldapDomains, initialContactType, initialCompanyName]);

  // List of distinct companies registered across all external contacts
  const existingCompanies = useMemo(() => {
    const map = new Map<string, { count: number; contacts: Contact[] }>();
    allContacts.forEach((c) => {
      if (c.contact_type === 'external' && c.company_name?.trim()) {
        const name = c.company_name.trim();
        const current = map.get(name) || { count: 0, contacts: [] };
        current.count += 1;
        current.contacts.push(c);
        map.set(name, current);
      }
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        contacts: data.contacts,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allContacts]);

  const [showCompanyPeeker, setShowCompanyPeeker] = useState(false);

  // Check if entered companyName matches any existing registered company
  const matchingCompany = useMemo(() => {
    if (!companyName.trim()) return null;
    const norm = normalizeSearchText(companyName);
    return existingCompanies.find((c) => normalizeSearchText(c.name) === norm) || null;
  }, [existingCompanies, companyName]);

  // In view mode: find other contacts registered for this same company
  const otherCompanyContacts = useMemo(() => {
    if (!contact || contact.contact_type !== 'external' || !contact.company_name) return [];
    const norm = normalizeSearchText(contact.company_name);
    return allContacts.filter(
      (c) =>
        c.id !== contact.id &&
        c.contact_type === 'external' &&
        c.company_name &&
        normalizeSearchText(c.company_name) === norm
    );
  }, [allContacts, contact]);

  if (!isOpen) return null;

  const handleCallClick = (targetNumber: string, title?: string) => {
    if (!currentUser) {
      if (onRequireLoginForCall) onRequireLoginForCall();
      return;
    }
    if (onInitiateCall && contact) {
      onInitiateCall(targetNumber, contact, title);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleToggleFavoriteInModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!contact || !onToggleFavorite) return;
    setIsFavorite((prev) => !prev);
    onToggleFavorite(contact.id);
  };

  // Avatar Upload & Optimization Handlers (Client-side Resize to max 300x300 JPEG Base64)
  const processAvatarFile = async (file: File) => {
    setAvatarError(null);
    setIsProcessingAvatar(true);
    try {
      const compressedDataUrl = await resizeAvatarImage(file, { maxSize: 300, quality: 0.85 });
      setAvatar(compressedDataUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در بهینه‌سازی و ذخیره تصویر آواتار.';
      setAvatarError(msg);
    } finally {
      setIsProcessingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAvatarFile(file);
    }
  };

  // Mobile Handlers
  const handleAddMobile = () => {
    setMobiles([...mobiles, '']);
  };

  const handleUpdateMobile = (index: number, val: string) => {
    const updated = [...mobiles];
    updated[index] = val;
    setMobiles(updated);
  };

  const handleRemoveMobile = (index: number) => {
    if (mobiles.length === 1) {
      setMobiles(['']);
    } else {
      setMobiles(mobiles.filter((_, i) => i !== index));
    }
  };

  // Landline Handlers
  const handleAddLandline = () => {
    setLandlines([
      ...landlines,
      { id: String(Date.now()), phone: '', extension: '', title: '' },
    ]);
  };

  const handleUpdateLandline = (
    index: number,
    field: keyof LandlineEntry,
    val: string
  ) => {
    const updated = [...landlines];
    updated[index] = { ...updated[index], [field]: val };
    setLandlines(updated);
  };

  const handleRemoveLandline = (index: number) => {
    if (landlines.length === 1) {
      setLandlines([{ id: '1', phone: '', extension: '', title: '' }]);
    } else {
      setLandlines(landlines.filter((_, i) => i !== index));
    }
  };

  // Personal Overlay Handlers (راهکار ترکیبی: ثبت شماره همراه اختصاصی روی شناسنامه مخاطب)
  const handleSavePersonalMobile = (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalOverlayError(null);
    setPersonalOverlaySuccess(null);

    if (!currentUser || !contact) return;

    const formattedNumber = formatIranianMobile(newPersonalMobile.trim());
    if (!formattedNumber) {
      setPersonalOverlayError('لطفاً یک شماره همراه وارد نمایید.');
      return;
    }

    // بررسی فرمت معتبر ۱۱ رقمی همراه
    if (!isValidIranianMobile(newPersonalMobile.trim())) {
      setPersonalOverlayError('شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.');
      return;
    }

    const normalizedToCompare = normalizePhoneNumber(formattedNumber);

    // بررسی تکرار با شماره‌های عمومی رسمی این پرسنل
    if (contact.mobiles && contact.mobiles.some((m) => normalizePhoneNumber(m) === normalizedToCompare)) {
      setPersonalOverlayError('این شماره همراه هم‌اکنون به عنوان شماره عمومی در دسترس است و نیازی به افزودن به دفترچه شخصی نیست.');
      return;
    }

    // بررسی تکرار در دفترچه شخصی همین کاربر
    const existingPersonal = contact.personal_mobiles?.[currentUser.id] || [];
    if (existingPersonal.some((p) => normalizePhoneNumber(p) === normalizedToCompare)) {
      setPersonalOverlayError('این شماره همراه قبلاً در دفترچه شخصی شما برای این مخاطب ذخیره شده است.');
      return;
    }

    const updatedPersonalList = [...existingPersonal, formattedNumber];
    const updatedContact: Contact = {
      ...contact,
      personal_mobiles: {
        ...(contact.personal_mobiles || {}),
        [currentUser.id]: updatedPersonalList,
      },
    };

    onSave(updatedContact);
    setNewPersonalMobile('');
    setPersonalOverlaySuccess(`شماره «${formattedNumber}» با موفقیت در دفترچه شخصی شما ذخیره شد و فقط برای حساب کاربری شما نمایش داده می‌شود.`);
    setShowPersonalOverlayForm(false);
  };

  const handleRemovePersonalMobile = (phoneToRemove: string) => {
    if (!currentUser || !contact) return;
    const cleanToRemove = normalizePhoneNumber(phoneToRemove);
    const existingPersonal = contact.personal_mobiles?.[currentUser.id] || [];
    const updatedPersonalList = existingPersonal.filter(
      (p) => normalizePhoneNumber(p) !== cleanToRemove
    );

    const updatedContact: Contact = {
      ...contact,
      personal_mobiles: {
        ...(contact.personal_mobiles || {}),
        [currentUser.id]: updatedPersonalList,
      },
    };

    onSave(updatedContact);
    setPersonalOverlaySuccess(`شماره «${phoneToRemove}» از دفترچه تلفن شخصی شما حذف گردید.`);
  };

  // Form Submit with Strict Validation:
  // * Required: prefix_title, first_name, last_name
  // ** Personnel Code: Mandatory & strictly 5 digits for internal staff + Duplication Prevention
  // *** One of: at least one mobile OR at least one landline (phone or extension)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setValidationError(null);

    try {
      // بررسی مجوز ویرایش مخاطب
      if (!canEdit) {
        setValidationError(
          currentUser
            ? 'شما فقط مجاز به ویرایش مخاطبینی هستید که خودتان در سامانه ثبت کرده‌اید.'
            : 'برای ویرایش مخاطب لطفاً ابتدا وارد حساب کاربری خود شوید.'
        );
        modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const rawFirstName = String(firstName || '').trim();
      const rawLastName = String(lastName || '').trim();

      // * Check Required Fields
      const isLocationContact = prefixTitle === 'location';
      if (isLocationContact) {
        if (!rawFirstName) {
          setValidationError('لطفاً عنوان یا نام مکان را وارد نمایید.');
          modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } else {
        if (!rawFirstName || !rawLastName) {
          setValidationError('لطفاً نام و نام خانوادگی را وارد نمایید.');
          modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      // ** Personnel code check: Only validate and update if user has permission to edit personnel code
      const cleanPersonnelCode = canEditPersonnelCode
        ? normalizePhoneNumber(String(personnelCode || '').trim())
        : String(contact?.personnel_code || '');

      if (canEditPersonnelCode && contactType === 'internal' && cleanPersonnelCode) {
        if (allContacts && allContacts.length > 0) {
          const isDuplicate = allContacts.some(
            (c) =>
              String(c.id) !== String(contact?.id) &&
              c.contact_type === 'internal' &&
              c.personnel_code &&
              normalizePhoneNumber(String(c.personnel_code).trim()).toLowerCase() === cleanPersonnelCode.toLowerCase()
          );
          if (isDuplicate) {
            setValidationError(
              `کد پرسنلی «${cleanPersonnelCode}» قبلاً برای پرسنل دیگری ثبت گردیده است. لطفاً کد پرسنلی یکتا وارد نمایید.`
            );
            modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
        }
      }

      // Filter non-empty mobiles and landlines (automatically normalizing Iranian mobile format)
      const validMobiles = (mobiles || [])
        .map((m) => {
          const trimmed = String(m || '').trim();
          return isValidIranianMobile(trimmed) ? formatIranianMobile(trimmed) : trimmed;
        })
        .filter(Boolean);

      const validLandlines = (landlines || [])
        .map((l: any, idx: number) => ({
          id: String(l?.id || idx + 1),
          phone: String(l?.phone || l?.number || '').trim(),
          extension: String(l?.extension || '').trim(),
          title: l?.title ? String(l.title).trim() : undefined,
        }))
        .filter((l) => l.phone !== '' || l.extension !== '');

      // *** Check: At least one mobile OR at least one landline required
      if (validMobiles.length === 0 && validLandlines.length === 0) {
        setValidationError(
          'ثبت حداقل یکی از موارد «شماره همراه» یا «خط تلفن ثابت و داخلی» الزامی می‌باشد.'
        );
        modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const matchedDomain = ldapDomains.find(
        (d) =>
          String(d.id) === String(domainId) ||
          d.name?.toLowerCase() === String(domainId).toLowerCase() ||
          d.display_name === domainId
      );
      const resolvedDomain = matchedDomain ? (matchedDomain.name || String(matchedDomain.id)) : (domainId || undefined);
      const resolvedDomainId = matchedDomain ? String(matchedDomain.id) : (domainId || undefined);
      const resolvedDomainName = matchedDomain
        ? (matchedDomain.display_name || matchedDomain.name)
        : undefined;

      const payload: Contact = {
        ...(contact || {}),
        id: contact?.id || Date.now(),
        contact_type: contactType,
        domain: contactType === 'internal' ? resolvedDomain : undefined,
        domain_id: contactType === 'internal' ? resolvedDomainId : undefined,
        domain_name: contactType === 'internal' ? resolvedDomainName : undefined,
        company_name: contactType === 'external' ? String(companyName || '').trim() : undefined,
        has_ldap_account:
          contactType === 'internal'
            ? (isAdmin ? hasLdapAccount : (isCreateMode ? false : (contact?.has_ldap_account ?? false)))
            : false,
        ldap_username: contactType === 'internal' && hasLdapAccount ? (String(ldapUsername || '').trim() || undefined) : undefined,
        personnel_code: contactType === 'internal' ? cleanPersonnelCode : (cleanPersonnelCode || undefined),
        prefix_title: prefixTitle,
        first_name: rawFirstName,
        last_name: prefixTitle === 'location' ? (rawLastName || '-') : rawLastName,
        job_title: String(jobTitle || '').trim() || undefined,
        department: department || 'سایر',
        location: String(location || '').trim() || undefined,
        mobiles: validMobiles,
        is_mobile_public: contactType === 'internal' ? isMobilePublic : true,
        personal_mobiles: contact?.personal_mobiles || {},
        landlines: validLandlines,
        email: String(email || '').trim() || undefined,
        description: String(description || '').trim() || undefined,
        avatar,
        is_favorite: isFavorite,
        created_by_user_id: contact?.created_by_user_id ?? (currentUser?.id || 1),
        created_by_user_name: contact?.created_by_user_name ?? (currentUser?.name || 'مدیر سیستم'),
        is_public: isPublic,
      };

      setIsSaving(true);
      try {
        await onSave(payload);
        setIsEditing(false);
      } catch (err: any) {
        console.error('Error in onSave inside ContactModal:', err);
        setValidationError(err?.message || 'خطا در ذخیره اطلاعات مخاطب');
        modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setIsSaving(false);
      }
    } catch (unexpectedErr: any) {
      console.error('Unexpected error in ContactModal handleSubmit:', unexpectedErr);
      setValidationError(unexpectedErr?.message || 'خطای سیستمی در پردازش اطلاعات فرم.');
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setIsSaving(false);
    }
  };

  const prefixText = prefixTitle === 'ms' ? 'خانم' : prefixTitle === 'location' ? '' : 'آقای';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-2xl sm:max-w-3xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <Avatar
              src={avatar}
              prefix={prefixTitle}
              name={`${firstName} ${lastName}`}
              size="md"
            />
            <div>
              <div className="flex items-center gap-1.5">
                {prefixText && (
                  <span className="text-xs font-semibold text-neutral-500">
                    {prefixText}
                  </span>
                )}
                <h2 className="text-base font-bold text-neutral-900">
                  {isCreateMode
                    ? (prefixTitle === 'location' ? 'افزودن موقعیت و مکان سازمانی' : 'افزودن پرسنل جدید')
                    : `${firstName || ''} ${lastName || ''}`}
                </h2>
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                {jobTitle || 'شناسنامه پرسنلی و اطلاعات تماس سازمانی'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isCreateMode && !isEditing && onToggleFavorite && contact && (
              <button
                type="button"
                id="modal-favorite-toggle-btn"
                onClick={handleToggleFavoriteInModal}
                className={`p-2 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center ${
                  isFavorite
                    ? 'text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-700'
                    : 'text-neutral-400 hover:text-blue-600 hover:bg-neutral-100'
                }`}
                title={isFavorite ? 'حذف از نشان‌شده‌ها' : 'افزودن به نشان‌شده‌ها'}
              >
                <Star
                  className={`w-4 h-4 transition-transform active:scale-90 ${
                    isFavorite
                      ? 'fill-blue-600 text-blue-600'
                      : 'stroke-[1.75]'
                  }`}
                />
              </button>
            )}

            {!isCreateMode && canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer text-xs flex items-center gap-1 border border-neutral-200"
                title="ویرایش مشخصات"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEditing ? 'انصراف' : 'ویرایش'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div ref={modalBodyRef} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {validationError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {validationError}
            </div>
          )}

          {isEditing ? (
            /* Edit / Create Form */
            <form id="contact-form" noValidate onSubmit={handleSubmit} className="space-y-5">
              {/* Avatar Upload & Title Section */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row items-center gap-5">
                <div className="flex flex-col items-center gap-2">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingAvatar(true);
                    }}
                    onDragLeave={() => setIsDraggingAvatar(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingAvatar(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processAvatarFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative group cursor-pointer rounded-2xl p-1 transition-all border-2 ${
                      isDraggingAvatar
                        ? 'border-blue-500 bg-blue-50/60 scale-105 shadow-sm'
                        : 'border-dashed border-neutral-300 hover:border-blue-400 bg-white'
                    }`}
                    title="برای انتخاب تصویر کلیک کنید یا عکس را به اینجا بکشید و رها کنید (Drag & Drop)"
                  >
                    <Avatar
                      src={avatar}
                      prefix={prefixTitle}
                      size="xl"
                    />
                    {isProcessingAvatar && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                        <span className="text-[9px] mt-1 font-medium">بهینه‌سازی...</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  <span className="text-[10px] text-neutral-400">
                    کلیک یا کشیدن و رها کردن عکس
                  </span>
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      عکس پرسنلی (آواتار)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessingAvatar}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isProcessingAvatar ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                            <span>در حال فشرده‌سازی...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-neutral-500" />
                            <span>آپلود تصویر پرسنل</span>
                          </>
                        )}
                      </button>
                      {avatar && (
                        <>
                          <span
                            className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium"
                            title="حجم تصویر پس از تغییر ابعاد و فشرده‌سازی خودکار"
                          >
                            حجم بهینه‌شده: {getBase64SizeInKb(avatar)} کیلوبایت
                          </span>
                          <button
                            type="button"
                            onClick={() => setAvatar(undefined)}
                            className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            حذف عکس
                          </button>
                        </>
                      )}
                    </div>
                    {avatarError && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{avatarError}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-neutral-500 mt-1">
                      تصاویر به صورت خودکار به ابعاد ۳۰۰×۳۰۰ تغییر مقیاس یافته و فشرده می‌شوند تا سرعت سامانه و دیتابیس همیشه بهینه بماند.
                    </p>
                  </div>

                  {/* Contact Type: Internal Domain vs External Company */}
                  <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-900 mb-1.5">
                        نوع مخاطب و دامنه سازمانی <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setContactType('internal')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition ${
                            contactType === 'internal'
                              ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                          }`}
                        >
                          <Network className="w-3.5 h-3.5" />
                          <span>افراد درون سازمانی</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactType('external')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition ${
                            contactType === 'external'
                              ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>افراد برون سازمانی</span>
                        </button>
                      </div>
                    </div>

                    {contactType === 'internal' ? (
                      <div className="space-y-2.5 pt-1 border-t border-neutral-200/60">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                            انتخاب دامین سازمانی مربوطه:
                          </label>
                          <select
                            value={domainId}
                            onChange={(e) => setDomainId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-800 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                            dir="rtl"
                          >
                            {ldapDomains.map((dom) => (
                              <option key={dom.id} value={dom.id}>
                                {dom.display_name} ({dom.name})
                              </option>
                            ))}
                          </select>
                        </div>

                        {isAdmin ? (
                          <div className="bg-white p-2.5 rounded-lg border border-neutral-200 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-800">
                              <input
                                type="checkbox"
                                checked={hasLdapAccount}
                                onChange={(e) => setHasLdapAccount(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="font-bold">دارای حساب کاربری در Active Directory / LDAP</span>
                            </label>
                            <p className="text-[10px] text-neutral-500 leading-normal">
                              {hasLdapAccount
                                ? 'کاربر می‌تواند با نام کاربری دامین لاگین کند و شماره‌های شخصی خود را مدیریت یا با دیگران تماس بگیرد.'
                                : 'شماره و مشخصات این فرد بدون داشتن حساب کاربری در دیتابیس ثبت شده و داخلی آن قابل تماس برای دیگران خواهد بود.'}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-neutral-100/80 p-2.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>
                              ثبت در فهرست اطلاعات تماس درون‌سازمانی (تعیین و اتصال حساب کاربری Active Directory منحصراً در اختیارات مدیر سیستم است).
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5 pt-1 border-t border-neutral-200/60">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              نام شرکت یا پیمانکار طرف قرارداد: <span className="text-red-500">*</span>
                            </label>
                            <span className="text-[10px] text-amber-700 font-medium">
                              ثبت آزادانه بدون محدودیت تکراری
                            </span>
                          </div>
                          <input
                            type="text"
                            list="registered-companies-datalist"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="نام شرکت را تایپ کرده یا از شرکت‌های پیشنهادی زیر انتخاب نمایید..."
                            className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-800 focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder:text-neutral-400"
                          />
                          <datalist id="registered-companies-datalist">
                            {existingCompanies.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name} ({c.count} مخاطب و رابط ثبت‌شده)
                              </option>
                            ))}
                          </datalist>
                        </div>

                        {/* Quick-Pick Chips of Existing Registered Companies */}
                        {existingCompanies.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 text-[10px] text-neutral-500 mb-1 font-medium">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>انتخاب سریع از شرکت‌های پیش‌تر ثبت‌شده در سامانه:</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1 bg-neutral-50 rounded-lg border border-neutral-200/70">
                              {existingCompanies.map((comp) => {
                                const isSelected =
                                  normalizeSearchText(companyName) === normalizeSearchText(comp.name);
                                return (
                                  <button
                                    key={comp.name}
                                    type="button"
                                    onClick={() => setCompanyName(comp.name)}
                                    className={`text-[11px] px-2.5 py-0.5 rounded-md border transition cursor-pointer flex items-center gap-1.5 ${
                                      isSelected
                                        ? 'bg-amber-600 text-white border-amber-700 font-bold shadow-2xs'
                                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-amber-50 hover:border-amber-300'
                                    }`}
                                    title={`کلیک برای درج خودکار «${comp.name}»`}
                                  >
                                    <Building2 className="w-2.5 h-2.5 opacity-70" />
                                    <span>{comp.name}</span>
                                    <span
                                      className={`text-[9px] px-1 py-0.2 rounded-full ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                                      }`}
                                    >
                                      {comp.count} رابط
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Soft Awareness: Informs about existing contacts of this company without blocking */}
                        {matchingCompany ? (
                          <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-950 space-y-1.5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-medium text-[11px] text-amber-900">
                                <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>
                                  قبلاً <strong>{matchingCompany.count} مخاطب و رابط</strong> برای شرکت «{matchingCompany.name}» در سامانه ثبت شده است.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowCompanyPeeker(!showCompanyPeeker)}
                                className="text-[10px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer shrink-0 mr-2"
                              >
                                {showCompanyPeeker ? 'بستن فهرست' : 'مشاهده رابط‌های قبلی'}
                              </button>
                            </div>

                            {showCompanyPeeker && (
                              <div className="space-y-1 max-h-36 overflow-y-auto border-t border-amber-200/70 pt-2">
                                <div className="text-[10px] text-amber-800 font-semibold mb-1">
                                  رابط‌های ثبت‌شده این شرکت جهت اطلاع:
                                </div>
                                {matchingCompany.contacts.map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between bg-white/90 p-1.5 rounded border border-amber-200/60 text-[11px]"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-neutral-800">
                                        {c.first_name} {c.last_name}
                                      </span>
                                      {c.job_title && (
                                        <span className="text-neutral-500 text-[10px]">
                                          ({c.job_title})
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-neutral-600 text-[10px] font-mono" dir="ltr">
                                      {c.mobiles?.[0] && <span>📱 {c.mobiles[0]}</span>}
                                      {c.landlines?.[0]?.extension && <span>☎ داخلی {c.landlines[0].extension}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : companyName.trim() ? (
                          <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>این نام به عنوان یک شرکت جدید در سامانه ثبت خواهد شد.</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Title / Prefix (* Required) */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-900 mb-1.5">
                      عنوان سازمانی <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition text-xs ${
                          prefixTitle === 'mr'
                            ? 'bg-neutral-900 text-white border-neutral-900 font-bold'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="prefixTitle"
                          value="mr"
                          checked={prefixTitle === 'mr'}
                          onChange={() => setPrefixTitle('mr')}
                          className="sr-only"
                        />
                        <span>آقای</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition text-xs ${
                          prefixTitle === 'ms'
                            ? 'bg-neutral-900 text-white border-neutral-900 font-bold'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="prefixTitle"
                          value="ms"
                          checked={prefixTitle === 'ms'}
                          onChange={() => setPrefixTitle('ms')}
                          className="sr-only"
                        />
                        <span>خانم</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition text-xs ${
                          prefixTitle === 'location'
                            ? 'bg-neutral-900 text-white border-neutral-900 font-bold'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="prefixTitle"
                          value="location"
                          checked={prefixTitle === 'location'}
                          onChange={() => setPrefixTitle('location')}
                          className="sr-only"
                        />
                        <MapPin className="w-3.5 h-3.5" />
                        <span>بدون عنوان (مکانی)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name Fields (* Required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-900 mb-1">
                    {prefixTitle === 'location' ? 'نام یا عنوان مکان' : 'نام'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    placeholder={prefixTitle === 'location' ? 'اتاق سرور، سالن جلسات، ...' : 'نام'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-900 mb-1">
                    {prefixTitle === 'location' ? 'توضیح تکمیلی عنوان (اختیاری)' : 'نام خانوادگی'} {prefixTitle !== 'location' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={prefixTitle !== 'location'}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    placeholder={prefixTitle === 'location' ? 'طبقه، واحد یا موقعیت (اختیاری)' : 'نام خانوادگی'}
                  />
                </div>
              </div>

              {/* Job Title & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    سمت سازمانی
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    placeholder="عنوان سمت یا جایگاه شغلی"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-700">
                      واحد سازمانی / دپارتمان
                    </label>
                    <span className="text-[10px] text-blue-600 font-medium">
                      امکان تایپ آزاد یا انتخاب
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      list="department-suggestions-list"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="نام واحد را تایپ کرده یا از لیست انتخاب کنید..."
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <datalist id="department-suggestions-list">
                      {effectiveDepartments.map((d) => (
                        <option key={d.id} value={d.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Quick Select Chips */}
                  <div className="flex items-center gap-1 mt-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    <span className="text-[10px] text-neutral-400 shrink-0">پیشنهادات:</span>
                    {effectiveDepartments.slice(0, 4).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDepartment(d.name)}
                        className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer whitespace-nowrap ${
                          department === d.name
                            ? 'bg-neutral-900 text-white font-bold'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200'
                        }`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Location & Personnel Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    موقعیت (ساختمان، طبقه، اتاق)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    placeholder="ساختمان، طبقه، شماره اتاق"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-700">
                      کد پرسنلی{' '}
                      {contactType === 'internal' && prefixTitle !== 'location' ? (
                        <span className="text-red-500 font-bold">* (الزامی)</span>
                      ) : (
                        <span className="text-neutral-400 font-normal">(اختیاری)</span>
                      )}
                    </label>
                    {!canEditPersonnelCode && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        فقط مدیر یا ثبت‌کننده
                      </span>
                    )}
                  </div>
                  {canEditPersonnelCode ? (
                    <>
                      <input
                        type="text"
                        value={personnelCode}
                        onChange={(e) => setPersonnelCode(e.target.value)}
                        className={`w-full px-3 py-2 bg-white border rounded-lg text-neutral-900 text-xs focus:ring-2 focus:outline-none font-mono ${
                          contactType === 'internal' && prefixTitle !== 'location' && !personnelCode.trim()
                            ? 'border-amber-400 focus:ring-amber-500 bg-amber-50/20'
                            : 'border-neutral-300 focus:ring-blue-600'
                        }`}
                        placeholder="کد پرسنلی"
                        dir="ltr"
                      />
                      {contactType === 'internal' && prefixTitle !== 'location' && (
                        <p className="text-[10px] text-neutral-500 mt-1">
                          کد پرسنلی یکتا برای پرسنل درون‌سازمانی
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={personnelCode ? '••••••' : ''}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-500 text-xs cursor-not-allowed font-mono"
                        placeholder="غیرقابل ویرایش"
                        title="تنها مدیر سیستم و کاربر ثبت‌کننده این مخاطب امکان ویرایش کد پرسنلی را دارند."
                        dir="ltr"
                      />
                      <p className="text-[10px] text-neutral-400 mt-1">
                        ویرایش کد پرسنلی فقط برای مدیر سیستم و ثبت‌کننده این مخاطب مجاز است.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* SECTION: ** خط تلفن ثابت + داخلی (امکان افزودن چند مورد) */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-neutral-900">
                      خط تلفن ثابت و شماره داخلی
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium">**</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLandline}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن خط تلفن ثابت دیگر</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {landlines.map((landline, idx) => (
                    <div
                      key={landline.id || idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded-lg border border-neutral-200 items-center"
                    >
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] text-neutral-500 mb-0.5">
                          خط تلفن ثابت
                        </label>
                        <input
                          type="text"
                          value={landline.phone || ''}
                          onChange={(e) => handleUpdateLandline(idx, 'phone', e.target.value)}
                          placeholder="شماره مستقیم"
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          dir="ltr"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-neutral-500 mb-0.5">
                          شماره داخلی
                        </label>
                        <input
                          type="text"
                          value={landline.extension || ''}
                          onChange={(e) => handleUpdateLandline(idx, 'extension', e.target.value)}
                          placeholder="داخلی"
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs font-mono font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          dir="ltr"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block text-[10px] text-neutral-500">
                            عنوان خط (اختیاری)
                          </label>
                          {isWirelessLine(landline.title) ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-sky-700 bg-sky-100 px-1 py-0.2 rounded border border-sky-300">
                              <CordlessPhoneIcon className="w-3 h-3 text-sky-600 animate-pulse" />
                              <span>بی‌سیم</span>
                            </span>
                          ) : !landline.title ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateLandline(idx, 'title', 'بی‌سیم')}
                              className="inline-flex items-center gap-1 text-[9px] text-neutral-400 hover:text-sky-700 cursor-pointer transition font-medium"
                              title="درج خودکار عنوان بی‌سیم"
                            >
                              <CordlessPhoneIcon className="w-3 h-3 text-sky-600" />
                              <span>درج سریع: بی‌سیم</span>
                            </button>
                          ) : null}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={landline.title || ''}
                            onChange={(e) => handleUpdateLandline(idx, 'title', e.target.value)}
                            placeholder="مثال: بی‌سیم، میز کاری"
                            className={`w-full px-2.5 py-1.5 border rounded text-xs text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                              isWirelessLine(landline.title)
                                ? 'border-sky-300 bg-sky-50/40 text-sky-900 pl-7'
                                : 'border-neutral-300'
                            }`}
                          />
                          {isWirelessLine(landline.title) && (
                            <CordlessPhoneIcon className="w-3.5 h-3.5 text-sky-600 absolute left-2 top-2 pointer-events-none" />
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-1 text-center pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveLandline(idx)}
                          className="text-neutral-400 hover:text-red-600 transition p-1 cursor-pointer"
                          title="حذف این خط"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: ** شماره همراه (امکان افزودن چند مورد) */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-neutral-900">
                      شماره همراه سازمانی / شخصی
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium">**</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMobile}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن شماره همراه دیگر</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {mobiles.map((mob, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white p-2 rounded-lg border border-neutral-200"
                    >
                      <input
                        type="text"
                        value={mob}
                        onChange={(e) => handleUpdateMobile(idx, e.target.value)}
                        placeholder="09xxxxxxxxx"
                        className="flex-1 px-2.5 py-1.5 border border-neutral-300 rounded text-xs font-mono text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMobile(idx)}
                        className="text-neutral-400 hover:text-red-600 transition p-1 cursor-pointer"
                        title="حذف شماره همراه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {contactType === 'internal' && (
                  <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="isMobilePublicCheckbox"
                      checked={isMobilePublic}
                      onChange={(e) => setIsMobilePublic(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="isMobilePublicCheckbox" className="text-xs text-neutral-800 cursor-pointer">
                      <span className="font-bold block text-neutral-900">
                        شماره همراه رسمی برای تمام پرسنل سازمان عمومی و قابل مشاهده باشد؟
                      </span>
                      <span className="text-[11px] text-neutral-600 block mt-0.5 leading-relaxed">
                        در صورت عدم انتخاب (حالت پیش‌فرض)، شماره همراه این پرسنل محرمانه بوده و سایر همکاران فقط خط ثابت و داخلی را مشاهده خواهند کرد (مگر اینکه آن را در دفترچه شخصی اختصاصی خود ذخیره کنند).
                      </span>
                    </label>
                  </div>
                )}

                <p className="text-[11px] text-neutral-500">
                  توجه: ثبت حداقل یکی از موارد (خط تلفن ثابت و داخلی یا شماره همراه) الزامی است.
                </p>
              </div>

              {/* Email & Description */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  پست الکترونیک (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@company.ir"
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  توضیحات
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="شرح وظایف، ساعات پاسخگویی یا سایر توضیحات اداری..."
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Privacy and Visibility Scope */}
              {isAdmin ? (
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>مخاطب عمومی سازمانی (قابل مشاهده برای تمام پرسنل در سراسر سازمان)</span>
                  </label>
                  <p className="text-[11px] text-neutral-500 mt-1 mr-6 leading-relaxed">
                    در صورت غیرفعال بودن این گزینه، شماره فقط برای ثبت‌کننده و ادمین‌های سیستم قابل رؤیت خواهد بود.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-xs text-blue-950 flex items-start gap-2.5">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">حفظ حریم خصوصی اطلاعات تماس:</span>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                      این شماره به عنوان شماره شخصی شما در سامانه ثبت می‌شود و مطابق قوانین محرمانگی، منحصراً برای شما و ادمین مجاز سیستم قابل مشاهده خواهد بود.
                    </p>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Personnel Identity Banner */}
              <div className="bg-neutral-900 text-white rounded-xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <Avatar
                  src={avatar}
                  prefix={prefixTitle}
                  name={`${firstName} ${lastName}`}
                  size="lg"
                />
                <div className="flex-1 text-center sm:text-right">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    {prefixText && (
                      <span className="text-xs text-neutral-400 font-medium">
                        {prefixText}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-white">
                      {firstName} {lastName}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    {jobTitle || (prefixTitle === 'location' ? 'موقعیت و مکان سازمانی' : 'پرسنل سازمانی')}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5 text-xs">
                    {/* Domain or Company Badge */}
                    {contact?.contact_type === 'external' ? (
                      <span className="bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>برون‌سازمانی: {contact.company_name || 'شرکت طرف قرارداد'}</span>
                      </span>
                    ) : (
                      <span className="bg-blue-600/30 text-blue-200 border border-blue-400/30 px-2.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
                        <Network className="w-3 h-3" />
                        <span>دامین: {contact ? getDomainDisplayName(contact, ldapDomains) : (ldapDomains.find(d => d.id === domainId)?.display_name || 'دامین سازمانی')}</span>
                        {contact?.has_ldap_account === false && (
                          <span className="text-[10px] bg-neutral-800/60 px-1 rounded text-neutral-300 mr-1">
                            تلفن رومیزی در سایت
                          </span>
                        )}
                      </span>
                    )}

                    {department && (
                      <span className="bg-white/10 px-2.5 py-0.5 rounded text-neutral-200 border border-white/10">
                        {department}
                      </span>
                    )}
                    {/* Scope indicator */}
                    {isOwner ? (
                      <span className="bg-blue-600/40 text-blue-200 border border-blue-400/30 px-2.5 py-0.5 rounded text-[11px] font-medium">
                        شماره شخصی شما
                      </span>
                    ) : contact?.is_public ? (
                      <span className="bg-white/10 text-neutral-300 px-2 py-0.5 rounded text-[11px]">
                        عمومی
                      </span>
                    ) : isAdmin ? (
                      <span className="bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded text-[11px]">
                        ثبت: {contact?.created_by_user_name || 'کاربر سازمانی'}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Fixed Lines & Extensions */}
              <div className="border border-neutral-200 rounded-xl p-4 sm:p-5 bg-white space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span>خطوط تلفن ثابت و شماره‌های داخلی</span>
                  </div>
                  {landlines && landlines.length > 0 && (
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {landlines.filter((l) => l.phone || l.extension).length} خط ثبت شده
                    </span>
                  )}
                </div>

                {landlines && landlines.some((l) => l.phone?.trim() || l.extension?.trim()) ? (
                  <div className="space-y-3">
                    {landlines
                      .filter((l) => l.phone?.trim() || l.extension?.trim())
                      .map((l, idx) => (
                      <div
                        key={l.id || idx}
                        className="bg-neutral-50/90 hover:bg-neutral-50 rounded-xl p-4 border border-neutral-200/90 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs"
                      >
                        {/* Information Row: Title Badge, Landline Number, Extension */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                          {l.title && (
                            <span className="text-xs font-bold text-neutral-700 bg-white px-3 py-1 rounded-md border border-neutral-200 shadow-2xs">
                              {l.title}
                            </span>
                          )}

                          {/* Fixed Line Phone Number - Only if registered */}
                          {l.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-neutral-500 font-medium">تلفن ثابت:</span>
                              <a
                                href={`tel:${l.phone}`}
                                className="text-base sm:text-lg font-black text-blue-600 font-mono tracking-wider hover:text-blue-700 hover:underline whitespace-nowrap"
                                dir="ltr"
                              >
                                {l.phone}
                              </a>
                            </div>
                          )}

                          {/* Extension Badge */}
                          {l.extension && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-neutral-500 font-medium">شماره داخلی:</span>
                              <span
                                className={`font-mono px-3 py-1 rounded-md tracking-wider whitespace-nowrap ${
                                  contact?.contact_type !== 'external'
                                    ? 'text-base sm:text-lg font-black text-neutral-900 bg-neutral-200/90'
                                    : 'font-bold text-neutral-900 bg-neutral-200/90 text-xs sm:text-sm'
                                }`}
                                dir="ltr"
                              >
                                {l.extension}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons: Extension Call, Landline Call, Copy */}
                        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap pt-2.5 lg:pt-0 border-t lg:border-t-0 border-neutral-200/60 w-full lg:w-auto justify-end">
                          {l.extension && contact && contact.contact_type !== 'external' && (
                            <button
                              type="button"
                              onClick={() => handleCallClick(l.extension, `داخلی ${l.extension}`)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                              title={currentUser ? "تماس مستقیم با این شماره داخلی از تلفن رومیزی شما" : "برای برقراری تماس لطفاً وارد شوید"}
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تماس با داخلی {l.extension}</span>
                            </button>
                          )}

                          {l.phone && contact && (
                            <button
                              type="button"
                              onClick={() => handleCallClick(l.phone, l.title || 'تلفن ثابت')}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-900 transition cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                              title={currentUser ? "شماره‌گیری از تلفن رومیزی شما (VoIP)" : "برای تماس با VoIP سازمانی وارد شوید"}
                            >
                              <Phone className="w-3.5 h-3.5 text-blue-600" />
                              <span>تماس با خط ثابت</span>
                            </button>
                          )}

                          {l.phone && (
                            <button
                              type="button"
                              onClick={() => handleCopy(l.phone, `modal-phone-${idx}`)}
                              className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 transition cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                              title="کپی شماره تلفن ثابت"
                            >
                              {copiedKey === `modal-phone-${idx}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-[11px] font-bold text-emerald-700">کپی شد</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                                  <span className="text-[11px]">کپی</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400 p-2">خط تلفن ثابتی ثبت نشده است.</div>
                )}
              </div>

              {/* Mobiles Section with Personal Overlay & Organizational Privacy Support */}
              <div className="border border-neutral-200 rounded-xl p-4 sm:p-5 bg-white space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>شماره‌های همراه</span>
                  </div>
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPersonalOverlayForm(!showPersonalOverlayForm);
                        setPersonalOverlayError(null);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showPersonalOverlayForm ? 'بستن فرم' : 'افزودن به دفترچه شخصی شما'}</span>
                    </button>
                  )}
                </div>

                {/* Personal Overlay Feedback Notifications */}
                {personalOverlaySuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{personalOverlaySuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPersonalOverlaySuccess(null)}
                      className="text-emerald-600 hover:text-emerald-900 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Organizational Confidentiality Notice for Internal Staff */}
                {contact && contact.contact_type === 'internal' && !contact.is_mobile_public && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-start gap-2 text-xs text-neutral-600">
                    <Lock className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-neutral-800 block">
                        حفظ حریم خصوصی پرسنل درون‌سازمانی
                      </span>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        شماره همراه رسمی این پرسنل طبق خط‌مشی سازمان محرمانه بوده و تنها خط ثابت و داخلی عمومی است. شماره‌های نمایش داده شده با نشان شخصی، لایه اختصاصی (Personal Overlay) شما هستند.
                      </p>
                    </div>
                  </div>
                )}

                {/* Personal Overlay Form */}
                {showPersonalOverlayForm && currentUser && contact && (
                  <form
                    onSubmit={handleSavePersonalMobile}
                    className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>ثبت شماره همراه در دفترچه تلفن شخصی (Personal Overlay)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      این شماره به عنوان لایه هوشمند اختصاصی روی همین مخاطب ذخیره شده و صرفاً برای حساب کاربری شما نمایش داده خواهد شد.
                    </p>

                    {personalOverlayError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>{personalOverlayError}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newPersonalMobile}
                        onChange={(e) => setNewPersonalMobile(e.target.value)}
                        placeholder="09xxxxxxxxx"
                        className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        dir="ltr"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs whitespace-nowrap"
                        >
                          ذخیره در دفترچه شخصی
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPersonalOverlayForm(false);
                            setPersonalOverlayError(null);
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs rounded-lg transition cursor-pointer"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Visible Mobiles Display */}
                {(() => {
                  const visibleMobiles = contact ? getVisibleMobiles(contact, currentUser) : [];
                  if (visibleMobiles.length > 0) {
                    return (
                      <div className="space-y-2.5">
                        {visibleMobiles.map((mobItem, idx) => (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                              mobItem.isPersonal
                                ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-50'
                                : mobItem.type === 'admin_confidential'
                                ? 'bg-neutral-100/80 border-neutral-300 hover:bg-neutral-100'
                                : 'bg-neutral-50/90 hover:bg-neutral-50 border-neutral-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2.5 font-mono" dir="ltr">
                              <span className={`p-1.5 bg-white rounded-lg border shadow-2xs ${
                                mobItem.isPersonal
                                  ? 'border-amber-300 text-amber-700'
                                  : mobItem.type === 'admin_confidential'
                                  ? 'border-neutral-300 text-neutral-700'
                                  : 'border-neutral-200 text-emerald-600'
                              }`}>
                                <Smartphone className="w-4 h-4" />
                              </span>
                              <a
                                href={`tel:${mobItem.phone}`}
                                className="text-base sm:text-lg font-bold text-neutral-900 hover:text-blue-600 tracking-wider font-mono whitespace-nowrap"
                              >
                                {mobItem.phone}
                              </a>

                              {/* Badges */}
                              {mobItem.isPersonal && (
                                <span className="font-sans text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                                  <Lock className="w-3 h-3 text-amber-800" />
                                  <span>دفترچه شخصی شما (اختصاصی)</span>
                                </span>
                              )}

                              {mobItem.type === 'admin_confidential' && (
                                <span className="font-sans text-[10px] font-bold bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-neutral-300">
                                  <Shield className="w-3 h-3 text-neutral-700" />
                                  <span>محرمانه سازمانی (دسترسی ادمین)</span>
                                </span>
                              )}

                              {mobItem.type === 'public' && contact.contact_type === 'internal' && (
                                <span className="font-sans text-[10px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Globe className="w-3 h-3 text-emerald-700" />
                                  <span>عمومی سازمانی</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 font-sans self-start sm:self-auto shrink-0 flex-wrap">
                              {contact && (
                                <button
                                  type="button"
                                  onClick={() => handleCallClick(mobItem.phone, mobItem.isPersonal ? 'همراه دفترچه شخصی' : 'شماره همراه')}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-700 hover:text-emerald-900 cursor-pointer text-xs font-semibold flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                                  title={currentUser ? "تماس از تلفن رومیزی با شماره همراه" : "برای برقراری تماس با VoIP وارد شوید"}
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>تماس با همراه</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(mobItem.phone, `modal-mob-${idx}`)}
                                className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-700 hover:text-neutral-900 cursor-pointer text-xs font-medium flex items-center gap-1 shadow-2xs whitespace-nowrap"
                              >
                                {copiedKey === `modal-mob-${idx}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-[11px] font-bold text-emerald-700">کپی شد</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                                    <span className="text-[11px]">کپی</span>
                                  </>
                                )}
                              </button>

                              {/* Remove from personal overlay button */}
                              {mobItem.isPersonal && (
                                <button
                                  type="button"
                                  onClick={() => handleRemovePersonalMobile(mobItem.phone)}
                                  className="p-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 hover:text-red-700 rounded-lg cursor-pointer transition"
                                  title="حذف این شماره از دفترچه شخصی شما"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 bg-neutral-50 rounded-lg text-xs text-neutral-500 flex items-center justify-between">
                      <span>شماره همراه عمومی یا شخصی برای این مخاطب ثبت نشده است.</span>
                      {currentUser && !showPersonalOverlayForm && (
                        <button
                          type="button"
                          onClick={() => setShowPersonalOverlayForm(true)}
                          className="text-blue-600 font-semibold hover:underline"
                        >
                          افزودن شماره در دفترچه شخصی
                        </button>
                      )}
                    </div>
                  );
                })()}

                {!currentUser && (
                  <p className="text-[11px] text-neutral-500 pt-1">
                    جهت افزودن شماره اختصاصی این همکار به دفترچه شخصی خود، ابتدا وارد سیستم شوید.
                  </p>
                )}
              </div>

              {/* Location, Email & Description */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-white space-y-3">
                {location && (
                  <div className="flex items-center gap-2 py-1 border-b border-neutral-100 text-xs">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="text-neutral-500">موقعیت استقرار:</span>
                    <span className="font-semibold text-neutral-900">{location}</span>
                  </div>
                )}

                {email && (
                  <div className="flex items-center gap-2 py-1 border-b border-neutral-100 text-xs">
                    <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="text-neutral-500">پست الکترونیک:</span>
                    <a
                      href={`mailto:${email}`}
                      className="font-mono text-neutral-900 hover:text-blue-600 font-semibold"
                      dir="ltr"
                    >
                      {email}
                    </a>
                  </div>
                )}

                {description && (
                  <div className="pt-1 text-xs">
                    <span className="text-neutral-500 block mb-1">توضیحات:</span>
                    <p className="text-neutral-700 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 leading-relaxed">
                      {description}
                    </p>
                  </div>
                )}

                {/* Other representatives and contacts of this company */}
                {contact?.contact_type === 'external' && otherCompanyContacts.length > 0 && (
                  <div className="border border-amber-200/90 rounded-xl p-4 sm:p-5 bg-amber-50/40 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                        <Building2 className="w-4 h-4 text-amber-600" />
                        <span>سایر رابط‌ها و نمایندگان ثبت‌شده «{contact.company_name}» ({otherCompanyContacts.length} نفر)</span>
                      </div>
                      <span className="text-[10px] text-amber-800 font-medium">هم‌پیمانکار / هم‌شرکت</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {otherCompanyContacts.map((rep) => (
                        <div
                          key={rep.id}
                          onClick={() => {
                            if (onSelectContact) {
                              onSelectContact(rep);
                            }
                          }}
                          className={`p-3 rounded-lg bg-white border border-amber-200/80 hover:border-amber-400 hover:shadow-xs transition flex flex-col justify-between gap-1.5 ${
                            onSelectContact ? 'cursor-pointer' : ''
                          }`}
                          title="مشاهده اطلاعات و شماره‌های این رابط"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-900">
                              {rep.first_name} {rep.last_name}
                            </span>
                            <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-semibold">
                              {rep.job_title || 'نماینده شرکت'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-600 font-mono mt-1" dir="ltr">
                            {rep.mobiles?.[0] && (
                              <span className="text-emerald-700 font-medium">📱 {rep.mobiles[0]}</span>
                            )}
                            {rep.landlines?.[0]?.extension && (
                              <span className="text-blue-700 font-medium">☎ داخلی {rep.landlines[0].extension}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEditing && !isCreateMode && canDelete && onDelete && contact && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`آیا از حذف پرسنل «${firstName} ${lastName}» اطمینان دارید؟`)) {
                    onDelete(contact.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف مخاطب</span>
              </button>
            )}

            {validationError && isEditing && (
              <span className="text-xs text-rose-600 font-medium">
                {validationError}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs rounded-lg transition cursor-pointer"
            >
              بستن
            </button>

            {!isEditing && !isCreateMode && canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="ویرایش اطلاعات این مخاطب"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>ویرایش اطلاعات</span>
              </button>
            )}

            {!isEditing && !isCreateMode && !canEdit && (
              <span className="text-[11px] text-neutral-500 bg-neutral-100/90 px-3 py-1.5 rounded-lg border border-neutral-200">
                {currentUser ? 'امکان ویرایش: فقط مدیر یا ثبت‌کننده' : 'برای ویرایش وارد حساب شوید'}
              </span>
            )}

            {isEditing && !isCreateMode && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setValidationError(null);
                }}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 text-xs rounded-lg transition cursor-pointer"
              >
                انصراف
              </button>
            )}

            {isEditing && (
              <button
                id="save-contact-submit-btn"
                type="button"
                disabled={isSaving}
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال ذخیره...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>ذخیره اطلاعات</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
