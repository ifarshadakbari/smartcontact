import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Sliders,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  Search,
  Activity,
  Save,
  Info,
  Server,
  Network,
  Lock,
  Building2,
  User as UserIcon,
  Phone,
  Filter,
} from 'lucide-react';
import { UserBlfPermission, Contact, LdapDomain, BlfState, User } from '../types';
import {
  getAllAvailableInternalExtensions,
  InternalExtensionMeta,
  extractExtensionFromLandline,
} from '../services/blfService';

interface BlfConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: UserBlfPermission[];
  onSavePermissions: (updated: UserBlfPermission[]) => void;
  allContacts: Contact[];
  ldapDomains: LdapDomain[];
  currentUser?: User | null;
}

export const BlfConfigModal: React.FC<BlfConfigModalProps> = ({
  isOpen,
  onClose,
  permissions,
  onSavePermissions,
  allContacts,
  ldapDomains,
  currentUser,
}) => {
  const [localPermissions, setLocalPermissions] = useState<UserBlfPermission[]>(permissions);
  const [selectedUserId, setSelectedUserId] = useState<number | string>(permissions[0]?.userId || 1);
  const [userListSearch, setUserListSearch] = useState('');
  const [userDomainFilter, setUserDomainFilter] = useState<string>('all');

  // ۴-a: فیلتر و جستجوی تایپی برای افزودن پرسنل جدید
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [candidateDomainFilter, setCandidateDomainFilter] = useState<string>('all');
  const [selectedNewContact, setSelectedNewContact] = useState<Contact | null>(null);

  // ۴-b: امکان انتخاب و فیلتر دامین اکتیو برای تخصیص خطوط داخلی
  const [extensionDomainFilter, setExtensionDomainFilter] = useState<string>('user_domain');
  const [searchExtension, setSearchExtension] = useState('');

  // Helper to get display title for any domain name or ID
  const formatDomainTitle = useCallback(
    (domainId?: string | number, domainName?: string): string => {
      const dIdStr = domainId != null ? String(domainId) : undefined;
      if (!dIdStr && !domainName) {
        return ldapDomains[0]?.display_name || ldapDomains[0]?.name || 'دامین پیش‌فرض';
      }
      const found = ldapDomains.find(
        (d) =>
          (dIdStr && String(d.id) === dIdStr) ||
          (domainName && (d.name === domainName || d.display_name === domainName))
      );
      if (found?.display_name) return found.display_name;
      if (found?.name) return found.name;
      if (domainName) return domainName;
      if (dIdStr) return dIdStr;
      return ldapDomains[0]?.display_name || ldapDomains[0]?.name || 'دامین پیش‌فرض';
    },
    [ldapDomains]
  );

  // Sync permissions when modal opens or permissions prop changes
  React.useEffect(() => {
    if (isOpen) {
      setLocalPermissions(permissions);
      if (permissions.length > 0 && (!selectedUserId || !permissions.some((p) => String(p.userId) === String(selectedUserId)))) {
        setSelectedUserId(permissions[0].userId);
      }
      setIsAddUserOpen(false);
      setCandidateSearchQuery('');
      setSelectedNewContact(null);
    }
  }, [isOpen, permissions]);

  // ۴-c: کلیه خطوط داخلی منحصراً از افراد درون‌سازمانی (contact_type === 'internal') استخراج می‌شوند
  const allAvailableExtensions = useMemo(() => {
    // مخاطبین برون‌سازمانی به هیچ وجه دارای خط داخلی سانترال / VoIP نیستند
    const internalContactsOnly = allContacts.filter((c) => c.contact_type === 'internal');
    return getAllAvailableInternalExtensions(internalContactsOnly, currentUser, ldapDomains);
  }, [allContacts, currentUser, ldapDomains]);

  // Enrich user permissions without dropping any configured user
  const validUsers = useMemo(() => {
    return localPermissions.map((p) => {
      const isCurrentAdmin =
        String(p.userId) === '1' ||
        (currentUser && String(p.userId) === String(currentUser.id)) ||
        p.role === 'admin';

      const domainObj = ldapDomains.find(
        (d) =>
          (p.domainId && String(d.id) === String(p.domainId)) ||
          (p.domainName && (d.name === p.domainName || d.display_name === p.domainName))
      ) || ldapDomains[0];

      const domainPersianTitle = formatDomainTitle(domainObj?.id || p.domainId, domainObj?.name || p.domainName);
      const realMonitored = p.monitoredExtensions || [];

      if (isCurrentAdmin) {
        const adminName = currentUser?.name
          ? `${currentUser.name} (مدیر سیستم)`
          : (p.userName || 'مدیر سیستم');
        return {
          ...p,
          userName: adminName,
          department: currentUser?.department || p.department || 'فناوری اطلاعات و زیرساخت',
          domainId: domainObj?.id || p.domainId || '1',
          domainName: domainPersianTitle,
          monitoredExtensions: realMonitored,
          canViewBlf: true,
        };
      }

      // Find contact if available to enrich details (internal only)
      const contact = allContacts.find((c) =>
        c.contact_type === 'internal' &&
        (String(c.id) === String(p.userId) ||
          (p.contactId && String(c.id) === String(p.contactId)) ||
          (p.userUsername && c.ldap_username && p.userUsername.toLowerCase() === c.ldap_username.toLowerCase()) ||
          (p.userEmail && c.email && p.userEmail.toLowerCase() === c.email.toLowerCase()) ||
          (p.personnelCode && c.personnel_code && p.personnelCode === c.personnel_code) ||
          (p.userName && `${c.first_name || ''} ${c.last_name || ''}`.trim() === p.userName.trim()))
      );

      if (contact) {
        const cDomain = ldapDomains.find((d) => String(d.id) === String(contact.domain_id)) || domainObj;
        const cDomainPersianTitle = formatDomainTitle(cDomain?.id || contact.domain_id, cDomain?.name || contact.domain_name);
        const cExt = (contact.landlines ? contact.landlines.map(extractExtensionFromLandline).find((x): x is string => Boolean(x)) || '' : '') as string;
        return {
          ...p,
          userName: `${contact.first_name} ${contact.last_name}`.trim() || p.userName,
          userUsername: contact.ldap_username || p.userUsername,
          userEmail: contact.email || p.userEmail,
          userExtension: cExt || p.userExtension || '',
          personnelCode: contact.personnel_code || p.personnelCode,
          contactId: contact.id,
          department: contact.department || p.department,
          domainId: contact.domain_id || domainObj?.id || '1',
          domainName: cDomainPersianTitle,
          canViewBlf: p.canViewBlf !== false && (Boolean(p.canViewBlf) || realMonitored.length > 0 || Boolean(p.canViewAll)),
          monitoredExtensions: realMonitored,
        };
      }

      return {
        ...p,
        domainName: domainPersianTitle,
        canViewBlf: p.canViewBlf !== false && (Boolean(p.canViewBlf) || realMonitored.length > 0 || Boolean(p.canViewAll)),
        monitoredExtensions: realMonitored,
      };
    });
  }, [localPermissions, allContacts, currentUser, ldapDomains, formatDomainTitle]);

  // Current selected user's permission
  const currentUserPerm = useMemo(() => {
    return (
      validUsers.find((p) => String(p.userId) === String(selectedUserId)) ||
      validUsers[0] ||
      null
    );
  }, [validUsers, selectedUserId]);

  // The home domain of the currently selected user
  const currentUserDomain = useMemo(() => {
    if (!currentUserPerm) return ldapDomains[0] || null;
    const userDomainId = currentUserPerm.domainId;
    return (
      ldapDomains.find(
        (d) =>
          (userDomainId && String(d.id) === String(userDomainId)) ||
          (currentUserPerm.domainName &&
            (d.name === currentUserPerm.domainName || d.display_name === currentUserPerm.domainName))
      ) || ldapDomains[0] || null
    );
  }, [currentUserPerm, ldapDomains]);

  // ۴-b: فیلتر دامین انتخابی برای داخلی‌های قابل مانیتورینگ
  const activeExtensionDomain = useMemo(() => {
    if (extensionDomainFilter === 'user_domain' || !extensionDomainFilter) {
      return currentUserDomain;
    }
    if (extensionDomainFilter === 'all') {
      return null;
    }
    return ldapDomains.find((d) => String(d.id) === String(extensionDomainFilter)) || currentUserDomain;
  }, [extensionDomainFilter, currentUserDomain, ldapDomains]);

  // Internal extensions filtered by selected domain
  const allowedExtensionsForDomain = useMemo(() => {
    if (!activeExtensionDomain) return allAvailableExtensions;
    const curDomId = String(activeExtensionDomain.id);
    const curDomName = (activeExtensionDomain.name || '').toLowerCase();
    const curDomDisplay = (activeExtensionDomain.display_name || '').toLowerCase();

    return allAvailableExtensions.filter((ext) => {
      if (!ext.domainId && !ext.domainName) return true;
      const extDomId = ext.domainId ? String(ext.domainId) : '';
      const extDomName = (ext.domainName || '').toLowerCase();
      return (
        extDomId === curDomId ||
        extDomName === curDomName ||
        extDomName === curDomDisplay ||
        extDomName.includes(curDomName) ||
        curDomName.includes(extDomName)
      );
    });
  }, [allAvailableExtensions, activeExtensionDomain]);

  // Filtered extensions for display (by search query)
  const displayedAllowedExtensions = useMemo(() => {
    if (!searchExtension.trim()) return allowedExtensionsForDomain;
    const q = searchExtension.trim().toLowerCase();
    return allowedExtensionsForDomain.filter(
      (ext) =>
        ext.extension.includes(q) ||
        ext.name.toLowerCase().includes(q) ||
        (ext.department || '').toLowerCase().includes(q)
    );
  }, [allowedExtensionsForDomain, searchExtension]);

  // Filtered users list by domain and search query on left side
  const filteredUsers = useMemo(() => {
    let list = validUsers;
    if (userDomainFilter !== 'all') {
      list = list.filter((p) => {
        const matchDomain = ldapDomains.find((d) => String(d.id) === String(userDomainFilter));
        return (
          String(p.domainId) === String(userDomainFilter) ||
          (matchDomain && (p.domainName === matchDomain.name || p.domainName === matchDomain.display_name))
        );
      });
    }
    if (userListSearch.trim()) {
      const q = userListSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.userName.toLowerCase().includes(q) ||
          (p.userExtension && p.userExtension.includes(q)) ||
          (p.personnelCode && p.personnelCode.includes(q)) ||
          (p.department && p.department.toLowerCase().includes(q))
      );
    }
    return list;
  }, [validUsers, userDomainFilter, userListSearch, ldapDomains]);

  // ۴-a & ۴-c: کاندیداهای پرسنل سازمانی جهت افزودن به پنل BLF (منحصراً افراد درون‌سازمانی)
  const availableCandidateContacts = useMemo(() => {
    const existingIds = new Set(validUsers.map((p) => String(p.userId)));
    const existingContactIds = new Set(validUsers.map((p) => (p.contactId ? String(p.contactId) : '')).filter(Boolean));

    // ۴-c: افراد برون‌سازمانی نبایستی در این پنل قابل افزودن باشند
    let candidates = allContacts.filter(
      (c) =>
        c.contact_type === 'internal' &&
        c.prefix_title !== 'location' &&
        !existingIds.has(String(c.id)) &&
        !existingContactIds.has(String(c.id))
    );

    // فیلتر دامین کاندیدا
    if (candidateDomainFilter !== 'all') {
      candidates = candidates.filter((c) => String(c.domain_id) === String(candidateDomainFilter));
    }

    // ۴-a: فیلتر با تایپ نام، کد پرسنلی یا داخلی
    if (candidateSearchQuery.trim()) {
      const q = candidateSearchQuery.trim().toLowerCase();
      candidates = candidates.filter((c) => {
        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
        const code = (c.personnel_code || '').toLowerCase();
        const dept = (c.department || '').toLowerCase();
        const ext = c.landlines ? c.landlines.some((l) => (l.extension || '').includes(q)) : false;
        return fullName.includes(q) || code.includes(q) || dept.includes(q) || ext;
      });
    }

    return candidates;
  }, [allContacts, validUsers, candidateDomainFilter, candidateSearchQuery]);

  const handleToggleUserBlf = (userId: number | string, canView: boolean) => {
    setLocalPermissions((prev) =>
      prev.map((p) => (String(p.userId) === String(userId) ? { ...p, canViewBlf: canView } : p))
    );
  };

  const handleToggleExtension = (userId: number | string, ext: string) => {
    setLocalPermissions((prev) =>
      prev.map((p) => {
        if (String(p.userId) !== String(userId)) return p;
        const exists = p.monitoredExtensions.includes(ext);
        const updatedList = exists
          ? p.monitoredExtensions.filter((e) => e !== ext)
          : [...p.monitoredExtensions, ext];
        return {
          ...p,
          monitoredExtensions: updatedList,
          canViewBlf: updatedList.length > 0 ? true : p.canViewBlf,
        };
      })
    );
  };

  const handleSelectAllExtensionsForDomain = (userId: number | string) => {
    const allDomainExts = allowedExtensionsForDomain.map((e) => e.extension);
    setLocalPermissions((prev) =>
      prev.map((p) => {
        if (String(p.userId) !== String(userId)) return p;
        // ادغام با خطوط فعلی بدون تکرار
        const merged = Array.from(new Set([...p.monitoredExtensions, ...allDomainExts]));
        return { ...p, monitoredExtensions: merged, canViewBlf: true };
      })
    );
  };

  const handleClearAllExtensions = (userId: number | string) => {
    setLocalPermissions((prev) =>
      prev.map((p) => (String(p.userId) === String(userId) ? { ...p, monitoredExtensions: [] } : p))
    );
  };

  // ۴-a: ثبت کاربر انتخاب‌شده در لیست دسترسی BLF
  const handleConfirmAddSelectedContact = () => {
    if (!selectedNewContact) return;
    const target = selectedNewContact;

    // بررسی عدم وجود در لیست
    const existing = localPermissions.find(
      (p) =>
        String(p.userId) === String(target.id) ||
        (p.contactId && String(p.contactId) === String(target.id)) ||
        (target.ldap_username && p.userUsername && p.userUsername.toLowerCase() === target.ldap_username.toLowerCase())
    );
    if (existing) {
      setSelectedUserId(existing.userId);
      setIsAddUserOpen(false);
      setSelectedNewContact(null);
      setCandidateSearchQuery('');
      return;
    }

    const domainId = target.domain_id || '1';
    const domainObj = ldapDomains.find((d) => String(d.id) === String(domainId));
    const targetExt = (target.landlines ? target.landlines.map(extractExtensionFromLandline).find((x): x is string => Boolean(x)) || '' : '') as string;

    const newPerm: UserBlfPermission = {
      userId: target.id,
      contactId: target.id,
      userName: `${target.first_name || ''} ${target.last_name || ''}`.trim() || 'کاربر سازمانی',
      userUsername: target.ldap_username || '',
      userEmail: target.email || '',
      userExtension: targetExt,
      personnelCode: target.personnel_code || '',
      role: 'staff',
      department: target.department || 'پرسنل سازمانی',
      domainId: String(domainId),
      domainName: domainObj?.display_name || formatDomainTitle(domainId, target.domain_name),
      canViewBlf: true,
      monitoredExtensions: [],
    };

    setLocalPermissions((prev) => [...prev, newPerm]);
    setSelectedUserId(newPerm.userId);
    setSelectedNewContact(null);
    setCandidateSearchQuery('');
    setIsAddUserOpen(false);
  };

  const handleRemoveUser = (userId: number | string) => {
    const isCurrentAdmin =
      String(userId) === '1' || (currentUser && String(userId) === String(currentUser.id));
    if (isCurrentAdmin) return; // Protect admin
    setLocalPermissions((prev) => prev.filter((p) => String(p.userId) !== String(userId)));
    if (String(selectedUserId) === String(userId)) {
      setSelectedUserId(1);
    }
  };

  const handleSave = () => {
    const sanitized = validUsers.map((perm) => {
      const userDomain = ldapDomains.find(
        (d) =>
          String(d.id) === String(perm.domainId) ||
          d.name === perm.domainName ||
          d.display_name === perm.domainName
      ) || ldapDomains[0];

      const validExts = perm.monitoredExtensions || [];

      return {
        ...perm,
        domainId: userDomain?.id || perm.domainId || '1',
        domainName: userDomain?.display_name || formatDomainTitle(perm.domainId, perm.domainName),
        monitoredExtensions: validExts,
        canViewBlf: perm.canViewBlf !== false && (validExts.length > 0 || Boolean(perm.canViewBlf) || Boolean(perm.canViewAll)),
      };
    });

    onSavePermissions(sanitized);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200 text-neutral-900 font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  پیکربندی و تخصیص مانیتورینگ BLF به پرسنل
                </h2>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded-full font-semibold">
                  تفکیک چنددامینی سرورهای VoIP
                </span>
              </div>
              <p className="text-xs text-neutral-300">
                تعیین سطوح دسترسی و انتخاب خطوط داخلی مجاز هر کاربر با تفکیک سرورهای VoIP دامین‌ها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Left Column: Personnel List with Search & Autocomplete */}
            <div className="md:col-span-1 border border-neutral-200 rounded-xl p-3.5 bg-neutral-50/70 space-y-3 flex flex-col max-h-[580px]">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-blue-600" />
                  <span>پرسنل سازمانی ({filteredUsers.length}):</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(!isAddUserOpen)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن کاربر</span>
                </button>
              </div>

              {/* ۴-a: باکس جستجوی تایپی و افزودن کاربر جدید */}
              {isAddUserOpen && (
                <div className="p-3 bg-white border-2 border-blue-400 rounded-xl space-y-2.5 text-xs shadow-md animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-blue-950 font-bold">
                    <span>جستجو و انتخاب پرسنل درون‌سازمانی:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddUserOpen(false);
                        setSelectedNewContact(null);
                        setCandidateSearchQuery('');
                      }}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Domain Filter for candidates */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCandidateDomainFilter('all')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition shrink-0 ${
                        candidateDomainFilter === 'all'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      همه دامین‌ها
                    </button>
                    {ldapDomains.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setCandidateDomainFilter(String(d.id))}
                        className={`px-2 py-0.5 rounded cursor-pointer transition shrink-0 truncate max-w-[110px] ${
                          candidateDomainFilter === String(d.id)
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                        title={d.display_name}
                      >
                        {d.display_name.replace('دامین ', '')}
                      </button>
                    ))}
                  </div>

                  {/* Input Search Field (Type-to-search) */}
                  <div className="relative">
                    <input
                      type="text"
                      value={candidateSearchQuery}
                      onChange={(e) => setCandidateSearchQuery(e.target.value)}
                      placeholder="تایپ نام، کد پرسنلی یا داخلی..."
                      className="w-full pl-3 pr-8 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      autoFocus
                    />
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5" />
                  </div>

                  {/* Matching candidates list */}
                  <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-neutral-100 border border-neutral-200 rounded-lg bg-neutral-50/50 p-1">
                    {availableCandidateContacts.length === 0 ? (
                      <div className="text-center py-4 text-neutral-400 text-[11px]">
                        پرسنل درون‌سازمانی با این مشخصات یافت نشد.
                      </div>
                    ) : (
                      availableCandidateContacts.map((c) => {
                        const isChosen = selectedNewContact?.id === c.id;
                        const ext = c.landlines ? c.landlines.map(extractExtensionFromLandline).find(Boolean) : '';
                        const dObj = ldapDomains.find((d) => String(d.id) === String(c.domain_id));
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedNewContact(c)}
                            className={`p-1.5 rounded cursor-pointer text-[11px] transition flex items-center justify-between ${
                              isChosen
                                ? 'bg-blue-600 text-white font-bold'
                                : 'hover:bg-white text-neutral-800'
                            }`}
                          >
                            <div className="truncate">
                              <div>{c.first_name} {c.last_name}</div>
                              <div className={`text-[10px] ${isChosen ? 'text-blue-100' : 'text-neutral-400'}`}>
                                {c.department || dObj?.display_name || 'پرسنل'}
                              </div>
                            </div>
                            <div className="text-left shrink-0 font-mono text-[10px]" dir="ltr">
                              {ext ? `☎ ${ext}` : c.personnel_code || ''}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add action */}
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddUserOpen(false);
                        setSelectedNewContact(null);
                      }}
                      className="px-2.5 py-1 bg-white text-neutral-600 hover:bg-neutral-100 rounded text-[11px] cursor-pointer border border-neutral-200"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAddSelectedContact}
                      disabled={!selectedNewContact}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded text-[11px] font-bold cursor-pointer shadow-xs"
                    >
                      افزودن به لیست BLF
                    </button>
                  </div>
                </div>
              )}

              {/* Search Existing Users in List */}
              <div className="relative">
                <input
                  type="text"
                  value={userListSearch}
                  onChange={(e) => setUserListSearch(e.target.value)}
                  placeholder="جستجو در لیست کاربران..."
                  className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5" />
              </div>

              {/* Domain Filter Buttons for Existing Users */}
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setUserDomainFilter('all')}
                    className={`p-1 rounded text-center transition cursor-pointer border ${
                      userDomainFilter === 'all'
                        ? 'bg-neutral-900 text-white font-bold border-neutral-900'
                        : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-200'
                    }`}
                  >
                    همه دامین‌ها ({validUsers.length})
                  </button>
                  {ldapDomains.map((d) => {
                    const count = validUsers.filter(
                      (p) =>
                        String(p.domainId) === String(d.id) ||
                        p.domainName === d.name ||
                        p.domainName === d.display_name
                    ).length;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setUserDomainFilter(String(d.id))}
                        className={`p-1 rounded truncate text-center transition cursor-pointer border ${
                          userDomainFilter === String(d.id)
                            ? 'bg-blue-600 text-white font-bold border-blue-600'
                            : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-200'
                        }`}
                        title={d.display_name}
                      >
                        {d.display_name.replace('دامین ', '')} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 text-xs bg-white rounded-xl border border-dashed border-neutral-200">
                    کاربری با این مشخصات یافت نشد
                  </div>
                ) : (
                  filteredUsers.map((userPerm) => {
                    const isSelected = String(userPerm.userId) === String(selectedUserId);

                    return (
                      <div
                        key={userPerm.userId}
                        onClick={() => setSelectedUserId(userPerm.userId)}
                        className={`w-full text-right p-2.5 rounded-xl text-xs transition cursor-pointer border flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold shadow-xs'
                            : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{userPerm.userName}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {userPerm.canViewBlf ? (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                                مجاز
                              </span>
                            ) : (
                              <span className="text-[9px] bg-neutral-200 text-neutral-600 px-1.5 py-0.2 rounded">
                                غیرفعال
                              </span>
                            )}
                            {userPerm.userId !== 1 && (!currentUser || String(userPerm.userId) !== String(currentUser.id)) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveUser(userPerm.userId);
                                }}
                                className="text-neutral-400 hover:text-rose-600 p-0.5 transition"
                                title="حذف کاربر از لیست دسترسی BLF"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Domain Tag & count */}
                        <div className="flex items-center justify-between text-[10px] text-neutral-500">
                          <span className="inline-flex items-center gap-1 font-sans text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded font-medium">
                            <Network className="w-3 h-3 text-blue-600" />
                            {userPerm.domainName || formatDomainTitle(userPerm.domainId, userPerm.domainName)}
                          </span>
                          <span className="font-mono text-neutral-700 font-bold">
                            {userPerm.monitoredExtensions.length} داخلی
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Monitored Extensions Picker with 4-b Multi-Domain Switching */}
            <div className="md:col-span-2 border border-neutral-200 rounded-xl p-4 space-y-4 bg-white flex flex-col">
              {currentUserPerm ? (
                <>
                  {/* User & Domain Info Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-neutral-900">
                          {currentUserPerm.userName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {currentUserPerm.role === 'admin' ? 'مدیر سیستم' : 'پرسنل'}
                        </span>
                        {currentUserPerm.userExtension && (
                          <span className="font-mono text-xs bg-neutral-100 px-2 py-0.5 rounded font-bold text-neutral-700">
                            داخلی {currentUserPerm.userExtension}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {currentUserPerm.department} • دامین اصلی: <strong>{currentUserPerm.domainName}</strong>
                      </p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 shrink-0">
                      <span className="text-xs font-semibold text-neutral-700">دسترسی به پنل BLF:</span>
                      <input
                        type="checkbox"
                        checked={currentUserPerm.canViewBlf}
                        onChange={(e) =>
                          handleToggleUserBlf(currentUserPerm.userId, e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* ۴-b: نوار انتخاب دامین جهت تخصیص خطوط داخلی این دامین یا سایر دامین‌ها */}
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-blue-950">
                        <Server className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>نمایش داخلی‌های سرور VoIP دامین:</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setExtensionDomainFilter('user_domain')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                            extensionDomainFilter === 'user_domain'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-300'
                          }`}
                        >
                          دامین همین پرسنل ({currentUserDomain?.display_name})
                        </button>
                        {ldapDomains
                          .filter((d) => !currentUserDomain || String(d.id) !== String(currentUserDomain.id))
                          .map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setExtensionDomainFilter(String(d.id))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                                extensionDomainFilter === String(d.id)
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-300'
                              }`}
                            >
                              {d.display_name}
                            </button>
                          ))}
                        <button
                          type="button"
                          onClick={() => setExtensionDomainFilter('all')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                            extensionDomainFilter === 'all'
                              ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                              : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-300'
                          }`}
                        >
                          همه دامین‌ها
                        </button>
                      </div>
                    </div>
                    {activeExtensionDomain && (
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        هاست VoIP این دامین: <strong className="font-mono text-neutral-900" dir="ltr">{activeExtensionDomain.voip_server_host || '127.0.0.1'}</strong> (کانتکست: {activeExtensionDomain.voip_context || 'from-internal'})
                      </p>
                    )}
                  </div>

                  {/* Monitored Extensions Picker for this Domain */}
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-neutral-800">
                        داخلی‌های مجاز ({allowedExtensionsForDomain.length} خط داخلی در دسترس):
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleSelectAllExtensionsForDomain(currentUserPerm.userId)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-medium transition cursor-pointer"
                        >
                          انتخاب تمام خطوط این بخش
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearAllExtensions(currentUserPerm.userId)}
                          className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-[11px] font-medium transition cursor-pointer"
                        >
                          لغو همه
                        </button>
                      </div>
                    </div>

                    {/* Search Extensions in this domain */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchExtension}
                        onChange={(e) => setSearchExtension(e.target.value)}
                        placeholder="جستجوی داخلی، نام پرسنل یا واحد سازمانی..."
                        className="w-full pl-8 pr-8 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5" />
                    </div>

                    {/* Extensions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                      {displayedAllowedExtensions.length === 0 ? (
                        <div className="col-span-2 text-center py-8 text-neutral-400 text-xs bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                          داخلی‌ای در این بخش مطابق با عبارت جستجو یافت نشد.
                        </div>
                      ) : (
                        displayedAllowedExtensions.map((ext) => {
                          const isChecked = currentUserPerm.monitoredExtensions.includes(ext.extension);
                          return (
                            <label
                              key={ext.extension}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                                isChecked
                                  ? 'bg-blue-50/90 border-blue-300 text-blue-950 font-medium shadow-2xs'
                                  : 'bg-neutral-50/50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    handleToggleExtension(currentUserPerm.userId, ext.extension)
                                  }
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="truncate">
                                  <div className="font-semibold truncate">{ext.name}</div>
                                  <div className="text-[10px] text-neutral-500 truncate flex items-center gap-1">
                                    <span>{ext.department}</span>
                                    {ext.domainName && (
                                      <span className="text-[9px] bg-neutral-200/80 px-1 rounded text-neutral-600">
                                        {ext.domainName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono font-bold text-neutral-900 bg-white border border-neutral-200 px-2 py-0.5 rounded text-[11px] shrink-0">
                                {ext.extension}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-neutral-400 text-xs">
                  کاربری انتخاب نشده است.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 border-t border-neutral-200 p-4 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            تخصیص‌ها با تفکیک سرورهای VoIP هر دامین ذخیره و بلادرنگ اعمال خواهند شد.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>ذخیره تنظیمات BLF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
