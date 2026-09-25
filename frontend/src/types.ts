export type PrefixTitle = 'mr' | 'ms' | 'location';

export interface LandlineEntry {
  id: string;
  phone?: string;
  extension?: string;
  number?: string;
  title?: string;
  type?: string;
  is_admin_only?: boolean;
}

export interface Contact {
  id: number;
  personnel_code?: string;
  prefix_title: PrefixTitle;
  first_name: string;
  last_name: string;
  job_title?: string;
  department?: string;
  location?: string;
  mobiles?: string[];
  is_mobile_public?: boolean;
  personal_mobiles?: Record<string | number, string[]>;
  landlines?: LandlineEntry[];
  email?: string;
  description?: string;
  avatar?: string;
  contact_type: 'internal' | 'external';
  company_name?: string;
  domain?: string;
  domain_id?: string | number;
  domain_name?: string;
  is_favorite?: boolean;
  is_public?: boolean;
  has_ldap_account?: boolean;
  ldap_username?: string;
  display_order?: number;
  created_by_user_id?: number | string;
  created_by_user_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number | string;
  name: string;
  username: string;
  email?: string;
  personnel_code?: string;
  role: 'admin' | 'staff' | string;
  extension?: string;
  department?: string;
  domain?: string;
  domain_id?: string | number;
  domain_name?: string;
  token?: string;
  auth_method?: 'local' | 'ldap' | string;
}

export interface LdapDomain {
  id: string;
  name: string;
  display_name: string;
  domain_name?: string;
  host: string;
  port: number;
  base_dn: string;
  encryption: 'none' | 'ssl' | 'tls' | string;
  bind_user?: string;
  bind_password?: string;
  user_filter?: string;
  is_default: boolean;
  is_active: boolean;
  sync_interval_hours?: number;
  default_voip_prefix?: string;
  voip_enabled?: boolean;
  voip_server_host?: string;
  voip_ami_port?: number;
  voip_ami_username?: string;
  voip_ami_secret?: string;
  voip_context?: string;
  voip_trunk_prefix?: string;
  voip_channel_tech?: string;
  voip_auto_answer?: boolean;
  netbios_name?: string;
  domain_controllers?: string;
  user_dn?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  domain_id?: string | number | null;
  domain_name?: string;
  sort_order?: number;
}

export interface LaravelConfig {
  baseUrl: string;
  apiPrefix: string;
  token: string;
  status?: string;
  lastPing?: string;
}

export type ViewMode = 'grid' | 'table' | 'card';

export interface ApiUsageStatus {
  totalCalls: number;
  limit: number;
  remainingCalls: number;
  percentUsed: number;
  isApproachingLimit: boolean;
  isRateLimited: boolean;
  resetTimeRemainingSec: number;
  windowSizeSec?: number;
}

export type BlfState = 'idle' | 'busy' | 'offline' | 'ringing';

export interface BlfExtensionInfo {
  extension: string;
  state: BlfState;
  name: string;
  department?: string;
  jobTitle?: string;
  contactId?: number | string;
  domain_id?: string | number;
  durationSec?: number;
  isDnd?: boolean;
}

export interface UserBlfPermission {
  userId: number;
  userName: string;
  userExtension?: string;
  department?: string;
  domainId?: string | number;
  domainName?: string;
  monitoredExtensions: string[];
  canViewAll?: boolean;
  canViewBlf?: boolean;
  role?: string;
}
