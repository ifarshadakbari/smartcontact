import { Contact, LaravelConfig, User, LdapDomain, Department } from '../types';
import { isAdminOnlyLandline } from '../utils/phoneUtils';

const STORAGE_VERSION = 'v11';
const STORAGE_KEY_CONFIG = 'enterprise_phonebook_laravel_config_${STORAGE_VERSION}';
const STORAGE_KEY_CONTACTS = 'enterprise_phonebook_contacts_${STORAGE_VERSION}';
const STORAGE_KEY_AUTH = 'enterprise_phonebook_auth_user_${STORAGE_VERSION}';
const STORAGE_KEY_DOMAINS = 'enterprise_phonebook_ldap_domains_${STORAGE_VERSION}';
const STORAGE_KEY_DEPARTMENTS = 'enterprise_phonebook_departments_${STORAGE_VERSION}';


export const getSavedLaravelConfig = (): LaravelConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading laravel config', e);
  }

  // Exact default backend URL configured for the enterprise database connection
  return {
    baseUrl: '/webapp/smartcontact/api',
    apiPrefix: '',
    token: '',
    status: 'connected',
  };
};

export const saveLaravelConfig = (config: LaravelConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving laravel config', e);
  }
};

export const getStoredContacts = (): Contact[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTACTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading contacts from storage', e);
  }
  return [];
};

export const saveStoredContacts = (contacts: Contact[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
  } catch (e) {
    console.error('Error saving contacts to storage', e);
  }
};

export const getStoredAuthUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (raw && raw !== 'null') return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading auth user', e);
  }
  return null;
};

export const saveStoredAuthUser = (user: User | null): void => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    } else {
      localStorage.setItem(STORAGE_KEY_AUTH, 'null');
    }
  } catch (e) {
    console.error('Error saving auth user', e);
  }
};

export const getAuthToken = (): string => {
  try {
    return (
      localStorage.getItem('enterprise_phonebook_auth_token') ||
      sessionStorage.getItem('enterprise_phonebook_auth_token') ||
      ''
    );
  } catch {
    return '';
  }
};

// Permanent User Favorites Storage (Keyed per user for permanent multi-user persistence)
const STORAGE_KEY_USER_FAVORITES_PREFIX = 'enterprise_phonebook_user_favs_v10_';

export const getStoredUserFavorites = (userId: number | string): (number | string)[] => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_USER_FAVORITES_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading user favorites', e);
  }
  return [];
};

