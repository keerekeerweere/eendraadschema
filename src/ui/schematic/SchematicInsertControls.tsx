import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { EditorStore } from "../../application/EditorStore";
import type { HierarchyViewNode } from "../../application/SchemaDocumentReader";
import type { ItemInsertion, SchemaStore } from "../../application/SchemaStore";
import { useSchemaSnapshot } from "../useSchemaSnapshot";
import { groupItemTypes } from "../hierarchy/GroupedItemTypeOptions";
import { SchematicItemIcon } from "./SchematicItemIcon";

type InsertMode = "before" | "end" | "start";
type InsertAction = InsertMode | "parallel";
const PARALLEL_CONTAINERS = new Set(["Bord", "Aansluiting", "Splitsing"]);

interface InsertTarget {
  readonly itemId: number;
  readonly mode: InsertMode;
  readonly left: number;
  readonly top: number;
}

interface RemoveTarget {
  readonly itemId: number;
  readonly boardId?: string;
  readonly left: number;
  readonly top: number;
}

interface SchematicInsertControlsProps {
  readonly schemaStore: SchemaStore;
  readonly editorStore: EditorStore;
  readonly previewElement: HTMLElement;
  readonly overlayElement: HTMLElement;
}

function diagramPoint(
  element: SVGGraphicsElement,
  x: number,
  y: number,
  overlayElement: HTMLElement,
  isEnd: boolean,
): { left: number; top: number } {
  const matrix = element.getScreenCTM?.();
  if (matrix && typeof DOMPoint !== "undefined") {
    const point = new DOMPoint(x, y).matrixTransform(matrix);
    const overlayRect = overlayElement.getBoundingClientRect();
    return {
      left: point.x - overlayRect.left + overlayElement.scrollLeft,
      top: point.y - overlayRect.top + overlayElement.scrollTop,
    };
  }

  const rect = element.getBoundingClientRect();
  const overlayRect = overlayElement.getBoundingClientRect();
  return {
    left: (isEnd ? rect.right : rect.left) - overlayRect.left + overlayElement.scrollLeft,
    top: rect.top + rect.height / 2 - overlayRect.top + overlayElement.scrollTop,
  };
}

function insertionTypes(node: HierarchyViewNode, mode: InsertMode): readonly string[] {
  return mode === "before"
    ? node.capabilities.allowedInsertBeforeTypes
    : node.capabilities.allowedChildTypes;
}

// A parent and its last child can share a wire junction. Keep every plus fully
// visible and leave a small gap so each one has its own click target.
const OVERLAP_DISTANCE = 26;
const OVERLAP_SPACING = 30;

function spreadOverlappingTargets<Target extends { readonly left: number; readonly top: number }>(targets: readonly Target[], leftEdge: number, rightEdge: number): readonly Target[] {
  const groups: Target[][] = [];
  for (const target of targets) {
    const matches = groups.filter((candidate) => candidate.some((member) => (
      Math.abs(member.left - target.left) < OVERLAP_DISTANCE
      && Math.abs(member.top - target.top) < OVERLAP_DISTANCE
    )));
    if (matches.length === 0) {
      groups.push([target]);
      continue;
    }
    const first = matches[0];
    first.push(target);
    for (const match of matches.slice(1)) {
      first.push(...match);
      groups.splice(groups.indexOf(match), 1);
    }
  }

  const spread = groups.flatMap((group) => {
    if (group.length === 1) return group;
    const centerLeft = group.reduce((sum, target) => sum + target.left, 0) / group.length;
    const centerTop = group.reduce((sum, target) => sum + target.top, 0) / group.length;
    const offsetStart = -((group.length - 1) * OVERLAP_SPACING) / 2;
    const boundedCenter = rightEdge >= leftEdge - 2 * offsetStart
      ? Math.max(leftEdge - offsetStart, Math.min(centerLeft, rightEdge + offsetStart))
      : centerLeft;
    return group.map((target, index) => ({
      ...target,
      left: boundedCenter + offsetStart + index * OVERLAP_SPACING,
      top: centerTop,
    }));
  });
  const placed: Target[] = [];
  for (const target of spread) {
    let left = target.left;
    for (let step = 0; step < 20; step += 1) {
      const offset = step === 0 ? 0 : Math.ceil(step / 2) * OVERLAP_SPACING * (step % 2 === 1 ? 1 : -1);
      const candidate = target.left + offset;
      if (rightEdge > leftEdge && (candidate < leftEdge || candidate > rightEdge)) continue;
      if (placed.every((other) => Math.abs(other.left - candidate) >= 22 || Math.abs(other.top - target.top) >= 22)) {
        left = candidate;
        break;
      }
    }
    placed.push({ ...target, left });
  }
  return placed;
}

