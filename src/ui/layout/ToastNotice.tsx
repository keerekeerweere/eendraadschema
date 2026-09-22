import { useEffect, useState } from "react";

interface ToastMessage {
  readonly id: number;
  readonly text: string;
  readonly visible: boolean;
}

export function ToastNotice() {
  const [notice, setNotice] = useState<ToastMessage | null>(null);

  useEffect(() => {
    let sequence = 0;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    const onToast = (event: Event) => {
      const message = (event as CustomEvent<{ message?: unknown }>).detail?.message;
      if (typeof message !== "string" || !message) return;
      if (fadeTimer !== undefined) clearTimeout(fadeTimer);
      if (removeTimer !== undefined) clearTimeout(removeTimer);
      const id = ++sequence;
      setNotice({ id, text: message, visible: true });
      fadeTimer = setTimeout(() => setNotice(current => current?.id === id ? { ...current, visible: false } : current), 2600);
      removeTimer = setTimeout(() => setNotice(current => current?.id === id ? null : current), 3000);
    };
    window.addEventListener("app:toast", onToast);
    return () => {
      window.removeEventListener("app:toast", onToast);
      if (fadeTimer !== undefined) clearTimeout(fadeTimer);
      if (removeTimer !== undefined) clearTimeout(removeTimer);
    };
  }, []);

  if (notice === null) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-[10000] max-w-[min(92vw,32rem)] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl transition-opacity duration-300 ${notice.visible ? "opacity-100" : "opacity-0"}`}
    >
      {notice.text}
    </div>
  );
}
