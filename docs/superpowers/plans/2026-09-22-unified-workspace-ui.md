# Unified Workspace UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved welcoming, consistent workbench across Dossier, Eéndraadschema, Situatieschema, and Bordindeling, with usable controls at desktop and narrow widths.

**Architecture:** Keep React responsible for workspace chrome and view presentation. Use the existing stores and command adapters; do not change persisted electrical data or renderer output. CSS host geometry and responsive drawers remain at the `index.html`/`css/all.css` boundary.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest/Testing Library, Playwright, Vite.

**Spec:** `docs/superpowers/specs/2026-09-22-unified-workspace-ui-design.md`

---

## File map

- `src/ui/workspace/WorkspaceHeader.tsx`: document identity, tab navigation, save state, and application actions.
- `src/ui/workspace/ApplicationMenu.tsx`: accessible New/File/Print/Help actions, reused within header.
- `src/ui/workspace/WorkspaceCommandBar.tsx`: view context, command grouping, and narrow-screen overflow.
- `src/ui/workspace/WorkspaceSidebarResizers.tsx`: desktop resize/collapse and narrow-screen panel triggers/drawer state.
- `src/ui/workspace/WorkspaceChromeController.tsx`: active canvas and side-panel visibility.
- `src/ui/workspace/WorkspaceIcon.tsx` (new): coherent inline SVG icons for common actions.
- `src/ui/App.tsx`, `index.html`, `css/all.css`: compose the two-row shell and set host geometry.
- `src/ui/uiStyles.ts`: shared button, field, focus, and status treatments.
- `src/ui/workspace/DossierWorkspace.tsx`: next-task and circuit overview hierarchy.
- `src/ui/schematic/SchematicViewport.tsx`: compact drawing guidance and collapsible legend.
- `src/ui/workspace/SituationPlacementPalette.tsx`: consistent task queue and empty/complete states.
- `src/ui/boards/BoardLayoutWorkspace.tsx`: clearer board setup, queue, and canvas hierarchy.
- `src/test/*` and `e2e/*`: interaction and regression checks where behavior changes.

## Task 1: Shared shell and design primitives

**Files:** `src/ui/workspace/WorkspaceHeader.tsx`, `src/ui/workspace/ApplicationMenu.tsx`, `src/ui/workspace/WorkspaceIcon.tsx`, `src/ui/App.tsx`, `src/ui/uiStyles.ts`, `index.html`, `css/all.css`, `src/test/workspace-header.test.tsx` (new)

- [ ] Write a focused header test: tabs retain their action, save status is visible, and file actions remain reachable. Render with existing store test helpers; expect `getByRole("navigation", { name: "Werkruimteweergave" })`, `getByRole("status")`, and `getByRole("button", { name: "Bestand" })`.
- [ ] Run `rtk npm run test:run -- workspace-header` and confirm it fails for the missing status/actions.
- [ ] Add a small SVG icon component with a discriminated `name` prop and `aria-hidden="true"`; use it for common commands rather than emoji.
- [ ] Compose `ApplicationMenu` inside `WorkspaceHeader`, subscribe to `SaveStatusStore` for filename/save state, and pass callbacks from `App`. Remove the separate menu portal and collapse its host height. The first header row must contain document identity, tabs, save state, and New/File/Print/Help.
- [ ] Consolidate `uiStyles` around one primary, secondary, quiet, danger, field, focus, and status vocabulary. Apply a consistent neutral/blue palette and 40–44 px primary controls; leave SVG anchor dimensions unchanged.
- [ ] Set `--menu-height: 0px`, keep the toolbar at 56 px, and verify the canvas starts below exactly two header rows. Run the focused test and `rtk npm run build`; commit the coherent shell change.

## Task 2: Responsive navigation and details

**Files:** `src/ui/workspace/WorkspaceSidebarResizers.tsx`, `src/ui/workspace/WorkspaceChromeController.tsx`, `css/all.css`, `src/ui/App.tsx`, `src/test/workspace-sidebar-resizers.test.tsx` (new), `e2e/smoke.spec.ts`

- [ ] Write a component test that activates the schema tab, opens Navigation and Details at the narrow breakpoint, closes with Escape, and verifies focus returns to each trigger. Use `window.matchMedia` in the test to model widths below 1152 px.
- [ ] Run `rtk npm run test:run -- workspace-sidebar-resizers` and confirm the drawer test fails.
- [ ] Keep desktop resizing as it is. On narrow screens render labelled Navigation and Details triggers; opening one drawer closes the other, sets `aria-expanded`, moves focus into its panel, and exposes a close action. Escape/backdrop closes it and restores focus. On tab change, close transient drawers.
- [ ] Replace the `display: none !important` mobile sidebar rule with off-canvas panel rules. Ensure the active tab's panel can appear above the canvas, and ensure the Dossier remains full width.
- [ ] Use Playwright at 1440, 1024, and 390 px to verify the navigation, central workspace, and inspector are reachable without document-level horizontal overflow. Run the focused test and build; commit.