export function SchematicInsertControls({
  schemaStore,
  editorStore,
  previewElement,
  overlayElement,
}: SchematicInsertControlsProps) {
  const snapshot = useSchemaSnapshot(schemaStore);
  const [targets, setTargets] = useState<readonly InsertTarget[]>([]);
  const [removeTargets, setRemoveTargets] = useState<readonly RemoveTarget[]>([]);
  const [controlHeld, setControlHeld] = useState(false);
  const [activeInsert, setActiveInsert] = useState<InsertTarget | null>(null);
  const [insertAction, setInsertAction] = useState<InsertAction>("end");
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [insertionPreview, setInsertionPreview] = useState<{ svg: string; itemId: number } | null>(null);
  const [previewBounds, setPreviewBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [pendingRemove, setPendingRemove] = useState<RemoveTarget | null>(null);
  const nodesById = useMemo(
    () => new Map(snapshot.document.getAllItems().map((node) => [node.id, node])),
    [snapshot.document],
  );
  const activeNode = activeInsert ? nodesById.get(activeInsert.itemId) : undefined;
  const activeParent = activeNode?.parentId != null ? nodesById.get(activeNode.parentId) : undefined;
  const canAddParallel = !!activeParent && PARALLEL_CONTAINERS.has(activeParent.type) && activeParent.capabilities.canAddChild;
  const availableTypes = activeInsert && activeNode ? (insertAction === "parallel"
    ? (canAddParallel ? activeParent!.capabilities.allowedChildTypes : [])
    : insertionTypes(activeNode, insertAction)).filter((type) => (
    type !== "Bord" || activeNode.type !== "Kring" || !snapshot.document.getBoards().some((board) => board.feeder?.sourceCircuitId === activeNode.id)
  )) : [];
  const filteredTypes = availableTypes.filter((type) => type.toLocaleLowerCase("nl-BE").includes(search.trim().toLocaleLowerCase("nl-BE")));
  const groups = groupItemTypes(filteredTypes);
  const previewHost = previewElement.querySelector<HTMLElement>("#EDS");
  const previewSvg = useMemo(() => {
    if (!insertionPreview) return "";
    const parsed = new DOMParser().parseFromString(insertionPreview.svg, "image/svg+xml");
    const item = parsed.querySelector(`[data-schema-item-id="${insertionPreview.itemId}"]`);
    if (item) {
      const highlight = parsed.createElementNS("http://www.w3.org/2000/svg", "rect");
      const bounds = { x: Number(item.getAttribute("data-schema-x") ?? 0) - 3, y: Number(item.getAttribute("data-schema-y") ?? 0) - 3, width: Number(item.getAttribute("data-schema-width") ?? 0) + 6, height: Number(item.getAttribute("data-schema-height") ?? 0) + 6 };
      for (const [key, value] of Object.entries({ ...bounds, fill: "#2563eb", "fill-opacity": "0.12", stroke: "#2563eb", "stroke-width": "2", "stroke-dasharray": "5 3" })) highlight.setAttribute(key, String(value));
      parsed.documentElement.appendChild(highlight);
    }
    return new XMLSerializer().serializeToString(parsed.documentElement);
  }, [insertionPreview]);

  useEffect(() => {
    if (!activeInsert || !previewType || !availableTypes.includes(previewType)) {
      setInsertionPreview(null);
      return;
    }
    const timeout = window.setTimeout(() => {
      try {
        const request = insertionRequest(previewType);
        setInsertionPreview(request ? schemaStore.previewInsertion(request) : null);
        setErrorMessage("");
      } catch (error) {
        setInsertionPreview(null);
        setErrorMessage(error instanceof Error ? error.message : "Het voorbeeld kon niet worden getekend.");
      }
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [activeInsert, previewType, insertAction, snapshot.revision]);

  useLayoutEffect(() => {
    if (!insertionPreview || !previewHost) {
      setPreviewBounds(null);
      return;
    }
    const updateBounds = () => {
      const rect = previewHost.getBoundingClientRect();
      setPreviewBounds({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    };
    updateBounds();
    window.addEventListener("resize", updateBounds);
    window.addEventListener("scroll", updateBounds, true);
    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("scroll", updateBounds, true);
    };
  }, [insertionPreview, previewHost]);

  useEffect(() => {
    const updateControlKey = (event: KeyboardEvent): void => setControlHeld(event.ctrlKey);
    const clearControlKey = (): void => setControlHeld(false);
    window.addEventListener("keydown", updateControlKey);
    window.addEventListener("keyup", updateControlKey);
    window.addEventListener("blur", clearControlKey);
    return () => {
      window.removeEventListener("keydown", updateControlKey);
      window.removeEventListener("keyup", updateControlKey);
      window.removeEventListener("blur", clearControlKey);
    };
  }, []);

  useLayoutEffect(() => {
    function updateTargets(): void {
      const nextTargets: InsertTarget[] = [];
      const nextRemoveTargets: RemoveTarget[] = [];
      const diagramElements = previewElement.querySelectorAll<SVGGraphicsElement>(
        "[data-schema-item-id]",
      );

      const positionedItemIds = new Set<number>();
      for (const element of Array.from(diagramElements).reverse()) {
        if (element.closest("[data-insertion-preview]")) continue;
        const itemId = Number(element.dataset.schemaItemId);
        const node = nodesById.get(itemId);
        if (!node || node.role !== "item" || positionedItemIds.has(itemId)) continue;
        positionedItemIds.add(itemId);
        const anchorX = Number(element.dataset.schemaAnchorX ?? 0);
        const anchorY = Number(element.dataset.schemaAnchorY ?? 0);

        const board = snapshot.document.getBoards().find((candidate) => candidate.rootItemIds.includes(itemId));
        if (node.capabilities.canDelete || board?.feeder) {
          const x = Number(element.dataset.schemaX ?? 0) + (node.type === "Omvormer" ? 46 : Number(element.dataset.schemaWidth ?? 0) / 2);
          const y = Number(element.dataset.schemaY ?? 0) + Number(element.dataset.schemaHeight ?? 0) / 2;
          nextRemoveTargets.push({
            itemId,
            boardId: board?.feeder ? board.id : undefined,
            ...diagramPoint(element, x, y, overlayElement, false),
          });
        }

        if (node.capabilities.canInsertBefore) {
          nextTargets.push({
            itemId,
            mode: "before",
            ...diagramPoint(element, anchorX, anchorY, overlayElement, false),
          });
        }
        if (node.capabilities.canAddChild) {
          const isKring = node.type === "Kring";
          const topX = Number(element.dataset.schemaTopX ?? anchorX);
          const topY = Number(element.dataset.schemaTopY ?? 0);
          if (isKring) nextTargets.push({
            itemId,
            mode: "start",
            ...diagramPoint(element, topX, topY, overlayElement, false),
          });
          nextTargets.push({
            itemId,
            mode: "end",
            ...diagramPoint(element, Number(element.dataset.schemaEndX ?? 0), anchorY, overlayElement, true),
          });
        }
      }

      const positionedTargets = spreadOverlappingTargets(
        nextTargets,
        overlayElement.scrollLeft + 14,
        overlayElement.scrollLeft + overlayElement.clientWidth - 14,
      );
      const positionedRemoveTargets = spreadOverlappingTargets(
        nextRemoveTargets,
        overlayElement.scrollLeft + 14,
        overlayElement.scrollLeft + overlayElement.clientWidth - 14,
      );
      setTargets(previous => previous.length === positionedTargets.length && previous.every((item, index) => (
        item.itemId === positionedTargets[index].itemId && item.mode === positionedTargets[index].mode && item.left === positionedTargets[index].left && item.top === positionedTargets[index].top
      )) ? previous : positionedTargets);
      setRemoveTargets(previous => previous.length === positionedRemoveTargets.length && previous.every((item, index) => (
        item.itemId === positionedRemoveTargets[index].itemId && item.boardId === positionedRemoveTargets[index].boardId && item.left === positionedRemoveTargets[index].left && item.top === positionedRemoveTargets[index].top
      )) ? previous : positionedRemoveTargets);
    }

    updateTargets();
    const observer = new MutationObserver(updateTargets);
    observer.observe(previewElement, { childList: true, subtree: true });
    const scrollElement = previewElement.parentElement;
    window.addEventListener("resize", updateTargets);
    scrollElement?.addEventListener("scroll", updateTargets, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateTargets);
      scrollElement?.removeEventListener("scroll", updateTargets);
    };
  }, [nodesById, overlayElement, previewElement, snapshot.revision]);

  function openInsert(target: InsertTarget): void {
    const node = nodesById.get(target.itemId);
    if (!node) return;
    const allowedTypes = insertionTypes(node, target.mode);
    if (allowedTypes.length === 0) return;
    setActiveInsert(target);
    setPreviewType(null);
    setInsertionPreview(null);
    const parent = node.parentId != null ? nodesById.get(node.parentId) : undefined;
    setInsertAction(target.mode === "before" && node.type === "Kring" && parent && PARALLEL_CONTAINERS.has(parent.type) ? "parallel" : target.mode);
    setSearch("");
    setErrorMessage("");
  }

  function insertionRequest(type: string): ItemInsertion | null {
      if (!activeInsert) return null;
      const node = nodesById.get(activeInsert.itemId);
      const siblingIndex = insertAction === "parallel" && node?.parentId != null
        ? snapshot.document.getChildren(node.parentId).filter((child) => child.role === "item").findIndex((child) => child.id === node.id)
        : -1;
      return insertAction === "parallel" && node?.parentId != null && siblingIndex >= 0
        ? { kind: "child", parentId: node.parentId, type, position: siblingIndex + (activeInsert.mode === "before" ? 0 : 1) }
        : insertAction === "before"
          ? { kind: "before", itemId: activeInsert.itemId, type }
          : { kind: "child", parentId: activeInsert.itemId, type, position: insertAction === "start" ? 0 : snapshot.document.getChildren(activeInsert.itemId).filter((child) => child.role === "item").length };
  }

  function addItem(type: string): void {
    const request = insertionRequest(type);
    if (!request) return;
    try {
      const itemId = request.kind === "before"
        ? schemaStore.commands.insertItemBefore(request.itemId, request.type)
        : schemaStore.commands.addItem(request.parentId, request.type, request.position);
      const document = schemaStore.getSnapshot().document;
      const ancestorItemIds: number[] = [];
      let parentId = document.getItem(itemId)?.parentId;
      while (parentId !== null && parentId !== undefined) {
        ancestorItemIds.push(parentId);
        parentId = document.getItem(parentId)?.parentId;
      }
      editorStore.commands.revealItem(
        itemId,
        document.getBoardForItem(itemId)?.id,
        ancestorItemIds,
      );
      setActiveInsert(null);
      setInsertionPreview(null);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Het onderdeel kon niet worden toegevoegd.");
    }
  }

  function removeItem(target: RemoveTarget): void {
    const node = snapshot.document.getItem(target.itemId);
    setRemoveError("");
    if (target.boardId || (node && node.childIds.length > 0)) {
      setPendingRemove(target);
      return;
    }
    executeRemoval(target, false);
  }

  function executeRemoval(target: RemoveTarget, reconnect: boolean): void {
    try {
      const board = target.boardId ? snapshot.document.getBoard(target.boardId) : undefined;
      if (board && !reconnect) schemaStore.commands.deleteDistributionBoard(board.id);
      else schemaStore.commands.deleteItem(target.itemId, reconnect);
      const document = schemaStore.getSnapshot().document;
      const validItemIds = new Set(document.getAllItems().map((item) => item.id));
      editorStore.commands.reconcileItemIds(validItemIds);
      if (board?.feeder) editorStore.commands.selectBoard(board.feeder.sourceBoardId, board.feeder.sourceCircuitId);
      setRemoveError("");
      setPendingRemove(null);
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Het onderdeel kon niet worden verwijderd.");
    }
  }

  return (
    <div className="absolute inset-0" aria-label="Onderdelen toevoegen in het schema">
      {activeInsert && insertionPreview && previewBounds ? createPortal(<div
        data-insertion-preview
        data-insertion-preview-item-id={insertionPreview.itemId}
        className="pointer-events-none fixed z-20 overflow-hidden bg-white/95"
        aria-label={`Voorbeeld van ${previewType}`}
        aria-hidden="true"
        style={previewBounds}
        dangerouslySetInnerHTML={{ __html: previewSvg }}
      />, document.body) : null}
      {!controlHeld && !insertionPreview && targets.map((target) => {
        const node = nodesById.get(target.itemId);
        if (!node) return null;
        const action = target.mode === "before"
          ? `vóór ${node.label} invoegen`
          : target.mode === "start"
            ? `aan het begin van ${node.label} toevoegen`
            : node.type === "Kring"
              ? `aan het einde van ${node.label} toevoegen`
              : `na ${node.label} toevoegen`;
        return (
          <button
            key={`${target.mode}-${target.itemId}`}
            type="button"
            className="pointer-events-auto absolute flex size-5 -translate-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-blue-700 bg-white font-sans text-sm leading-none font-bold text-blue-700 shadow-sm hover:bg-blue-700 hover:text-white focus-visible:bg-blue-700 focus-visible:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700/30"
            style={{ left: target.left, top: target.top }}
            aria-label={`Onderdeel ${action}`}
            title={`Onderdeel ${action}`}
            onClick={() => openInsert(target)}
          >+</button>
        );
      })}

      {controlHeld && removeTargets.map((target) => {
        const node = nodesById.get(target.itemId);
        if (!node) return null;
        return (
          <button
            key={target.itemId}
            type="button"
            className="pointer-events-auto absolute z-1 flex size-6 -translate-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-red-700 bg-white font-sans text-lg leading-none font-bold text-red-700 shadow-sm hover:bg-red-700 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-red-700/30"
            style={{ left: target.left, top: target.top }}
            data-schema-remove-item-id={target.itemId}
            aria-label={`${target.boardId ? "Verdeelbord " : ""}${node.label} verwijderen`}
            title={`${target.boardId ? "Verdeelbord " : ""}${node.label} verwijderen`}
            onClick={() => removeItem(target)}
          >−</button>
        );
      })}
      {removeError ? <p className="pointer-events-auto absolute left-2 top-2 z-10 rounded bg-white p-2 text-sm text-red-700 shadow" role="alert">{removeError}</p> : null}

      {pendingRemove ? <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onKeyDown={event => { if (event.key === "Escape") setPendingRemove(null); }}>
        <section role="dialog" aria-modal="true" aria-label="Onderdeel verwijderen" className="grid w-full max-w-md gap-3 rounded-xl bg-white p-5 text-neutral-900 shadow-xl">
          <h2 className="m-0 text-lg font-semibold">{nodesById.get(pendingRemove.itemId)?.label} verwijderen</h2>
          <p className="m-0 text-sm">Wat moet er gebeuren met de onderdelen die hierop aangesloten zijn?</p>
          <button autoFocus type="button" className="min-h-11 rounded-lg border border-blue-700 p-3 text-left text-blue-800 hover:bg-blue-50" onClick={() => executeRemoval(pendingRemove, true)}>Alleen dit onderdeel verwijderen en de rest opnieuw verbinden</button>
          <button type="button" className="min-h-11 rounded-lg border border-red-300 p-3 text-left text-red-700 hover:bg-red-50" onClick={() => executeRemoval(pendingRemove, false)}>Dit onderdeel en alles erachter verwijderen</button>
          {removeError ? <p role="alert" className="m-0 text-sm text-red-700">{removeError}</p> : null}
          <button type="button" className="min-h-10 rounded-lg border border-neutral-300 px-3" onClick={() => { setPendingRemove(null); setRemoveError(""); }}>Annuleren</button>
        </section>
      </div> : null}

      {activeInsert && activeNode ? createPortal(
        <div
          className="pointer-events-auto fixed bottom-3 right-3 z-40 flex max-h-[45vh] w-[min(20rem,calc(100vw-2rem))] flex-col gap-2 rounded-xl border border-neutral-300 bg-white p-3 text-neutral-800 shadow-xl sm:bottom-auto sm:top-32 sm:max-h-[calc(100vh-9rem)]"
          role="dialog"
          aria-label="Onderdeel toevoegen"
          onKeyDown={(event) => {
            if (event.key === "Escape") setActiveInsert(null);
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm">Onderdeel toevoegen</strong>
            <button className="rounded px-2 text-xl leading-none hover:bg-neutral-100" type="button" aria-label="Sluiten" onClick={() => setActiveInsert(null)}>×</button>
          </div>
          <p className="m-0 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-800" role="status">{insertionPreview ? `Voorbeeld: ${previewType}. Klik op het symbool hieronder om op deze plek te plaatsen; Esc om te annuleren.` : "Wijs een symbool aan of gebruik Tab om de nieuwe positie en verbindingen in het schema te zien."}</p>
          <label className="grid gap-1 rounded-lg bg-blue-50 p-2 text-sm font-semibold text-blue-950">
            Hoe wil je het onderdeel verbinden?
            <select className="min-h-10 max-w-full rounded-md border border-blue-200 bg-white px-2 text-sm font-normal" value={insertAction} onChange={event => { setInsertAction(event.target.value as InsertAction); setSearch(""); setErrorMessage(""); }}>
              {activeNode.capabilities.canInsertBefore ? <option value="before">In de verbinding vóór {activeNode.label}</option> : null}
              {activeNode.capabilities.canAddChild && activeNode.type === "Kring" ? <option value="start">Vooraan in {activeNode.label} — op dezelfde lijn</option> : null}
              {activeNode.capabilities.canAddChild ? <option value="end">{PARALLEL_CONTAINERS.has(activeNode.type) ? `Nieuwe parallelle tak vanuit ${activeNode.label}` : `Na ${activeNode.label} aansluiten`}</option> : null}
              {canAddParallel ? <option value="parallel">Parallel naast {activeNode.label} — vanuit {activeParent!.label}</option> : null}
            </select>
          </label>
          <p className="m-0 text-xs text-neutral-600">{insertAction === "before"
            ? `Het nieuwe onderdeel komt tussen ${activeParent?.label ?? "de voeding"} en ${activeNode.label}. De bestaande verbinding loopt erdoor verder.`
            : activeNode.type === "Aansluiting"
              ? "Maak hier een aftakking door een Kring toe te voegen. Voeg de Omvormer daarna toe aan die Kring; dit maakt geen nieuw verdeelbord."
            : insertAction === "parallel"
              ? `${activeNode.label} en het nieuwe onderdeel krijgen elk een eigen tak vanuit ${activeParent?.label}.`
              : PARALLEL_CONTAINERS.has(activeNode.type)
                ? `Een eigen tak vanuit ${activeNode.label}, naast de bestaande takken.`
                : `Aangesloten op ${activeNode.label}. Kies Splitsing als je hier parallelle takken wilt maken.`}</p>
          <label className="sr-only" htmlFor="schematic-item-search">Zoek onderdeel</label>
          <input
            id="schematic-item-search"
            className="min-h-9 rounded-md border border-neutral-300 px-2 text-sm focus-visible:outline-3 focus-visible:outline-blue-700/30"
            type="search"
            placeholder="Zoek een onderdeel…"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            autoFocus
          />
          <div className="min-h-0 overflow-y-auto pr-1">
            {groups.map((group) => (
              <section key={group.label} className="mb-3" aria-label={group.label}>
                <h3 className="mb-1 text-xs font-semibold text-neutral-600">{group.label}</h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {group.types.map((type) => (
                    <button
                      key={type}
                      className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white p-1 text-center text-xs leading-tight hover:border-blue-600 hover:bg-blue-50 focus-visible:outline-3 focus-visible:outline-blue-700/30"
                      type="button"
                      aria-label={type}
                      title={type}
                      onClick={() => addItem(type)}
                      onMouseEnter={() => setPreviewType(type)}
                      onFocus={() => setPreviewType(type)}
                    >
                      <SchematicItemIcon type={type} />
                      <span className="max-w-full break-words">{type}</span>
                      {type === "Aansluiting" && insertAction === "before" && activeNode.type === "Omschakelaar"
                        ? <span className="text-[10px] text-neutral-500">lijn met aftakpunt</span>
                        : null}
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {filteredTypes.length === 0 ? <p className="m-0 py-6 text-center text-sm text-neutral-600">Geen onderdelen gevonden.</p> : null}
          </div>
          {errorMessage ? <p className="m-0 text-sm text-red-700" role="alert">{errorMessage}</p> : null}
        </div>, document.body,
      ) : null}
    </div>
  );
}
