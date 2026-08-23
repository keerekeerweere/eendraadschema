import { useEffect } from "react";
import type { EditorStore } from "../../application/EditorStore";
import type { WorkspaceStore } from "../../application/WorkspaceStore";
import type { SituationPlanStore } from "../../application/SituationPlanStore";
import type { SituationPlanElement } from "../../sitplan/SituationPlanElement";

interface SituationBoxElement extends HTMLElement {
  readonly sitPlanElementRef?: SituationPlanElement;
}

export interface SituationSelectionBridgeProps {
  readonly paperElement: HTMLElement | null;
  readonly editorStore: EditorStore;
  readonly workspaceStore: WorkspaceStore;
  readonly situationPlanStore: SituationPlanStore | null;
  readonly onMutation: () => void;
  readonly onDeleteSelection: () => void;
  readonly onClearSelection: () => void;
}

export function SituationSelectionBridge({
  paperElement,
  editorStore,
  workspaceStore,
  situationPlanStore,
  onMutation,
  onDeleteSelection,
  onClearSelection,
}: SituationSelectionBridgeProps) {
  useEffect(() => {
    if (!paperElement) return;

    const syncSelection = (preferredBox: SituationBoxElement | null = null) => {
      const selectedBoxes = Array.from(
        paperElement.querySelectorAll<SituationBoxElement>(".box.selected"),
      );
      if (selectedBoxes.length === 0 && preferredBox?.sitPlanElementRef) {
        selectedBoxes.push(preferredBox);
      }
      const elementIds = selectedBoxes
        .map(box => box.sitPlanElementRef?.id)
        .filter((id): id is string => id !== undefined);
      const currentPrimary = workspaceStore.getSnapshot().selectedSituationElementId;
      const primaryElementId = preferredBox?.sitPlanElementRef?.id
        ?? (currentPrimary !== null && elementIds.includes(currentPrimary) ? currentPrimary : null);
      workspaceStore.commands.selectSituationElements(elementIds, primaryElementId);

      const primary = selectedBoxes.find(box => box.sitPlanElementRef?.id
        === workspaceStore.getSnapshot().selectedSituationElementId);
      const itemId = primary?.sitPlanElementRef?.getElectroItemId() ?? null;
      if (itemId !== null) editorStore.commands.selectItem(itemId);
    };

    const selectLinkedElectricalItem = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const box = target.closest(".box") as SituationBoxElement | null;
      syncSelection(box);
      queueMicrotask(() => syncSelection());
    };
    const suppressLegacyContextMenu = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".box")) return;
      event.preventDefault();
      event.stopPropagation();
      syncSelection(target.closest(".box") as SituationBoxElement);
    };
    const handleKeyboard = (event: KeyboardEvent) => {
      if (workspaceStore.getSnapshot().activeTab !== "situation" || !situationPlanStore) return;
      const target = event.target;
      if (
        (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']"))
        || document.querySelector("[role='dialog'][aria-modal='true']")
      ) return;
      const selectedIds = workspaceStore.getSnapshot().selectedSituationElementIds;
      if (selectedIds.length === 0) return;
      const elements = situationPlanStore.getSnapshot().elements
        .filter(element => selectedIds.includes(element.id));
      const movable = elements.filter(element => element.movable);
      const modifier = event.ctrlKey || event.metaKey;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClearSelection();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        onDeleteSelection();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (modifier && event.key.toLowerCase() === "l") {
        event.preventDefault();
        event.stopPropagation();
        situationPlanStore.commands.updateElements(elements.map(element => ({
          elementId: element.id,
          changes: { movable: !element.movable },
        })));
        onMutation();
        return;
      }
      if (!event.key.startsWith("Arrow") || movable.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (modifier && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        const rotation = event.key === "ArrowLeft" ? -90 : 90;
        situationPlanStore.commands.updateElements(movable.map(element => ({
          elementId: element.id,
          changes: { rotation: element.rotation + rotation },
        })));
      } else if (!modifier) {
        const delta = {
          ArrowLeft: { x: -1, y: 0 },
          ArrowRight: { x: 1, y: 0 },
          ArrowUp: { x: 0, y: -1 },
          ArrowDown: { x: 0, y: 1 },
        }[event.key];
        if (!delta) return;
        situationPlanStore.commands.updateElements(movable.map(element => ({
          elementId: element.id,
          changes: {
            position: {
              x: element.position.x + delta.x,
              y: element.position.y + delta.y,
            },
          },
        })));
      } else {
        return;
      }
      onMutation();
    };
    const observer = new MutationObserver(() => syncSelection());
    observer.observe(paperElement, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
    paperElement.addEventListener("mousedown", selectLinkedElectricalItem);
    paperElement.addEventListener("touchstart", selectLinkedElectricalItem);
    paperElement.addEventListener("contextmenu", suppressLegacyContextMenu, true);
    document.addEventListener("keydown", handleKeyboard, true);

    return () => {
      observer.disconnect();
      paperElement.removeEventListener("mousedown", selectLinkedElectricalItem);
      paperElement.removeEventListener("touchstart", selectLinkedElectricalItem);
      paperElement.removeEventListener("contextmenu", suppressLegacyContextMenu, true);
      document.removeEventListener("keydown", handleKeyboard, true);
    };
  }, [
    editorStore,
    onClearSelection,
    onDeleteSelection,
    onMutation,
    paperElement,
    situationPlanStore,
    workspaceStore,
  ]);

  return null;
}