export const saveStoredUserFavorites = (
  userId: number | string,
  favoriteIds: (number | string)[]
): void => {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_USER_FAVORITES_PREFIX}${userId}`,
      JSON.stringify(favoriteIds)
    );
  } catch (e) {
    console.error('Error saving user favorites', e);
  }
};

// LDAP Domains Storage
export const getStoredLdapDomains = (): LdapDomain[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOMAINS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading LDAP domains', e);
  }
  return [];
};

export const saveStoredLdapDomains = (domains: LdapDomain[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_DOMAINS, JSON.stringify(domains));
  } catch (e) {
    console.error('Error saving LDAP domains', e);
  }
};

// Departments Storage
export const getStoredDepartments = (): Department[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEPARTMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading departments', e);
  }
  return [];
};

export const saveStoredDepartments = (departments: Department[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_DEPARTMENTS, JSON.stringify(departments));
  } catch (e) {
    console.error('Error saving departments', e);
  }
};

// Real testing of LDAP server connectivity via backend API
export const testLdapConnection = async (domain: LdapDomain, config?: LaravelConfig): Promise<{ success: boolean; message: string; latencyMs: number }> => {
  const start = Date.now();

  if (!domain.host || !domain.name) {
    return {
      success: false,
      message: 'نام دامین و آدرس IP سرور الزامی هستند.',
      latencyMs: 0,
    };
  }

  const laravelCfg = config || getSavedLaravelConfig();
  try {
    const baseUrl = laravelCfg.baseUrl.replace(/\/$/, '');
    const targetUrl = `${baseUrl}${laravelCfg.apiPrefix}/domains/test-ldap`;
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(laravelCfg.token ? { Authorization: `Bearer ${laravelCfg.token}` } : {}),
      },
      body: JSON.stringify({
        domain_id: domain.id,
        host: domain.host,
        port: domain.port,
        encryption: domain.encryption,
        base_dn: domain.base_dn,
        bind_user: domain.bind_user,
        bind_password: domain.bind_password,
      }),
    });

    const latency = Math.round(Date.now() - start);
    if (res.ok) {
      const json = await res.json();
      return {
        success: true,
        message: json.message || `اتصال واقعی به دامین کنترلر ${domain.host}:${domain.port} با موفقیت برقرار شد.`,
        latencyMs: latency,
      };
    } else {
      const json = await res.json().catch(() => ({}));
      return {
        success: false,
        message: json.message || `خطا در برقراری ارتباط با دامین کنترلر ${domain.host}:${domain.port} (کد خطا: ${res.status})`,
        latencyMs: latency,
      };
    }
  } catch (e: any) {
    const latency = Math.round(Date.now() - start);
    return {
      success: false,
      message: `خطای اتصال به سرور بک‌اند جهت تست LDAP: ${e?.message || 'عدم دسترسی به سرور'}`,
      latencyMs: latency,
    };
  }
};

// Real testing of Issabel / Asterisk AMI connectivity via Backend Proxy
export const testVoipAmiConnection = async (domain: LdapDomain): Promise<{ success: boolean; message: string; latencyMs: number; version?: string }> => {
  const start = Date.now();

  if (!domain.voip_server_host || !domain.voip_server_host.trim()) {
    return {
      success: false,
      message: 'آدرس سرور ایزابل (IP یا Hostname) تعیین نشده است.',
      latencyMs: 0,
    };
  }

  const laravelCfg = getSavedLaravelConfig();
  const targetUrl = `${laravelCfg.baseUrl.replace(/\/$/, '')}${laravelCfg.apiPrefix}/domains/test-voip`;

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(laravelCfg.token ? { Authorization: `Bearer ${laravelCfg.token}` } : {}),
      },
      body: JSON.stringify({
        domain_id: domain.id,
        host: domain.voip_server_host.trim(),
        port: domain.voip_ami_port || 5038,
        username: domain.voip_ami_username ? domain.voip_ami_username.trim() : 'phonebook_ami',
        secret: domain.voip_ami_secret !== undefined ? domain.voip_ami_secret : '',
      }),
    });

    const latency = Math.round(Date.now() - start);
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.status === 'success') {
      return {
        success: true,
        message: json.message || `اتصال موفق به سرویس AMI ایزابل با کاربر ${domain.voip_ami_username} تایید شد.`,
        latencyMs: json.latencyMs || latency,
        version: json.version,
      };
    } else {
      return {
        success: false,
        message: json.message || `خطا در برقراری ارتباط با سرور ایزابل (کد وضعیت: ${res.status})`,
        latencyMs: json.latencyMs || latency,
      };
    }
  } catch (e: any) {
    const latency = Math.round(Date.now() - start);
    return {
      success: false,
      message: `خطای اتصال به سرور جهت تست VoIP: ${e?.message || 'عدم دسترسی به سرور یا شبکه'}`,
      latencyMs: latency,
    };
  }
};

// Real Initiate Click-to-Call (Originate) via Backend Proxy
export const originateVoipCall = async (params: {
  targetNumber: string;
  targetName?: string;
  callerExtension: string;
  domain: LdapDomain;
}): Promise<{ success: boolean; message: string; callId: string }> => {
  const laravelCfg = getSavedLaravelConfig();
  const targetUrl = `${laravelCfg.baseUrl.replace(/\/$/, '')}${laravelCfg.apiPrefix}/voip/originate`;

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(laravelCfg.token ? { Authorization: `Bearer ${laravelCfg.token}` } : {}),
      },
      body: JSON.stringify({
        caller_extension: params.callerExtension,
        target_number: params.targetNumber,
        target_name: params.targetName,
        domain_id: params.domain.id,
        host: params.domain.voip_server_host,
        port: params.domain.voip_ami_port || 5038,
        username: params.domain.voip_ami_username,
        secret: params.domain.voip_ami_secret,
        context: params.domain.voip_context || 'from-internal',
        channel_tech: params.domain.voip_channel_tech || 'SIP',
        auto_answer: params.domain.voip_auto_answer ?? true,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.status === 'success') {
      return {
        success: true,
        message: json.message || `دستور برقراری تماس به سرور VoIP ارسال شد. گوشی رومیزی شما (${params.callerExtension}) زنگ می‌خورد.`,
        callId: json.callId || `call-${Date.now()}`,
      };
    } else {
      return {
        success: false,
        message: json.message || `خطا در ارسال دستور تماس به سرور VoIP (${res.status})`,
        callId: '',
      };
    }
  } catch (e: any) {
    return {
      success: false,
      message: `خطای برقراری ارتباط با وب‌سرویس تماس: ${e?.message || 'عدم دسترسی به سرور'}`,
      callId: '',
    };
  }
};

// Hangup Active VoIP Call
export const hangupVoipCall = async (params: {
  callerExtension: string;
  domain: LdapDomain;
}): Promise<{ success: boolean; message: string }> => {
  const laravelCfg = getSavedLaravelConfig();
  const targetUrl = `${laravelCfg.baseUrl.replace(/\/$/, '')}${laravelCfg.apiPrefix}/voip/hangup`;

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(laravelCfg.token ? { Authorization: `Bearer ${laravelCfg.token}` } : {}),
      },
      body: JSON.stringify({
        caller_extension: params.callerExtension,
        domain_id: params.domain.id,
        host: params.domain.voip_server_host,
        port: params.domain.voip_ami_port || 5038,
        username: params.domain.voip_ami_username,
        secret: params.domain.voip_ami_secret,
        channel_tech: params.domain.voip_channel_tech || 'SIP',
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.status === 'success') {
      return {
        success: true,
        message: json.message || 'تماس با موفقیت قطع شد.',
      };
    } else {
      return {
        success: false,
        message: json.message || `خطا در قطع تماس (${res.status})`,
      };
    }
  } catch (e: any) {
    return {
      success: false,
      message: `خطا در ارسال دستور قطع تماس: ${e?.message || 'عدم دسترسی به سرور'}`,
    };
  }
};

// Check if Extension has an active call on Asterisk
export const checkVoipChannelStatus = async (params: {
  callerExtension: string;
  domain: LdapDomain;
}): Promise<{ active: boolean; duration?: number }> => {
  const laravelCfg = getSavedLaravelConfig();
  const targetUrl = `${laravelCfg.baseUrl.replace(/\/$/, '')}${laravelCfg.apiPrefix}/voip/channel-status`;

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(laravelCfg.token ? { Authorization: `Bearer ${laravelCfg.token}` } : {}),
      },
      body: JSON.stringify({
        caller_extension: params.callerExtension,
        domain_id: params.domain.id,
        host: params.domain.voip_server_host,
        port: params.domain.voip_ami_port || 5038,
        username: params.domain.voip_ami_username,
        secret: params.domain.voip_ami_secret,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        active: Boolean(json.active),
        duration: typeof json.duration === 'number' ? json.duration : undefined,
      };
    }
    return { active: false };
  } catch {
    return { active: false };
  }
};

// Test connection to Laravel
export const testLaravelPing = async (config: LaravelConfig): Promise<{ success: boolean; message: string; data?: any }> => {
  const targetUrl = `${config.baseUrl.replace(/\/$/, '')}${config.apiPrefix}/contacts`;
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      return {
        success: true,
        message: 'اتصال به وب‌سرویس با موفقیت برقرار شد.',
        data: json,
      };
    } else {
      return {
        success: false,
        message: `پاسخ وب‌سرویس با کد وضعیت ${res.status} همراه بود (${res.statusText})`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `خطا در ارتباط با ${targetUrl}: ${error?.message || 'سرور در دسترس نیست یا CORS فعال نشده است.'}`,
    };
  }
};

/**
 * Fetch contacts from Laravel Live API
 */
export const fetchContactsFromApi = async (config: LaravelConfig): Promise<Contact[]> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const targetUrl = `${baseUrl}${config.apiPrefix}/contacts`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const token = config.token || getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const authUser = getStoredAuthUser();
  if (authUser?.id) {
    headers['X-User-Id'] = String(authUser.id);
  }
  if (authUser?.role) {
    headers['X-User-Role'] = String(authUser.role);
  }

  const res = await fetch(targetUrl, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(`خطای دریافت مخاطبین: ${res.status}`);
  }
  const json = await res.json();
  const rawList = Array.isArray(json) ? json : (json.data || []);
  return rawList.map((item: any) => {
    const isLocation =
      item.prefix_title === 'location' ||
      (item.description && typeof item.description === 'string' && item.description.includes('[PREFIX:LOCATION]')) ||
      (item.last_name === '-' && item.prefix_title !== 'ms');

    const cleanDesc = item.description && typeof item.description === 'string'
      ? item.description.replace('[PREFIX:LOCATION]', '').trim()
      : (item.description || '');

    return {
      id: item.id,
      personnel_code: item.personnel_code,
      prefix_title: (isLocation ? 'location' : (item.prefix_title || 'mr')) as any,
      first_name: item.first_name || '',
      last_name: isLocation && item.last_name === '-' ? '' : (item.last_name || ''),
      job_title: item.job_title || '',
      department: item.department || '',
      location: item.location || '',
      mobiles: Array.isArray(item.mobiles) ? item.mobiles : [],
      landlines: Array.isArray(item.landlines)
        ? item.landlines.map((l: any, idx: number) => ({
            id: String(l?.id || idx + 1),
            phone: String(l?.phone || '').trim(),
            extension: String(l?.extension || '').trim(),
            title: l?.title ? String(l.title).trim() : undefined,
            type: l?.type ? String(l.type).trim() : undefined,
            is_admin_only: isAdminOnlyLandline(l),
          }))
        : [],
      email: item.email || '',
      description: cleanDesc,
      avatar: item.avatar || '',
      contact_type: item.contact_type || 'internal',
      domain: item.domain ? String(item.domain) : (item.domain_name ? String(item.domain_name) : (item.domain_id ? String(item.domain_id) : '')),
      domain_name: item.domain_name ? String(item.domain_name) : (item.domain ? String(item.domain) : ''),
      domain_id: item.domain_id !== undefined && item.domain_id !== null && item.domain_id !== ''
        ? String(item.domain_id)
        : (item.domain ? String(item.domain) : ''),
      company_name: item.company_name || '',
      is_favorite: Boolean(item.is_favorite),
      created_by_user_id: item.created_by_user_id,
      created_by_user_name: item.created_by_user_name || undefined,
      is_public: item.is_public !== undefined ? Boolean(item.is_public) : true,
      is_mobile_public: item.is_mobile_public !== undefined ? Boolean(item.is_mobile_public) : false,
      personal_mobiles: item.personal_mobiles && typeof item.personal_mobiles === 'object' ? item.personal_mobiles : {},
      display_order: typeof item.display_order === 'number' ? item.display_order : undefined,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  });
};

/**
 * Create or update contact on Laravel Live API
 */
export const saveContactToApi = async (
  contact: Contact,
  config: LaravelConfig,
  isNew?: boolean
): Promise<Contact> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = config.token || getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const authUser = getStoredAuthUser();
  if (authUser?.id) {
    headers['X-User-Id'] = String(authUser.id);
  }
  if (authUser?.role) {
    headers['X-User-Role'] = String(authUser.role);
  }

  // Determine if this is an update or create
  const rawId = contact.id;
  const numId = rawId !== undefined && rawId !== null ? Number(rawId) : NaN;
  const hasNumericId = !isNaN(numId) && numId > 0;
  
  // It is an update if explicitly specified (isNew === false) or if it has a real DB ID (< 1,000,000,000)
  const isUpdate = isNew !== undefined ? !isNew : Boolean(hasNumericId && numId < 1000000000);
  const targetId = hasNumericId ? numId : contact.id;

  const targetUrl = isUpdate
    ? `${baseUrl}${config.apiPrefix}/contacts/${targetId}`
    : `${baseUrl}${config.apiPrefix}/contacts`;
  const method = isUpdate ? 'PUT' : 'POST';

  // Sanitize mobiles: array of non-empty strings
  const cleanMobiles = Array.isArray(contact.mobiles)
    ? contact.mobiles
        .map((m) => (typeof m === 'string' ? m.trim() : String(m || '')))
        .filter((m) => m !== '')
    : [];

  // Sanitize landlines: array of objects with valid phone or extension
  const cleanLandlines = Array.isArray(contact.landlines)
    ? contact.landlines
        .filter((l) => l && (String(l.phone || '').trim() !== '' || String(l.extension || '').trim() !== ''))
        .map((l, idx) => ({
          id: String(l.id || idx + 1),
          phone: String(l.phone || '').trim(),
          extension: String(l.extension || '').trim(),
          title: String(l.title || '').trim(),
          is_admin_only: isAdminOnlyLandline(l),
        }))
    : [];

  const isLocation = contact.prefix_title === 'location';
  // Backend validation: accepts 'location', 'mr', 'ms'. Never send null because prefix_title is NOT NULL in database schema.
  const prefixTitleVal = isLocation
    ? 'location'
    : contact.prefix_title === 'ms'
    ? 'ms'
    : 'mr';

  // Required name fields
  const firstNameVal = (contact.first_name || '').trim();
  const lastNameVal = isLocation
    ? (contact.last_name?.trim() || '-')
    : (contact.last_name?.trim() || '-');

  // Clean email: must be valid email or null (never empty string "" which fails Laravel validation)
  const rawEmail = (contact.email || '').trim();
  const emailVal = rawEmail && rawEmail.includes('@') ? rawEmail : null;

  // Description with location tag preservation
  let descVal = (contact.description || '').trim();
  if (isLocation && !descVal.includes('[PREFIX:LOCATION]')) {
    descVal = descVal ? `${descVal} [PREFIX:LOCATION]` : '[PREFIX:LOCATION]';
  } else if (!isLocation && descVal.includes('[PREFIX:LOCATION]')) {
    descVal = descVal.replace('[PREFIX:LOCATION]', '').trim();
  }

  const resolvedCreatedById =
    contact.created_by_user_id !== undefined && contact.created_by_user_id !== null && contact.created_by_user_id !== 0
      ? Number(contact.created_by_user_id)
      : (authUser?.id ? Number(authUser.id) : undefined);

  const payload: any = {
    first_name: firstNameVal,
    last_name: lastNameVal,
    prefix_title: prefixTitleVal,
    personnel_code: contact.personnel_code ? contact.personnel_code.trim() : null,
    job_title: contact.job_title ? contact.job_title.trim() : null,
    department: contact.department ? contact.department.trim() : null,
    location: contact.location ? contact.location.trim() : null,
    mobiles: cleanMobiles,
    landlines: cleanLandlines,
    email: emailVal,
    description: descVal || null,
    avatar: contact.avatar || null,
    contact_type: contact.contact_type === 'external' ? 'external' : 'internal',
    domain: contact.contact_type === 'internal' ? (contact.domain || contact.domain_id || contact.domain_name || null) : null,
    domain_id: contact.contact_type === 'internal' ? (contact.domain_id || contact.domain || null) : null,
    domain_name: contact.contact_type === 'internal' ? (contact.domain_name || contact.domain || null) : null,
    company_name: contact.contact_type === 'external' ? (contact.company_name || null) : null,
    is_public: contact.is_public !== undefined ? Boolean(contact.is_public) : true,
    is_mobile_public: contact.is_mobile_public !== undefined ? Boolean(contact.is_mobile_public) : false,
    personal_mobiles: contact.personal_mobiles && typeof contact.personal_mobiles === 'object' ? contact.personal_mobiles : {},
    is_favorite: Boolean(contact.is_favorite),
    created_by_user_id: resolvedCreatedById,
  };

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method,
      headers,
      body: JSON.stringify(payload),
    });
  } catch (netErr: any) {
    console.warn('Network error reaching backend API, preserving locally:', netErr);
    // Return updated contact so local state and storage succeed
    return contact;
  }

  // If 404 on PUT (contact was created locally or removed on server), fallback to POST
  if (!res.ok && res.status === 404 && isUpdate) {
    try {
      const postUrl = `${baseUrl}${config.apiPrefix}/contacts`;
      const postRes = await fetch(postUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (postRes.ok) {
        res = postRes;
      }
    } catch (fallbackErr) {
      console.warn('Fallback POST after 404 encountered error:', fallbackErr);
    }
  }

  // If server validation failed (422) retry with minimal payload if needed
  if (!res.ok && res.status === 422) {
    try {
      const errClone = res.clone();
      const errText = await errClone.text();
      if (errText.toLowerCase().includes('prefix_title') || errText.toLowerCase().includes('prefix title')) {
        const retryPayload = {
          ...payload,
          prefix_title: 'mr', // Fallback to 'mr' if server enum doesn't have 'location'; description holds [PREFIX:LOCATION]
        };
        const retryRes = await fetch(targetUrl, {
          method,
          headers,
          body: JSON.stringify(retryPayload),
        });
        if (retryRes.ok) {
          res = retryRes;
        }
      }
    } catch (e) {
      console.warn('422 retry check encountered exception:', e);
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    let parsedMsg = errText;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.message) parsedMsg = errJson.message;
      if (errJson.errors) {
        const fieldErrors = Object.values(errJson.errors).flat().join(', ');
        parsedMsg += ` (${fieldErrors})`;
      }
    } catch {}
    throw new Error(`خطای ذخیره در وب‌سرویس سرور (${res.status}): ${parsedMsg}`);
  }

  const json = await res.json();
  const savedItem = json.data || json;

  const isResultLocation =
    contact.prefix_title === 'location' ||
    savedItem.prefix_title === 'location' ||
    (savedItem.description && typeof savedItem.description === 'string' && savedItem.description.includes('[PREFIX:LOCATION]')) ||
    (savedItem.last_name === '-' && savedItem.prefix_title !== 'ms');

  const cleanSavedLastName =
    isResultLocation && (savedItem.last_name === '-' || !savedItem.last_name)
      ? (contact.last_name === '-' ? '' : (contact.last_name || ''))
      : (savedItem.last_name || contact.last_name || '');

  const cleanSavedDesc =
    savedItem.description && typeof savedItem.description === 'string'
      ? savedItem.description.replace('[PREFIX:LOCATION]', '').trim()
      : (contact.description || '');

  return {
    ...contact,
    ...savedItem,
    id: savedItem.id || contact.id,
    created_by_user_id:
      savedItem.created_by_user_id !== undefined && savedItem.created_by_user_id !== null
        ? Number(savedItem.created_by_user_id)
        : (contact.created_by_user_id || resolvedCreatedById || 1),
    domain: savedItem.domain ? String(savedItem.domain) : (contact.domain ? String(contact.domain) : ''),
    domain_id: savedItem.domain_id !== undefined && savedItem.domain_id !== null && savedItem.domain_id !== ''
      ? String(savedItem.domain_id)
      : (contact.domain_id ? String(contact.domain_id) : (savedItem.domain ? String(savedItem.domain) : '')),
    domain_name: savedItem.domain_name ? String(savedItem.domain_name) : (contact.domain_name ? String(contact.domain_name) : ''),
    company_name: contact.contact_type === 'external' ? (contact.company_name || savedItem.company_name || '') : undefined,
    prefix_title: isResultLocation ? 'location' : (contact.prefix_title || savedItem.prefix_title || 'mr'),
    last_name: cleanSavedLastName,
    description: cleanSavedDesc,
    is_mobile_public: savedItem.is_mobile_public !== undefined ? Boolean(savedItem.is_mobile_public) : (contact.is_mobile_public ?? false),
    personal_mobiles: savedItem.personal_mobiles && typeof savedItem.personal_mobiles === 'object'
      ? savedItem.personal_mobiles
      : (contact.personal_mobiles || {}),
  };
};

/**
 * Save personal mobiles to backend API (Personal Overlay in user notebook)
 */
export const savePersonalMobilesToApi = async (
  contactId: number | string,
  personalMobiles: Record<string | number, string[]>
): Promise<Contact | null> => {
  const config = getSavedLaravelConfig();
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const targetUrl = `${baseUrl}${config.apiPrefix}/contacts/${contactId}/personal-mobiles`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = config.token || getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const authUser = getStoredAuthUser();
  if (authUser?.id) {
    headers['X-User-Id'] = String(authUser.id);
  }
  if (authUser?.role) {
    headers['X-User-Role'] = String(authUser.role);
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ personal_mobiles: personalMobiles }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.data || data;
    }

    // Fallback to standard PUT /contacts/:id if dedicated endpoint is not yet defined on target
    const putUrl = `${baseUrl}${config.apiPrefix}/contacts/${contactId}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ personal_mobiles: personalMobiles }),
    });
    if (putRes.ok) {
      const putData = await putRes.json();
      return putData.data || putData;
    }
  } catch (err) {
    console.warn('Network error saving personal mobiles to API:', err);
  }
  return null;
};

