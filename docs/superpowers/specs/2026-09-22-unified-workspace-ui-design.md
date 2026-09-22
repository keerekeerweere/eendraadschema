# Unified workspace UI redesign

Date: 22 September 2026
Status: Approved design direction; written specification awaiting review

## Goal and scope

Make the full workspace welcoming and clear for a homeowner who is completing an electrical dossier one circuit at a time. Improve the shared shell and all four tabs: Dossier, Eéndraadschema, Situatieschema, and Bordindeling. Keep the four views linked to the same electrical installation and preserve existing editing, undo, save, EDS, SVG, PDF, and print behavior.

This is a UI and interaction redesign. It does not change electrical rules, the persisted document, or the legacy drawing engines.

## Current problems observed

- Three stacked bars take about 158 px before the workspace begins. File actions, edit actions, and status are spread across them.
- Controls use inconsistent button shapes, sizes, icons, colors, and wording. Some toolbar icons are emoji.
- The Eéndraadschema canvas starts with a long instruction paragraph. It competes with the drawing and the insertion controls.
- At widths below 1152 px, CSS hides both side panels without an alternate way to open them.
- The Dossier overview, situation placement queue, and board setup each use different visual patterns for related tasks and status.
- The prominent next action changes by tab, but the shared chrome does not make that clear.

## Chosen direction

A unified workbench with a welcoming and clear visual tone. This preserves the four familiar views while giving the active canvas or task the most space. It follows the existing product model: one electrical installation, stable item identity across views, and circuit-level progress.

### Shared shell

1. Replace the current three-level header/menu/command stack with a compact two-level shell. The first level shows the document identity, four workspace tabs, save state, and access to New, File, Print, and Help. The second level shows the active view's title or current board/circuit context and the actions relevant to that view. Undo and redo remain easy to find.
2. Show one clear primary action per view. In Eéndraadschema, the existing on-line plus controls are the primary insertion action; do not add a competing global insertion button. Put less common toolbar actions in a labelled overflow menu instead of shrinking them into ambiguous icons. Every icon-only action has an accessible name and tooltip; critical actions keep a visible label.
3. Use a consistent visual system: neutral canvas and panels, one blue action color, green for complete states, amber for work needing attention, consistent type scale, spacing, border radius, fields, and focus treatment. Replace emoji toolbar symbols with a coherent icon set. Do not use color alone to convey status.
4. On wide screens, keep resizable navigation on the left, the main workspace in the center, and contextual details on the right. Maintain the existing collapse controls and keyboard resizing.
5. Below 1152 px, visible Navigation and Details buttons open the corresponding panels as dismissible drawers. The main work area uses the available width. On narrow screens, tabs can scroll horizontally and secondary toolbar actions move into overflow. A panel must never simply disappear because of the viewport width.
6. The Dossier view uses the full content width, since its overview already contains the necessary navigation and editing surfaces.

### Dossier

- Put the next unfinished circuit or actionable issue near the top. Keep the main action, Kring toevoegen, clearly visible.
- Show progress by circuit, with plain-language counts for situation and board placement. Each issue has a direct action that opens the relevant item or view.
- Keep dossier metadata editable in a section that does not dominate the overview. Empty and complete states explain what to do next.

### Eéndraadschema

- Give the SVG drawing priority in the central area. Move the long instruction paragraph into a discoverable Help control and keep the legend available without occupying the drawing by default.
- Preserve the on-line icon picker opened by plus controls and the Ctrl-held minus overlay on eligible simple items. The drawing symbols and wire routing are outside this redesign.
- Keep current board and selected item visible, with the selected item's properties, links, and checks in the contextual inspector. Offer a labelled route to find the same item in another view.
- Keep zoom and save feedback visible without overlaying the schematic.

### Situatieschema

- Present Nog te plaatsen as a focused queue with search and circuit filtering. Show placement progress and use the same status language as Dossier.
- Group background import, symbol creation, page controls, selection tools, and zoom by purpose. Prioritize Achtergrond toevoegen and Plaats when the plan is empty.
- Keep placement properties in the inspector. Selection feedback and multi-selection actions remain clear and undoable.

### Bordindeling

- Separate board format settings from the list of modules waiting to be placed. Keep the rail layout central and visually distinct from the controls.
- Make an unconfigured board's first step explicit: set board size, apply it, then place modules. After configuration, show the available positions and placement queue without a large instructional block.
- Keep current board and selected module context visible. Preserve manual rail placement and validation rules.

### Feedback, dialogs, and accessibility

- Use consistent button hierarchy, dialog layout, empty states, loading states, and inline errors. Errors say what failed and what the user can do next. A failed action must leave the current document state intact.
- Preserve keyboard shortcuts and add keyboard access to any new drawer or overflow menu. Opening a drawer moves focus into it; closing returns focus to the trigger. Escape closes transient UI.
- Provide a visible focus indicator and a sufficiently large target for primary toolbar and panel actions. Where the drawing requires smaller anchor controls, an equivalent labelled action remains available.
- Keep user-facing copy in Belgian Dutch.

## Architecture and data flow

The shared shell is owned by React components in `src/ui/workspace/`; fixed host geometry and responsive behavior remain in `index.html` and `css/all.css`. Reusable styles or small controls live in the React UI layer. Each tab renders from the existing `SchemaStore`, `SituationPlanStore`, `EditorStore`, and `WorkspaceStore` snapshots. Actions continue through validated commands and existing adapters. Drawer open state and toolbar overflow state are transient UI state and are never saved to EDS.

`WorkspaceChromeController` continues to decide which legacy-backed canvas host is visible. The redesign may adjust its host classes and geometry, but it must not move electrical state into the components or change the authoritative renderers. The board workspace keeps its own format, queue, and rail components; the dossier keeps its existing derived progress readers.

## Delivery sequence

1. Shared visual tokens, header, view toolbar, and responsive panel access.
2. Dossier and Eéndraadschema presentation and guidance.
3. Situatieschema and Bordindeling task presentation.
4. Dialog and feedback consistency, followed by browser verification and polish.

Each step must leave all four tabs functional. Keep changes in the React and layout layers unless a narrow adapter fix is required to preserve existing behavior.

## Acceptance criteria

- At desktop and 1024 px widths, users can reach the navigation, main workspace, and details for every editing tab; the canvas is not blocked by a hidden or permanent panel.
- At narrow widths, users can reach the four tabs and all primary actions without horizontal page overflow. Drawers and overflow menus can be opened, used, and dismissed by pointer and keyboard.
- In each tab, the current view, current board or circuit when applicable, save state, and primary next action are understandable without reading long instructions.
- Adding a circuit, inserting and removing an eligible schematic item, placing a situation symbol, configuring a board, switching to a linked view, undoing, saving, and exporting still work.
- Focus remains visible; controls have accessible names; status is understandable without relying on color.
- EDS round trips, SVG/PDF output, and print behavior are unchanged.

## Verification

Run focused component tests for shell state and responsive panel interactions. Run the repository's unit tests, test typecheck, production build, and diff check. Use Playwright to exercise the core flows at 1440 px, 1024 px, and a narrow viewport, including keyboard navigation. Inspect screenshots of all four tabs for clipping, overlap, and visual consistency. Stop optional testing once these risks are resolved.
