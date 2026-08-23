import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { EditorStore } from "../../application/EditorStore";
import type { SchemaStore } from "../../application/SchemaStore";
import { useEditorSnapshot } from "../useEditorSnapshot";
import { useSchemaSnapshot } from "../useSchemaSnapshot";

interface BoardLayoutWorkspaceProps {
  readonly schemaStore: SchemaStore;
  readonly editorStore: EditorStore;
}

export function BoardLayoutWorkspace({ schemaStore, editorStore }: BoardLayoutWorkspaceProps) {
  const schema = useSchemaSnapshot(schemaStore);
  const editor = useEditorSnapshot(editorStore);
  const board = schema.document.getBoard(editor.activeBoardId);
  const layout = schema.boardLayouts.find(candidate => candidate.boardId === editor.activeBoardId);
  const boardItems = useMemo(() => schema.document.getAllItems().filter(item => (
    item.role === "item"
    && schema.document.getBoardForItem(item.id)?.id === editor.activeBoardId
  )), [editor.activeBoardId, schema]);
  const placedItemIds = new Set(layout?.placements.map(placement => placement.itemId) ?? []);
  const unplacedItems = boardItems.filter(item => !placedItemIds.has(item.id));
  const [itemId, setItemId] = useState("");
  const [railId, setRailId] = useState("");
  const [startModule, setStartModule] = useState("1");
  const [moduleWidth, setModuleWidth] = useState("1");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!unplacedItems.some(item => String(item.id) === itemId)) {
      setItemId(unplacedItems[0] ? String(unplacedItems[0].id) : "");
    }
    if (!layout?.rails.some(rail => rail.id === railId)) {
      setRailId(layout?.rails[0]?.id ?? "");
    }
  }, [itemId, layout, railId, unplacedItems]);

  if (!board) {
    return <section className="p-6">Het actieve verdeelbord bestaat niet.</section>;
  }

  function run(command: () => void) {
    try {
      command();
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De bordindeling kon niet worden aangepast.");
    }
  }

  function addPlacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedItemId = Number(itemId);
    const start = Number(startModule) - 1;
    const width = Number(moduleWidth);
    if (!Number.isInteger(selectedItemId) || !railId) {
      setError("Kies een onderdeel en een bordrij.");
      return;
    }
    run(() => schemaStore.commands.placeBoardLayoutItem(editor.activeBoardId, selectedItemId, {
      railId,
      startModule: start,
      moduleWidth: width,
    }));
  }

  const fieldClass = "rounded border border-neutral-300 bg-white px-3 py-2 text-sm";
  const buttonClass = "rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800";

  return (
    <section className="h-full overflow-auto bg-neutral-100 p-5" aria-label="Fysieke bordindeling">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-blue-700">Bordindeling</p>
            <h1 className="my-1 text-2xl font-bold">{board.name}</h1>
            <p className="m-0 text-sm text-neutral-600">
              Plaats onderdelen handmatig op DIN-rijen. Posities worden opgeslagen in het EDS-bestand.
            </p>
          </div>
          <button
            type="button"
            className={buttonClass}
            onClick={() => run(() => schemaStore.commands.addBoardLayoutRail(editor.activeBoardId))}
          >
            Bordrij toevoegen
          </button>
        </div>

        {error ? <p className="rounded bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}

        <div className="mt-5 grid gap-4">
          {layout?.rails.map((rail) => {
            const placements = layout.placements.filter(placement => placement.railId === rail.id);
            return (
              <article key={rail.id} className="rounded-lg border border-neutral-300 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-base font-semibold">{rail.name}</h2>
                    <p className="m-0 text-xs text-neutral-500">{rail.moduleCapacity} modules</p>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    onClick={() => run(() => schemaStore.commands.deleteBoardLayoutRail(
                      editor.activeBoardId,
                      rail.id,
                    ))}
                  >
                    Rij verwijderen
                  </button>
                </div>
                <div className="overflow-x-auto rounded border border-neutral-400 bg-neutral-200 p-2">
                  <div
                    className="grid min-w-max"
                    style={{ gridTemplateColumns: `repeat(${rail.moduleCapacity}, minmax(2rem, 1fr))` }}
                  >
                    {Array.from({ length: rail.moduleCapacity }, (_, index) => (
                      <span
                        key={index}
                        className="h-20 border-r border-neutral-300 bg-white/70 text-center text-[10px] text-neutral-400"
                        style={{ gridColumn: index + 1, gridRow: 1 }}
                      >
                        {index + 1}
                      </span>
                    ))}
                    {placements.map((placement) => {
                      const item = schema.document.getItem(placement.itemId);
                      return (
                        <button
                          key={placement.itemId}
                          type="button"
                          className={[
                            "z-10 m-1 overflow-hidden rounded border-2 px-2 text-left text-xs font-semibold shadow-sm",
                            editor.selectedItemId === placement.itemId
                              ? "border-blue-700 bg-blue-100 text-blue-950"
                              : "border-neutral-500 bg-neutral-50 text-neutral-800 hover:border-blue-500",
                          ].join(" ")}
                          style={{
                            gridColumn: `${placement.startModule + 1} / span ${placement.moduleWidth}`,
                            gridRow: 1,
                          }}
                          onClick={() => editorStore.commands.selectItem(placement.itemId)}
                          title={`${item?.label ?? `Onderdeel ${placement.itemId}`} · ${placement.moduleWidth} modules`}
                        >
                          <span className="block truncate">{item?.label ?? `Onderdeel ${placement.itemId}`}</span>
                          <span className="block font-normal text-neutral-500">{placement.moduleWidth}M</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
          {!layout || layout.rails.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-600">
              Voeg de eerste bordrij toe om de fysieke indeling te beginnen.
            </div>
          ) : null}
        </div>

        {layout && layout.rails.length > 0 ? (
          <form className="mt-5 grid gap-3 rounded-lg border border-neutral-300 bg-white p-4 md:grid-cols-5" onSubmit={addPlacement}>
            <label className="grid gap-1 text-xs font-semibold text-neutral-600 md:col-span-2">
              Ongeplaatst onderdeel
              <select className={fieldClass} value={itemId} onChange={event => setItemId(event.target.value)}>
                {unplacedItems.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-neutral-600">
              Bordrij
              <select className={fieldClass} value={railId} onChange={event => setRailId(event.target.value)}>
                {layout.rails.map(rail => <option key={rail.id} value={rail.id}>{rail.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-neutral-600">
              Startmodule
              <input className={fieldClass} type="number" min="1" value={startModule} onChange={event => setStartModule(event.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-neutral-600">
              Breedte
              <div className="flex gap-2">
                <input className={`${fieldClass} min-w-0 flex-1`} type="number" min="1" value={moduleWidth} onChange={event => setModuleWidth(event.target.value)} />
                <button type="submit" className={buttonClass} disabled={!itemId}>Plaatsen</button>
              </div>
            </label>
          </form>
        ) : null}
      </div>
    </section>
  );
}
