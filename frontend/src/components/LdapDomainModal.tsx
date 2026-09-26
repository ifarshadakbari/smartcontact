import React, { useState } from 'react';
import {
  Network,
  Server,
  Plus,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  Lock,
  Globe,
  Star,
  Code,
  Layers,
  PhoneCall,
  PhoneForwarded,
  Radio,
  FileCode,
} from 'lucide-react';
import { LdapDomain } from '../types';
import { testLdapConnection, testVoipAmiConnection, LARAVEL_CODE_SNIPPET } from '../services/apiService';

interface LdapDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domains: LdapDomain[];
  onSaveDomains: (domains: LdapDomain[]) => void;
}

export const LdapDomainModal: React.FC<LdapDomainModalProps> = ({
  isOpen,
  onClose,
  domains,
  onSaveDomains,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'edit' | 'code'>('list');
  const [editingDomain, setEditingDomain] = useState<LdapDomain | null>(null);
  const [isTestingId, setIsTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states for creating / editing
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(389);
  const [baseDn, setBaseDn] = useState('');
  const [encryption, setEncryption] = useState<'none' | 'ssl' | 'tls'>('none');
  const [bindUser, setBindUser] = useState('');
  const [bindPassword, setBindPassword] = useState('');
  const [userFilter, setUserFilter] = useState('(&(objectClass=user)(sAMAccountName={username}))');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // VoIP Issabel Asterisk AMI states
  const [voipEnabled, setVoipEnabled] = useState(true);
  const [voipServerHost, setVoipServerHost] = useState('');
  const [voipAmiPort, setVoipAmiPort] = useState(5038);
  const [voipAmiUsername, setVoipAmiUsername] = useState('phonebook_ami');
  const [voipAmiSecret, setVoipAmiSecret] = useState('');
  const [voipContext, setVoipContext] = useState('from-internal');
  const [voipTrunkPrefix, setVoipTrunkPrefix] = useState('');
  const [voipChannelTech, setVoipChannelTech] = useState<'SIP' | 'PJSIP' | 'DAHDI'>('SIP');
  const [voipAutoAnswer, setVoipAutoAnswer] = useState(true);
  const [isTestingVoipId, setIsTestingVoipId] = useState<string | null>(null);
  const [voipTestResults, setVoipTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number; version?: string }>>({});
  const [codeSubTab, setCodeSubTab] = useState<'ldap' | 'voip' | 'manager' | 'routes'>('ldap');

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingDomain(null);
    setName('');
    setDisplayName('');
    setHost('');
    setPort(389);
    setBaseDn('');
    setEncryption('none');
    setBindUser('');
    setBindPassword('');
    setUserFilter('(&(objectClass=user)(sAMAccountName={username}))');
    setIsDefault(domains.length === 0);
    setIsActive(true);
    setFormError(null);

    // Default VoIP settings
    setVoipEnabled(true);
    setVoipServerHost('192.168.10.25');
    setVoipAmiPort(5038);
    setVoipAmiUsername('phonebook_ami');
    setVoipAmiSecret('Issabel@2026!secret');
    setVoipContext('from-internal');
    setVoipTrunkPrefix('');
    setVoipChannelTech('SIP');
    setVoipAutoAnswer(true);

    setActiveTab('edit');
  };

  const handleOpenEdit = (domain: LdapDomain) => {
    setEditingDomain(domain);
    setName(domain.name);
    setDisplayName(domain.display_name);
    setHost(domain.host);
    setPort(domain.port);
    setBaseDn(domain.base_dn);
    setEncryption((domain.encryption as 'none' | 'ssl' | 'tls') || 'none');
    setBindUser(domain.bind_user || '');
    setBindPassword(domain.bind_password || '');
    setUserFilter(domain.user_filter || '(&(objectClass=user)(sAMAccountName={username}))');
    setIsDefault(domain.is_default);
    setIsActive(domain.is_active);
    setFormError(null);

    // VoIP settings
    setVoipEnabled(domain.voip_enabled ?? true);
    setVoipServerHost(domain.voip_server_host || '');
    setVoipAmiPort(domain.voip_ami_port || 5038);
    setVoipAmiUsername(domain.voip_ami_username || 'phonebook_ami');
    setVoipAmiSecret(domain.voip_ami_secret || '');
    setVoipContext(domain.voip_context || 'from-internal');
    setVoipTrunkPrefix(domain.voip_trunk_prefix || '');
    setVoipChannelTech((domain.voip_channel_tech as 'SIP' | 'PJSIP' | 'DAHDI') || 'SIP');
    setVoipAutoAnswer(domain.voip_auto_answer ?? true);

    setActiveTab('edit');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('نام دامین الزامی است.');
      return;
    }
    if (!displayName.trim()) {
      setFormError('عنوان فارسی نمایشی دامین الزامی است.');
      return;
    }
    if (!host.trim()) {
      setFormError('آدرس IP یا نام هاست سرور LDAP الزامی است.');
      return;
    }
    if (!baseDn.trim()) {
      setFormError('مسیر پایه دایرکتوری (Base DN) الزامی است.');
      return;
    }

    const domainData: LdapDomain = {
      id: editingDomain ? editingDomain.id : `dom-${Date.now()}`,
      name: name.trim().toUpperCase(),
      display_name: displayName.trim(),
      host: host.trim(),
      port: Number(port) || 389,
      base_dn: baseDn.trim(),
      encryption,
      bind_user: bindUser.trim() || undefined,
      bind_password: bindPassword || undefined,
      user_filter: userFilter.trim() || undefined,
      is_default: isDefault,
      is_active: isActive,
      created_at: editingDomain ? editingDomain.created_at : new Date().toLocaleDateString('fa-IR'),
      
      // VoIP settings
      voip_enabled: voipEnabled,
      voip_server_host: voipServerHost.trim() || undefined,
      voip_ami_port: Number(voipAmiPort) || 5038,
      voip_ami_username: voipAmiUsername.trim() || undefined,
      voip_ami_secret: voipAmiSecret || undefined,
      voip_context: voipContext.trim() || 'from-internal',
      voip_trunk_prefix: voipTrunkPrefix.trim() || undefined,
      voip_channel_tech: voipChannelTech,
      voip_auto_answer: voipAutoAnswer,
    };

    let updatedList = [...domains];
    if (isDefault) {
      // Unset previous defaults
      updatedList = updatedList.map((d) => ({ ...d, is_default: false }));
    }

    if (editingDomain) {
      updatedList = updatedList.map((d) => (d.id === editingDomain.id ? domainData : d));
    } else {
      updatedList.push(domainData);
    }

    // Ensure at least one default exists
    if (!updatedList.some((d) => d.is_default) && updatedList.length > 0) {
      updatedList[0].is_default = true;
    }

    onSaveDomains(updatedList);
    setActiveTab('list');
  };

  const handleDeleteDomain = (id: string) => {
    const updated = domains.filter((d) => d.id !== id);
    if (updated.length > 0 && !updated.some((d) => d.is_default)) {
      updated[0].is_default = true;
    }
    onSaveDomains(updated);
    setDeleteConfirmId(null);
  };

  const handleSetDefault = (id: string) => {
    const updated = domains.map((d) => ({
      ...d,
      is_default: d.id === id,
    }));
    onSaveDomains(updated);
  };

  const handleTestConnection = async (domain: LdapDomain) => {
    setIsTestingId(domain.id);
    const res = await testLdapConnection(domain);
    setTestResults((prev) => ({ ...prev, [domain.id]: res }));
    setIsTestingId(null);
  };

  const handleTestVoipConnection = async (domain: LdapDomain) => {
    setIsTestingVoipId(domain.id);
    const res = await testVoipAmiConnection(domain);
    setVoipTestResults((prev) => ({ ...prev, [domain.id]: res }));
    setIsTestingVoipId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-blue-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">مدیریت دامین‌های سازمانی (LDAP / Active Directory)</h2>
              <p className="text-[11px] text-neutral-300">
                تنظیم سرورهای احراز هویت دامین، پورت‌ها و سطوح دسترسی کاربران
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'list'
                ? 'border-neutral-900 text-neutral-900 bg-white rounded-t-lg'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>فهرست دامین‌ها ({domains.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'edit'
                ? 'border-neutral-900 text-neutral-900 bg-white rounded-t-lg'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingDomain ? 'ویرایش دامین' : 'تعریف دامین جدید'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'code'
                ? 'border-neutral-900 text-neutral-900 bg-white rounded-t-lg'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>کدهای وب‌سرویس بک‌اند و سرور</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4">
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  کاربران در صفحه ورود می‌توانند یکی از دامین‌های فعال زیر را برای اعتبارسنجی با Active Directory انتخاب کنند.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن دامین</span>
                </button>
              </div>

              {domains.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl">
                  <Network className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">هنوز هیچ دامینی تعریف نشده است.</p>
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="mt-3 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    تعریف اولین دامین سازمان
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {domains.map((dom) => {
                    const test = testResults[dom.id];
                    return (
                      <div
                        key={dom.id}
                        className={`p-4 rounded-xl border transition ${
                          dom.is_default
                            ? 'border-blue-500 bg-blue-50/20'
                            : 'border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-neutral-900" dir="ltr">
                                {dom.name}
                              </span>
                              {dom.is_default && (
                                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-current" />
                                  دامین پیش‌فرض
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  dom.is_active
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-neutral-200 text-neutral-600'
                                }`}
                              >
                                {dom.is_active ? 'فعال' : 'غیرفعال'}
                              </span>
                            </div>

                            <p className="text-xs font-medium text-neutral-700 mt-1">
                              {dom.display_name}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-neutral-500 font-mono" dir="ltr">
                              <span className="flex items-center gap-1">
                                <Server className="w-3 h-3 text-neutral-400" />
                                {dom.host}:{dom.port}
                              </span>
                              <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
                                امنیت: {dom.encryption.toUpperCase()}
                              </span>
                              <span className="text-neutral-400 truncate max-w-[200px]" title={dom.base_dn}>
                                {dom.base_dn}
                              </span>
                            </div>

                            {/* VoIP Server info badge */}
                            {dom.voip_enabled ? (
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                                <span className="flex items-center gap-1 font-semibold">
                                  <PhoneCall className="w-3 h-3 text-emerald-600" />
                                  <span>سرور VoIP:</span>
                                </span>
                                <span className="font-mono font-bold" dir="ltr">{dom.voip_server_host}:{dom.voip_ami_port || 5038}</span>
                                <span className="text-[10px] text-emerald-600 bg-emerald-100/60 px-1.5 py-0.5 rounded font-mono">
                                  {dom.voip_channel_tech || 'SIP'} / {dom.voip_context || 'from-internal'}
                                </span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-neutral-400 mt-1.5 flex items-center gap-1">
                                <Radio className="w-3 h-3 text-neutral-300" />
                                <span>سرویس تماس VoIP غیرفعال است</span>
                              </div>
                            )}
                          </div>

                          {/* Action Controls */}
                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                            {/* LDAP Test Button */}
                            <button
                              type="button"
                              onClick={() => handleTestConnection(dom)}
                              disabled={isTestingId === dom.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg text-xs text-neutral-700 font-medium transition cursor-pointer disabled:opacity-50 shadow-2xs"
                              title="تست ارتباط با سرور LDAP / Active Directory"
                            >
                              <RefreshCw
                                className={`w-3 h-3 text-blue-600 ${
                                  isTestingId === dom.id ? 'animate-spin' : ''
                                }`}
                              />
                              <span>تست LDAP</span>
                            </button>

                            {/* VoIP AMI Test Button */}
                            {dom.voip_enabled && (
                              <button
                                type="button"
                                onClick={() => handleTestVoipConnection(dom)}
                                disabled={isTestingVoipId === dom.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs text-emerald-800 font-medium transition cursor-pointer disabled:opacity-50 shadow-2xs"
                                title="تست ارتباط سوکت AMI با سرور VoIP پورت ۵۰۳۸"
                              >
                                <PhoneForwarded
                                  className={`w-3 h-3 text-emerald-600 ${
                                    isTestingVoipId === dom.id ? 'animate-spin' : ''
                                  }`}
                                />
                                <span>تست VoIP</span>
                              </button>
                            )}

                            {!dom.is_default && (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(dom.id)}
                                className="px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-900 border border-neutral-300 bg-white rounded-lg transition cursor-pointer hover:bg-neutral-100"
                                title="تنظیم به عنوان دامین پیش‌فرض"
                              >
                                پیش‌فرض
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(dom)}
                              className="p-1.5 text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-300 rounded-lg transition cursor-pointer hover:bg-neutral-100"
                              title="ویرایش تنظیمات دامین و VoIP"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {deleteConfirmId === dom.id ? (
                              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                                <span className="text-[10px] text-red-700 font-bold">حذف شود؟</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDomain(dom.id)}
                                  className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] cursor-pointer"
                                >
                                  بله
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded text-[10px] cursor-pointer"
                                >
                                  خیر
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(dom.id)}
                                className="p-1.5 text-neutral-400 hover:text-red-600 bg-white border border-neutral-300 rounded-lg transition cursor-pointer hover:bg-neutral-100"
                                title="حذف دامین"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* LDAP Test connection result display */}
                        {test && (
                          <div
                            className={`mt-3 p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                              test.success
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {test.success ? (
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                              )}
                              <span>[LDAP] {test.message}</span>
                            </div>
                            <span className="font-mono text-[11px] text-neutral-500" dir="ltr">
                              {test.latencyMs} ms
                            </span>
                          </div>
                        )}

                        {/* VoIP Test connection result display */}
                        {voipTestResults[dom.id] && (
                          <div
                            className={`mt-2 p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                              voipTestResults[dom.id].success
                                ? 'bg-teal-50 border-teal-200 text-teal-800'
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {voipTestResults[dom.id].success ? (
                                <Check className="w-4 h-4 text-teal-600 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span>[سرور VoIP] {voipTestResults[dom.id].message}</span>
                            </div>
                            <span className="font-mono text-[11px] text-neutral-500" dir="ltr">
                              {voipTestResults[dom.id].latencyMs} ms
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <form onSubmit={handleSaveForm} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Domain Name */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    نام دامین (NetBIOS / FQDN) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="domain.local یا domain.com"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    dir="ltr"
                    required
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    شناسه دامین سازمانی برای لاگین کاربران
                  </span>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    عنوان فارسی نمایشی دامین <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="عنوان نمایشی دامین"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    عنوانی که در منوی بازشوی لاگین نمایش داده می‌شود
                  </span>
                </div>

                {/* Server Host / IP */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    آدرس سرور / کنترلر دامین (DC Host / IP) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.10 یا dc1.company.ir"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    dir="ltr"
                    required
                  />
                </div>

                {/* Port & Encryption */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">پورت LDAP</label>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">رمزنگاری</label>
                    <select
                      value={encryption}
                      onChange={(e) => {
                        const val = e.target.value as 'none' | 'ssl' | 'tls';
                        setEncryption(val);
                        if (val === 'ssl' && port === 389) setPort(636);
                        if (val === 'none' && port === 636) setPort(389);
                      }}
                      className="w-full px-2 py-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      <option value="none">بدون رمزنگاری (Plain)</option>
                      <option value="ssl">LDAPS (SSL/636)</option>
                      <option value="tls">STARTTLS</option>
                    </select>
                  </div>
                </div>

                {/* Base DN */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    مسیر پایه جستجو (Base DN) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={baseDn}
                    onChange={(e) => setBaseDn(e.target.value)}
                    placeholder="DC=corp,DC=company,DC=ir"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    dir="ltr"
                    required
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    ریشه درخت اکتیودایرکتوری برای پیدا کردن اطلاعات کاربری
                  </span>
                </div>

                {/* Optional Service Account (Bind DN) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    اکانت اتصال سیستمی (Bind DN - اختیاری)
                  </label>
                  <input
                    type="text"
                    value={bindUser}
                    onChange={(e) => setBindUser(e.target.value)}
                    placeholder="CN=svc_ldap,OU=ServiceAccounts,DC=corp,DC=company,DC=ir"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    رمز عبور اتصال سیستمی (اختیاری)
                  </label>
                  <input
                    type="password"
                    value={bindPassword}
                    onChange={(e) => setBindPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                {/* User Filter */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    فیلتر جستجوی اکانت‌ها (User Filter)
                  </label>
                  <input
                    type="text"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* VoIP Issabel / Asterisk AMI Configuration Section */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border border-emerald-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        تنظیمات سرور VoIP (Asterisk AMI) - تماس با یک کلیک (Click to Call)
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        ارسال فرمان Originate به استریسک تا تلفن رومیزی IP Phone کاربر شماره مقصد را شماره‌گیری کند
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs self-start sm:self-auto">
                    <input
                      type="checkbox"
                      checked={voipEnabled}
                      onChange={(e) => setVoipEnabled(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>فعال‌سازی سرویس VoIP برای این دامین</span>
                  </label>
                </div>

                {voipEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        آدرس IP / هاست سرور VoIP (PBX Host)
                      </label>
                      <input
                        type="text"
                        value={voipServerHost}
                        onChange={(e) => setVoipServerHost(e.target.value)}
                        placeholder="192.168.10.25 یا voip.company.ir"
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                          پورت AMI (پیش‌فرض 5038)
                        </label>
                        <input
                          type="number"
                          value={voipAmiPort}
                          onChange={(e) => setVoipAmiPort(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                          تکنولوژی چنل
                        </label>
                        <select
                          value={voipChannelTech}
                          onChange={(e) => setVoipChannelTech(e.target.value as any)}
                          className="w-full px-2 py-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        >
                          <option value="SIP">SIP (چنل استاندارد)</option>
                          <option value="PJSIP">PJSIP (نسخه جدید VoIP)</option>
                          <option value="DAHDI">DAHDI (آنالوگ/E1)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        نام کاربری AMI (تعریف‌شده در manager.conf)
                      </label>
                      <input
                        type="text"
                        value={voipAmiUsername}
                        onChange={(e) => setVoipAmiUsername(e.target.value)}
                        placeholder="phonebook_ami"
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        رمز عبور AMI (Secret)
                      </label>
                      <input
                        type="password"
                        value={voipAmiSecret}
                        onChange={(e) => setVoipAmiSecret(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        کانتکست تماس در سرور VoIP (Context)
                      </label>
                      <input
                        type="text"
                        value={voipContext}
                        onChange={(e) => setVoipContext(e.target.value)}
                        placeholder="from-internal"
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                        پیش‌شماره خط شهری Trunk (اختیاری)
                      </label>
                      <input
                        type="text"
                        value={voipTrunkPrefix}
                        onChange={(e) => setVoipTrunkPrefix(e.target.value)}
                        placeholder="مثلاً 9 یا بدون پیش‌شماره"
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono text-neutral-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-neutral-200 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-800">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>تنظیم به عنوان دامین پیش‌فرض ورود</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-800">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>دامین فعال باشد</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-4 flex items-center justify-between gap-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={async () => {
                    const tempDomain: LdapDomain = {
                      id: editingDomain?.id || 'temp-test',
                      name: name.trim().toUpperCase(),
                      display_name: displayName.trim() || name.trim(),
                      host: host.trim(),
                      port: Number(port) || 389,
                      base_dn: baseDn.trim(),
                      encryption,
                      bind_user: bindUser.trim() || undefined,
                      bind_password: bindPassword || undefined,
                      user_filter: userFilter.trim() || undefined,
                      is_default: isDefault,
                      is_active: isActive,
                      voip_enabled: voipEnabled,
                    };
                    setIsTestingId('edit-form');
                    const res = await testLdapConnection(tempDomain);
                    setTestResults((prev) => ({ ...prev, 'edit-form': res }));
                    setIsTestingId(null);
                  }}
                  disabled={isTestingId === 'edit-form' || !host.trim() || !name.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="تست ارتباط زنده با اکتیودایرکتوری"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isTestingId === 'edit-form' ? 'animate-spin' : ''}`} />
                  <span>تست ارتباط زنده با سرور دامین</span>
                </button>

                {voipEnabled && (
                  <button
                    type="button"
                    onClick={async () => {
                      const tempDomain: LdapDomain = {
                        id: editingDomain?.id || 'temp-test',
                        name: name.trim().toUpperCase(),
                        display_name: displayName.trim() || name.trim(),
                        host: host.trim(),
                        port: Number(port) || 389,
                        base_dn: baseDn.trim(),
                        encryption,
                        is_default: isDefault,
                        is_active: isActive,
                        voip_enabled: voipEnabled,
                        voip_server_host: voipServerHost.trim(),
                        voip_ami_port: Number(voipAmiPort) || 5038,
                        voip_ami_username: voipAmiUsername.trim(),
                        voip_ami_secret: voipAmiSecret,
                        voip_context: voipContext.trim() || 'from-internal',
                        voip_channel_tech: voipChannelTech,
                        voip_auto_answer: voipAutoAnswer,
                      };
                      setIsTestingVoipId('edit-form');
                      const res = await testVoipAmiConnection(tempDomain);
                      setVoipTestResults((prev) => ({ ...prev, 'edit-form': res }));
                      setIsTestingVoipId(null);
                    }}
                    disabled={isTestingVoipId === 'edit-form' || !voipServerHost.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 shadow-2xs"
                    title="تست اتصال زنده به سرویس AMI سرور VoIP"
                  >
                    <PhoneForwarded
                      className={`w-3.5 h-3.5 text-emerald-600 ${
                        isTestingVoipId === 'edit-form' ? 'animate-spin' : ''
                      }`}
                    />
                    <span>تست ارتباط زنده با VoIP</span>
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-xs text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    {editingDomain ? 'ذخیره تغییرات دامین' : 'ثبت و فعال‌سازی دامین'}
                  </button>
                </div>
              </div>

              {testResults['edit-form'] && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in ${
                    testResults['edit-form'].success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {testResults['edit-form'].success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{testResults['edit-form'].message}</span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5 font-mono" dir="ltr">
                      تاخیر زمانی: {testResults['edit-form'].latencyMs} میلی‌ثانیه
                    </span>
                  </div>
                </div>
              )}

              {voipTestResults['edit-form'] && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in ${
                    voipTestResults['edit-form'].success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {voipTestResults['edit-form'].success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">[سرور VoIP] {voipTestResults['edit-form'].message}</span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5 font-mono" dir="ltr">
                      تاخیر زمانی: {voipTestResults['edit-form'].latencyMs} میلی‌ثانیه {voipTestResults['edit-form'].version ? `| نسخه: ${voipTestResults['edit-form'].version}` : ''}
                    </span>
                  </div>
                </div>
              )}
            </form>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              {/* Code Sub-tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-neutral-200 pb-2">
                <button
                  type="button"
                  onClick={() => setCodeSubTab('ldap')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    codeSubTab === 'ldap'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>۱. احراز هویت دامین (LdapRecord)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCodeSubTab('voip')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    codeSubTab === 'voip'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>۲. کنترلر تماس سرور VoIP (VoipController)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCodeSubTab('manager')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    codeSubTab === 'manager'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>۳. کانفیگ manager.conf سرور VoIP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCodeSubTab('routes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    codeSubTab === 'routes'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>۴. روت‌های وب‌سرویس (routes/api.php)</span>
                </button>
              </div>

              {codeSubTab === 'ldap' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl text-xs flex items-start gap-2">
                    <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p>
                      برای ورود و احراز هویت با اکتیودایرکتوری، از پروتکل استاندارد دایرکتوری سرویس 
                      استفاده شده و فیلد <code className="mx-1 font-mono font-bold bg-white px-1 py-0.5 rounded text-blue-700" dir="ltr">ipPhone</code> به عنوان داخلی تلفن رومیزی کاربر برگردانده می‌شود:
                    </p>
                  </div>
                  <pre className="p-4 bg-neutral-900 text-neutral-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-[380px]" dir="ltr">
                    {LARAVEL_CODE_SNIPPET.ldapAuth}
                  </pre>
                </div>
              )}

              {codeSubTab === 'voip' && (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-start gap-2">
                    <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      کد آماده کنترلر وب‌سرویس برای پروتکل AMI استریسک سرور VoIP. این کنترلر دستور <code className="mx-1 font-mono font-bold bg-white px-1 py-0.5 rounded text-emerald-700" dir="ltr">Action: Originate</code> را ارسال می‌کند تا ابتدا گوشی رومیزی کاربر زنگ بخورد و پس از برداشتن، شماره مقصد شماره‌گیری شود:
                    </p>
                  </div>
                  <pre className="p-4 bg-neutral-900 text-neutral-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-[380px]" dir="ltr">
                    {LARAVEL_CODE_SNIPPET.voipController}
                  </pre>
                </div>
              )}

              {codeSubTab === 'manager' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-start gap-2">
                    <Server className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      تنظیمات فایل <code className="mx-1 font-mono font-bold bg-white px-1 py-0.5 rounded text-amber-800" dir="ltr">/etc/asterisk/manager.conf</code> در سرور VoIP برای اعطای مجوز AMI به وب‌سرور:
                    </p>
                  </div>
                  <pre className="p-4 bg-neutral-900 text-neutral-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-[380px]" dir="ltr">
                    {LARAVEL_CODE_SNIPPET.issabelManagerConf}
                  </pre>
                </div>
              )}

              {codeSubTab === 'routes' && (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 text-purple-900 p-3 rounded-xl text-xs flex items-start gap-2">
                    <FileCode className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <p>
                      مسیرهای وب‌سرویس REST در فایل <code className="mx-1 font-mono font-bold bg-white px-1 py-0.5 rounded text-purple-800" dir="ltr">routes/api.php</code> سرور برای اتصال سامانه تلفن، مخاطبین و دامین‌ها:
                    </p>
                  </div>
                  <pre className="p-4 bg-neutral-900 text-neutral-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-[380px]" dir="ltr">
                    {LARAVEL_CODE_SNIPPET.routes}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-neutral-400" />
            امنیت احراز هویت با اکتیودایرکتوری / دایرکتوری سازمانی (LDAP)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-100 transition cursor-pointer text-xs"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
