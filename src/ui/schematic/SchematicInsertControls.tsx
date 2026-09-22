import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { EditorStore } from "../../application/EditorStore";
import type { HierarchyViewNode } from "../../application/SchemaDocumentReader";
import type { SchemaStore } from "../../application/SchemaStore";
import { useSchemaSnapshot } from "../useSchemaSnapshot";
import { groupItemTypes } from "../hierarchy/GroupedItemTypeOptions";
import { SchematicItemIcon } from "./SchematicItemIcon";

type InsertMode = "before" | "end" | "start";

interface InsertTarget {
  readonly itemId: number;
  readonly mode: InsertMode;
  readonly left: number;
  readonly top: number;
}

interface RemoveTarget {
  readonly itemId: number;
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

// Different insert targets can end up anchored at (almost) the same pixel, e.g. "add
// item after the last child of a Kring" and "add item after the Kring itself" both sit
// at the end of the Kring's wire when the last child has no trailing space of its own.
// Spread such overlapping buttons apart horizontally so they remain distinguishable/clickable.
const OVERLAP_DISTANCE = 12;
const OVERLAP_SPACING = 14;

function spreadOverlappingTargets(targets: readonly InsertTarget[]): readonly InsertTarget[] {
  const groups: InsertTarget[][] = [];
  for (const target of targets) {
    const group = groups.find((candidate) => {
      const first = candidate[0];
      return (
        Math.abs(first.left - target.left) < OVERLAP_DISTANCE
        && Math.abs(first.top - target.top) < OVERLAP_DISTANCE
      );
    });
    if (group) group.push(target);
    else groups.push([target]);
  }

  return groups.flatMap((group) => {
    if (group.length === 1) return group;
    const offsetStart = -((group.length - 1) * OVERLAP_SPACING) / 2;
    return group.map((target, index) => ({
      ...target,
      left: target.left + offsetStart + index * OVERLAP_SPACING,
    }));
  });
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
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [removeError, setRemoveError] = useState("");
  const nodesById = useMemo(
    () => new Map(snapshot.document.getAllItems().map((node) => [node.id, node])),
    [snapshot.document],
  );
  const activeNode = activeInsert ? nodesById.get(activeInsert.itemId) : undefined;
  const availableTypes = activeInsert && activeNode ? insertionTypes(activeNode, activeInsert.mode) : [];
  const filteredTypes = availableTypes.filter((type) => type.toLocaleLowerCase("nl-BE").includes(search.trim().toLocaleLowerCase("nl-BE")));
  const groups = groupItemTypes(filteredTypes);
  const popoverPosition = activeInsert ? {
    left: Math.max(
      overlayElement.scrollLeft + 8,
      Math.min(
        activeInsert.left,
        overlayElement.scrollLeft + overlayElement.clientWidth - 432 - 8,
      ),
    ),
    top: Math.max(
      overlayElement.scrollTop + 8,
      Math.min(
        activeInsert.top,
        overlayElement.scrollTop + Math.max(8, overlayElement.clientHeight - 512 - 8),
      ),
    ),
  } : undefined;

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
        const itemId = Number(element.dataset.schemaItemId);
        const node = nodesById.get(itemId);
        if (!node || node.role !== "item" || positionedItemIds.has(itemId)) continue;
        positionedItemIds.add(itemId);
        const anchorX = Number(element.dataset.schemaAnchorX ?? 0);
        const anchorY = Number(element.dataset.schemaAnchorY ?? 0);

        if (node.capabilities.canDelete && node.childIds.length === 0) {
          const x = Number(element.dataset.schemaX ?? 0) + Number(element.dataset.schemaWidth ?? 0) / 2;
          const y = Number(element.dataset.schemaY ?? 0) + Number(element.dataset.schemaHeight ?? 0) / 2;
          nextRemoveTargets.push({
            itemId,
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
          nextTargets.push({
            itemId,
            mode: isKring ? "start" : "end",
            ...(isKring
              ? diagramPoint(element, topX, topY, overlayElement, false)
              : diagramPoint(
                  element,
                  Number(element.dataset.schemaEndX ?? 0),
                  anchorY,
                  overlayElement,
                  true,
                )),
          });
        }
      }

      setTargets(spreadOverlappingTargets(nextTargets));
      setRemoveTargets(nextRemoveTargets);
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
    setSearch("");
    setErrorMessage("");
  }

  function addItem(type: string): void {
    if (!activeInsert) return;
    try {
      const node = nodesById.get(activeInsert.itemId);
      const itemId = activeInsert.mode === "before"
        ? schemaStore.commands.insertItemBefore(activeInsert.itemId, type)
        : schemaStore.commands.addItem(activeInsert.itemId, type);
      if (activeInsert.mode === "start" && node) {
        schemaStore.commands.moveItem(itemId, { targetParentId: node.id, position: 0 });
      }
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
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Het onderdeel kon niet worden toegevoegd.");
    }
  }

  function removeItem(itemId: number): void {
    try {
      schemaStore.commands.deleteItem(itemId);
      const validItemIds = new Set(schemaStore.getSnapshot().document.getAllItems().map((item) => item.id));
      editorStore.commands.reconcileItemIds(validItemIds);
      setRemoveError("");
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Het onderdeel kon niet worden verwijderd.");
    }
  }

  return (
    <div className="absolute inset-0" aria-label="Onderdelen toevoegen in het schema">
      {!controlHeld && targets.map((target) => {
        const node = nodesById.get(target.itemId);
        if (!node) return null;
        const action = target.mode === "before"
          ? `vóór ${node.label} invoegen`
          : target.mode === "start"
            ? `in ${node.label} toevoegen`
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
            aria-label={`${node.label} verwijderen`}
            title={`${node.label} verwijderen`}
            onClick={() => removeItem(target.itemId)}
          >−</button>
        );
      })}
      {removeError ? <p className="pointer-events-auto absolute left-2 top-2 z-10 rounded bg-white p-2 text-sm text-red-700 shadow" role="alert">{removeError}</p> : null}

      {activeInsert && activeNode ? (
        <div
          className="pointer-events-auto absolute z-10 flex max-h-[min(32rem,calc(100vh-2rem))] w-[min(27rem,calc(100vw-2rem))] flex-col gap-2 rounded-xl border border-neutral-300 bg-white p-3 text-neutral-800 shadow-xl"
          role="dialog"
          aria-label="Onderdeel toevoegen"
          style={popoverPosition}
          onKeyDown={(event) => {
            if (event.key === "Escape") setActiveInsert(null);
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm">Onderdeel toevoegen</strong>
            <button className="rounded px-2 text-xl leading-none hover:bg-neutral-100" type="button" aria-label="Sluiten" onClick={() => setActiveInsert(null)}>×</button>
          </div>
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
                    >
                      <SchematicItemIcon type={type} />
                      <span className="max-w-full break-words">{type}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {filteredTypes.length === 0 ? <p className="m-0 py-6 text-center text-sm text-neutral-600">Geen onderdelen gevonden.</p> : null}
          </div>
          {errorMessage ? <p className="m-0 text-sm text-red-700" role="alert">{errorMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
