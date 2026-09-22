import { useSyncExternalStore } from "react";
import type { SaveStatusStore } from "../../application/SaveStatusStore";
import type { WorkspaceStore, WorkspaceTab } from "../../application/WorkspaceStore";
import { useWorkspaceSnapshot } from "../useWorkspaceSnapshot";
import { ApplicationMenu } from "./ApplicationMenu";

interface WorkspaceHeaderProps {
  readonly itemCount: number;
  readonly openIssueCount?: number;
  readonly store: WorkspaceStore;
  readonly saveStatusStore?: SaveStatusStore | null;
  readonly onSelectTab: (tab: WorkspaceTab) => void;
  readonly onNew: () => void;
  readonly onFile: () => void;
  readonly onPrint: () => void;
  readonly onDocumentation: () => void;
  readonly onAbout: () => void;
}

function SaveIndicator({ store }: { readonly store: SaveStatusStore }) {
  const save = useSyncExternalStore(
    listener => store.subscribe(listener),
    () => store.getSnapshot(),
    () => store.getSnapshot(),
  );
  return (
    <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-slate-600" role="status" aria-label={save.hasUnsavedChanges ? `Niet opgeslagen wijzigingen in ${save.filename}` : `${save.filename} is opgeslagen`}>
      <span className={save.hasUnsavedChanges ? "size-2 shrink-0 rounded-full bg-amber-500" : "size-2 shrink-0 rounded-full bg-emerald-500"} aria-hidden="true" />
      <span className="lg:hidden" aria-hidden="true">{save.hasUnsavedChanges ? "!" : "✓"}</span>
      <span className="hidden truncate lg:inline">{save.hasUnsavedChanges ? "Niet opgeslagen" : "Opgeslagen"} · {save.filename}</span>
    </span>
  );
}

const tabs: readonly [WorkspaceTab, string][] = [
  ["dossier", "Dossier"],
  ["schema", "Eéndraadschema"],
  ["situation", "Situatieschema"],
  ["board", "Bordindeling"],
];

function itemCountLabel(count: number): string {
  return count === 1 ? "1 elektrisch onderdeel" : `${count} elektrische onderdelen`;
}

export function WorkspaceHeader({ itemCount, openIssueCount = 0, store, saveStatusStore, onSelectTab, ...menuActions }: WorkspaceHeaderProps) {
  const { activeTab } = useWorkspaceSnapshot(store);

  return (
    <header className="flex h-[var(--react-shell-height)] min-w-0 items-center gap-3 border-b border-slate-200 bg-white px-3 text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-4">
      <div className="hidden shrink-0 flex-col leading-tight sm:flex">
        <span className="text-[10px] font-bold tracking-[0.14em] text-blue-700 uppercase">Werkruimte</span>
        <strong className="whitespace-nowrap text-sm">Elektrisch dossier</strong>
      </div>
      <span className="shrink-0 rounded-md bg-blue-700 px-2 py-1 text-xs font-black text-white sm:hidden" aria-label="Elektrisch dossier">EDS</span>
      <nav className="flex h-full min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Werkruimteweergave">
        {tabs.map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={`shrink-0 border-b-[3px] px-3 text-sm font-semibold transition-colors sm:px-4 ${tab === activeTab ? "border-blue-700 bg-blue-50/70 text-blue-900" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
            aria-current={tab === activeTab ? "page" : undefined}
            onClick={() => onSelectTab(tab)}
          >{label}</button>
        ))}
      </nav>
      {saveStatusStore ? <SaveIndicator store={saveStatusStore} /> : null}
      {!saveStatusStore ? <span className="sr-only" role="status">{itemCountLabel(itemCount)}</span> : null}
      {openIssueCount > 0 ? <span className="hidden shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 xl:inline" aria-label={`${openIssueCount} aandachtspunten bij ${itemCount} onderdelen`}>{openIssueCount} aandachtspunten</span> : null}
      <ApplicationMenu {...menuActions} />
    </header>
  );
}
