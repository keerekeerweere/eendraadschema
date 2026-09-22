import { useEffect, useRef } from "react";

interface ApplicationMenuProps {
  readonly onNew: () => void;
  readonly onFile: () => void;
  readonly onPrint: () => void;
  readonly onDocumentation: () => void;
  readonly onAbout: () => void;
}

export function ApplicationMenu({ onNew, onFile, onPrint, onDocumentation, onAbout }: ApplicationMenuProps) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !menu.current?.open) return;
      menu.current.open = false;
      menu.current.querySelector("summary")?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  const action = (label: string, callback: () => void) => (
    <button
      type="button"
      className="min-h-10 rounded-lg px-3 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
      onClick={() => {
        menu.current?.removeAttribute("open");
        menu.current?.querySelector("summary")?.focus();
        callback();
      }}
    >{label}</button>
  );

  return (
    <details ref={menu} className="group relative shrink-0">
      <summary aria-label="Applicatiemenu openen" className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 [&::-webkit-details-marker]:hidden">
        Menu <span className="text-xs text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>
      <nav className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid min-w-44 gap-0.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" aria-label="Applicatiemenu">
        {action("Nieuw dossier", onNew)}
        {action("Bestand", onFile)}
        {action("Afdrukken en exporteren", onPrint)}
        <span className="my-1 border-t border-slate-100" />
        {action("Handleiding", onDocumentation)}
        {action("Info en contact", onAbout)}
      </nav>
    </details>
  );
}
