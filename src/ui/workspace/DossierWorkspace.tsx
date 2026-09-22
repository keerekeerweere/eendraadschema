import { useMemo, useState, type ReactNode } from "react";
import { createCircuitCompletionSummaries } from "../../application/CircuitContext";
import { createDossierSnapshot } from "../../application/DossierReader";
import type { EditorStore } from "../../application/EditorStore";
import type { SchemaStore } from "../../application/SchemaStore";
import type { SituationPlanStore } from "../../application/SituationPlanStore";
import { useSchemaSnapshot } from "../useSchemaSnapshot";
import { useEditorSnapshot } from "../useEditorSnapshot";
import { useSituationPlanSnapshot } from "../useSituationPlanSnapshot";
import { DossierDetailsForm } from "./DossierDetailsForm";
import { CircuitSetupDialog } from "./CircuitSetupDialog";
import type { CircuitPropertyChanges } from "../../application/SchemaPropertyReader";

interface DossierWorkspaceProps {
  readonly schemaStore: SchemaStore;
  readonly editorStore: EditorStore;
  readonly situationPlanStore: SituationPlanStore | null;
  readonly onShowItem: (itemId: number) => void;
}

export function DossierWorkspace({ schemaStore, editorStore, situationPlanStore, onShowItem }: DossierWorkspaceProps) {
  if (!situationPlanStore) {
    return <main className="grid h-full place-items-center bg-neutral-100 p-5 text-neutral-600">Situatieschema wordt geladen…</main>;
  }
  return <DossierWorkspaceContent
    schemaStore={schemaStore}
    editorStore={editorStore}
    situationPlanStore={situationPlanStore}
    onShowItem={onShowItem}
  />;
}

