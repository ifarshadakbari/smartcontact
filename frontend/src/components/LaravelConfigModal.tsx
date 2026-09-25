import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Code, Shield, Database } from 'lucide-react';
import { LaravelConfig } from '../types';
import { testLaravelPing, LARAVEL_CODE_SNIPPET } from '../services/apiService';

interface LaravelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LaravelConfig;
  onSaveConfig: (newConfig: LaravelConfig) => void;
}

export const LaravelConfigModal: React.FC<LaravelConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [apiPrefix, setApiPrefix] = useState(config.apiPrefix);
  const [token, setToken] = useState(config.token);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'snippets'>('settings');
  const [snippetTab, setSnippetTab] = useState<
    | 'controller'
    | 'contactModel'
    | 'migration'
    | 'favMigration'
    | 'deptController'
    | 'deptMigration'
    | 'cors'
    | 'ldapAuth'
    | 'routes'
    | 'amiBlf'
  >('controller');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testLaravelPing({
      baseUrl,
      apiPrefix,
      token,
      status: 'testing',
    });
    setTesting(false);
    setTestResult(res);
  };

  const handleSave = () => {
    onSaveConfig({
      baseUrl,
      apiPrefix,
      token,
      status: testResult?.success ? 'connected' : 'disconnected',
      lastPing: new Date().toLocaleTimeString('fa-IR'),
    });
    onClose();
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold">
              <Server className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                تنظیمات اتصال به وب‌سرویس و پایگاه داده (API)
              </h2>
              <p className="text-[11px] text-neutral-500">
                پیکربندی آدرس وب‌سرویس و احراز هویت توکن Bearer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 px-5 pt-2 bg-neutral-50/40 text-xs gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 font-medium border-b-2 transition cursor-pointer ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            تنظیمات اتصال و URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('snippets')}
            className={`pb-2.5 font-medium border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'snippets'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>کدهای آماده کنترلر سرور</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {activeTab === 'settings' ? (
            <>
              {/* Direct Database Connection Banner */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-950">اتصال مستقیم به پایگاه داده و وب‌سرویس</h4>
                  <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                    سامانه صرفاً بر مبنای اتصال مستقیم به پایگاه داده و وب‌سرویس سرور عمل می‌کند. کلیه درخواست‌ها (مخاطبین، واحدهای سازمانی، احراز هویت LDAP و دامین‌ها) به صورت زنده از سرور فراخوانی می‌گردند.
                  </p>
                </div>
              </div>

              {/* Endpoint Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    آدرس سرور وب‌سرویس (Base URL)
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8000"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    مثال لوکال: <code className="text-neutral-600">http://127.0.0.1:8000</code> یا آدرس دامنه سرور سازمان
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      پیشوند مسیر API (API Prefix)
                    </label>
                    <input
                      type="text"
                      value={apiPrefix}
                      onChange={(e) => setApiPrefix(e.target.value)}
                      placeholder="/api"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      توکن احراز هویت (Bearer Token)
                    </label>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Bearer Token (اختیاری در صورت لاگین با سشن)"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Test Ping */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-medium transition cursor-pointer border border-neutral-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>تست ارتباط با سرور (Ping Endpoint)</span>
                </button>

                {testResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="leading-relaxed">
                      <span className="font-bold block">{testResult.message}</span>
                      {!testResult.success && (
                        <span className="text-[11px] text-amber-700 mt-1 block">
                          نکته: در صورت خطای CORS در سرور، کافیست دسترسی هدرهای CORS را بررسی فرمایید.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Code Snippet View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSnippetTab('controller')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      snippetTab === 'controller'
                        ? 'bg-neutral-900 text-white font-bold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Contact Controller
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetTab('contactModel')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      snippetTab === 'contactModel'
                        ? 'bg-neutral-900 text-white font-bold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Contact Model
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetTab('migration')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      snippetTab === 'migration'
                        ? 'bg-neutral-900 text-white font-bold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Contact Migration
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetTab('favMigration')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                      snippetTab === 'favMigration'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    Favorites Migration
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetTab('cors')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                      snippetTab === 'cors'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    CORS Config
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetTab('deptController')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                      snippetTab === 'deptController'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    Dept Controller
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetTab('deptMigration')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                      snippetTab === 'deptMigration'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    Dept Migration
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetTab('ldapAuth')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      snippetTab === 'ldapAuth'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    LDAP Auth
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetTab('routes')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                      snippetTab === 'routes'
                        ? 'bg-neutral-900 text-white font-bold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    Routes
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetTab('amiBlf')}
                    className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                      snippetTab === 'amiBlf'
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    AMI BLF Listener
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyCode(
                      snippetTab === 'controller'
                        ? LARAVEL_CODE_SNIPPET.controller
                        : snippetTab === 'contactModel'
                        ? (LARAVEL_CODE_SNIPPET as any).contactModel
                        : snippetTab === 'migration'
                        ? LARAVEL_CODE_SNIPPET.migration
                        : snippetTab === 'favMigration'
                        ? (LARAVEL_CODE_SNIPPET as any).favMigration
                        : snippetTab === 'cors'
                        ? (LARAVEL_CODE_SNIPPET as any).cors
                        : snippetTab === 'deptController'
                        ? LARAVEL_CODE_SNIPPET.deptController
                        : snippetTab === 'deptMigration'
                        ? LARAVEL_CODE_SNIPPET.deptMigration
                        : snippetTab === 'ldapAuth'
                        ? LARAVEL_CODE_SNIPPET.ldapAuth
                        : snippetTab === 'routes'
                        ? LARAVEL_CODE_SNIPPET.routes
                        : LARAVEL_CODE_SNIPPET.amiBlfListener
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded border border-neutral-300 transition cursor-pointer"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی کد سرور</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-neutral-900 text-neutral-100 p-3.5 rounded-xl text-xs font-mono overflow-x-auto max-h-72" dir="ltr">
                <pre>
                  {snippetTab === 'controller'
                    ? LARAVEL_CODE_SNIPPET.controller
                    : snippetTab === 'contactModel'
                    ? (LARAVEL_CODE_SNIPPET as any).contactModel
                    : snippetTab === 'migration'
                    ? LARAVEL_CODE_SNIPPET.migration
                    : snippetTab === 'favMigration'
                    ? (LARAVEL_CODE_SNIPPET as any).favMigration
                    : snippetTab === 'cors'
                    ? (LARAVEL_CODE_SNIPPET as any).cors
                    : snippetTab === 'deptController'
                    ? LARAVEL_CODE_SNIPPET.deptController
                    : snippetTab === 'deptMigration'
                    ? LARAVEL_CODE_SNIPPET.deptMigration
                    : snippetTab === 'ldapAuth'
                    ? LARAVEL_CODE_SNIPPET.ldapAuth
                    : snippetTab === 'routes'
                    ? LARAVEL_CODE_SNIPPET.routes
                    : LARAVEL_CODE_SNIPPET.amiBlfListener}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs rounded-lg transition cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-sm"
          >
            ذخیره تنظیمات
          </button>
        </div>
      </div>
    </div>
  );
};
