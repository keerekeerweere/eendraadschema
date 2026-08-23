import { createPortal } from "react-dom";
import type { EditorStore } from "../application/EditorStore";
import type { SaveStatusStore } from "../application/SaveStatusStore";
import type { HistoryStatusStore } from "../application/HistoryStatusStore";
import type { SchemaStore } from "../application/SchemaStore";
import type { SituationPlanStore } from "../application/SituationPlanStore";
import type { SituationPlanAssetService } from "../application/SituationPlanAssetService";
import type { LegacyFileService } from "../application/FileService";
import type { LegacyPrintService } from "../application/PrintService";
import {
  LocalWorkspaceStore,
  type WorkspaceStore,
  type WorkspaceTab,
} from "../application/WorkspaceStore";
import { HierarchyTree } from "./hierarchy/HierarchyTree";
import { StatusBar } from "./layout/StatusBar";
import { ItemPropertiesPanel } from "./properties/ItemPropertiesPanel";
import { useSchemaSnapshot } from "./useSchemaSnapshot";
import { WorkspaceHeader } from "./workspace/WorkspaceHeader";
import { SituationSelectionBridge } from "./workspace/SituationSelectionBridge";
import { SituationElementInspector } from "./workspace/SituationElementInspector";
import { useWorkspaceSnapshot } from "./useWorkspaceSnapshot";
import { WorkspaceCommandBar } from "./workspace/WorkspaceCommandBar";
import { BoardLayoutWorkspace } from "./boards/BoardLayoutWorkspace";
import { BoardLayoutInspector } from "./boards/BoardLayoutInspector";
import { SchematicInsertControls } from "./schematic/SchematicInsertControls";
import { SchematicSelectionBridge } from "./schematic/SchematicSelectionBridge";
import { FileDialog } from "./workspace/FileDialog";
import { PrintDialog } from "./workspace/PrintDialog";
import { createDossierSnapshot } from "../application/DossierReader";
import { McpProposalReview } from "./workspace/McpProposalReview";