/**
 * Delete contact from Laravel Live API
 */
export const deleteContactFromApi = async (id: number | string, config: LaravelConfig): Promise<void> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const targetUrl = `${baseUrl}${config.apiPrefix}/contacts/${id}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  const res = await fetch(targetUrl, { method: 'DELETE', headers });
  if (!res.ok) {
    throw new Error(`خطای حذف در API: ${res.status}`);
  }
};

/**
 * Toggle Favorite on Laravel Live API / Database
 */
export const toggleFavoriteOnApi = async (
  id: number | string,
  config: LaravelConfig,
  forcedStatus?: boolean
): Promise<{ success: boolean; is_favorite?: boolean }> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const targetUrl = `${baseUrl}${config.apiPrefix}/contacts/${id}/favorite`;
  const token = config.token || getAuthToken();
  const authUser = getStoredAuthUser();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (authUser?.id) {
    headers['X-User-Id'] = String(authUser.id);
  }
  if (authUser?.role) {
    headers['X-User-Role'] = String(authUser.role);
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contact_id: id,
        user_id: authUser?.id,
        ...(forcedStatus !== undefined ? { is_favorite: forcedStatus } : {}),
      }),
    });

    if (res.ok) {
      const json = await res.json().catch(() => null);
      return {
        success: true,
        is_favorite: json?.is_favorite !== undefined ? Boolean(json.is_favorite) : forcedStatus,
      };
    }
  } catch (err) {
    console.warn('Network error reaching backend favorite endpoint:', err);
  }
  return { success: false, is_favorite: forcedStatus };
};

/**
 * Fetch LDAP Domains from Laravel Live API / Database
 * Supports fetching full admin config when authenticated or public domains for login
 */
export const fetchDomainsFromApi = async (config: LaravelConfig, isAdmin: boolean = false): Promise<LdapDomain[]> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const endpoint = isAdmin ? `${baseUrl}${config.apiPrefix}/admin/domains` : `${baseUrl}${config.apiPrefix}/domains`;
  const fallbackEndpoint = `${baseUrl}${config.apiPrefix}/domains`;
  
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  let res = await fetch(endpoint, { method: 'GET', headers }).catch(() => null);
  if (!res || !res.ok) {
    res = await fetch(fallbackEndpoint, { method: 'GET', headers });
  }

  if (!res.ok) {
    throw new Error(`خطای دریافت دامین‌ها: ${res.status}`);
  }
  const json = await res.json();
  const rawList = Array.isArray(json) ? json : (json.data || []);
  return rawList.map((item: any) => ({
    id: String(item.id || item.domain || item.name || Math.random()),
    name: item.name || item.domain || '',
    display_name: item.display_name || item.name || '',
    host: item.host || '',
    port: Number(item.port) || 389,
    base_dn: item.base_dn || item.baseDn || '',
    encryption: item.encryption || 'none',
    bind_user: item.bind_user || '',
    bind_password: item.bind_password || '',
    user_filter: item.user_filter || '',
    is_default: Boolean(item.is_default),
    is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
    created_at: item.created_at,
    voip_enabled: Boolean(item.voip_enabled),
    voip_server_host: item.voip_server_host || '',
    voip_ami_port: Number(item.voip_ami_port) || 5038,
    voip_ami_username: item.voip_ami_username || '',
    voip_ami_secret: item.voip_ami_secret || '',
    voip_context: item.voip_context || 'from-internal',
    voip_trunk_prefix: item.voip_trunk_prefix || '',
    voip_channel_tech: item.voip_channel_tech || 'SIP',
    voip_auto_answer: Boolean(item.voip_auto_answer),
  }));
};

/**
 * Save or sync LDAP Domains to Laravel Live API / Database
 */
export const saveDomainsToApi = async (domains: LdapDomain[], config: LaravelConfig): Promise<void> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const targetUrl = `${baseUrl}${config.apiPrefix}/domains/sync`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ domains }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`خطای ذخیره دامین‌ها در سرور (${res.status}): ${errText}`);
  }
};

/**
 * Fetch Departments from Laravel Live API / Database
 */
export const fetchDepartmentsFromApi = async (config: LaravelConfig): Promise<Department[]> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const targetUrl = `${baseUrl}${config.apiPrefix}/departments`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  const res = await fetch(targetUrl, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(`خطای دریافت واحدهای سازمانی: ${res.status}`);
  }
  const json = await res.json();
  const rawList = Array.isArray(json) ? json : (json.data || []);

  const parsedList: Department[] = rawList.map((item: any) => ({
    id: String(item.id),
    name: item.name || '',
    code: item.code || '',
    domain_id: item.domain_id ? String(item.domain_id) : undefined,
    domain_name: item.domain_name || undefined,
    sort_order: typeof item.sort_order === 'number' ? item.sort_order : undefined,
  }));

  // Ensure "all" synthetic entry exists at the start
  const hasAll = parsedList.some((d) => d.id === 'all');
  if (!hasAll && parsedList.length > 0) {
    return [{ id: 'all', name: 'تمام واحدها', code: 'ALL' }, ...parsedList];
  }

  return parsedList;
};

/**
 * Save or sync entire Departments list to Laravel Live API / Database
 */
export const saveDepartmentsToApi = async (departments: Department[], config: LaravelConfig): Promise<void> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const targetUrl = `${baseUrl}${config.apiPrefix}/departments/sync`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  // Filter out the 'all' virtual item before persisting to DB
  const realDepartments = departments.filter((d) => d.id !== 'all');

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ departments: realDepartments }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`خطای ذخیره واحدها در دیتابیس (${res.status}): ${errText}`);
  }
};

/**
 * Save custom order of contacts (Drag & Drop) to server and storage
 */
export const saveContactsOrderToApi = async (
  orderedItems: { id: number | string; display_order: number }[],
  config: LaravelConfig
): Promise<void> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const targetUrl = `${baseUrl}${config.apiPrefix}/contacts/reorder`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ orders: orderedItems }),
    });

    if (!res.ok) {
      console.warn(`Server reorder endpoint returned ${res.status}, order preserved locally.`);
    }
  } catch (err) {
    console.warn('Server reorder endpoint not accessible, order saved locally.', err);
  }
};

/**
 * Create or Update a single Department on Laravel Live API / Database
 */
export const saveSingleDepartmentToApi = async (dept: Department, config: LaravelConfig): Promise<Department> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  const isNumericId = /^\d+$/.test(dept.id);
  const isUpdate = isNumericId && Number(dept.id) > 0;
  const targetUrl = isUpdate
    ? `${baseUrl}${config.apiPrefix}/departments/${dept.id}`
    : `${baseUrl}${config.apiPrefix}/departments`;
  const method = isUpdate ? 'PUT' : 'POST';

  const res = await fetch(targetUrl, {
    method,
    headers,
    body: JSON.stringify({
      name: dept.name,
      code: dept.code,
      domain_id: dept.domain_id,
      sort_order: dept.sort_order,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`خطای ذخیره واحد سازمانی (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const savedItem = json.data || json;
  return {
    ...dept,
    id: String(savedItem.id || dept.id),
    name: savedItem.name || dept.name,
    code: savedItem.code || dept.code,
  };
};

