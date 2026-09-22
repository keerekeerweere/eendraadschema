import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import type { EditorStore } from "../../application/EditorStore";
import type {
  HistoryStatusSnapshot,
  HistoryStatusStore,
} from "../../application/HistoryStatusStore";
import type {
  SaveStatusSnapshot,
  SaveStatusStore,
} from "../../application/SaveStatusStore";
import type { SchemaStore } from "../../application/SchemaStore";
import type { SituationPlanStore } from "../../application/SituationPlanStore";
import type {
  AddSituationSymbolOptions,
  SituationPlanAssetService,
} from "../../application/SituationPlanAssetService";
import type { WorkspaceStore } from "../../application/WorkspaceStore";
import { useSchemaSnapshot } from "../useSchemaSnapshot";
import { useSituationPlanSnapshot } from "../useSituationPlanSnapshot";
import { useWorkspaceSnapshot } from "../useWorkspaceSnapshot";
import { CustomSituationSymbolDialog } from "./CustomSituationSymbolDialog";
import type { WorkspaceHistoryAdapter } from "../../application/WorkspaceHistoryAdapter";
import { WorkspaceIcon } from "./WorkspaceIcon";

interface WorkspaceCommandBarProps {
  readonly schemaStore: SchemaStore;
  readonly editorStore: EditorStore;
  readonly situationPlanStore: SituationPlanStore;
  readonly workspaceStore: WorkspaceStore;
  readonly saveStatusStore: SaveStatusStore;
  readonly situationHistoryStore: HistoryStatusStore;
  readonly historyAdapter: WorkspaceHistoryAdapter;
  readonly onSave: () => void;
  readonly onOpenFile: () => void;
  readonly situationAssetService: SituationPlanAssetService;
  readonly onDeleteSelection: () => void;
  readonly onSelectAll: () => void;
  readonly onClearSelection: () => void;
  readonly onSendBackward: () => void;
  readonly onBringForward: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomToFit: () => void;
  readonly situationWorkspaceElement?: HTMLElement | null;
}