export interface EditorAppProps {
  readonly schemaStore: SchemaStore;
  readonly editorStore: EditorStore;
  readonly hierarchyMountElement: HTMLElement | null;
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

export function EditorApp({
  schemaStore,
  editorStore,
  hierarchyMountElement,
  propertiesMountElement = null,
  saveStatusStore = null,
  statusBarMountElement = null,
  zoomTargetElement = null,
  schematicControlsMountElement = null,
  situationPlanStore = null,
  onSituationPlanMutation = () => {},
  onSituationPlanZoomIn = () => {},
  onSituationPlanZoomOut = () => {},
  onSituationPlanZoomToFit = () => {},
  onSituationPlanItemsDeleted = () => {},
  onSituationPlanSelectAll = () => {},
  onSituationPlanClearSelection = () => {},
  onSituationPlanSendBackward = () => {},
  onSituationPlanBringForward = () => {},
  workspaceStore = defaultWorkspaceStore,
  onSelectWorkspaceTab = () => {},
  canCreateSituationOccurrence = () => false,
  onCreateSituationOccurrence = () => {},
  onRevealSituationOccurrence = () => {},
  onRevealBoardItem = () => {},
  situationPaperElement = null,
  commandBarMountElement = null,
  boardLayoutMountElement = null,
  situationHistoryStore = null,
  onSituationUndo = () => {},
  onSituationRedo = () => {},
  onSave = () => {},
  onOpenFile = () => {},
  situationPlanAssetService = null,
  fileService = null,
  printService = null,
  onOpenDocument = () => {},
  onAppendDocument = () => {},
  onDownloadPrintSvg = () => {},
}: EditorAppProps) {
  const snapshot = useSchemaSnapshot(schemaStore);
  const workspace = useWorkspaceSnapshot(workspaceStore);
  const itemCount = snapshot.document
    .getAllItems()
    .filter((item) => item.role === "item").length;
  const dossierIssues = situationPlanStore
    ? createDossierSnapshot(snapshot, situationPlanStore.getSnapshot()).issues
    : [];

  function deleteSituationSelection() {
    if (!situationPlanStore) return;
    const elementIds = workspaceStore.getSnapshot().selectedSituationElementIds;
    if (elementIds.length === 0) return;
    const deletedItemIds = situationPlanStore.commands.deleteElements(elementIds);
    workspaceStore.commands.selectSituationElement(null);
    onSituationPlanMutation();
    onSituationPlanItemsDeleted(deletedItemIds);
  }

  return (
    <>
      <McpProposalReview />
      <WorkspaceHeader
        itemCount={itemCount}
        store={workspaceStore}
        onSelectTab={onSelectWorkspaceTab}
      />
      {hierarchyMountElement
        ? createPortal(
            <HierarchyTree
              schemaStore={schemaStore}
              editorStore={editorStore}
              situationPlanStore={situationPlanStore}
              canCreateSituationOccurrence={canCreateSituationOccurrence}
              onCreateSituationOccurrence={onCreateSituationOccurrence}
              onRevealSituationOccurrence={onRevealSituationOccurrence}
              onRevealBoardItem={onRevealBoardItem}
            />,
            hierarchyMountElement,
          )
        : null}
      {propertiesMountElement
        ? createPortal(
            workspace.activeTab === "board"
              ? <BoardLayoutInspector schemaStore={schemaStore} editorStore={editorStore} />
              : workspace.activeTab === "situation" && situationPlanStore
              ? (
                  <SituationElementInspector
                    situationPlanStore={situationPlanStore}
                    workspaceStore={workspaceStore}
                    onMutation={() => onSituationPlanMutation()}
                  />
                )
              : <ItemPropertiesPanel schemaStore={schemaStore} editorStore={editorStore} />,
            propertiesMountElement,
          )
        : null}
      {boardLayoutMountElement && workspace.activeTab === "board"
        ? createPortal(
            <BoardLayoutWorkspace schemaStore={schemaStore} editorStore={editorStore} />,
            boardLayoutMountElement,
          )
        : null}
      {statusBarMountElement && saveStatusStore
        ? createPortal(
            <StatusBar
              schemaStore={schemaStore}
              editorStore={editorStore}
              saveStatusStore={saveStatusStore}
              zoomTargetElement={zoomTargetElement}
            />,
            statusBarMountElement,
          )
        : null}
      {schematicControlsMountElement && zoomTargetElement
        ? createPortal(
            <SchematicInsertControls
              schemaStore={schemaStore}
              editorStore={editorStore}
              previewElement={zoomTargetElement}
              overlayElement={schematicControlsMountElement.parentElement ?? schematicControlsMountElement}
            />,
            schematicControlsMountElement,
          )
        : null}
      {zoomTargetElement ? (
        <SchematicSelectionBridge
          schemaStore={schemaStore}
          editorStore={editorStore}
          previewElement={zoomTargetElement}
        />
      ) : null}
      {commandBarMountElement
        && situationPlanStore
        && situationPlanAssetService
        && saveStatusStore
        && situationHistoryStore
        ? createPortal(
            <WorkspaceCommandBar
              schemaStore={schemaStore}
              editorStore={editorStore}
              situationPlanStore={situationPlanStore}
              workspaceStore={workspaceStore}
              saveStatusStore={saveStatusStore}
              situationHistoryStore={situationHistoryStore}
              onSituationMutation={onSituationPlanMutation}
              onSituationUndo={onSituationUndo}
              onSituationRedo={onSituationRedo}
              onSave={onSave}
              onOpenFile={onOpenFile}
              situationAssetService={situationPlanAssetService}
              onDeleteSelection={deleteSituationSelection}
              onSelectAll={onSituationPlanSelectAll}
              onClearSelection={onSituationPlanClearSelection}
              onSendBackward={onSituationPlanSendBackward}
              onBringForward={onSituationPlanBringForward}
              onZoomIn={onSituationPlanZoomIn}
              onZoomOut={onSituationPlanZoomOut}
              onZoomToFit={onSituationPlanZoomToFit}
            />,
            commandBarMountElement,
          )
        : null}
      <SituationSelectionBridge
        paperElement={situationPaperElement}
        editorStore={editorStore}
        workspaceStore={workspaceStore}
        situationPlanStore={situationPlanStore}
        onMutation={() => onSituationPlanMutation()}
        onDeleteSelection={deleteSituationSelection}
        onClearSelection={onSituationPlanClearSelection}
      />
      {workspace.activeDialog === "file" && fileService ? (
        <FileDialog
          fileService={fileService}
          schemaStore={schemaStore}
          onOpen={onOpenDocument}
          onAppend={onAppendDocument}
          onClose={() => workspaceStore.commands.closeDialog()}
        />
      ) : null}
      {workspace.activeDialog === "print" && printService ? (
        <PrintDialog
          printService={printService}
          dossierIssues={dossierIssues}
          onDownloadSvg={onDownloadPrintSvg}
          onClose={() => workspaceStore.commands.closeDialog()}
        />
      ) : null}
    </>
  );
}

const defaultWorkspaceStore = new LocalWorkspaceStore();