/**
 * Delete a Department from Laravel Live API / Database
 */
export const deleteDepartmentFromApi = async (id: string, config: LaravelConfig): Promise<void> => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const targetUrl = `${baseUrl}${config.apiPrefix}/departments/${id}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  const res = await fetch(targetUrl, { method: 'DELETE', headers });
  if (!res.ok) {
    throw new Error(`خطای حذف واحد سازمانی از سرور: ${res.status}`);
  }
};

// Laravel Backend Documentation & Code Snippet for User & Development
export const LARAVEL_CODE_SNIPPET = {
  deptMigration: `// database/migrations/xxxx_xx_xx_create_departments_table.php
Schema::create('departments', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();           // نام رسمی واحد سازمانی (*)
    $table->string('code')->nullable();         // کدینگ سازمانی (مثلا IT, FIN, MNG)
    $table->foreignId('domain_id')->nullable()->constrained('ldap_domains')->nullOnDelete(); // انتساب به دامین
    $table->integer('sort_order')->default(0);  // اولویت نمایش در لیست‌ها
    $table->timestamps();
});`,

  deptController: `// app/Http/Controllers/Api/DepartmentController.php
namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\Department;
use Illuminate\\Http\\Request;
use Illuminate\\Validation\\Rule;

class DepartmentController extends Controller
{
    public function index()
    {
        $departments = Department::orderBy('sort_order')
            ->orderBy('name')
            ->get();
        return response()->json($departments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:departments,name',
            'code' => 'nullable|string|max:50',
            'domain_id' => 'nullable|exists:ldap_domains,id',
            'sort_order' => 'nullable|integer',
        ]);

