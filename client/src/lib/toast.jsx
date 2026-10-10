import { createContext, useCallback, useContext, useRef, useState } from "react";

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const timer = useRef();
  const show = useCallback((msg, action) => {
    clearTimeout(timer.current);
    setT({ msg, action });
    timer.current = setTimeout(() => setT(null), action ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div role="status" aria-live="polite" className="arrive fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full bg-ink px-5 py-3 text-sm text-white shadow-xl">
          <span>{t.msg}</span>
          {t.action && (
            <button className="font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-white" onClick={() => { t.action.run(); setT(null); }}>
              {t.action.label}
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