function DossierWorkspaceContent({ schemaStore, editorStore, situationPlanStore, onShowItem }: Omit<DossierWorkspaceProps, "situationPlanStore"> & { readonly situationPlanStore: SituationPlanStore }) {
  const schema = useSchemaSnapshot(schemaStore);
  const editor = useEditorSnapshot(editorStore);
  const situation = useSituationPlanSnapshot(situationPlanStore);
  const [error, setError] = useState("");
  const [showCircuitSetup, setShowCircuitSetup] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dossier = useMemo(() => createDossierSnapshot(schema, situation), [schema, situation]);
  const circuits = useMemo(() => createCircuitCompletionSummaries(schema, situation), [schema, situation]);
  const boardCircuits = useMemo(() => Object.fromEntries(schema.document.getBoards().map(board => {
    const roots = schema.document.getBoardRootItems(board.id);
    const choices = roots.flatMap(root => schema.document.getChildren(root.id)
      .filter(item => item.role === "item")
      .flatMap((item, index) => item.type === "Kring"
        ? [{ id: item.id, label: item.label, position: index + 1 }]
        : []));
    return [board.id, choices];
  })), [schema.document]);
  const details = schema.document.getDocumentDetails().dossier;
  const fieldItems = dossier.items.filter(item => item.presentation === "field-device");
  const panelItems = dossier.items.filter(item => item.presentation === "panel-device");
  const detailsKey = [details.installationContext, details.installationAddress, details.nominalVoltage, details.currentNature, details.frequencyHz, details.revisionLabel, details.issueDate].join("|");
  const nextCircuit = circuits.find(circuit => circuit.openTaskCount > 0 || circuit.situationComplete < circuit.situationRequired || circuit.boardComplete < circuit.boardRequired);
  const detailsIncomplete = !details.installationAddress || !details.nominalVoltage;

  function addCircuit(boardId: string, changes: CircuitPropertyChanges, position?: number) {
    try {
      const itemId = schemaStore.commands.addCircuit(boardId, changes, position);
      setShowCircuitSetup(false);
      editorStore.commands.selectItem(itemId);
      onShowItem(itemId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De kring kon niet worden toegevoegd.");
    }
  }

  return (
    <>
    <main className="h-full overflow-auto bg-slate-50 p-3 text-slate-900 sm:p-5" aria-labelledby="dossier-title">
      <div className="mx-auto grid max-w-7xl gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-blue-700">Elektrisch dossier</p>
            <h1 className="my-0.5 text-2xl font-bold tracking-tight" id="dossier-title">Je elektrisch dossier</h1>
            <p className="m-0 max-w-2xl text-sm text-slate-600">Werk kring per kring. Je schema, plaatsingen en bord blijven met elkaar verbonden.</p>
          </div>
          <button type="button" className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={() => setShowCircuitSetup(true)}>
            + Kring toevoegen
          </button>
        </header>
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4" aria-label="Volgende stap">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-wide text-blue-700">Volgende stap</p>
            <p className="mb-0 mt-1 text-sm font-semibold text-slate-900">
              {circuits.length === 0 ? "Maak je eerste kring aan" : nextCircuit ? `Werk verder aan ${nextCircuit.label}` : detailsIncomplete ? "Vul je dossiergegevens aan" : dossier.issues.length > 0 ? "Bekijk de resterende aandachtspunten" : "Je dossier is klaar voor controle"}
            </p>
          </div>
          {circuits.length === 0 ? <button type="button" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800" onClick={() => setShowCircuitSetup(true)}>Kring toevoegen</button>
            : nextCircuit ? <button type="button" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100" onClick={() => onShowItem(nextCircuit.circuitId)}>Open kring</button>
            : detailsIncomplete ? <button type="button" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-800 shadow-sm hover:bg-blue-100" onClick={() => setDetailsOpen(true)}>Gegevens aanvullen</button> : null}
        </section>
        {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,0.8fr)]">
          <div className="grid gap-3">
            <section className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm" aria-labelledby="next-steps-title">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="m-0 text-lg" id="next-steps-title">Voortgang</h2>
                <span className={dossier.issues.length === 0 ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-amber-800"}>{dossier.issues.length === 0 ? "Klaar voor review" : `${dossier.issues.length} aandachtspunten`}</span>
              </div>
              <ul className="m-0 grid list-none gap-2 p-0 text-xs sm:grid-cols-2 xl:grid-cols-4">
                <ProgressItem complete={Boolean(details.installationAddress && details.nominalVoltage)}>Dossiergegevens zijn ingevuld</ProgressItem>
                <ProgressItem complete={circuits.length > 0}>Minstens één kring is geconfigureerd</ProgressItem>
                <ProgressItem complete={fieldItems.length > 0 && fieldItems.every(item => item.situationOccurrenceIds.length > 0)}>{fieldItems.length === 0 ? "Voeg elektrische punten toe aan de kringen" : "Veldonderdelen staan op het situatieschema"}</ProgressItem>
                <ProgressItem complete={panelItems.length > 0 && panelItems.every(item => item.hasBoardPlacement)}>{panelItems.length === 0 ? "Voeg bordonderdelen toe" : "Bordonderdelen staan in de bordindeling"}</ProgressItem>
              </ul>
            </section>
            <section className="rounded-lg border border-neutral-200 bg-white shadow-sm" aria-labelledby="circuits-title">
              <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                <h2 className="m-0 text-lg" id="circuits-title">Kringen</h2>
                <span className="text-sm text-neutral-500">{circuits.length}</span>
              </header>
              {circuits.length === 0 ? <p className="p-5 text-sm text-neutral-600">Voeg je eerste kring toe om de drie weergaven te verbinden.</p> : (
                <ul className="m-0 grid list-none gap-px bg-neutral-200 p-px md:grid-cols-2 xl:grid-cols-3">
                  {circuits.map(circuit => <li key={circuit.circuitId} className="grid gap-2 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2"><strong>{circuit.label}</strong><span className="text-xs text-neutral-500">{circuit.boardName}</span></div>
                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-neutral-700">
                        <StatusChip complete={circuit.situationComplete === circuit.situationRequired}>Plan {circuit.situationComplete}/{circuit.situationRequired}</StatusChip>
                        <StatusChip complete={circuit.boardComplete === circuit.boardRequired}>Bord {circuit.boardComplete}/{circuit.boardRequired}</StatusChip>
                        {circuit.openTaskCount > 0 ? <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-900">{circuit.openTaskCount} open taken</span> : null}
                      </div>
                    </div>
                    <button type="button" className="rounded-md border border-blue-700 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700/35" onClick={() => onShowItem(circuit.circuitId)}>Open</button>
                  </li>)}
                </ul>
              )}
            </section>
            {dossier.issues.length > 0 ? (
              <section className="rounded-lg border border-amber-200 bg-white shadow-sm" aria-labelledby="issues-title">
                <header className="border-b border-amber-100 px-4 py-3"><h2 className="m-0 text-lg" id="issues-title">Aandachtspunten</h2></header>
                <ul className="m-0 grid list-none divide-y divide-neutral-100 p-0">
                  {dossier.issues.slice(0, 8).map(issue => <li key={issue.id} className="flex items-start gap-2 px-4 py-2 text-xs sm:text-sm">
                    <span className={issue.severity === "error" ? "mt-0.5 text-red-700" : "mt-0.5 text-amber-700"} aria-hidden="true">●</span>
                    <span className="min-w-0 flex-1">{issue.message}</span>
                    {issue.itemId !== undefined && issue.itemId > 0 && schema.document.getItem(issue.itemId) ? <button className="shrink-0 font-semibold text-blue-700 hover:underline" type="button" onClick={() => onShowItem(issue.itemId!)}>Open</button> : null}
                  </li>)}
                </ul>
              </section>
            ) : null}
          </div>
          <aside>
            <details className="rounded-xl border border-slate-200 bg-white shadow-sm" open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)}>
              <summary className="cursor-pointer list-none rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-blue-700 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2 text-base font-semibold">Dossiergegevens <span className="text-slate-500" aria-hidden="true">{detailsOpen ? "−" : "+"}</span></span>
                <span className="mt-1 block text-sm font-normal text-slate-600">{detailsIncomplete ? "Vul de gegevens aan voor je documentatie en export." : "Gegevens voor documentatie en export."}</span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <DossierDetailsForm key={detailsKey} metadata={details} schemaStore={schemaStore} onError={setError} />
              </div>
            </details>
          </aside>
        </div>
      </div>
    </main>
    {showCircuitSetup ? <CircuitSetupDialog
      boards={schema.document.getBoards()}
      activeBoardId={editor.activeBoardId}
      boardCircuits={boardCircuits}
      onCancel={() => setShowCircuitSetup(false)}
      onCreate={addCircuit}
    /> : null}
    </>
  );
}

function ProgressItem({ complete, children }: { readonly complete: boolean; readonly children: ReactNode }) {
  return <li className="flex min-h-11 items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 p-2"><span className={complete ? "grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700" : "grid size-5 shrink-0 place-items-center rounded-full bg-white font-bold text-neutral-500"} aria-hidden="true">{complete ? "✓" : "·"}</span><span className={complete ? "text-emerald-800" : "text-neutral-700"}>{children}</span></li>;
}

function StatusChip({ complete, children }: { readonly complete: boolean; readonly children: ReactNode }) {
  return <span className={complete ? "rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800" : "rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-700"}>{children}</span>;
}