        $department = Department::create($validated);
        return response()->json($department, 201);
    }

    public function update(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150', Rule::unique('departments')->ignore($department->id)],
            'code' => 'nullable|string|max:50',
            'domain_id' => 'nullable|exists:ldap_domains,id',
            'sort_order' => 'nullable|integer',
        ]);

        $department->update($validated);
        return response()->json($department);
    }

    public function destroy(Department $department)
    {
        $department->delete();
        return response()->json(['message' => 'واحد سازمانی با موفقیت حذف شد.']);
    }

    public function sync(Request $request)
    {
        $request->validate([
            'departments' => 'required|array',
        ]);

        $items = $request->input('departments', []);
        $saved = [];

        foreach ($items as $index => $item) {
            $dept = Department::updateOrCreate(
                ['name' => $item['name']],
                [
                    'code' => $item['code'] ?? null,
                    'domain_id' => $item['domain_id'] ?? null,
                    'sort_order' => $index,
                ]
            );
            $saved[] = $dept;
        }

        return response()->json(['message' => 'واحدهای سازمانی با دیتابیس همگام شدند.', 'data' => $saved]);
    }
}`,
  contactModel: `// app/Models/Contact.php
namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class Contact extends Model
{
    use HasFactory;

    // اجازه ذخیره تمام فیلدهای ارسال شده از سامانه
    protected $guarded = [];

    // تبدیل خودکار آرایه‌های موبایل و تلفن ثابت به JSON
    protected $casts = [
        'mobiles'          => 'array',
        'landlines'        => 'array',
        'personal_mobiles' => 'array',
        'is_public'        => 'boolean',
        'is_mobile_public' => 'boolean',
        'has_ldap_account' => 'boolean',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * رابطه چندبه‌چند: کاربرانی که این مخاطب را نشان کرده‌اند
     */
    public function favoritedByUsers()
    {
        return $this->belongsToMany(User::class, 'contact_favorites')->withTimestamps();
    }
}

// -------------------------------------------------------------
// همچنین متد زیر را به مدل کاربر (app/Models/User.php) اضافه نمایید:
// -------------------------------------------------------------
/*
public function favoriteContacts()
{
    return $this->belongsToMany(\\App\\Models\\Contact::class, 'contact_favorites')->withTimestamps();
}
*/`,

  favMigration: `// database/migrations/xxxx_xx_xx_create_contact_favorites_table.php
use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    /**
     * جدول رابطه نشان‌شده‌ها (علاقه‌مندی‌ها) به ازای هر شناسه کاربر (userId)
     * هر کاربر دارای نشان‌شده‌های کاملاً مستقل و دائمی در دیتابیس است.
     */
    public function up(): void
    {
        Schema::create('contact_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained('contacts')->cascadeOnDelete();
            $table->timestamps();

            // تضمین یکتایی: هر مخاطب برای هر کاربر حداکثر یک بار ثبت می‌گردد
            $table->unique(['user_id', 'contact_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_favorites');
    }
};`,

  cors: `// config/cors.php
// رفع خطای CORS برای برقراری ارتباط بدون مسدودی بین مرورگر و سرور وب‌سرویس
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];`,

  migration: `// database/migrations/xxxx_xx_xx_create_contacts_table.php
use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->string('contact_type')->default('internal'); // internal یا external
            $table->string('domain_id')->nullable();
            $table->string('domain_name')->nullable();
            $table->string('company_name')->nullable(); // شرکت طرف قرارداد (برای برون‌سازمانی)
            $table->string('personnel_code')->nullable(); // کد پرسنلی الزامی پرسنل
            $table->string('prefix_title')->default('mr'); // mr, ms, location
            $table->string('first_name'); // نام یا نام مکان
            $table->string('last_name')->nullable();  // نام خانوادگی
            $table->string('job_title')->nullable(); // سمت سازمانی
            $table->string('department')->nullable(); // واحد سازمانی / دپارتمان
            $table->string('location')->nullable(); // موقعیت (ساختمان/اتاق)
            $table->json('mobiles')->nullable(); // شماره‌های همراه
            $table->boolean('is_mobile_public')->default(false); // نمایش عمومی همراه
            $table->json('personal_mobiles')->nullable();
            $table->json('landlines')->nullable(); // خط تلفن ثابت و داخلی
            $table->string('email')->nullable(); // ایمیل
            $table->text('description')->nullable(); // توضیحات
            $table->longText('avatar')->nullable(); // تصویر آواتار
            $table->boolean('has_ldap_account')->default(false);
            $table->string('ldap_username')->nullable();
            
            // کاربر ثبت‌کننده (با قابلیت nullOnDelete جهت تست و جلوگیری از خطای Foreign Key)
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('created_by_user_name')->nullable();
            $table->boolean('is_public')->default(true); // مخاطب عمومی سازمانی
            $table->timestamps();

            // توجه: وضعیت نشان‌شده‌های هر کاربر در جدول رابط contact_favorites نگهداری می‌شود
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};`,

  controller: `// app/Http/Controllers/Api/ContactController.php
namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\Contact;
use Illuminate\\Http\\Request;

class ContactController extends Controller
{
    /**
     * دریافت لیست مخاطبین (با وضعیت اختصاصی نشان‌شده کاربر لاگین‌شده)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Contact::query();

        // اگر کاربر احراز هویت شده و ادمین نباشد، شماره‌های عمومی یا ثبت‌شده توسط خودش را می‌بیند
        if ($user && !($user->is_admin ?? false) && ($user->role ?? '') !== 'admin') {
            $query->where(function($q) use ($user) {
                $q->where('created_by_user_id', $user->id)
                  ->orWhere('is_public', true);
            });
        }

        if ($request->filled('department') && $request->department !== 'all') {
            $query->where('department', $request->department);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function($q) use ($s) {
                $q->where('first_name', 'like', "%{$s}%")
                  ->orWhere('last_name', 'like', "%{$s}%")
                  ->orWhere('job_title', 'like', "%{$s}%")
                  ->orWhere('personnel_code', 'like', "%{$s}%")
                  ->orWhere('location', 'like', "%{$s}%");
            });
        }

        // استخراج شناسه‌های نشان‌شده کاربر لاگین‌شده از جدول رابط contact_favorites
        $userFavIds = $user ? $user->favoriteContacts()->pluck('contacts.id')->toArray() : [];

        $contacts = $query->orderBy('first_name')->get()->map(function ($contact) use ($userFavIds) {
            $contact->is_favorite = in_array($contact->id, $userFavIds);
            return $contact;
        });

        return response()->json($contacts);
    }

    /**
     * ثبت مخاطب جدید
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name'   => 'required|string|max:150',
            'last_name'    => 'nullable|string|max:150',
            'prefix_title' => 'nullable|string',
            'mobiles'      => 'nullable|array',
            'landlines'    => 'nullable|array',
        ]);

        $data = $request->all();
        if ($request->user()) {
            $data['created_by_user_id'] = $request->user()->id;
            $data['created_by_user_name'] = $request->user()->name ?? 'کاربر سیستم';
        }

        $contact = Contact::create($data);
        return response()->json($contact, 201);
    }

    /**
     * نمایش اطلاعات یک مخاطب
     */
    public function show(Contact $contact)
    {
        return response()->json($contact);
    }