export function WorkspaceCommandBar({
  schemaStore,
  editorStore,
  situationPlanStore,
  workspaceStore,
  saveStatusStore,
  situationHistoryStore,
  historyAdapter,
  onSave,
  onOpenFile,
  situationAssetService,
  onDeleteSelection,
  onSelectAll,
  onClearSelection,
  onSendBackward,
  onBringForward,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  situationWorkspaceElement = null,
}: WorkspaceCommandBarProps) {
  const backgroundInput = useRef<HTMLInputElement>(null);
  const [showCustomSymbolDialog, setShowCustomSymbolDialog] = useState(false);
  const [assetMessage, setAssetMessage] = useState("");
  const [assetError, setAssetError] = useState("");
  const [importingBackground, setImportingBackground] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const moreMenu = useRef<HTMLDivElement>(null);
  const schema = useSchemaSnapshot(schemaStore);
  const situation = useSituationPlanSnapshot(situationPlanStore);
  const workspace = useWorkspaceSnapshot(workspaceStore);
  const save = useSyncExternalStore<SaveStatusSnapshot>(
    listener => saveStatusStore.subscribe(listener),
    () => saveStatusStore.getSnapshot(),
    () => saveStatusStore.getSnapshot(),
  );
  const situationHistory = useSyncExternalStore<HistoryStatusSnapshot>(
    listener => situationHistoryStore.subscribe(listener),
    () => situationHistoryStore.getSnapshot(),
    () => situationHistoryStore.getSnapshot(),
  );
  const inSituation = workspace.activeTab === "situation";
  const canUndo = inSituation ? situationHistory.canUndo : schema.canUndo;
  const canRedo = inSituation ? situationHistory.canRedo : schema.canRedo;
  const hasSituationSelection = workspace.selectedSituationElementIds.length > 0;

  useEffect(() => {
    if (!moreOpen) return;
    moreMenu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMoreOpen(false);
      moreTrigger.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (moreMenu.current?.contains(document.activeElement)) moreTrigger.current?.focus();
    };
  }, [moreOpen]);

  useEffect(() => setMoreOpen(false), [workspace.activeTab]);

  function undo() {
    historyAdapter.undo(inSituation ? "situation" : "schema");
  }

  function redo() {
    historyAdapter.redo(inSituation ? "situation" : "schema");
  }

  function selectPage(page: number) {
    if (page === situation.activePage) return;
    situationPlanStore.commands.selectPage(page);
    workspaceStore.commands.selectSituationElement(null);
  }

  function addPage() {
    situationPlanStore.commands.addPage();
  }

  function deletePage() {
    if (
      situation.pageCount <= 1
      || !window.confirm(`Pagina ${situation.activePage} volledig verwijderen?`)
    ) return;
    situationPlanStore.commands.deletePage(situation.activePage);
    workspaceStore.commands.selectSituationElement(null);
  }

  async function importBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportingBackground(true);
    setAssetError("");
    setAssetMessage("");
    try {
      const result = await situationAssetService.importBackground(file);
      workspaceStore.commands.selectSituationElement(result.elementId);
      setAssetMessage(result.largeFile
        ? "De plattegrond is toegevoegd. Het grote bestand kan opslaan en afdrukken vertragen."
        : result.scaledToFit
          ? "De plattegrond is toegevoegd en passend verkleind."
          : "De plattegrond is toegevoegd.");
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "De plattegrond kon niet worden toegevoegd.");
    } finally {
      setImportingBackground(false);
    }
  }

  function addCustomSymbol(options: AddSituationSymbolOptions) {
    setAssetError("");
    setAssetMessage("");
    try {
      const result = situationAssetService.addSituationOnlySymbol(options);
      editorStore.commands.selectItem(result.itemId);
      workspaceStore.commands.selectSituationElement(result.elementId);
      setShowCustomSymbolDialog(false);
      setAssetMessage("Het losse symbool is toegevoegd.");
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Het symbool kon niet worden toegevoegd.");
    }
  }

  const buttonClass = [
    "inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
    "text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700",
  ].join(" ");
  const separatorClass = "mx-1 h-6 w-px self-center bg-slate-200";

  return <>
    <div className="flex h-full min-w-max items-center justify-between gap-3 border-b border-slate-200 bg-white px-3" role="toolbar" aria-label="Werkruimtecommando's">
      <div className="flex items-stretch whitespace-nowrap">
        <span className="hidden self-center pr-3 text-sm font-semibold text-slate-900 md:inline">{workspace.activeTab === "dossier" ? "Dossieroverzicht" : workspace.activeTab === "schema" ? "Eéndraadschema" : workspace.activeTab === "situation" ? "Situatieschema" : "Bordindeling"}</span>
        <button type="button" className={buttonClass} disabled={!canUndo} onClick={undo}>
          <WorkspaceIcon name="undo" />
          Ongedaan
        </button>
        <button type="button" className={buttonClass} disabled={!canRedo} onClick={redo}>
          <WorkspaceIcon name="redo" />
          Opnieuw
        </button>
        <span className={separatorClass} />
        <button
          type="button"
          className={`${buttonClass} ${save.hasUnsavedChanges ? "text-red-800" : "text-emerald-800"}`}
          onClick={save.hasUnsavedChanges ? onSave : onOpenFile}
        >
          <WorkspaceIcon name={save.hasUnsavedChanges ? "save" : "file"} />
          {save.hasUnsavedChanges ? "Opslaan" : "Bestand"}
        </button>

        {inSituation ? (
          <>
            <span className={separatorClass} />
            <input
              ref={backgroundInput}
              className="sr-only"
              type="file"
              accept="image/*"
              aria-label="Kies een plattegrondbestand"
              onChange={importBackground}
            />
            <button
              type="button"
              className={buttonClass}
              disabled={importingBackground}
              onClick={() => backgroundInput.current?.click()}
            >
              <WorkspaceIcon name="image" />
              {importingBackground ? "Laden…" : "Plattegrond"}
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => {
                setAssetError("");
                setShowCustomSymbolDialog(true);
              }}
            >
              <WorkspaceIcon name="add" />
              Los symbool
            </button>
            <div className="contents max-[72rem]:hidden">
            <button
              type="button"
              className={buttonClass}
              onClick={onSelectAll}
              aria-label="Alle symbolen op pagina selecteren"
            >
              <WorkspaceIcon name="select" />
              Alles
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!hasSituationSelection}
              onClick={onClearSelection}
              aria-label="Selectie wissen"
            >
              <WorkspaceIcon name="clear" />
              Wis
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!hasSituationSelection}
              onClick={onDeleteSelection}
            >
              <WorkspaceIcon name="delete" />
              Verwijder
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!hasSituationSelection}
              onClick={onSendBackward}
            >
              <WorkspaceIcon name="back" />
              Naar achter
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={!hasSituationSelection}
              onClick={onBringForward}
            >
              <WorkspaceIcon name="front" />
              Naar voor
            </button>
            </div>
            <button
              ref={moreTrigger}
              type="button"
              className={`${buttonClass} hidden max-[72rem]:inline-flex`}
              aria-expanded={moreOpen}
              aria-controls="workspace-more-menu"
              onClick={() => setMoreOpen(open => !open)}
            >Meer acties ▾</button>
          </>
        ) : null}
        {inSituation && hasSituationSelection ? (
          <span className="self-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800" role="status">
            {workspace.selectedSituationElementIds.length} geselecteerd
          </span>
        ) : null}
      </div>

      {inSituation ? (
        <div className="flex items-center gap-2 max-[72rem]:hidden">
          <label className="flex items-center gap-1 text-xs font-semibold text-neutral-600">
            Pagina
            <select
              className="rounded border border-neutral-300 bg-white px-2 py-1"
              value={situation.activePage}
              onChange={(event) => selectPage(Number(event.target.value))}
            >
              {Array.from({ length: situation.pageCount }, (_, index) => index + 1).map(page => (
                <option key={page} value={page}>{page}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={buttonClass}
            disabled={situation.activePage !== situation.pageCount}
            onClick={addPage}
          >
            <WorkspaceIcon name="add" />
            Pagina
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={situation.pageCount <= 1}
            onClick={deletePage}
            aria-label={`Pagina ${situation.activePage} verwijderen`}
          >
            <WorkspaceIcon name="delete" />
            Pagina
          </button>
          <span className={separatorClass} />
          <button type="button" className={buttonClass} onClick={onZoomOut} aria-label="Situatieschema uitzoomen">
            <WorkspaceIcon name="zoomOut" />
            Uit
          </button>
          <button type="button" className={buttonClass} onClick={onZoomToFit}>
            <WorkspaceIcon name="fit" />
            Passend
          </button>
          <button type="button" className={buttonClass} onClick={onZoomIn} aria-label="Situatieschema inzoomen">
            <WorkspaceIcon name="zoomIn" />
            In
          </button>
        </div>
      ) : null}
      {assetMessage ? (
        <p className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 shadow-lg" role="status">{assetMessage}</p>
      ) : null}
      {assetError ? (
        <p className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 shadow-lg" role="alert">{assetError}</p>
      ) : null}
      {showCustomSymbolDialog ? (
        <CustomSituationSymbolDialog
          defaultScale={situation.defaults.scale}
          errorMessage={assetError}
          onCancel={() => setShowCustomSymbolDialog(false)}
          onSubmit={addCustomSymbol}
        />
      ) : null}
    </div>
    {moreOpen && inSituation ? createPortal(
      <>
        <button type="button" className="fixed inset-0 z-40 cursor-default bg-transparent" aria-label="Meer acties sluiten" onClick={() => { setMoreOpen(false); moreTrigger.current?.focus(); }} />
        <div ref={moreMenu} id="workspace-more-menu" className="fixed right-3 top-[calc(var(--react-shell-height)+var(--ribbon-height)-0.25rem)] z-50 grid max-h-[70vh] w-64 gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl" role="group" aria-label="Meer acties">
          <p className="m-0 px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">Selectie</p>
          <button type="button" className={buttonClass} onClick={() => { onSelectAll(); setMoreOpen(false); }}>Alles selecteren</button>
          <button type="button" className={buttonClass} disabled={!hasSituationSelection} onClick={() => { onClearSelection(); setMoreOpen(false); }}>Selectie wissen</button>
          <button type="button" className={buttonClass} disabled={!hasSituationSelection} onClick={() => { onDeleteSelection(); setMoreOpen(false); }}>Verwijderen</button>
          <button type="button" className={buttonClass} disabled={!hasSituationSelection} onClick={() => { onSendBackward(); setMoreOpen(false); }}>Naar achter</button>
          <button type="button" className={buttonClass} disabled={!hasSituationSelection} onClick={() => { onBringForward(); setMoreOpen(false); }}>Naar voor</button>
          <p className="m-0 border-t border-slate-100 px-2 pt-2 text-xs font-bold uppercase tracking-wide text-slate-500">Pagina en zoom</p>
          <label className="flex items-center justify-between gap-2 px-2 text-sm font-medium text-slate-700">Pagina
            <select className="min-h-9 rounded-lg border border-slate-300 bg-white px-2" value={situation.activePage} onChange={event => selectPage(Number(event.target.value))}>
              {Array.from({ length: situation.pageCount }, (_, index) => index + 1).map(page => <option key={page} value={page}>{page}</option>)}
            </select>
          </label>
          <button type="button" className={buttonClass} disabled={situation.activePage !== situation.pageCount} onClick={() => { addPage(); setMoreOpen(false); }}>Pagina toevoegen</button>
          <button type="button" className={buttonClass} disabled={situation.pageCount <= 1} onClick={() => { deletePage(); setMoreOpen(false); }}>Pagina verwijderen</button>
          <button type="button" className={buttonClass} onClick={() => { onZoomOut(); setMoreOpen(false); }}>Uitzoomen</button>
          <button type="button" className={buttonClass} onClick={() => { onZoomToFit(); setMoreOpen(false); }}>Passend tonen</button>
          <button type="button" className={buttonClass} onClick={() => { onZoomIn(); setMoreOpen(false); }}>Inzoomen</button>
        </div>
      </>, document.body,
    ) : null}
    {inSituation && situation.elements.length === 0 && situationWorkspaceElement ? createPortal(
      <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center px-4 pt-24">
        <section className="pointer-events-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl" aria-label="Start met het situatieschema">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><WorkspaceIcon name="image" /></span>
          <h2 className="mb-1 mt-4 text-lg font-bold text-slate-900">Begin met je situatieschema</h2>
          <p className="m-0 text-sm leading-relaxed text-slate-600">Voeg een plattegrond toe of plaats meteen een symbool uit ‘Nog te plaatsen’.</p>
          <button type="button" className="mt-4 min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={() => backgroundInput.current?.click()}>Achtergrond toevoegen</button>
        </section>
      </div>, situationWorkspaceElement,
    ) : null}
  </>;
}
