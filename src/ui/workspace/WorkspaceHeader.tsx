import { useEffect } from "react";
import type { WorkspaceStore, WorkspaceTab } from "../../application/WorkspaceStore";
import { useWorkspaceSnapshot } from "../useWorkspaceSnapshot";

interface WorkspaceHeaderProps {
  readonly itemCount: number;
  readonly store: WorkspaceStore;
  readonly onSelectTab: (tab: WorkspaceTab) => void;
}

function itemCountLabel(itemCount: number): string {
  return itemCount === 1
    ? "1 elektrisch onderdeel"
    : `${itemCount} elektrische onderdelen`;
}

export function WorkspaceHeader({ itemCount, store, onSelectTab }: WorkspaceHeaderProps) {
  const { activeTab } = useWorkspaceSnapshot(store);
  useEffect(() => {
    const menu = document.getElementById("minitabs");
    if (!menu) return;
    const hiddenItems = new Set<HTMLLIElement>();

    const hideDuplicateWorkspaceLinks = () => {
      for (const control of Array.from(menu.querySelectorAll("a, button"))) {
        if (control.textContent === "Eéndraadschema" || control.textContent === "Situatieschema") {
          const listItem = control.closest("li");
          if (listItem instanceof HTMLLIElement) {
            listItem.style.display = "none";
            hiddenItems.add(listItem);
          }
        }
      }
    };
    const observer = new MutationObserver(hideDuplicateWorkspaceLinks);
    observer.observe(menu, { childList: true, subtree: true });
    hideDuplicateWorkspaceLinks();

    return () => {
      observer.disconnect();
      for (const listItem of hiddenItems) listItem.style.removeProperty("display");
    };
  }, []);

  const tabClass = (tab: WorkspaceTab) => [
    "h-full border-b-2 px-4 text-sm font-semibold transition-colors",
    tab === activeTab
      ? "border-blue-700 bg-blue-50 text-blue-900"
      : "border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
  ].join(" ");

  return (
    <header className="flex h-[var(--react-shell-height)] items-stretch justify-between overflow-hidden border-b border-neutral-300 bg-white text-neutral-900">
      <div className="flex min-w-72 items-center gap-5 px-4">
        <div className="flex flex-col leading-tight">
          <span className="text-xs tracking-wide text-neutral-500 uppercase">Werkruimte</span>
          <strong>Elektrisch dossier</strong>
        </div>
        <nav className="flex h-full items-stretch" aria-label="Werkruimteweergave">
          <button
            type="button"
            className={tabClass("schema")}
            aria-current={activeTab === "schema" ? "page" : undefined}
            onClick={() => onSelectTab("schema")}
          >
            Eéndraadschema
          </button>
          <button
            type="button"
            className={tabClass("situation")}
            aria-current={activeTab === "situation" ? "page" : undefined}
            onClick={() => onSelectTab("situation")}
          >
            Situatieschema
          </button>
          <button
            type="button"
            className={tabClass("board")}
            aria-current={activeTab === "board" ? "page" : undefined}
            onClick={() => onSelectTab("board")}
          >
            Bordindeling
          </button>
        </nav>
      </div>
      <p className="m-0 flex items-center px-4 text-sm text-neutral-500" role="status" aria-live="polite">
        {itemCountLabel(itemCount)}
      </p>
    </header>
  );
}
