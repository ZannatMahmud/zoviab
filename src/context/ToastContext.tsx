import { createContext, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show: ToastContextValue['show'] = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-down flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-float"
          >
            {t.type === 'success' && <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />}
            {t.type === 'error' && <XCircle className="h-5 w-5 shrink-0 text-berry-600" />}
            {t.type === 'info' && <Info className="h-5 w-5 shrink-0 text-gold-500" />}
            <span className="text-sm font-medium text-plum-500">{t.message}</span>
            <button onClick={() => remove(t.id)} className="ml-2 text-plum-300 hover:text-plum-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
