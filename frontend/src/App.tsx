import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  LayoutGrid,
  ListFilter,
  Plus,
  Printer,
  Download,
  Star,
  RotateCcw,
  CheckCircle2,
  X,
  Phone,
  Network,
  ShieldCheck,
  UserCheck,
  Globe,
  Lock,
  Users,
  Building2,
  Server,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Contact, User, LaravelConfig, ViewMode, LdapDomain, Department, ApiUsageStatus, UserBlfPermission, BlfExtensionInfo } from './types';
import {
  getSavedLaravelConfig,
  saveLaravelConfig,
  getStoredContacts,
  saveStoredContacts,
  getStoredAuthUser,
  saveStoredAuthUser,
  getStoredUserFavorites,
  saveStoredUserFavorites,
  getStoredLdapDomains,
  saveStoredLdapDomains,
  getStoredDepartments,
  saveStoredDepartments,
  fetchDepartmentsFromApi,
  saveDepartmentsToApi,
  saveContactsOrderToApi,
  fetchContactsFromApi,
  saveContactToApi,
  savePersonalMobilesToApi,
  deleteContactFromApi,
  toggleFavoriteOnApi,
  fetchDomainsFromApi,
  saveDomainsToApi,
  fetchBlfPermissionsFromApi,
  saveBlfPermissionsToApi,
  fetchBlfExtensionStatesFromApi,
} from './services/apiService';
import {
  getStoredBlfPermissions,
  saveStoredBlfPermissions,
  getStoredBlfStates,
  saveStoredBlfStates,
  subscribeToBlfUpdates,
  getMonitoredExtensionsData,
  getAllAvailableInternalExtensions,
  extractExtensionFromLandline,
} from './services/blfService';
import {
  subscribeToApiUsage,
  calculateUsageStatus,
  recordApiCall,
} from './services/rateLimitService';
import { normalizeSearchText, normalizePhoneNumber, matchContactToDomain, deduplicateDepartments, isWirelessLine, getUserDomainId, getVisibleLandlines } from './utils/phoneUtils';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { ContactCard } from './components/ContactCard';
import { ContactTable } from './components/ContactTable';
import { ContactModal } from './components/ContactModal';
import { ClickToCallModal } from './components/ClickToCallModal';
import { LaravelConfigModal } from './components/LaravelConfigModal';
import { LdapDomainModal } from './components/LdapDomainModal';
import { DepartmentModal } from './components/DepartmentModal';
import { PrintView } from './components/PrintView';
import { BlfSidePanel } from './components/BlfSidePanel';
import { BlfConfigModal } from './components/BlfConfigModal';
import { DragOrderModal } from './components/DragOrderModal';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const remembered = getStoredAuthUser();
    if (remembered) return remembered;
    try {
      const sessionUser = sessionStorage.getItem('enterprise_phonebook_auth_user_session');
      if (sessionUser) return JSON.parse(sessionUser);
    } catch (_) {}
    return null;
  });

  // API Rate Limit & Quota Monitoring State
  const [apiUsageStatus, setApiUsageStatus] = useState<ApiUsageStatus>(() => calculateUsageStatus());

  useEffect(() => {
    document.title = 'پُــرسا لینک';
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToApiUsage((status) => {
      setApiUsageStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Departments State
  const [departments, setDepartments] = useState<Department[]>(() => deduplicateDepartments(getStoredDepartments()));
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);

  // LDAP Domains State
  const [ldapDomains, setLdapDomains] = useState<LdapDomain[]>(() => getStoredLdapDomains());
  const [isLdapModalOpen, setIsLdapModalOpen] = useState(false);

  // Laravel Config State
  const [laravelConfig, setLaravelConfig] = useState<LaravelConfig>(() => getSavedLaravelConfig());

  // Contacts Data
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const raw = getStoredContacts();
    const user = getStoredAuthUser();
    const userId = user ? user.id : 'guest';
    const storedFavs = getStoredUserFavorites(userId);
    const userFavIds = new Set(storedFavs.map(String));

    return raw.map((c) => ({
      ...c,
      is_favorite: userFavIds.size > 0 ? userFavIds.has(String(c.id)) : Boolean(c.is_favorite),
    }));
  });

  // Automatically load and persist user-specific favorites when currentUser changes
  useEffect(() => {
    const user = currentUser || getStoredAuthUser();
    const userId = user ? user.id : 'guest';
    const storedFavs = getStoredUserFavorites(userId);
    const userFavIds = new Set(storedFavs.map(String));

    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        is_favorite: userFavIds.size > 0 ? userFavIds.has(String(c.id)) : Boolean(c.is_favorite),
      }))
    );

    setSelectedContact((prev) =>
      prev
        ? {
            ...prev,
            is_favorite: userFavIds.size > 0 ? userFavIds.has(String(prev.id)) : Boolean(prev.is_favorite),
          }
        : null
    );
  }, [currentUser?.id]);

  // Track active user to set their default domain filter tab on login/session restoration
  const activeUserDomainSetRef = useRef<number | string | null>(null);

  // View & Filter States
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  // Selected category / domain tab in phonebook (defaults to logged-in user's domain if authenticated)
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const rememberedUser = getStoredAuthUser();
    if (rememberedUser) {
      const storedDomains = getStoredLdapDomains();
      const domId = getUserDomainId(rememberedUser, storedDomains);
      if (domId) return domId;
    }
    return 'all';
  });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'public' | 'private'>('all');
  const [sortBy, setSortBy] = useState<'custom' | 'name' | 'personnel_code' | 'department' | 'created_at'>('custom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(24);

  // Synchronize default filter tab to logged-in user's domain upon login or restoration
  useEffect(() => {
    if (currentUser) {
      if (activeUserDomainSetRef.current !== currentUser.id) {
        activeUserDomainSetRef.current = currentUser.id;
        const userDomainId = getUserDomainId(currentUser, ldapDomains, contacts);
        if (userDomainId) {
          setSelectedCategory(userDomainId);
        }
      }
    } else {
      if (activeUserDomainSetRef.current !== null) {
        activeUserDomainSetRef.current = null;
        setSelectedCategory('all');
      }
    }
  }, [currentUser, ldapDomains, contacts]);

  // Modals & Panels
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInitialCompany, setCreateInitialCompany] = useState<string>('');
  const [createInitialContactType, setCreateInitialContactType] = useState<'internal' | 'external'>('internal');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLaravelConfigOpen, setIsLaravelConfigOpen] = useState(false);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const [isDragOrderModalOpen, setIsDragOrderModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [callTarget, setCallTarget] = useState<{ number: string; contact: Contact; title?: string } | null>(null);

  // BLF (Busy Lamp Field) State & Permissions
  const [blfPermissions, setBlfPermissions] = useState<UserBlfPermission[]>(() => getStoredBlfPermissions());
  const [blfStates, setBlfStates] = useState(() => getStoredBlfStates());
  const [isBlfPanelOpen, setIsBlfPanelOpen] = useState(false);
  const [isBlfConfigModalOpen, setIsBlfConfigModalOpen] = useState(false);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Synchronize with Live Laravel Database API
  useEffect(() => {
    let isMounted = true;
    setIsLoadingApi(true);

    // 1. Fetch live contacts
    fetchContactsFromApi(laravelConfig)
      .then((apiContacts) => {
        if (!isMounted) return;
        if (Array.isArray(apiContacts)) {
          const user = currentUser || getStoredAuthUser();
          const userId = user ? user.id : 'guest';
          const storedFavs = getStoredUserFavorites(userId);
          const favSet = new Set(storedFavs.map(String));

          const mergedContacts = apiContacts.map((c) => ({
            ...c,
            is_favorite: favSet.size > 0 ? favSet.has(String(c.id)) : Boolean(c.is_favorite),
          }));

          setContacts(mergedContacts);
          saveStoredContacts(mergedContacts);

          // اگر پنجره نمایش جزئیات مخاطب باز است، اطلاعات آن را هم همگام کنیم
          setSelectedContact((prev) => {
            if (!prev) return null;
            const match = mergedContacts.find((c) => String(c.id) === String(prev.id));
            return match || prev;
          });
        }
        setIsLoadingApi(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Could not fetch contacts from live API (using cached):', err);
        setContacts((prev) => (prev && prev.length > 0 ? prev : getStoredContacts()));
        setIsLoadingApi(false);
      });

    // 2. Fetch live LDAP domains from database (fetch full admin details if admin is logged in)
    fetchDomainsFromApi(laravelConfig, currentUser?.role === 'admin')
      .then((apiDomains) => {
        if (!isMounted) return;
        if (Array.isArray(apiDomains) && apiDomains.length > 0) {
          setLdapDomains(apiDomains);
          saveStoredLdapDomains(apiDomains);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch domains from live API (using cached):', err);
        setLdapDomains((prev) => (prev && prev.length > 0 ? prev : getStoredLdapDomains()));
      });

    // 3. Fetch live Departments from database
    fetchDepartmentsFromApi(laravelConfig)
      .then((apiDepartments) => {
        if (!isMounted) return;
        if (Array.isArray(apiDepartments) && apiDepartments.length > 0) {
          const cleanDepts = deduplicateDepartments(apiDepartments);
          setDepartments(cleanDepts);
          saveStoredDepartments(cleanDepts);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch departments from live API (using cached):', err);
        setDepartments((prev) => deduplicateDepartments(prev && prev.length > 0 ? prev : getStoredDepartments()));
      });

    // 4. Fetch live BLF Permissions from database
    fetchBlfPermissionsFromApi(laravelConfig)
      .then((apiPerms) => {
        if (!isMounted) return;
        if (Array.isArray(apiPerms) && apiPerms.length > 0) {
          setBlfPermissions(apiPerms);
          saveStoredBlfPermissions(apiPerms);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch BLF permissions from live API (using local cache):', err);
      });

    return () => {
      isMounted = false;
    };
  }, [laravelConfig.baseUrl, laravelConfig.apiPrefix, laravelConfig.token, currentUser?.role]);

  // Subscribe to live BLF updates (Asterisk AMI event-driven changes)
  useEffect(() => {
    const unsub = subscribeToBlfUpdates((newStates) => {
      setBlfStates({ ...newStates });
    });
    return () => unsub();
  }, []);

  // Timer to increment durationSec for busy calls (live call timer)
  useEffect(() => {
    const timer = setInterval(() => {
      setBlfStates((prev) => {
        let hasBusy = false;
        const next = { ...prev };
        Object.keys(next).forEach((ext) => {
          if (next[ext].state === 'busy') {
            hasBusy = true;
            next[ext] = {
              ...next[ext],
              durationSec: (next[ext].durationSec || 0) + 1,
            };
          }
        });
        return hasBusy ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine if current user has BLF permission and what extensions to monitor
  const currentUserBlfPerm = useMemo(() => {
    if (!currentUser) return null;

    const currentUserIdStr = currentUser.id != null ? String(currentUser.id) : '';
    const cleanUser = (currentUser.username || '').trim().toLowerCase();
    const cleanEmail = (currentUser.email || '').trim().toLowerCase();
    const cleanPersonnel = (currentUser.personnel_code || '').trim();
    const cleanExt = (currentUser.extension || '').trim();
    const cleanName = normalizeSearchText(currentUser.name || '');

    // 1. Direct match on blfPermissions by userId or contactId
    let found = blfPermissions.find((p) => {
      if (currentUserIdStr && String(p.userId) === currentUserIdStr) return true;
      if (p.contactId && String(p.contactId) === currentUserIdStr) return true;
      return false;
    });

    // 2. Direct match on blfPermissions by username, email, personnel_code, extension
    if (!found) {
      found = blfPermissions.find((p) => {
        if (cleanUser && p.userUsername && p.userUsername.trim().toLowerCase() === cleanUser) return true;
        if (cleanEmail && p.userEmail && p.userEmail.trim().toLowerCase() === cleanEmail) return true;
        if (cleanPersonnel && p.personnelCode && String(p.personnelCode).trim() === cleanPersonnel) return true;
        if (cleanExt && p.userExtension && String(p.userExtension).trim() === cleanExt) return true;
        return false;
      });
    }

    // 3. Match via contact book: find the contact representing currentUser, then find their permission
    if (!found && contacts.length > 0) {
      const userMatchedContact = contacts.find((c) => {
        if (currentUserIdStr && String(c.id) === currentUserIdStr) return true;
        if (cleanUser && c.ldap_username && c.ldap_username.trim().toLowerCase() === cleanUser) return true;
        if (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail) return true;
        if (cleanPersonnel && c.personnel_code && String(c.personnel_code).trim() === cleanPersonnel) return true;
        if (cleanExt && c.landlines?.some((l) => extractExtensionFromLandline(l) === cleanExt)) return true;
        if (cleanName) {
          const cName = normalizeSearchText(`${c.first_name || ''} ${c.last_name || ''}`);
          if (cName && (cName === cleanName || cName.includes(cleanName) || cleanName.includes(cName))) {
            return true;
          }
        }
        return false;
      });

      if (userMatchedContact) {
        const cIdStr = String(userMatchedContact.id);
        const cLdapUser = (userMatchedContact.ldap_username || '').trim().toLowerCase();
        const cEmail = (userMatchedContact.email || '').trim().toLowerCase();
        const cPersonnel = (userMatchedContact.personnel_code || '').trim();
        const cExt = userMatchedContact.landlines?.map(extractExtensionFromLandline).find(Boolean) || '';
        const cFullName = normalizeSearchText(`${userMatchedContact.first_name || ''} ${userMatchedContact.last_name || ''}`);

        found = blfPermissions.find((p) => {
          if (String(p.userId) === cIdStr || (p.contactId && String(p.contactId) === cIdStr)) return true;
          if (cLdapUser && p.userUsername && p.userUsername.trim().toLowerCase() === cLdapUser) return true;
          if (cEmail && p.userEmail && p.userEmail.trim().toLowerCase() === cEmail) return true;
          if (cPersonnel && p.personnelCode && String(p.personnelCode).trim() === cPersonnel) return true;
          if (cExt && p.userExtension && String(p.userExtension).trim() === cExt) return true;
          if (cFullName) {
            const pNorm = normalizeSearchText(p.userName || '');
            if (pNorm && (pNorm === cFullName || pNorm.includes(cFullName) || cFullName.includes(pNorm))) return true;
          }
          return false;
        });
      }
    }

    // 4. Match by normalized user name or username comparison directly
    if (!found) {
      found = blfPermissions.find((p) => {
        const pNorm = normalizeSearchText(p.userName || '');
        if (cleanName && pNorm && (pNorm === cleanName || pNorm.includes(cleanName) || cleanName.includes(pNorm))) {
          return true;
        }
        if (cleanUser && pNorm && pNorm === cleanUser) {
          return true;
        }
        return false;
      });
    }

    // 5. Fallback for administrator
    if (!found && currentUser.role === 'admin') {
      const userDomainObj = ldapDomains.find(
        (d) => String(d.id) === String(currentUser.domain) || d.name === currentUser.domain
      ) || ldapDomains[0];

      return {
        userId: typeof currentUser.id === 'number' ? currentUser.id : 1,
        userName: currentUser.name,
        role: 'admin' as const,
        department: currentUser.department,
        domainId: userDomainObj?.id || '1',
        domainName: userDomainObj?.display_name || userDomainObj?.name || currentUser.domain || 'دامین پیش‌فرض',
        canViewBlf: true,
        canViewAll: true,
        monitoredExtensions: [],
      };
    }

    if (found) {
      const userDomainObj = ldapDomains.find(
        (d) => String(d.id) === String(found?.domainId) || d.name === found?.domainName
      ) || ldapDomains[0];

      const hasExtensions = Array.isArray(found.monitoredExtensions) && found.monitoredExtensions.length > 0;
      const canView = found.canViewBlf !== false && (Boolean(found.canViewBlf) || Boolean(found.canViewAll) || hasExtensions || currentUser.role === 'admin');

      return {
        ...found,
        domainId: found.domainId || userDomainObj?.id || '1',
        domainName: found.domainName || userDomainObj?.display_name || 'دامین پیش‌فرض',
        canViewBlf: canView,
      };
    }

    return null;
  }, [currentUser, blfPermissions, ldapDomains, contacts]);

  const canViewBlf = Boolean(
    currentUserBlfPerm &&
    (currentUserBlfPerm.canViewBlf ||
     currentUserBlfPerm.canViewAll ||
     (currentUserBlfPerm.monitoredExtensions && currentUserBlfPerm.monitoredExtensions.length > 0) ||
     currentUser?.role === 'admin')
  );

  // BLF panel remains closed by default upon login (user opens manually when needed)

  const monitoredExtensionsData: BlfExtensionInfo[] = useMemo(() => {
    if (!canViewBlf || !currentUserBlfPerm) return [];

    let extsToMonitor = currentUserBlfPerm.monitoredExtensions || [];

    // اگر کاربر مدیر است، دسترسی مشاهده همه دارد، یا هیچ داخلی خاصی مشخص نشده، تمام داخلی‌های دامین مربوطه را نمایش دهد
    if (
      currentUser?.role === 'admin' ||
      currentUserBlfPerm.canViewAll ||
      extsToMonitor.length === 0
    ) {
      const allAvail = getAllAvailableInternalExtensions(contacts, currentUser, ldapDomains);
      const curDomId = String(currentUserBlfPerm.domainId || '1');
      const domainAvail = allAvail.filter((e) => !e.domainId || String(e.domainId) === curDomId);
      if (extsToMonitor.length === 0) {
        extsToMonitor = (domainAvail.length > 0 ? domainAvail : allAvail).map((e) => e.extension);
      }
    }

    return getMonitoredExtensionsData(
      extsToMonitor,
      contacts,
      blfStates,
      currentUserBlfPerm.domainId
    );
  }, [canViewBlf, currentUserBlfPerm, contacts, blfStates, currentUser, ldapDomains]);

  // Active live polling of BLF extension states from server PBX / Asterisk AMI
  useEffect(() => {
    if (!canViewBlf || !currentUserBlfPerm) return;

    let isMounted = true;
    const targetDomainObj = ldapDomains.find(
      (d) => String(d.id) === String(currentUserBlfPerm.domainId) || d.name === currentUserBlfPerm.domainName
    ) || ldapDomains[0];

    const pollStates = async () => {
      try {
        const exts = (monitoredExtensionsData || []).map((e) => e.extension);
        if (exts.length === 0) return;

        const liveStates = await fetchBlfExtensionStatesFromApi({
          domainId: currentUserBlfPerm.domainId,
          extensions: exts,
          domain: targetDomainObj,
          config: laravelConfig,
        });

        if (isMounted && liveStates && Object.keys(liveStates).length > 0) {
          setBlfStates((prev) => {
            let hasChanged = false;
            const next = { ...prev };
            Object.entries(liveStates).forEach(([ext, val]) => {
              const currentVal = next[ext];
              const newState = val.state || 'idle';
              const newDuration = newState === 'busy' ? (val.durationSec || 0) : 0;
              const newCaller = newState === 'busy' ? val.callerNumber : undefined;

              if (
                !currentVal ||
                currentVal.state !== newState ||
                currentVal.durationSec !== newDuration ||
                currentVal.callerNumber !== newCaller
              ) {
                hasChanged = true;
              }
              next[ext] = {
                state: newState,
                durationSec: newDuration,
                callerNumber: newCaller,
              };
            });
            if (hasChanged) {
              saveStoredBlfStates(next);
              return next;
            }
            return prev;
          });
        }
      } catch (err) {
        // Transient network error
      }
    };

    pollStates();
    const interval = setInterval(pollStates, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [canViewBlf, currentUserBlfPerm, ldapDomains, laravelConfig, monitoredExtensionsData.length]);

  const handleSaveBlfPermissions = async (newPermissions: UserBlfPermission[]) => {
    setBlfPermissions(newPermissions);
    saveStoredBlfPermissions(newPermissions);

    // Save to Laravel Database
    try {
      const res = await saveBlfPermissionsToApi(newPermissions, laravelConfig);
      if (res.success) {
        showToast('سطوح دسترسی BLF با موفقیت در دیتابیس ثبت و اعمال شد.');
      } else {
        showToast(`تنظیمات ذخیره شد (پیام دیتابیس: ${res.message})`);
      }
    } catch {
      showToast('تنظیمات در حافظه محلی ذخیره شد اما اتصال به دیتابیس با وقفه مواجه شد.');
    }
  };

  const handleFilterByCompany = (companyName: string) => {
    if (!companyName) return;
    setSelectedCategory(`comp:${companyName}`);
    setSearchQuery('');
    window.scrollTo({ top: 250, behavior: 'smooth' });
  };

  const handleInitiateCall = (targetNumber: string, contact: Contact, title?: string) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      showToast('جهت برقراری تماس مستقیم (Click to Call) با داخلی‌ها، ابتدا با اکانت سازمانی وارد شوید.');
      return;
    }
    if (!currentUser.extension || currentUser.extension.trim() === '') {
      showToast('شماره داخلی تلفن سازمانی شما در سامانه ثبت نشده است و امکان برقراری تماس وجود ندارد.');
      return;
    }
    if (apiUsageStatus.isRateLimited) {
      showToast(`محدودیت موقت سهمیه API: جهت پیشگیری از خطای سرور، لطفاً ${apiUsageStatus.resetTimeRemainingSec} ثانیه شکیبا باشید.`);
      return;
    }
    recordApiCall(1);
    setCallTarget({ number: targetNumber, contact, title });
  };

  // Sync contacts to storage
  const updateContacts = (newContacts: Contact[]) => {
    setContacts(newContacts);
    saveStoredContacts(newContacts);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Auth Handlers
  const handleLoginSuccess = (user: User, remember: boolean = true) => {
    setCurrentUser(user);
    if (remember) {
      saveStoredAuthUser(user);
    } else {
      // In session-only mode, don't persist user across browser restarts
      sessionStorage.setItem('enterprise_phonebook_auth_user_session', JSON.stringify(user));
      saveStoredAuthUser(null);
    }
    activeUserDomainSetRef.current = user.id;
    const userDomainId = getUserDomainId(user, ldapDomains, contacts);
    if (userDomainId) {
      setSelectedCategory(userDomainId);
    }
    // Refresh BLF permissions from server upon login so new permissions apply immediately
    fetchBlfPermissionsFromApi(laravelConfig)
      .then((apiPerms) => {
        if (Array.isArray(apiPerms) && apiPerms.length > 0) {
          setBlfPermissions(apiPerms);
          saveStoredBlfPermissions(apiPerms);
        }
      })
      .catch(() => {});
    showToast(`ورود موفقیت‌آمیز: ${user.name} (${user.role === 'admin' ? 'مدیر سیستم' : 'پرسنل سازمانی'})`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveStoredAuthUser(null);
    sessionStorage.removeItem('enterprise_phonebook_auth_user_session');
    localStorage.removeItem('enterprise_phonebook_auth_token');
    sessionStorage.removeItem('enterprise_phonebook_auth_token');
    activeUserDomainSetRef.current = null;
    setSelectedCategory('all');
    setSearchQuery('');
    setFavoritesOnly(false);
    setIsBlfPanelOpen(false);
    setScopeFilter('all');
    setSelectedContact(null);
  };

  // Save Laravel Config
  const handleSaveLaravelConfig = (newConfig: LaravelConfig) => {
    setLaravelConfig(newConfig);
    saveLaravelConfig(newConfig);

    showToast('در حال بارگذاری اطلاعات از پایگاه داده سرور...');
    setIsLoadingApi(true);

    // Fetch contacts, domains, and departments in parallel
    Promise.all([
      fetchContactsFromApi(newConfig),
      fetchDomainsFromApi(newConfig, currentUser?.role === 'admin'),
      fetchDepartmentsFromApi(newConfig),
    ])
      .then(([apiContacts, apiDomains, apiDepartments]) => {
        setContacts(apiContacts);
        saveStoredContacts(apiContacts);

        if (Array.isArray(apiDomains) && apiDomains.length > 0) {
          setLdapDomains(apiDomains);
          saveStoredLdapDomains(apiDomains);
        }

        if (Array.isArray(apiDepartments) && apiDepartments.length > 0) {
          const cleanDepts = deduplicateDepartments(apiDepartments);
          setDepartments(cleanDepts);
          saveStoredDepartments(cleanDepts);
        }

        setIsLoadingApi(false);
        showToast(`ارتباط با پایگاه داده برقرار شد (${apiContacts.length} مخاطب و ${apiDepartments.length} واحد دریافت گردید).`);
      })
      .catch((err) => {
        setIsLoadingApi(false);
        showToast('خطا در دریافت اطلاعات از سرور: ' + (err?.message || 'پاسخ نامعتبر'));
      });
  };

  // Save LDAP Domains
  const handleSaveLdapDomains = (updatedDomains: LdapDomain[]) => {
    setLdapDomains(updatedDomains);
    saveStoredLdapDomains(updatedDomains);

    saveDomainsToApi(updatedDomains, laravelConfig).catch((err) => {
      console.warn('Could not sync domains with server:', err);
    });

    showToast('تنظیمات دامین‌های سازمانی LDAP با موفقیت ذخیره شد.');
  };

  // Save Departments (Admin)
  const handleSaveDepartments = (updatedDepartments: Department[]) => {
    const clean = deduplicateDepartments(updatedDepartments);
    setDepartments(clean);
    saveStoredDepartments(clean);

    saveDepartmentsToApi(clean, laravelConfig)
      .then((serverDepartments) => {
        if (Array.isArray(serverDepartments) && serverDepartments.length > 0) {
          const freshClean = deduplicateDepartments(serverDepartments);
          setDepartments(freshClean);
          saveStoredDepartments(freshClean);
        }
        showToast('واحدهای سازمانی با موفقیت در دیتابیس سرور همگام‌سازی شدند.');
      })
      .catch((err) => {
        console.warn('Could not sync departments with server:', err);
        showToast('خطا در همگام‌سازی واحدها با دیتابیس سرور: ' + (err?.message || 'نامشخص'));
      });
  };

  // Favorite Toggle (Permanently stored per user in database / localStorage)
  const handleToggleFavorite = (id: number | string) => {
    if (!currentUser) {
      showToast('برای نشان‌گذاری مخاطبین لطفاً ابتدا وارد حساب کاربری خود شوید');
      return;
    }

    const targetIdStr = String(id);
    let newFavState = false;

    const updated = contacts.map((c) => {
      if (String(c.id) === targetIdStr) {
        newFavState = !c.is_favorite;
        return { ...c, is_favorite: newFavState };
      }
      return c;
    });
    updateContacts(updated);

    // به‌روزرسانی بلافاصله مخاطب انتخابی در صورت باز بودن پنجره جزئیات
    setSelectedContact((prev) =>
      prev && String(prev.id) === targetIdStr
        ? { ...prev, is_favorite: newFavState }
        : prev
    );

    // ذخیره دائمی نشان‌های کاربر در حافظه محلی
    const user = currentUser || getStoredAuthUser();
    const userId = user ? user.id : 'guest';
    const activeFavIds = updated
      .filter((c) => c.is_favorite)
      .map((c) => c.id);
    saveStoredUserFavorites(userId, activeFavIds);

    // ارسال به دیتابیس با وضعیت جدید
    toggleFavoriteOnApi(id, laravelConfig, newFavState);
  };

  // Save Contact (Create or Edit)
  const handleSaveContact = async (contactToSave: Contact) => {
    // If the department was typed freely and is new, auto-register it to the department list
    if (contactToSave.department && contactToSave.department.trim()) {
      const deptTrimmed = contactToSave.department.trim();
      const existsInDepts = departments.some(
        (d) => d.name.trim().toLowerCase() === deptTrimmed.toLowerCase()
      );
      if (!existsInDepts) {
        const newDept: Department = {
          id: `dept-${Date.now()}`,
          name: deptTrimmed,
          code: `D${departments.length}`,
        };
        const updatedDepts = [...departments, newDept];
        setDepartments(updatedDepts);
        saveStoredDepartments(updatedDepts);
      }
    }

    const exists = contacts.some((c) => String(c.id) === String(contactToSave.id));
    const existing = exists ? contacts.find((c) => String(c.id) === String(contactToSave.id)) : null;

    // کنترل سطح دسترسی:
    // - کاربر عادی مجاز به ویرایش فیلدهای اصلی مخاطب ایجادشده توسط دیگران نیست.
    // - اما کلیه کاربران لاگین مجاز هستند شماره همراه در دفترچه تلفن شخصی (personal_mobiles) خود را چه برای مخاطبینی که خود ثبت کرده‌اند و چه مخاطبین عمومی ثبت نمایند.
    if (exists && existing) {
      const isAdmin = currentUser?.role === 'admin';
      const isOwner = existing && currentUser ? String(existing.created_by_user_id) === String(currentUser.id) : false;
      const isSystemContact = !existing?.created_by_user_id;

      const isOnlyPersonalMobilesUpdate =
        Boolean(currentUser) &&
        existing.first_name === contactToSave.first_name &&
        existing.last_name === contactToSave.last_name &&
        existing.job_title === contactToSave.job_title &&
        existing.department === contactToSave.department &&
        existing.location === contactToSave.location &&
        existing.email === contactToSave.email;

      if (currentUser && !isAdmin && !isOwner && !isSystemContact && !isOnlyPersonalMobilesUpdate) {
        showToast('شما فقط مجاز به ویرایش مخاطبینی هستید که خودتان در سامانه ثبت کرده‌اید.');
        return;
      }
    } else {
      if (!currentUser) {
        showToast('برای ثبت مخاطب جدید، لطفاً ابتدا وارد حساب کاربری خود شوید.');
        setIsLoginModalOpen(true);
        return;
      }
    }

    const isAdminUser = currentUser?.role === 'admin';

    // اگر مخاطب موجود است و کاربر غیر ادمین در حال ویرایش است (مثلاً ثبت شماره شخصی)، وضعیت عمومی بودن مخاطب باید محفوظ بماند
    const resolvedIsPublic = existing
      ? (isAdminUser ? (contactToSave.is_public !== undefined ? Boolean(contactToSave.is_public) : existing.is_public) : existing.is_public)
      : (isAdminUser ? (contactToSave.is_public !== undefined ? Boolean(contactToSave.is_public) : true) : false);

    const resolvedIsMobilePublic = existing
      ? (isAdminUser && resolvedIsPublic
          ? (contactToSave.is_mobile_public !== undefined ? Boolean(contactToSave.is_mobile_public) : (existing.is_mobile_public ?? false))
          : (existing.is_mobile_public ?? false))
      : (isAdminUser && resolvedIsPublic
          ? (contactToSave.contact_type === 'internal' ? Boolean(contactToSave.is_mobile_public) : true)
          : false);

    const resolvedCreatorId = existing
      ? (existing.created_by_user_id || 1)
      : (contactToSave.created_by_user_id !== undefined && contactToSave.created_by_user_id !== null && contactToSave.created_by_user_id !== 0
          ? contactToSave.created_by_user_id
          : (currentUser?.id || 1));

    const mergedPersonalMobiles = {
      ...(existing?.personal_mobiles || {}),
      ...(contactToSave.personal_mobiles || {}),
    };

    let finalContact: Contact = {
      ...contactToSave,
      created_by_user_id: resolvedCreatorId,
      is_public: resolvedIsPublic,
      is_mobile_public: resolvedIsMobilePublic,
      personal_mobiles: mergedPersonalMobiles,
    };

    // Send to Live API directly
    try {
      const apiResult = await saveContactToApi(finalContact, laravelConfig, !exists);
      finalContact = {
        ...finalContact,
        ...apiResult,
        created_by_user_id: apiResult.created_by_user_id || finalContact.created_by_user_id || resolvedCreatorId,
        // اطمینان از حفظ مقادیر دامین انتخاب‌شده توسط کاربر در فرم
        domain: contactToSave.domain || apiResult.domain,
        domain_id: contactToSave.domain_id || apiResult.domain_id,
        domain_name: contactToSave.domain_name || apiResult.domain_name,
      };
    } catch (err: any) {
      console.error('Error saving to API:', err);
      // حتی در صورت خطای شبکه، تغییرات به‌صورت محلی ذخیره می‌شوند
      finalContact = {
        ...contactToSave,
        created_by_user_id: resolvedCreatorId,
      };
      showToast('اطلاعات به‌صورت محلی ثبت شد (عدم پاسخ سرور)');
    }

    let updated: Contact[];
    const cleanLast = finalContact.prefix_title === 'location' && finalContact.last_name === '-' ? '' : (finalContact.last_name || '');
    const prefix = finalContact.prefix_title === 'ms' ? 'خانم' : finalContact.prefix_title === 'location' ? '' : 'آقای';
    const displayName = prefix
      ? `${prefix} ${finalContact.first_name} ${cleanLast}`.trim()
      : `${finalContact.first_name} ${cleanLast}`.trim();

    if (exists) {
      updated = contacts.map((c) =>
        String(c.id) === String(contactToSave.id) || String(c.id) === String(finalContact.id)
          ? finalContact
          : c
      );
      showToast(`اطلاعات «${displayName}» با موفقیت بروزرسانی شد.`);
      if (
        selectedContact &&
        (String(selectedContact.id) === String(contactToSave.id) ||
          String(selectedContact.id) === String(finalContact.id))
      ) {
        setSelectedContact(finalContact);
      }
    } else {
      updated = [finalContact, ...contacts];
      showToast(`مخاطب جدید «${displayName}» با موفقیت ذخیره شد.`);
      setSelectedContact(null);
    }
    recordApiCall(1);
    updateContacts(updated);
    setIsCreateModalOpen(false);
  };

  // ثبت و به‌روزرسانی مستقیم شماره‌های همراه در دفترچه تلفن شخصی کاربر
  const handleUpdatePersonalMobiles = async (
    contactId: number | string,
    updatedPersonalMobiles: Record<string | number, string[]>
  ) => {
    if (!currentUser) {
      showToast('برای ثبت در دفترچه تلفن شخصی، ابتدا وارد حساب کاربری خود شوید.');
      setIsLoginModalOpen(true);
      return;
    }

    const targetIndex = contacts.findIndex((c) => String(c.id) === String(contactId));
    if (targetIndex === -1) return;

    const currentContact = contacts[targetIndex];
    const updatedContact: Contact = {
      ...currentContact,
      personal_mobiles: updatedPersonalMobiles,
      updated_at: new Date().toISOString(),
    };

    const updatedContacts = [...contacts];
    updatedContacts[targetIndex] = updatedContact;
    updateContacts(updatedContacts);

    if (selectedContact && String(selectedContact.id) === String(contactId)) {
      setSelectedContact(updatedContact);
    }

    try {
      await savePersonalMobilesToApi(contactId, updatedPersonalMobiles);
      recordApiCall(1);
    } catch (err) {
      console.warn('Could not sync personal mobiles to API, stored locally:', err);
    }
  };

  // Delete Contact
  const handleDeleteContact = (id: number | string) => {
    const contactToDelete = contacts.find((c) => String(c.id) === String(id));
    if (contactToDelete) {
      const isAdmin = currentUser?.role === 'admin';
      const isOwner = currentUser ? contactToDelete.created_by_user_id === currentUser.id : false;
      if (!isAdmin && !isOwner) {
        showToast('شما فقط مجاز به حذف مخاطبینی هستید که خودتان در سامانه ثبت کرده‌اید.');
        return;
      }
    }

    const updated = contacts.filter((c) => String(c.id) !== String(id));
    updateContacts(updated);
    setSelectedContact(null);

    deleteContactFromApi(id, laravelConfig).catch((err) => {
      console.error('Error deleting from API:', err);
    });

    showToast('پرسنل مورد نظر از سامانه حذف شد.');
  };

  // Reorder Contacts (Admin Drag & Drop)
  const handleSaveContactsOrder = async (reorderedList: Contact[]) => {
    // Map existing contacts with updated display_order
    const orderMap = new Map<string, number>();
    reorderedList.forEach((c, idx) => {
      orderMap.set(String(c.id), typeof c.display_order === 'number' ? c.display_order : idx + 1);
    });

    const updated = contacts.map((c) => {
      const order = orderMap.get(String(c.id));
      return order !== undefined ? { ...c, display_order: order } : c;
    });

    // Sort full contacts locally according to updated order
    updated.sort((a, b) => {
      const orderA = typeof a.display_order === 'number' ? a.display_order : 999999;
      const orderB = typeof b.display_order === 'number' ? b.display_order : 999999;
      return orderA - orderB;
    });

    updateContacts(updated);
    showToast('ترتیب و چیدمان جدید مخاطبین ذخیره شد.');

    // Save orders to server
    const orderPayload = reorderedList.map((c, idx) => ({
      id: c.id,
      display_order: typeof c.display_order === 'number' ? c.display_order : idx + 1,
    }));
    await saveContactsOrderToApi(orderPayload, laravelConfig);
  };

  // ACCESSIBILITY LOGIC:
  // - Unauthenticated (guest): views all public organizational contacts across the 3 domains and external companies.
  // - Authenticated Staff: views public contacts + their own created contacts.
  // - Admin: views all contacts in the database.
  const accessibleContacts = useMemo(() => {
    if (!currentUser) {
      // Guest / Public view: see all public directory records
      return contacts.filter((c) => c.is_public !== false);
    }

    // Admin sees ALL contacts in the enterprise directory
    if (currentUser.role === 'admin') {
      return contacts;
    }

    // Regular staff user sees:
    // 1. Public organizational contacts (is_public === true)
    // 2. Contacts created specifically by this user (created_by_user_id === currentUser.id)
    return contacts.filter(
      (c) => c.is_public === true || c.created_by_user_id === currentUser.id
    );
  }, [contacts, currentUser]);

  // Distinct external companies for the filter tabs
  const externalCompanies = useMemo(() => {
    const map = new Map<string, number>();
    accessibleContacts.forEach((c) => {
      if (c.contact_type === 'external' && c.company_name?.trim()) {
        const name = c.company_name.trim();
        map.set(name, (map.get(name) || 0) + 1);
      }
    });
    const result: { name: string; count: number }[] = [];
    map.forEach((count, name) => {
      result.push({ name, count });
    });
    return result;
  }, [accessibleContacts]);

  // Companies matching current search query for instant discovery
  const searchMatchedCompanies = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const normQ = normalizeSearchText(searchQuery);
    return externalCompanies.filter((c) => {
      const normC = normalizeSearchText(c.name);
      return normC.includes(normQ) || normQ.includes(normC);
    });
  }, [searchQuery, externalCompanies]);

  // Filtered Contacts Logic
  const filteredContacts = useMemo(() => {
    return accessibleContacts.filter((contact) => {
      // Scope filter (Mine vs Public vs Private vs All)
      if (scopeFilter === 'mine') {
        if (!currentUser || contact.created_by_user_id !== currentUser.id) return false;
      } else if (scopeFilter === 'public') {
        if (contact.is_public === false) return false;
      } else if (scopeFilter === 'private') {
        if (contact.is_public !== false) return false;
      }

      // Domain & External Company filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'external_all') {
          if (contact.contact_type !== 'external') return false;
        } else if (selectedCategory.startsWith('comp:')) {
          const compName = selectedCategory.replace('comp:', '');
          if (
            contact.contact_type !== 'external' ||
            normalizeSearchText(contact.company_name || '') !== normalizeSearchText(compName)
          ) {
            return false;
          }
        } else {
          // It's an LDAP domain ID (e.g., 'corp', 'factory', 'holding')
          const domObj = ldapDomains.find((d) => d.id === selectedCategory);
          if (domObj) {
            if (!matchContactToDomain(contact, domObj)) return false;
          } else {
            if (contact.contact_type === 'external') return false;
            if (contact.domain_id !== undefined && contact.domain_id !== null && String(contact.domain_id) !== String(selectedCategory)) return false;
          }
        }
      }

      // Favorites only
      if (favoritesOnly && !contact.is_favorite) {
        return false;
      }

      // Smart Multi-Token & Phone Search
      if (searchQuery.trim()) {
        const normQ = normalizeSearchText(searchQuery);
        const tokens = normQ.split(' ').filter(Boolean);

        const fullName = normalizeSearchText(`${contact.first_name} ${contact.last_name}`);
        const role = normalizeSearchText(contact.job_title || '');
        const dept = normalizeSearchText(contact.department || '');
        const loc = normalizeSearchText(contact.location || '');
        const emailStr = (contact.email || '').toLowerCase();
        const pCode = (contact.personnel_code || '').toLowerCase();
        const domName = normalizeSearchText(contact.domain_name || contact.domain || '');
        const compName = normalizeSearchText(contact.company_name || '');

        const visibleLinesForSearch = getVisibleLandlines(contact, currentUser);
        const landlineTitles = normalizeSearchText(
          visibleLinesForSearch
            .map((l) => `${l.title || ''} ${l.type === 'cordless' ? 'بی سیم بیسیم' : ''} ${l.type === 'remote' ? 'ریموت دورکاری' : ''}`)
            .join(' ')
        );

        const allText = `${fullName} ${role} ${dept} ${loc} ${emailStr} ${pCode} ${domName} ${compName} ${landlineTitles}`;

        const phonesRaw = [
          ...visibleLinesForSearch.map((l) => `${l.phone || ''} ${l.extension || ''}`),
          ...(contact.mobiles || []),
        ].join(' ');
        const normalizedPhones = normalizePhoneNumber(phonesRaw);

        // Every token in the search query must match either the textual fields or the phone numbers
        const tokensMatch = tokens.every((tok) => {
          if (allText.includes(tok)) return true;
          const tokNorm = normalizePhoneNumber(tok);
          if (tokNorm && normalizedPhones.includes(tokNorm)) return true;
          // also check raw token in phone numbers/extensions (e.g. extension '102')
          if (phonesRaw.toLowerCase().includes(tok)) return true;
          return false;
        });

        if (!tokensMatch) return false;
      }

      return true;
    });
  }, [accessibleContacts, selectedCategory, ldapDomains, favoritesOnly, searchQuery, scopeFilter, currentUser]);

  // Sorted Contacts Logic
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'custom') {
        const orderA = typeof a.display_order === 'number' ? a.display_order : 999999;
        const orderB = typeof b.display_order === 'number' ? b.display_order : 999999;
        if (orderA !== orderB) {
          comparison = orderA - orderB;
        } else {
          // Fallback to name if display_order is equal or unset
          const cleanLastA = a.prefix_title === 'location' && a.last_name === '-' ? '' : (a.last_name || '');
          const cleanLastB = b.prefix_title === 'location' && b.last_name === '-' ? '' : (b.last_name || '');
          const nameA = [a.first_name, cleanLastA].filter(Boolean).join(' ').trim();
          const nameB = [b.first_name, cleanLastB].filter(Boolean).join(' ').trim();
          comparison = nameA.localeCompare(nameB, 'fa');
        }
      } else if (sortBy === 'name') {
        const cleanLastA = a.prefix_title === 'location' && a.last_name === '-' ? '' : (a.last_name || '');
        const cleanLastB = b.prefix_title === 'location' && b.last_name === '-' ? '' : (b.last_name || '');
        const nameA = [a.first_name, cleanLastA].filter(Boolean).join(' ').trim();
        const nameB = [b.first_name, cleanLastB].filter(Boolean).join(' ').trim();
        comparison = nameA.localeCompare(nameB, 'fa');
      } else if (sortBy === 'personnel_code') {
        const codeA = (a.personnel_code || '').padStart(10, '0');
        const codeB = (b.personnel_code || '').padStart(10, '0');
        comparison = codeA.localeCompare(codeB);
      } else if (sortBy === 'department') {
        const deptA = (a.department || '').trim();
        const deptB = (b.department || '').trim();
        comparison = deptA.localeCompare(deptB, 'fa');
      } else if (sortBy === 'created_at') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = timeA - timeB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredContacts, sortBy, sortOrder]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedContacts.length / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedContacts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return sortedContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedContacts, safeCurrentPage, itemsPerPage]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, favoritesOnly, scopeFilter, itemsPerPage]);

  // Count metrics based on accessible contacts
  const totalCount = accessibleContacts.length;
  const favoritesCount = accessibleContacts.filter((c) => c.is_favorite).length;
  const departmentsCount = useMemo(() => {
    return departments.filter((d) => d.id !== 'all').length;
  }, [departments]);

  const myContactsCount = useMemo(() => {
    return accessibleContacts.filter((c) => c.created_by_user_id === currentUser?.id).length;
  }, [accessibleContacts, currentUser]);

  // CSV Export with UTF-8 BOM
  const handleExportCSV = () => {
    if (apiUsageStatus.isRateLimited) {
      showToast(`محدودیت نرخ مصرف API: لطفاً ${apiUsageStatus.resetTimeRemainingSec} ثانیه تا بازنشانی سهمیه شکیبا باشید.`);
      return;
    }
    recordApiCall(2);

    const headers = [
      'کد پرسنلی',
      'عنوان',
      'نام',
      'نام خانوادگی',
      'سمت سازمانی',
      'واحد سازمانی',
      'موقعیت استقرار',
      'خطوط تلفن ثابت و داخلی',
      'شماره‌های همراه',
      'پست الکترونیک',
      'وضعیت دسترسی',
      'توضیحات',
    ];

    const rows = filteredContacts.map((c) => [
      c.personnel_code || '',
      c.prefix_title === 'ms' ? 'خانم' : c.prefix_title === 'location' ? 'بدون عنوان (مکانی)' : 'آقای',
      c.first_name,
      c.last_name,
      c.job_title || '',
      c.department || '',
      c.location || '',
      c.landlines
        ? c.landlines
            .map((l) => `${l.extension ? `داخلی ${l.extension}` : ''}${l.phone ? ` (${l.phone})` : ''}`)
            .join(' | ')
        : '',
      c.mobiles ? c.mobiles.join(' - ') : '',
      c.email || '',
      c.is_public ? 'عمومی' : 'اختصاصی',
      c.description || '',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SmartContact_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('فایل اکسل مخاطبین با موفقیت دانلود شد.');
  };

  // Print View Overlay
  if (isPrintViewOpen) {
    return (
      <PrintView
        contacts={filteredContacts}
        ldapDomains={ldapDomains}
        onBack={() => setIsPrintViewOpen(false)}
        onClose={() => setIsPrintViewOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans text-neutral-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        laravelConfig={laravelConfig}
        onOpenLaravelSettings={() => setIsLaravelConfigOpen(true)}
        totalContacts={totalCount}
        favoritesCount={favoritesCount}
        departmentsCount={departmentsCount}
        ldapDomains={ldapDomains}
        ldapDomainsCount={ldapDomains.filter((d) => d.is_active).length}
        onOpenLdapSettings={() => setIsLdapModalOpen(true)}
        onOpenDepartmentSettings={() => setIsDepartmentModalOpen(true)}
        canViewBlf={canViewBlf}
        isBlfOpen={isBlfPanelOpen}
        onToggleBlf={() => setIsBlfPanelOpen(!isBlfPanelOpen)}
        onOpenBlfConfig={() => setIsBlfConfigModalOpen(true)}
        onOpenDragOrderModal={currentUser?.role === 'admin' ? () => setIsDragOrderModalOpen(true) : undefined}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Top Control Section: Search & Primary Actions */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Instant Search Bar */}
            <div className="relative flex-1">
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس نام، خط تلفن ثابت، شماره داخلی (مثال: ۲۰۱)، همراه، سمت یا موقعیت..."
                className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-3 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Action Buttons: Add, Export, Print */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Favorites Filter Toggle */}
              <button
                type="button"
                disabled={!currentUser}
                onClick={() => {
                  if (!currentUser) return;
                  setFavoritesOnly(!favoritesOnly);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                  !currentUser
                    ? 'bg-neutral-50 text-neutral-400 border-neutral-200 opacity-60 cursor-not-allowed'
                    : favoritesOnly
                    ? 'bg-blue-50 text-blue-700 border-blue-300 cursor-pointer'
                    : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 cursor-pointer'
                }`}
                title={!currentUser ? 'برای مشاهده نشان‌شده‌ها ابتدا وارد حساب کاربری شوید' : 'نمایش شماره‌های نشان‌شده'}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    favoritesOnly && currentUser ? 'fill-blue-600 text-blue-600' : 'text-neutral-400'
                  }`}
                />
                <span>نشان‌شده‌ها</span>
                {currentUser && favoritesCount > 0 && (
                  <span className="bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded-full text-[10px]">
                    {favoritesCount}
                  </span>
                )}
              </button>

              {/* Print View */}
              <button
                type="button"
                onClick={() => setIsPrintViewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-medium border border-neutral-300 transition cursor-pointer"
                title="چاپ دفترچه تلفن اداری"
              >
                <Printer className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">چاپ</span>
              </button>

              {/* CSV Export */}
              <button
                type="button"
                disabled={apiUsageStatus.isRateLimited}
                onClick={handleExportCSV}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                  apiUsageStatus.isRateLimited
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-75'
                    : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-300 cursor-pointer'
                }`}
                title={
                  apiUsageStatus.isRateLimited
                    ? `دکمه موقتاً به دلیل سقف فراخوانی غیرفعال است (${apiUsageStatus.resetTimeRemainingSec} ثانیه تا بازنشانی)`
                    : 'دریافت فایل اکسل'
                }
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">خروجی اکسل</span>
                {apiUsageStatus.isRateLimited && (
                  <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-mono">
                    محدود
                  </span>
                )}
              </button>

              {/* Add New Contact Button */}
              <button
                id="add-contact-btn"
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    setIsLoginModalOpen(true);
                    return;
                  }
                  if (selectedCategory.startsWith('comp:')) {
                    setCreateInitialCompany(selectedCategory.replace('comp:', ''));
                    setCreateInitialContactType('external');
                  } else {
                    setCreateInitialCompany('');
                    setCreateInitialContactType('internal');
                  }
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن مخاطب جدید</span>
              </button>
            </div>
          </div>

          {/* Smart Company Discovery Matches */}
          {searchMatchedCompanies.length > 0 && searchQuery.trim() && (
            <div className="pt-2 border-t border-neutral-100 flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold text-amber-800 flex items-center gap-1 text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>شرکت‌های مرتبط با این عبارت جستجو:</span>
              </span>
              {searchMatchedCompanies.map((comp) => (
                <button
                  key={comp.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(`comp:${comp.name}`);
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
                  title="فیلتر مخاطبان به این شرکت"
                >
                  <span>{comp.name}</span>
                  <span className="bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px]">
                    {comp.count} رابط
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Scope Filters (All Accessible / Only Mine / Organizational Public) */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-100 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500 text-[11px] font-semibold">محدوده نمایش:</span>
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs font-medium ${
                  scopeFilter === 'all'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                همه مخاطبین قابل مشاهده ({accessibleContacts.length})
              </button>

              {currentUser && (
                <button
                  type="button"
                  onClick={() => setScopeFilter('mine')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg transition cursor-pointer text-xs font-medium ${
                    scopeFilter === 'mine'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>فقط شماره‌های ثبت‌شده توسط من ({myContactsCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setScopeFilter('public')}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg transition cursor-pointer text-xs font-medium ${
                  scopeFilter === 'public'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>عمومی ({accessibleContacts.filter((c) => c.is_public !== false).length})</span>
              </button>

              {currentUser && (
                <button
                  type="button"
                  onClick={() => setScopeFilter('private')}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg transition cursor-pointer text-xs font-medium ${
                    scopeFilter === 'private'
                      ? 'bg-amber-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>خصوصی ({accessibleContacts.filter((c) => c.is_public === false).length})</span>
                </button>
              )}
            </div>

            {/* View Toggle (Grid vs Table) */}
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="نمای کارتی"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="نمای جدولی"
              >
                <ListFilter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Domain & External Company Filter Tabs (Substituted for Department Tabs) */}
          <div className="pt-2.5 border-t border-neutral-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {/* All Contacts Tab */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>همه</span>
              <span className="bg-white/20 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                {accessibleContacts.length}
              </span>
            </button>

            {/* Separator */}
            <div className="h-4 w-px bg-neutral-300 mx-1 shrink-0" />

            {/* 3 Active LDAP Domains */}
            {ldapDomains
              .filter((d) => d.is_active)
              .map((dom) => {
                const isSelected = selectedCategory === dom.id;
                const count = accessibleContacts.filter((c) => matchContactToDomain(c, dom)).length;

                return (
                  <button
                    key={dom.id}
                    type="button"
                    onClick={() => setSelectedCategory(dom.id)}
                    title={dom.name}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5 text-blue-500" />
                    <span>{dom.display_name || dom.name}</span>
                    <span className="bg-white/30 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                      {count}
                    </span>
                  </button>
                );
              })}

            {/* Separator */}
            <div className="h-4 w-px bg-neutral-300 mx-1 shrink-0" />

            {/* External Companies (All) */}
            <button
              type="button"
              onClick={() => setSelectedCategory('external_all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'external_all'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>شرکت‌های برون‌سازمانی</span>
              <span className="bg-white/30 text-current px-1.5 py-0.2 rounded-full text-[10px]">
                {accessibleContacts.filter((c) => c.contact_type === 'external').length}
              </span>
            </button>

            {/* Individual External Companies */}
            {externalCompanies.map((comp) => {
              const compKey = `comp:${comp.name}`;
              const isSelected = selectedCategory === compKey;
              return (
                <button
                  key={compKey}
                  type="button"
                  onClick={() => setSelectedCategory(compKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-xs font-bold'
                      : 'bg-white text-neutral-700 hover:bg-amber-50 border border-neutral-200'
                  }`}
                >
                  <span>{comp.name}</span>
                  <span className="text-[10px] text-neutral-400">({comp.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Company Focus Banner */}
        {selectedCategory.startsWith('comp:') && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 border border-amber-200 shadow-2xs shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">
                    {selectedCategory.replace('comp:', '')}
                  </h3>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    شرکت / پیمانکار
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  فهرست کلیه کارشناسان، مدیران و رابط‌های ثبت‌شده برای این شرکت ({filteredContacts.length} نفر)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    setIsLoginModalOpen(true);
                    return;
                  }
                  setCreateInitialCompany(selectedCategory.replace('comp:', ''));
                  setCreateInitialContactType('external');
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن رابط جدید به این شرکت</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="px-2.5 py-2 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-amber-100/60 rounded-xl transition cursor-pointer"
              >
                نمایش همه مخاطبان
              </button>
            </div>
          </div>
        )}

        {/* Results Bar with Sort and Pagination Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-neutral-500 px-1 py-1">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              نمایش <span className="font-bold text-neutral-900">{filteredContacts.length}</span> مورد
              {currentUser?.role === 'admin' ? (
                <span> (دسترسی ادمین: کلیه شماره‌های ثبت‌شده در پایگاه داده)</span>
              ) : currentUser ? (
                <span> (دسترسی پرسنل: شماره‌های عمومی سازمان + شماره‌های ثبت‌شده توسط شما)</span>
              ) : (
                <span> (حالت مهمان: شماره‌های عمومی ۳ دامین و شرکت‌های همکار)</span>
              )}
              {selectedCategory !== 'all' && (
                <span className="text-neutral-700 font-medium">
                  {' '}
                  — فیلتر فعال:{' '}
                  {selectedCategory === 'external_all'
                    ? 'کلیه شرکت‌های برون‌سازمانی'
                    : selectedCategory.startsWith('comp:')
                    ? selectedCategory.replace('comp:', '')
                    : ldapDomains.find((d) => d.id === selectedCategory)?.display_name ||
                      ldapDomains.find((d) => d.id === selectedCategory)?.name ||
                      selectedCategory}
                </span>
              )}
            </div>

            {(searchQuery || selectedCategory !== 'all' || favoritesOnly || scopeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setFavoritesOnly(false);
                  setScopeFilter('all');
                }}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 cursor-pointer font-medium mr-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span>بازنشانی فیلترها</span>
              </button>
            )}
          </div>

          {/* Sorting & Page Size Controls */}
          <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
            {/* Sort Field */}
            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg px-2 py-1 shadow-2xs">
              <ArrowUpDown className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="text-[11px] text-neutral-500">مرتب‌سازی:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-transparent text-neutral-800 font-medium border-0 focus:outline-hidden cursor-pointer"
              >
                <option value="custom">ترتیب سفارشی (چیدمان)</option>
                <option value="name">نام و نام خانوادگی</option>
                <option value="personnel_code">کد پرسنلی</option>
                <option value="department">واحد سازمانی</option>
                <option value="created_at">زمان ثبت</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'صعودی' : 'نزولی'}
                className="p-1 hover:bg-neutral-100 rounded text-neutral-600 transition cursor-pointer"
              >
                {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Page Size */}
            <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-[11px] text-neutral-500">تعداد:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="text-xs bg-transparent text-neutral-800 font-medium border-0 focus:outline-hidden cursor-pointer"
              >
                <option value={12}>۱۲</option>
                <option value={24}>۲۴</option>
                <option value={48}>۴۸</option>
                <option value={96}>۹۶</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacts Display: Card View or Table View */}
        {isLoadingApi ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-xs">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 animate-spin">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-neutral-900 text-sm mb-1">
              در حال دریافت اطلاعات از پایگاه داده سرور...
            </h3>
            <p className="text-xs text-neutral-500">
              ارتباط با وب‌سرویس مستقیم برقرار است. لطفاً چند لحظه شکیبا باشید.
            </p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-neutral-900 text-sm mb-1">
              {contacts.length === 0
                ? 'هنوز هیچ آیتمی در سیستم ثبت نشده است.'
                : 'مخاطبی با مشخصات وارد شده یافت نشد'}
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
              {contacts.length === 0
                ? 'اتصال به وب‌سرویس برقرار است اما هنوز مخاطبی در پایگاه داده درج نشده است. می‌توانید با دکمه زیر اولین مخاطب را ثبت کنید.'
                : !currentUser
                ? 'در حالت مهمان، فقط شماره‌های عمومی ۳ دامین و شرکت‌های همکار نمایش داده می‌شوند. برای دسترسی کامل یا افزودن شماره وارد شوید.'
                : currentUser.role !== 'admin'
                ? 'توجه: شماره‌های ثبت‌شده توسط سایر همکاران برای شما غیرقابل مشاهده است. می‌توانید شماره‌های جدیدی اضافه نمایید.'
                : 'لطفاً عبارت جستجو یا فیلترهای بالا را بازنشانی فرمایید.'}
            </p>
            {contacts.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    setIsLoginModalOpen(true);
                  } else {
                    setIsCreateModalOpen(true);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                افزودن اولین مخاطب به سیستم
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setFavoritesOnly(false);
                  setScopeFilter('all');
                }}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                بازنشانی فیلترها
              </button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                currentUser={currentUser}
                allContacts={contacts}
                ldapDomains={ldapDomains}
                onSelect={(c) => setSelectedContact(c)}
                onToggleFavorite={handleToggleFavorite}
                onInitiateCall={handleInitiateCall}
                onFilterByCompany={handleFilterByCompany}
              />
            ))}
          </div>
        ) : (
          <ContactTable
            contacts={paginatedContacts}
            currentUser={currentUser}
            ldapDomains={ldapDomains}
            onSelect={(c) => setSelectedContact(c)}
            onToggleFavorite={handleToggleFavorite}
            onInitiateCall={handleInitiateCall}
            onFilterByCompany={handleFilterByCompany}
            onReorder={currentUser?.role === 'admin' ? handleSaveContactsOrder : undefined}
            isCustomOrderActive={sortBy === 'custom'}
          />
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-2xs mt-4">
            <div className="text-xs text-neutral-500">
              نمایش صفحه <span className="font-bold text-neutral-800">{safeCurrentPage}</span> از{' '}
              <span className="font-bold text-neutral-800">{totalPages}</span>{' '}
              (مجموعاً <span className="font-semibold text-neutral-800">{sortedContacts.length}</span> مخاطب)
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                title="صفحه اول"
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-600 transition cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="صفحه قبل"
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-600 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - safeCurrentPage) <= 1;
                  })
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    typeof p === 'number' ? (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          p === safeCurrentPage
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'hover:bg-neutral-100 text-neutral-700 border border-neutral-200'
                        }`}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={`dots-${idx}`} className="px-1 text-neutral-400 text-xs">
                        ...
                      </span>
                    )
                  )}
              </div>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="صفحه بعد"
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-600 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="صفحه آخر"
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-600 transition cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-4 mt-12 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            پُــرسا لینک © {new Date().getFullYear()} امور فناوری اطلاعات و توسعه سیستم‌ها
          </div>
          <div className="flex items-center gap-4">
            {currentUser?.role === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsDepartmentModalOpen(true)}
                  className="text-neutral-600 hover:text-blue-600 transition cursor-pointer flex items-center gap-1 font-medium"
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>مدیریت واحدهای سازمانی</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLaravelConfigOpen(true)}
                  className="text-neutral-600 hover:text-blue-600 transition cursor-pointer flex items-center gap-1 font-medium"
                >
                  <Server className="w-3.5 h-3.5 text-blue-600" />
                  <span>کدهای آماده وب‌سرویس و API</span>
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Detail / Edit Contact Modal */}
      {selectedContact && (
        <ContactModal
          contact={selectedContact}
          allContacts={contacts}
          isOpen={true}
          isCreateMode={false}
          currentUser={currentUser}
          departments={departments}
          ldapDomains={ldapDomains}
          onClose={() => setSelectedContact(null)}
          onSave={handleSaveContact}
          onUpdatePersonalMobiles={handleUpdatePersonalMobiles}
          onDelete={handleDeleteContact}
          onToggleFavorite={handleToggleFavorite}
          onInitiateCall={handleInitiateCall}
          onRequireLoginForCall={() => setIsLoginModalOpen(true)}
          onSelectContact={(c) => setSelectedContact(c)}
        />
      )}

      {/* Create Contact Modal */}
      {isCreateModalOpen && (
        <ContactModal
          contact={null}
          allContacts={contacts}
          isOpen={true}
          isCreateMode={true}
          initialContactType={createInitialContactType}
          initialCompanyName={createInitialCompany}
          currentUser={currentUser}
          departments={departments}
          ldapDomains={ldapDomains}
          onClose={() => {
            setIsCreateModalOpen(false);
            setCreateInitialCompany('');
            setCreateInitialContactType('internal');
          }}
          onSave={async (contactData) => {
            await handleSaveContact(contactData);
            setCreateInitialCompany('');
            setCreateInitialContactType('internal');
          }}
          onInitiateCall={handleInitiateCall}
          onRequireLoginForCall={() => setIsLoginModalOpen(true)}
          onSelectContact={(c) => {
            setIsCreateModalOpen(false);
            setSelectedContact(c);
          }}
        />
      )}

      {/* VoIP Click-to-Call Modal (Issabel / Asterisk AMI) */}
      {callTarget && currentUser && (
        <ClickToCallModal
          isOpen={Boolean(callTarget)}
          onClose={() => setCallTarget(null)}
          currentUser={currentUser}
          targetNumber={callTarget.number}
          contact={callTarget.contact}
          targetTitle={callTarget.title}
          ldapDomains={ldapDomains}
        />
      )}

      {/* LDAP Domain Management Modal (Admin) */}
      <LdapDomainModal
        isOpen={isLdapModalOpen}
        onClose={() => setIsLdapModalOpen(false)}
        domains={ldapDomains}
        onSaveDomains={handleSaveLdapDomains}
      />

      {/* Department Management Modal (Admin) */}
      <DepartmentModal
        isOpen={isDepartmentModalOpen}
        onClose={() => setIsDepartmentModalOpen(false)}
        departments={departments}
        contacts={contacts}
        onSaveDepartments={handleSaveDepartments}
        laravelConfig={laravelConfig}
        ldapDomains={ldapDomains}
      />

      {/* Laravel Config Modal */}
      <LaravelConfigModal
        isOpen={isLaravelConfigOpen}
        onClose={() => setIsLaravelConfigOpen(false)}
        config={laravelConfig}
        onSaveConfig={handleSaveLaravelConfig}
      />

      {/* BLF (Busy Lamp Field) Collapsible Side Panel / Floating Dock */}
      {canViewBlf && (
        <BlfSidePanel
          currentUser={currentUser}
          extensionsData={monitoredExtensionsData}
          allContacts={contacts}
          ldapDomains={ldapDomains}
          isOpen={isBlfPanelOpen}
          onToggleOpen={() => setIsBlfPanelOpen(!isBlfPanelOpen)}
          onInitiateCall={handleInitiateCall}
          onOpenBlfConfig={() => setIsBlfConfigModalOpen(true)}
          onSelectContact={(c) => setSelectedContact(c)}
        />
      )}

      {/* Admin BLF Configuration Modal */}
      {isBlfConfigModalOpen && (
        <BlfConfigModal
          isOpen={isBlfConfigModalOpen}
          onClose={() => setIsBlfConfigModalOpen(false)}
          permissions={blfPermissions}
          onSavePermissions={handleSaveBlfPermissions}
          allContacts={contacts}
          ldapDomains={ldapDomains}
          currentUser={currentUser}
        />
      )}

      {/* Admin Drag & Drop Layout / Reorder Contacts Modal */}
      {isDragOrderModalOpen && currentUser?.role === 'admin' && (
        <DragOrderModal
          isOpen={isDragOrderModalOpen}
          onClose={() => setIsDragOrderModalOpen(false)}
          contacts={contacts}
          ldapDomains={ldapDomains}
          onSaveOrder={handleSaveContactsOrder}
        />
      )}

      {/* LDAP Login Modal */}
      {isLoginModalOpen && (
        <LoginPage
          isModal={true}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(user, remember) => {
            handleLoginSuccess(user, remember);
            setIsLoginModalOpen(false);
          }}
          laravelConfig={laravelConfig}
          onOpenLaravelSettings={() => {
            setIsLoginModalOpen(false);
            setIsLaravelConfigOpen(true);
          }}
          ldapDomains={ldapDomains}
          onOpenLdapSettings={() => {
            setIsLoginModalOpen(false);
            setIsLdapModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
