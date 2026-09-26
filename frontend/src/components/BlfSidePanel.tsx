import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  ChevronLeft,
  ChevronRight,
  Settings,
  Search,
  Maximize2,
  Minimize2,
  X,
  Activity,
  User as UserIcon,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Network,
} from 'lucide-react';
import { BlfState, BlfExtensionInfo, User, Contact, LdapDomain } from '../types';
import { extractExtensionFromLandline } from '../services/blfService';
import { AnimatedAntennaIcon } from './AnimatedAntennaIcon';

interface BlfSidePanelProps {
  currentUser: User | null;
  extensionsData: BlfExtensionInfo[];
  allContacts: Contact[];
  ldapDomains?: LdapDomain[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onInitiateCall: (targetNumber: string, contact: Contact, title?: string) => void;
  onOpenBlfConfig?: () => void;
  onSelectContact?: (contact: Contact) => void;
}

export const BlfSidePanel: React.FC<BlfSidePanelProps> = ({
  currentUser,
  extensionsData,
  allContacts,
  ldapDomains = [],
  isOpen,
  onToggleOpen,
  onInitiateCall,
  onOpenBlfConfig,
  onSelectContact,
}) => {
  const [filterState, setFilterState] = useState<'all' | 'idle' | 'busy' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active user domain object
  const userDomainObj = useMemo(() => {
    if (!ldapDomains || ldapDomains.length === 0) return null;
    if (!currentUser?.domain) return ldapDomains[0];
    return (
      ldapDomains.find(
        (d) => d.name === currentUser.domain || d.id === currentUser.domain
      ) || ldapDomains[0]
    );
  }, [currentUser, ldapDomains]);

  // State classification helpers
  const isStateBusy = (s?: string) => {
    const raw = String(s || '').toLowerCase().trim();
    return (
      raw === 'busy' ||
      raw === 'inuse' ||
      raw === 'ringing' ||
      raw === 'hold' ||
      raw === 'onhold' ||
      raw === '1' ||
      raw === '2' ||
      raw === '9' ||
      raw === '16'
    );
  };
  const isStateOffline = (s?: string) => {
    const raw = String(s || '').toLowerCase().trim();
    return raw === 'offline' || raw === 'unavailable' || raw === '4' || raw === '-1';
  };
  const isStateIdle = (s?: string) => !isStateBusy(s) && !isStateOffline(s);

  // Counter metrics
  const canMakeCalls = Boolean(currentUser && currentUser.extension && currentUser.extension.trim() !== '');
  const idleCount = useMemo(
    () => extensionsData.filter((e) => isStateIdle(e.state)).length,
    [extensionsData]
  );
  const busyCount = useMemo(
    () => extensionsData.filter((e) => isStateBusy(e.state)).length,
    [extensionsData]
  );
  const offlineCount = useMemo(
    () => extensionsData.filter((e) => isStateOffline(e.state)).length,
    [extensionsData]
  );

  // Filtered list
  const filteredExtensions = useMemo(() => {
    return extensionsData.filter((item) => {
      if (filterState === 'idle' && !isStateIdle(item.state)) return false;
      if (filterState === 'busy' && !isStateBusy(item.state)) return false;
      if (filterState === 'offline' && !isStateOffline(item.state)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesExt = item.extension.toLowerCase().includes(q);
        const matchesDept = (item.department || '').toLowerCase().includes(q);
        if (!matchesName && !matchesExt && !matchesDept) return false;
      }
      return true;
    });
  }, [extensionsData, filterState, searchQuery]);

  const handleExtensionClick = (extInfo: BlfExtensionInfo) => {
    // Find matching contact in database
    const cleanExt = String(extInfo.extension).trim();
    const matched = allContacts.find((c) => {
      if (extInfo.contactId && String(c.id) === String(extInfo.contactId)) return true;
      return (
        c.landlines?.some((l) => extractExtensionFromLandline(l) === cleanExt) ||
        (c.personnel_code && String(c.personnel_code).trim() === cleanExt)
      );
    });

    if (matched) {
      if (extInfo.state === 'idle') {
        onInitiateCall(cleanExt, matched, `تماس مستقیم BLF با داخلی ${cleanExt}`);
      } else if (onSelectContact) {
        onSelectContact(matched);
      }
    }
  };

  // If panel is collapsed, render a high-efficiency floating dock pill
  if (!isOpen) {
    return (
      <aside
        id="blf-dock-collapsed"
        aria-label="داک وضعیت خطوط تلفن"
        className="fixed bottom-5 left-5 z-40"
      >
        <button
          type="button"
          onClick={onToggleOpen}
          className="group flex items-center gap-3 bg-neutral-900/95 hover:bg-neutral-950 text-white pl-4 pr-3.5 py-2.5 rounded-2xl shadow-xl border border-neutral-700/80 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          title="باز کردن پنل مانیتورینگ وضعیت خطوط (BLF)"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-xs tracking-wider text-neutral-200">BLF</span>
          </div>

          <div className="h-4 w-px bg-neutral-700 mx-0.5" />

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-emerald-400" title="داخلی‌های آزاد">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="font-mono font-bold text-[11px]">{idleCount}</span>
            </div>

            <div className="flex items-center gap-1 text-rose-400" title="داخلی‌های در حال مکالمه">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span className="font-mono font-bold text-[11px]">{busyCount}</span>
            </div>

            {offlineCount > 0 && (
              <div className="flex items-center gap-1 text-neutral-400" title="داخلی‌های غیرفعال">
                <span className="w-2 h-2 rounded-full bg-neutral-400 inline-block" />
                <span className="font-mono text-[11px]">{offlineCount}</span>
              </div>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition" />
        </button>
      </aside>
    );
  }

  // Expanded Side Panel (Left drawer in RTL layout)
  return (
    <aside
      id="blf-side-drawer"
      aria-label="پنل کناری مانیتورینگ خطوط BLF"
      className="fixed inset-y-0 left-0 z-40 w-80 sm:w-92 bg-white/98 backdrop-blur-md border-r border-neutral-200/90 shadow-2xl flex flex-col font-sans transition-transform duration-300"
    >
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 bg-neutral-900 text-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-emerald-400 border border-neutral-700">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">مانیتورینگ خطوط (BLF)</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                وضعیت بلادرنگ داخلی‌های منتخب (Busy Lamp Field)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {currentUser?.role === 'admin' && onOpenBlfConfig && (
              <button
                type="button"
                onClick={onOpenBlfConfig}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                title="تنظیمات و گزینش داخلی‌های این پنل"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title="بستن و جمع‌کردن پنل"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Domain Indicator Badge */}
        {userDomainObj && (
          <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-neutral-800/90 border border-neutral-700/80 flex items-center gap-2 text-[11px]">
            <Network className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-semibold text-neutral-100">{userDomainObj.display_name}</span>
          </div>
        )}

        {/* Status Counters Strip */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-800 text-center">
          <button
            type="button"
            onClick={() => setFilterState(filterState === 'idle' ? 'all' : 'idle')}
            className={`px-2 py-1.5 rounded-lg transition text-xs font-semibold cursor-pointer border ${
              filterState === 'idle'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                : 'bg-neutral-800/80 border-neutral-700/60 text-emerald-400 hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              <span>آزاد</span>
              <span className="font-mono text-[11px]">({idleCount})</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterState(filterState === 'busy' ? 'all' : 'busy')}
            className={`px-2 py-1.5 rounded-lg transition text-xs font-semibold cursor-pointer border ${
              filterState === 'busy'
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 ring-1 ring-rose-500/50'
                : 'bg-neutral-800/80 border-neutral-700/60 text-rose-400 hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
              <span>مشغول</span>
              <span className="font-mono text-[11px]">({busyCount})</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilterState(filterState === 'offline' ? 'all' : 'offline')}
            className={`px-2 py-1.5 rounded-lg transition text-xs font-semibold cursor-pointer border ${
              filterState === 'offline'
                ? 'bg-neutral-800 border-neutral-500 text-neutral-200 ring-1 ring-neutral-400/50'
                : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-neutral-400 inline-block"></span>
              <span>غیرفعال</span>
              <span className="font-mono text-[11px]">({offlineCount})</span>
            </div>
          </button>
        </div>
      </div>

      {/* Search Filter inside BLF */}
      <div className="p-3 border-b border-neutral-200/80 bg-neutral-50 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی داخلی یا نام پرسنل..."
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Extension Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredExtensions.length === 0 ? (
          <div className="text-center py-8 px-4 text-neutral-400 text-xs space-y-1.5">
            <PhoneOff className="w-8 h-8 mx-auto mb-1 opacity-40 text-neutral-400" />
            <p className="font-semibold text-neutral-600">داخلی فعالی برای مانیتورینگ یافت نشد</p>
            {userDomainObj && (
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                بر اساس تنظیمات تفکیک امنیتی ۳ دامین، صرفاً داخلی‌های تخصیص‌یافته از «{userDomainObj.display_name}» در این پنل قابل مانیتورینگ هستند.
              </p>
            )}
          </div>
        ) : (
          filteredExtensions.map((item) => {
            const isBusy = isStateBusy(item.state);
            const isOffline = isStateOffline(item.state);
            const isIdle = !isBusy && !isOffline;

            return (
              <div
                key={item.extension}
                onClick={() => handleExtensionClick(item)}
                className={`group relative rounded-xl p-3 border transition-all cursor-pointer select-none ${
                  isIdle
                    ? 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-200/90 shadow-2xs hover:shadow-xs'
                    : isBusy
                    ? 'bg-rose-50/50 hover:bg-rose-50 border-rose-200/90 shadow-2xs'
                    : 'bg-neutral-50 hover:bg-neutral-100/70 border-neutral-200 text-neutral-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Status Lamp (Green / Red / Gray) */}
                    <div className="pt-0.5 shrink-0">
                      {isIdle && (
                        <span className="relative flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-xs"></span>
                        </span>
                      )}
                      {isBusy && (
                        <span className="relative flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-40"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 shadow-xs"></span>
                        </span>
                      )}
                      {isOffline && (
                        <span className="inline-flex rounded-full h-3.5 w-3.5 bg-neutral-300 border border-neutral-400"></span>
                      )}
                    </div>

                    {/* Person / Extension Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-neutral-900 bg-white/80 border border-neutral-200/90 px-1.5 py-0.2 rounded shadow-2xs">
                          {item.extension}
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900 truncate">
                          {item.name}
                        </h4>
                      </div>

                      {item.jobTitle && (
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                          {item.jobTitle}
                        </p>
                      )}

                      {/* State Description */}
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        {isIdle && (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <span>آزاد</span>
                            <span className="text-neutral-400">• کلیک جهت تماس</span>
                          </span>
                        )}
                        {isBusy && (
                          <span className="text-rose-700 font-semibold flex items-center gap-1.5 flex-wrap">
                            <AnimatedAntennaIcon size="sm" className="text-rose-600 shrink-0" />
                            <span>مشغول مکالمه</span>
                            {item.callerNumber && (
                              <span className="text-[9px] bg-rose-100/90 text-rose-800 px-1 rounded font-mono" dir="ltr">
                                {item.callerNumber}
                              </span>
                            )}
                            <span className="inline-flex items-end gap-0.5 h-2.5 opacity-80" aria-hidden="true">
                              <span className="w-0.5 bg-rose-500 rounded-full h-2 soundwave-bar soundwave-bar-1"></span>
                              <span className="w-0.5 bg-rose-600 rounded-full h-2.5 soundwave-bar soundwave-bar-2"></span>
                              <span className="w-0.5 bg-rose-500 rounded-full h-1.5 soundwave-bar soundwave-bar-3"></span>
                            </span>
                          </span>
                        )}
                        {isOffline && (
                          <span className="text-neutral-500">غیرفعال / خارج از شبکه</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <div className="shrink-0">
                    {isIdle && canMakeCalls && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExtensionClick(item);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer"
                        title="برقراری تماس مستقیم یک‌کلیکه"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isBusy && (
                      <div
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200/90 shadow-2xs select-none"
                        title="خط در حال مکالمه است"
                      >
                        {/* آیکن آنتن سه خطی متحرک سرور VoIP */}
                        <AnimatedAntennaIcon size="sm" className="text-rose-600" />
                        {/* 3 Animated Sound Wave Bars */}
                        <div className="flex items-end gap-0.5 h-3 px-0.5" aria-hidden="true">
                          <span className="w-0.5 bg-rose-500 rounded-full h-2.5 soundwave-bar soundwave-bar-1"></span>
                          <span className="w-0.5 bg-rose-600 rounded-full h-3.5 soundwave-bar soundwave-bar-2"></span>
                          <span className="w-0.5 bg-rose-500 rounded-full h-2 soundwave-bar soundwave-bar-3"></span>
                        </div>
                        {/* Wobbling / vibrating red phone icon */}
                        <Phone className="w-3.5 h-3.5 animate-phone-wobble" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className="p-2.5 border-t border-neutral-200 bg-neutral-50 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-neutral-600">مانیتورینگ بلادرنگ (Live BLF)</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">AMI Event-Driven</span>
        </div>
      </div>
    </aside>
  );
};
