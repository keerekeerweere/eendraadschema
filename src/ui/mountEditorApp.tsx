import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { EditorStore } from "../application/EditorStore";
import type { SaveStatusStore } from "../application/SaveStatusStore";
import type { HistoryStatusStore } from "../application/HistoryStatusStore";
import type { SchemaStore } from "../application/SchemaStore";
import type { SituationPlanStore } from "../application/SituationPlanStore";
import type { SituationPlanAssetService } from "../application/SituationPlanAssetService";
import type { LegacyFileService } from "../application/FileService";
import type { LegacyPrintService } from "../application/PrintService";
import type { WorkspaceStore, WorkspaceTab } from "../application/WorkspaceStore";
import { EditorApp } from "./App";

export interface EditorAppMountOptions {
  readonly propertiesMountElement?: HTMLElement | null;
  readonly saveStatusStore?: SaveStatusStore | null;
  readonly statusBarMountElement?: HTMLElement | null;
  readonly zoomTargetElement?: HTMLElement | null;
  readonly schematicControlsMountElement?: HTMLElement | null;
  readonly situationPlanStore?: SituationPlanStore | null;
  readonly onSituationPlanMutation?: (historyKey?: string) => void;
  readonly onSituationPlanZoomIn?: () => void;
  readonly onSituationPlanZoomOut?: () => void;
  readonly onSituationPlanZoomToFit?: () => void;
  readonly onSituationPlanItemsDeleted?: (itemIds: readonly number[]) => void;
  readonly onSituationPlanSelectAll?: () => void;
  readonly onSituationPlanClearSelection?: () => void;
  readonly onSituationPlanSendBackward?: () => void;
  readonly onSituationPlanBringForward?: () => void;
  readonly workspaceStore?: WorkspaceStore;
  readonly onSelectWorkspaceTab?: (tab: WorkspaceTab) => void;
  readonly canCreateSituationOccurrence?: (itemId: number) => boolean;
  readonly onCreateSituationOccurrence?: (itemId: number) => void;
  readonly onRevealSituationOccurrence?: (occurrenceId: string) => void;
  readonly onRevealBoardItem?: (itemId: number) => void;
  readonly situationPaperElement?: HTMLElement | null;
  readonly commandBarMountElement?: HTMLElement | null;
  readonly boardLayoutMountElement?: HTMLElement | null;
  readonly situationHistoryStore?: HistoryStatusStore | null;
  readonly onSituationUndo?: () => void;
  readonly onSituationRedo?: () => void;
  readonly onSave?: () => void;
  readonly onOpenFile?: () => void;
  readonly situationPlanAssetService?: SituationPlanAssetService | null;
  readonly fileService?: LegacyFileService | null;
  readonly printService?: LegacyPrintService | null;
  readonly onOpenDocument?: () => void;
  readonly onAppendDocument?: () => void;
  readonly onDownloadPrintSvg?: (svg: string, filename: string) => void;
}

export function mountEditorApp(
  element: HTMLElement,
  schemaStore: SchemaStore,
  editorStore: EditorStore,
  hierarchyMountElement: HTMLElement | null,
  options: EditorAppMountOptions = {},
): Root {
  const root = createRoot(element);
  root.render(
    <StrictMode>
      <EditorApp
        schemaStore={schemaStore}
        editorStore={editorStore}
        hierarchyMountElement={hierarchyMountElement}
        propertiesMountElement={options.propertiesMountElement ?? null}
        saveStatusStore={options.saveStatusStore ?? null}
        statusBarMountElement={options.statusBarMountElement ?? null}
        zoomTargetElement={options.zoomTargetElement ?? null}
        schematicControlsMountElement={options.schematicControlsMountElement ?? null}
        situationPlanStore={options.situationPlanStore ?? null}
        onSituationPlanMutation={options.onSituationPlanMutation}
        onSituationPlanZoomIn={options.onSituationPlanZoomIn}
        onSituationPlanZoomOut={options.onSituationPlanZoomOut}
        onSituationPlanZoomToFit={options.onSituationPlanZoomToFit}
        onSituationPlanItemsDeleted={options.onSituationPlanItemsDeleted}
        onSituationPlanSelectAll={options.onSituationPlanSelectAll}
        onSituationPlanClearSelection={options.onSituationPlanClearSelection}
        onSituationPlanSendBackward={options.onSituationPlanSendBackward}
        onSituationPlanBringForward={options.onSituationPlanBringForward}
        workspaceStore={options.workspaceStore}
        onSelectWorkspaceTab={options.onSelectWorkspaceTab}
        canCreateSituationOccurrence={options.canCreateSituationOccurrence}
        onCreateSituationOccurrence={options.onCreateSituationOccurrence}
        onRevealSituationOccurrence={options.onRevealSituationOccurrence}
        onRevealBoardItem={options.onRevealBoardItem}
        situationPaperElement={options.situationPaperElement ?? null}
        commandBarMountElement={options.commandBarMountElement ?? null}
        boardLayoutMountElement={options.boardLayoutMountElement ?? null}
        situationHistoryStore={options.situationHistoryStore ?? null}
        onSituationUndo={options.onSituationUndo}
        onSituationRedo={options.onSituationRedo}
        onSave={options.onSave}
        onOpenFile={options.onOpenFile}
        situationPlanAssetService={options.situationPlanAssetService ?? null}
        fileService={options.fileService ?? null}
        printService={options.printService ?? null}
        onOpenDocument={options.onOpenDocument}
        onAppendDocument={options.onAppendDocument}
        onDownloadPrintSvg={options.onDownloadPrintSvg}
      />
    </StrictMode>,
  );
  return root;
}