    /**
     * ویرایش مخاطب
     */
    public function update(Request $request, Contact $contact)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:150',
            'last_name'  => 'nullable|string|max:150',
        ]);

        $contact->update($request->all());
        return response()->json($contact);
    }

    /**
     * حذف مخاطب
     */
    public function destroy(Contact $contact)
    {
        $contact->delete();
        return response()->json(['message' => 'مخاطب با موفقیت حذف گردید.']);
    }

    /**
     * تغییر وضعیت نشان‌شده / علاقه‌مندی به ازای کاربر لاگین‌شده (Toggle Favorite)
     */
    public function favorite(Request $request, Contact $contact)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'کاربر احراز هویت نشده است.'], 401);
        }

        // بررسی و معکوس‌سازی وضعیت در جدول رابط contact_favorites
        $isFavorited = $user->favoriteContacts()->where('contact_id', $contact->id)->exists();
        if ($isFavorited) {
            $user->favoriteContacts()->detach($contact->id);
            $newStatus = false;
        } else {
            $user->favoriteContacts()->attach($contact->id);
            $newStatus = true;
        }

        $contact->is_favorite = $newStatus;
        return response()->json([
            'status' => 'success',
            'contact_id' => $contact->id,
            'is_favorite' => $newStatus,
            'message' => $newStatus ? 'به نشان‌شده‌ها اضافه شد.' : 'از نشان‌شده‌ها حذف شد.',
        ]);
    }
}`,

  ldapAuth: `// app/Http/Controllers/Api/AuthController.php
// احراز هویت دامین با اکتیودایرکتوری (Directory Service)
namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\LdapDomain;
use App\\Models\\User;
use Illuminate\\Http\\Request;
use LdapRecord\\Connection;

class AuthController extends Controller
{
    public function loginWithLdap(Request $request)
    {
        $request->validate([
            'domain_id' => 'required|exists:ldap_domains,id',
            'username'  => 'required|string',
            'password'  => 'required|string',
        ]);

        $domain = LdapDomain::findOrFail($request->domain_id);

        // ساخت کانکشن پویا به دامین انتخاب شده توسط کاربر
        $connection = new Connection([
            'hosts'    => [$domain->host],
            'port'     => $domain->port,
            'base_dn'  => $domain->base_dn,
            'use_ssl'  => $domain->encryption === 'ssl',
            'use_tls'  => $domain->encryption === 'tls',
        ]);

        // تست اعتبارسنجی با نام کاربری و رمز در Active Directory
        $userPrincipal = $request->username . '@' . $domain->name;
        if (!$connection->auth()->attempt($userPrincipal, $request->password)) {
            return response()->json(['message' => 'نام کاربری یا رمز عبور دامین نادرست است.'], 401);
        }

        // سینک یا ایجاد کاربر محلی در جدول users
        $user = User::firstOrCreate(
            ['username' => $request->username, 'domain' => $domain->name],
            ['name' => $request->username, 'role' => 'staff']
        );

        $token = $user->createToken('auth-token')->plainTextToken;
        return response()->json(['user' => $user, 'token' => $token]);
    }
}`,

  routes: `// routes/api.php
use App\\Http\\Controllers\\Api\\ContactController;
use App\\Http\\Controllers\\Api\\DepartmentController;
use App\\Http\\Controllers\\Api\\AuthController;
use App\\Http\\Controllers\\Api\\LdapDomainController;
use App\\Http\\Controllers\\Api\\VoipController;

// 1. ورود یکپارچه با حساب Active Directory
Route::post('/login/ldap', [AuthController::class, 'loginWithLdap']);

// دریافت لیست عمومی واحدها (جهت استفاده در فیلترها و فرم‌ها)
Route::get('/departments', [DepartmentController::class, 'index']);

