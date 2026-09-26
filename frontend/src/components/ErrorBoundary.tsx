import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 font-sans text-neutral-900" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 sm:p-8 max-w-lg w-full text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                خطایی در اجرای بخش جاری رخ داد
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed">
                سامانه پُــرسا لینک برای جلوگیری از بروز اختلال، اجرای این بخش را متوقف نمود. با بازخوانی صفحه می‌توانید به کار خود ادامه دهید.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 text-left font-mono text-[11px] text-neutral-700 overflow-x-auto" dir="ltr">
                {this.state.error.message}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer w-full"
            >
              <RotateCcw className="w-4 h-4" />
              <span>بازخوانی و راه‌اندازی مجدد سامانه</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