## Task 3: Contextual toolbar and feedback

**Files:** `src/ui/workspace/WorkspaceCommandBar.tsx`, `src/ui/workspace/WorkspaceIcon.tsx`, `src/ui/workspace/WorkspaceHeader.tsx`, `src/test/workspace-command-bar.test.tsx`

- [ ] Extend existing command-bar tests for the situation tab: undo/redo, background import, page selection, placement selection, and zoom actions remain reachable through visible controls or the labelled `Meer acties` menu.
- [ ] Run `rtk npm run test:run -- workspace-command-bar` and confirm the new test fails.
- [ ] Group primary actions by task, show current view/board or circuit context, and move less common actions into an accessible overflow menu at narrow widths. Preserve every existing callback and disabled condition. Replace emoji with `WorkspaceIcon` while keeping visible Dutch labels or tooltips.
- [ ] Present import success/error as visible status text as well as live announcements. Close overflow on action and Escape, with focus returning to the trigger.
- [ ] Run the focused test and browser smoke for situation commands; commit.

## Task 4: Dossier and schematic surfaces

**Files:** `src/ui/workspace/DossierWorkspace.tsx`, `src/ui/schematic/SchematicViewport.tsx`, `src/test/schematic-viewport.test.tsx`, `src/test/dossier-workspace.test.tsx` (new)

- [ ] Add a component assertion that schematic guidance is behind a Help control, legend is collapsed by default, and the renderer SVG remains present. Add a dossier assertion that the next actionable issue or unfinished circuit appears before the full progress sections.
- [ ] Run both focused tests and confirm the new assertions fail.
- [ ] Refine Dossier hierarchy: compact hero, first next step, scan-friendly circuit cards, consistent issue links, and less dominant metadata. Derive tasks from existing `createDossierSnapshot`/`createCircuitCompletionSummaries`; do not create new persisted state.
- [ ] Make schematic guidance/legend discoverable disclosure controls, keep `#EDS` and all insertion overlays intact, and free vertical canvas space. Keep version/license information accessible in the disclosure or footer.
- [ ] Run focused tests plus browser insertion/removal and dossier-to-schematic flows; commit.

## Task 5: Situation and board surfaces

**Files:** `src/ui/workspace/SituationPlacementPalette.tsx`, `src/ui/boards/BoardLayoutWorkspace.tsx`, `src/test/board-layout-workspace.test.tsx`, `src/test/situation-placement-palette.test.tsx` (new)

- [ ] Add focused assertions for queue count, search/filter, Place action, board setup prompt, and module placement selection. Keep existing command assertions intact.
- [ ] Run focused tests and confirm new expectations fail.
- [ ] Restyle the situation queue using shared status, field, and button treatments. Make empty/complete states action-led and keep placement progress readable.
- [ ] Separate board format settings from the unplaced module queue visually; make the unconfigured board's first action explicit. At narrow widths, let setup/queue collapse so the rail canvas remains reachable. Preserve drag/drop, click-to-place, and validation behavior.
- [ ] Run focused tests and browser placement flows; commit.

## Task 6: Cross-view polish and final verification

**Files:** `src/ui/workspace/ContextInspector.tsx`, `src/ui/workspace/NewDocumentDialog.tsx`, `src/ui/workspace/FileDialog.tsx`, `src/ui/workspace/PrintDialog.tsx`, `src/ui/uiStyles.ts`, `e2e/smoke.spec.ts`

- [ ] Check that inspector tabs, empty states, and key dialogs share headings, field spacing, error styling, button hierarchy, and visible focus. Apply targeted styling only; do not rewrite workflows.
- [ ] Add one Playwright flow at narrow width for drawer access and one cross-view flow covering dossier → schema → situation → board. Check no overlapping chrome and keyboard access to transient UI.
- [ ] Run `rtk npm run test:run`, `rtk npm run typecheck:test`, `rtk npm run build`, `rtk npm run test:e2e`, and `rtk git diff --check`. Inspect screenshots at 1440, 1024, and 390 px; fix concrete clipping or regression findings.
- [ ] Commit the verified polish, then report changed areas, verification results, and any remaining limitations.