// 2. مسیرهای دارای احراز هویت (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // مخاطبین با تفکیک دسترسی پرسنل و ادمین
    Route::apiResource('contacts', ContactController::class);
    // تغییر وضعیت نشان‌شده اختصاصی کاربر
    Route::post('contacts/{contact}/favorite', [ContactController::class, 'favorite']);

    // مدیریت واحدهای سازمانی در دیتابیس (ادمین)
    Route::apiResource('departments', DepartmentController::class)->except(['index']);
    Route::post('departments/sync', [DepartmentController::class, 'sync']);

    // مدیریت دامین‌های LDAP (منحصراً برای ادمین)
    Route::apiResource('ldap-domains', LdapDomainController::class);
    Route::post('ldap-domains/{domain}/test', [LdapDomainController::class, 'testConnection']);
    Route::post('ldap-domains/{domain}/test-voip', [LdapDomainController::class, 'testVoipConnection']);

    // ۳. قابلیت تماس با یک کلیک با سرور ایزابل (Click-to-Call Originate)
    Route::post('voip/originate', [VoipController::class, 'originate']);
});`,

  voipController: `// app/Http/Controllers/Api/VoipController.php
// پیاده‌سازی Click-to-Call با پروتکل Asterisk Manager Interface (AMI) ایزابل
namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\LdapDomain;
use Illuminate\\Http\\Request;

class VoipController extends Controller
{
    public function originate(Request $request)
    {
        $request->validate([
            'target_number' => 'required|string',
        ]);

        $user = $request->user();
        // خواندن شماره داخلی کاربر که در زمان ورود از Active Directory خوانده شده
        $callerExt = $user->extension; 
        if (!$callerExt) {
            return response()->json([
                'message' => 'شماره داخلی تلفن رومیزی در حساب اکتیودایرکتوری شما (ipPhone) تعریف نشده است.'
            ], 422);
        }

        // واکشی سرور ایزابل مرتبط با دامین کاربر
        $domain = LdapDomain::where('name', $user->domain)->first();
        $host = $domain->voip_server_host ?? '192.168.10.25';
        $port = $domain->voip_ami_port ?? 5038;
        $userAmi = $domain->voip_ami_username ?? 'phonebook_ami';
        $secretAmi = $domain->voip_ami_secret ?? 'IssabelSecret!2026';
        $context = $domain->voip_context ?? 'from-internal';
        $tech = $domain->voip_channel_tech ?? 'SIP';

        // باز کردن سوکت TCP به سرور ایزابل روی پورت AMI
        $socket = @fsockopen($host, $port, $errno, $errstr, 4);
        if (!$socket) {
            return response()->json(['message' => "خطا در برقراری ارتباط با سرور ایزابل: {$errstr}"], 500);
        }

        // احراز هویت با AMI
        fputs($socket, "Action: Login\\r\\nUserName: {$userAmi}\\r\\nSecret: {$secretAmi}\\r\\n\\r\\n");
        
        // ارسال دستور Originate برای زنگ خوردن تلفن رومیزی کاربر
        $channel = "{$tech}/{$callerExt}";
        $cmd = "Action: Originate\\r\\n"
             . "Channel: {$channel}\\r\\n"
             . "Exten: {$request->target_number}\\r\\n"
             . "Context: {$context}\\r\\n"
             . "Priority: 1\\r\\n"
             . "CallerID: Phonebook <{$callerExt}>\\r\\n"
             . "Timeout: 30000\\r\\n\\r\\n";
        
        fputs($socket, $cmd);
        fputs($socket, "Action: Logoff\\r\\n\\r\\n");
        fclose($socket);

        return response()->json([
            'success' => true,
            'message' => "دستور تماس ارسال شد. تلفن رومیزی شما (داخلی {$callerExt}) در حال زنگ خوردن است.",
        ]);
    }
}`,

  issabelManagerConf: `; /etc/asterisk/manager.conf (در سرور ایزابل)
; برای اعطای دسترسی به وب‌سرویس سرور این بلوک را در انتهای فایل قرار دهید:
[phonebook_ami]
secret = Issabel@2026!secret
deny = 0.0.0.0/0.0.0.0
permit = 192.168.10.0/255.255.255.0 ; رنج IP سرور وب‌سرویس
read = originate,system,call
write = originate,system,call`,

  amiBlfListener: `// app/Console/Commands/AsteriskBlfListener.php
// شنود بلادرنگ رویدادهای ExtensionStatus استریسک/ایزابل بدون سربار روی سرور (Event-Driven Daemon)
namespace App\\Console\\Commands;

use Illuminate\\Console\\Command;
use App\\Events\\ExtensionStatusChanged;

class AsteriskBlfListener extends Command
{
    protected $signature = 'voip:blf-listen';
    protected $description = 'Listen to Asterisk AMI ExtensionStatus events and broadcast via WebSocket (Zero Server Polling Overhead)';

    public function handle()
    {
        $host = config('voip.ami_host', '192.168.10.25');
        $port = config('voip.ami_port', 5038);
        $user = config('voip.ami_user', 'phonebook_ami');
        $secret = config('voip.ami_secret', 'Issabel@2026!secret');

        $this->info("Connecting to Issabel/Asterisk AMI at {$host}:{$port}...");
        $socket = fsockopen($host, $port, $errno, $errstr, 10);
        if (!$socket) {
            $this->error("Failed to connect: {$errstr}");
            return 1;
        }

        // ورود به AMI با دریافت اختصاصی رویدادهای call
        fputs($socket, "Action: Login\\r\\nUserName: {$user}\\r\\nSecret: {$secret}\\r\\nEvents: call\\r\\n\\r\\n");

        $buffer = '';
        while (!feof($socket)) {
            $line = fgets($socket, 1024);
            $buffer .= $line;

            // رویدادها در AMI با خط خالی تفکیک می‌شوند
            if (trim($line) === '') {
                if (str_contains($buffer, 'Event: ExtensionStatus')) {
                    preg_match('/Exten: (\\d+)/', $buffer, $extMatch);
                    preg_match('/Status: (-?\\d+)/', $buffer, $statusMatch);

                    if (!empty($extMatch[1]) && isset($statusMatch[1])) {
                        $ext = $extMatch[1];
                        $statusCode = (int)$statusMatch[1];

                        // تبدیل وضعیت‌های استریسک به ۳ وضعیت اختصاصی (بدون زرد/چشمک‌زن Ringing):
                        // 0 = Idle (سبز/آزاد), 1/2 = InUse/Busy (قرمز/مشغول), 4/-1 = Unavailable (خاکستری/آفلاین)
                        $state = match ($statusCode) {
                            0 => 'idle',
                            1, 2 => 'busy',
                            default => 'offline',
                        };

                        // انتشار بلادرنگ روی وب‌سوکت به کلاینت‌های مجاز
                        broadcast(new ExtensionStatusChanged($ext, $state));
                        $this->line("BLF Event: Exten {$ext} => {$state}");
                    }
                }
                $buffer = '';
            }
        }
        fclose($socket);
    }
}`,
};
