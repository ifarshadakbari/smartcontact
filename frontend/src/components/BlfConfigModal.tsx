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
} from 'lucide-react';
import { UserBlfPermission, Contact, LdapDomain, BlfState, User } from '../types';
import {
  getAllAvailableInternalExtensions,
  InternalExtensionMeta,
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
  const [selectedUserId, setSelectedUserId] = useState<number>(permissions[0]?.userId || 1);
  const [searchExtension, setSearchExtension] = useState('');
  const [userDomainFilter, setUserDomainFilter] = useState<string>('all');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedNewContactId, setSelectedNewContactId] = useState<number | string>('');

  // Helper to get display title for any domain name or ID
  const formatDomainTitle = useCallback(
    (domainId?: string, domainName?: string): string => {
      if (!domainId && !domainName) {
        return ldapDomains[0]?.display_name || ldapDomains[0]?.name || 'دامین پیش‌فرض';
      }
      const found = ldapDomains.find(
        (d) =>
          (domainId && d.id === domainId) ||
          (domainName && (d.name === domainName || d.display_name === domainName))
      );
      if (found?.display_name) return found.display_name;
      if (found?.name) return found.name;
      if (domainName) return domainName;
      if (domainId) return domainId;
      return ldapDomains[0]?.display_name || ldapDomains[0]?.name || 'دامین پیش‌فرض';
    },
    [ldapDomains]
  );

  // Sync permissions when modal opens or permissions prop changes
  React.useEffect(() => {
    if (isOpen) {
      setLocalPermissions(permissions);
    }
  }, [isOpen, permissions]);

  // All internal extensions across all domains
  const allAvailableExtensions = useMemo(() => {
    return getAllAvailableInternalExtensions(allContacts);
  }, [allContacts]);

  // Filter users to only real employees present in the company contacts or current admin
  const validUsers = useMemo(() => {
    const internalContactsMap = new Map<number, Contact>(
      allContacts
        .filter((c) => c.contact_type === 'internal')
        .map((c) => [c.id, c])
    );

    return localPermissions
      .filter((p) => {
        // Admin / Current User is always valid
        const isCurrentAdmin =
          p.userId === 1 ||
          (currentUser && p.userId === currentUser.id) ||
          p.role === 'admin';
        if (isCurrentAdmin) return true;

        // Any other user must be an actual internal employee in allContacts
        return internalContactsMap.has(p.userId);
      })
      .map((p) => {
        const isCurrentAdmin =
          p.userId === 1 ||
          (currentUser && p.userId === currentUser.id) ||
          p.role === 'admin';

        const domainObj = ldapDomains.find(
          (d) =>
            (p.domainId && d.id === p.domainId) ||
            (p.domainName && (d.name === p.domainName || d.display_name === p.domainName))
        ) || ldapDomains[0];

        const domainPersianTitle = formatDomainTitle(domainObj?.id || p.domainId, domainObj?.name || p.domainName);

        // Real internal extensions available in allContacts for this user's domain
        const realDomainExts = allAvailableExtensions
          .filter((e) =>
            (domainObj && (e.domainId === domainObj.id || e.domainName === domainObj.name)) ||
            e.domainName === domainPersianTitle
          )
          .map((e) => e.extension);

        let realMonitored = p.monitoredExtensions.filter((ext) => realDomainExts.includes(ext));

        if (p.monitoredExtensions.length === 0 && realDomainExts.length > 0 && isCurrentAdmin) {
          realMonitored = realDomainExts;
        }

        if (isCurrentAdmin) {
          const adminName = currentUser?.name
            ? `${currentUser.name} (مدیر سیستم)`
            : 'مدیر سیستم';
          return {
            ...p,
            userName: adminName,
            department: currentUser?.department || p.department || 'فناوری اطلاعات و زیرساخت',
            domainId: domainObj?.id || p.domainId || 'dom-1',
            domainName: domainPersianTitle,
            monitoredExtensions: realMonitored,
          };
        }

        // Real contact: sync name, department, and domain directly from real contact record
        const contact = internalContactsMap.get(p.userId);
        if (contact) {
          const cDomain = ldapDomains.find((d) => d.id === contact.domain_id) || domainObj;
          const cDomainPersianTitle = formatDomainTitle(cDomain?.id || contact.domain_id, cDomain?.name || contact.domain_name);
          return {
            ...p,
            userName: `${contact.first_name} ${contact.last_name}`,
            department: contact.department || p.department,
            domainId: contact.domain_id || domainObj?.id || 'dom-1',
            domainName: cDomainPersianTitle,
            monitoredExtensions: realMonitored,
          };
        }

        return {
          ...p,
          domainName: domainPersianTitle,
          monitoredExtensions: realMonitored,
        };
      });
  }, [localPermissions, allContacts, currentUser, ldapDomains, allAvailableExtensions, formatDomainTitle]);

  // Current selected user's permission
  const currentUserPerm = useMemo(() => {
    return (
      validUsers.find((p) => p.userId === selectedUserId) ||
      validUsers[0] ||
      null
    );
  }, [validUsers, selectedUserId]);

  // The domain of the currently selected user
  const currentUserDomain = useMemo(() => {
    if (!currentUserPerm) return ldapDomains[0] || null;
    const userDomainId = currentUserPerm.domainId;
    return (
      ldapDomains.find(
        (d) =>
          (userDomainId && d.id === userDomainId) ||
          (currentUserPerm.domainName &&
            (d.name === currentUserPerm.domainName || d.display_name === currentUserPerm.domainName))
      ) || ldapDomains[0] || null
    );
  }, [currentUserPerm, ldapDomains]);

  // STRICT DOMAIN ISOLATION:
  // Internal extensions strictly belonging to the current user's domain!
  const allowedExtensionsForCurrentDomain = useMemo(() => {
    if (!currentUserDomain) return [];
    return allAvailableExtensions.filter((ext) => {
      return (
        ext.domainId === currentUserDomain.id ||
        ext.domainName === currentUserDomain.name ||
        ext.domainName === currentUserDomain.display_name
      );
    });
  }, [allAvailableExtensions, currentUserDomain]);

  // Filtered extensions for display (by search query)
  const displayedAllowedExtensions = useMemo(() => {
    if (!searchExtension.trim()) return allowedExtensionsForCurrentDomain;
    const q = searchExtension.trim().toLowerCase();
    return allowedExtensionsForCurrentDomain.filter(
      (ext) =>
        ext.extension.includes(q) ||
        ext.name.toLowerCase().includes(q) ||
        (ext.department || '').toLowerCase().includes(q)
    );
  }, [allowedExtensionsForCurrentDomain, searchExtension]);

  // Filtered users list by domain (ensuring test users are never shown in "all" or specific domains)
  const filteredUsers = useMemo(() => {
    if (userDomainFilter === 'all') return validUsers;
    return validUsers.filter(
      (p) =>
        p.domainId === userDomainFilter ||
        ldapDomains.find((d) => d.id === userDomainFilter)?.name === p.domainName
    );
  }, [validUsers, userDomainFilter, ldapDomains]);

  // Candidates for adding new users to BLF (internal contacts not yet in validUsers)
  const availableCandidateContacts = useMemo(() => {
    const existingIds = new Set(validUsers.map((p) => p.userId));
    return allContacts.filter(
      (c) => c.contact_type === 'internal' && !existingIds.has(c.id)
    );
  }, [allContacts, validUsers]);

  const handleToggleUserBlf = (userId: number, canView: boolean) => {
    setLocalPermissions((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, canViewBlf: canView } : p))
    );
  };

  const handleToggleExtension = (userId: number, ext: string) => {
    // Verify that this extension strictly belongs to the user's domain
    const isBelongsToDomain = allowedExtensionsForCurrentDomain.some(
      (e) => e.extension === ext
    );
    if (!isBelongsToDomain) return;

    setLocalPermissions((prev) =>
      prev.map((p) => {
        if (p.userId !== userId) return p;
        const exists = p.monitoredExtensions.includes(ext);
        const updatedList = exists
          ? p.monitoredExtensions.filter((e) => e !== ext)
          : [...p.monitoredExtensions, ext];
        return { ...p, monitoredExtensions: updatedList };
      })
    );
  };

  const handleSelectAllExtensionsForDomain = (userId: number) => {
    const allDomainExts = allowedExtensionsForCurrentDomain.map((e) => e.extension);
    setLocalPermissions((prev) =>
      prev.map((p) =>
        p.userId === userId ? { ...p, monitoredExtensions: allDomainExts } : p
      )
    );
  };

  const handleClearAllExtensions = (userId: number) => {
    setLocalPermissions((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, monitoredExtensions: [] } : p))
    );
  };

  const handleAddUserFromContact = () => {
    if (!selectedNewContactId) return;
    const target = allContacts.find((c) => c.id === Number(selectedNewContactId) || c.id === selectedNewContactId);
    if (!target) return;

    const domainId = target.domain_id || 'dom-1';
    const domainObj = ldapDomains.find((d) => d.id === domainId);

    const newPerm: UserBlfPermission = {
      userId: typeof target.id === 'number' ? target.id : Date.now(),
      userName: `${target.first_name} ${target.last_name}`,
      role: 'staff',
      department: target.department || 'پرسنل سازمانی',
      domainId: domainId,
      domainName: domainObj?.display_name || formatDomainTitle(domainId, target.domain_name),
      canViewBlf: true,
      monitoredExtensions: [],
    };

    setLocalPermissions((prev) => [...prev, newPerm]);
    setSelectedUserId(newPerm.userId);
    setSelectedNewContactId('');
    setIsAddUserOpen(false);
  };

  const handleRemoveUser = (userId: number) => {
    const isCurrentAdmin =
      userId === 1 || (currentUser && userId === currentUser.id);
    if (isCurrentAdmin) return; // Protect admin
    setLocalPermissions((prev) => prev.filter((p) => p.userId !== userId));
    if (selectedUserId === userId) {
      setSelectedUserId(1);
    }
  };

  const handleSave = () => {
    // Sanitize before saving: enforce that every user's monitoredExtensions
    // ONLY contains extensions from their respective domain, and only save valid real users!
    const sanitized = validUsers.map((perm) => {
      const userDomain = ldapDomains.find(
        (d) =>
          d.id === perm.domainId ||
          d.name === perm.domainName ||
          d.display_name === perm.domainName
      ) || ldapDomains[0];

      const validExts = perm.monitoredExtensions.filter((ext) => {
        const extMeta = allAvailableExtensions.find((e) => e.extension === ext);
        if (!extMeta) return false;
        return (
          extMeta.domainId === userDomain?.id ||
          extMeta.domainName === userDomain?.name ||
          extMeta.domainName === userDomain?.display_name
        );
      });

      return {
        ...perm,
        domainId: userDomain?.id || perm.domainId || 'dom-1',
        domainName: userDomain?.display_name || formatDomainTitle(perm.domainId, perm.domainName),
        monitoredExtensions: validExts,
      };
    });

    onSavePermissions(sanitized);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-neutral-200 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-neutral-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-emerald-400 border border-neutral-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                پیکربندی تخصیص BLF به کاربران معین
              </h2>
              <p className="text-xs text-neutral-400">
                اختصاص داخلی‌های تحت مانیتورینگ برای هر کاربر معین در دامین سازمانی
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Subheader */}
        <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>تخصیص خطوط و مانیتورینگ BLF کاربران به تفکیک دامین</span>
          </div>
          <span className="text-[11px] text-neutral-500">
            تعداد کل خطوط فعال: {allAvailableExtensions.length} داخلی
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Left Column: User Selection & Domain Filter */}
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-800">پرسنل سازمانی:</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddUserOpen(!isAddUserOpen)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن کاربر</span>
                  </button>
                </div>

                {/* Add User Quick Box */}
                {isAddUserOpen && (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                    <span className="font-semibold text-blue-900 block">انتخاب از دفترچه تلفن داخلی:</span>
                    <select
                      value={selectedNewContactId}
                      onChange={(e) => setSelectedNewContactId(e.target.value)}
                      className="w-full text-xs p-1.5 bg-white border border-neutral-300 rounded-lg"
                    >
                      <option value="">-- انتخاب پرسنل --</option>
                      {availableCandidateContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name} ({c.domain_name || 'دامین'})
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddUserOpen(false)}
                        className="px-2 py-1 bg-white text-neutral-600 hover:bg-neutral-100 rounded text-[10px] cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        onClick={handleAddUserFromContact}
                        disabled={!selectedNewContactId}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        ثبت در لیست BLF
                      </button>
                    </div>
                  </div>
                )}

                {/* Domain Filter Buttons for Users */}
                <div className="space-y-1">
                  <span className="text-[11px] text-neutral-500 font-medium block">فیلتر دامین:</span>
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
                          p.domainId === d.id ||
                          p.domainName === d.name ||
                          p.domainName === d.display_name
                      ).length;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setUserDomainFilter(d.id)}
                          className={`p-1 rounded truncate text-center transition cursor-pointer border ${
                            userDomainFilter === d.id
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
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-6 text-neutral-400 text-xs bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                      کاربری در این فیلتر یافت نشد
                    </div>
                  ) : (
                    filteredUsers.map((userPerm) => {
                    const isSelected = userPerm.userId === selectedUserId;

                    return (
                      <div
                        key={userPerm.userId}
                        onClick={() => setSelectedUserId(userPerm.userId)}
                        className={`w-full text-right p-2.5 rounded-xl text-xs transition cursor-pointer border flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold shadow-2xs'
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
                            {userPerm.userId !== 1 && (!currentUser || userPerm.userId !== currentUser.id) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveUser(userPerm.userId);
                                }}
                                className="text-neutral-400 hover:text-rose-600 p-0.5"
                                title="حذف از لیست"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Domain Tag */}
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

              {/* Right Column (2 spans): Domain-Restricted Monitored Extensions Picker */}
              <div className="md:col-span-2 border border-neutral-200 rounded-xl p-4 space-y-4">
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
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {currentUserPerm.department}
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

                    {/* Strict Domain Security Notice Banner */}
                    <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">قانون تفکیک دامین سازمانی:</span>
                          <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold text-[11px]">
                            {currentUserDomain.display_name || formatDomainTitle(currentUserDomain.id, currentUserDomain.name)}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          این کاربر منحصراً مجاز به مشاهده و مانیتورینگ وضعیت خطوط سرور ایزابل{' '}
                          <strong className="font-mono text-neutral-900" dir="ltr">
                            {currentUserDomain.voip_server_host || 'Asterisk PBX'}
                          </strong>{' '}
                          (همین دامین) می‌باشد و امکان گزینش یا مانیتورینگ داخلی‌های سایر دامین‌ها
                          وجود ندارد.
                        </p>
                      </div>
                    </div>

                    {/* Monitored Extensions Picker for this Domain */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-800">
                          داخلی‌های مجاز دامین ({allowedExtensionsForCurrentDomain.length} داخلی در این دامین):
                        </span>
                        <div className="flex items-center gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSelectAllExtensionsForDomain(currentUserPerm.userId)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-medium transition cursor-pointer"
                          >
                            انتخاب همه خطوط دامین
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
                          placeholder={`جستجوی داخلی یا نام همکار در ${currentUserDomain.display_name}...`}
                          className="w-full pl-8 pr-8 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5" />
                      </div>

                      {/* Extensions Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                        {displayedAllowedExtensions.length === 0 ? (
                          <div className="col-span-2 text-center py-6 text-neutral-400 text-xs">
                            داخلی‌ای در این دامین مطابق با عبارت جستجو یافت نشد.
                          </div>
                        ) : (
                          displayedAllowedExtensions.map((ext) => {
                            const isChecked = currentUserPerm.monitoredExtensions.includes(
                              ext.extension
                            );
                            return (
                              <label
                                key={ext.extension}
                                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                                  isChecked
                                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-medium shadow-2xs'
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
                                    <div className="text-[10px] text-neutral-500 truncate">
                                      {ext.department}
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
                  <div className="text-center py-10 text-neutral-400 text-xs">
                    کاربری انتخاب نشده است.
                  </div>
                )}
              </div>
            </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 border-t border-neutral-200 p-4 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            تخصیص‌ها با تفکیک سرورهای ایزابل هر دامین ذخیره و بلادرنگ اعمال خواهند شد.
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
