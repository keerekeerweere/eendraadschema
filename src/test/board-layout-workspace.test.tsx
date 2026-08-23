import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalEditorStore } from "../application/EditorStore";
import { LegacySchemaStore } from "../application/LegacySchemaStore";
import { BoardLayoutInspector } from "../ui/boards/BoardLayoutInspector";
import { BoardLayoutWorkspace } from "../ui/boards/BoardLayoutWorkspace";
import { loadFixture } from "./helpers";

beforeEach(() => {
  globalThis.SITPLANVIEW_DEFAULT_SCALE = 1;
});

afterEach(() => {
  cleanup();
  delete (globalThis as { structure?: unknown }).structure;
});

function createState() {
  const structure = loadFixture("example001.eds");
  globalThis.structure = structure;
  return {
    editorStore: new LocalEditorStore(),
    schemaStore: new LegacySchemaStore(structure),
  };
}

describe("BoardLayoutWorkspace", () => {
  it("creates rails and manually places an electrical item", () => {
    const { editorStore, schemaStore } = createState();
    render(<BoardLayoutWorkspace schemaStore={schemaStore} editorStore={editorStore} />);

    fireEvent.click(screen.getByRole("button", { name: "Bordrij toevoegen" }));
    const itemSelect = screen.getByLabelText("Ongeplaatst onderdeel") as HTMLSelectElement;
    expect(itemSelect.options.length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Startmodule"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Breedte"), { target: { value: "2" } });
    const placedItemId = Number(itemSelect.value);
    fireEvent.click(screen.getByRole("button", { name: "Plaatsen" }));

    expect(schemaStore.getSnapshot().boardLayouts[0]).toMatchObject({
      boardId: "main",
      rails: [{ name: "Rij 1", moduleCapacity: 18 }],
      placements: [{
        itemId: placedItemId,
        startModule: 1,
        moduleWidth: 2,
      }],
    });
  });

  it("edits a selected module through the contextual inspector", () => {
    const { editorStore, schemaStore } = createState();
    const item = schemaStore.getSnapshot().document.getAllItems()
      .find(candidate => candidate.role === "item"
        && schemaStore.getSnapshot().document.getBoardForItem(candidate.id)?.id === "main");
    if (!item) throw new Error("Fixture bevat geen onderdeel voor het hoofdbord.");
    const railId = schemaStore.commands.addBoardLayoutRail("main");
    schemaStore.commands.placeBoardLayoutItem("main", item.id, {
      railId,
      startModule: 0,
      moduleWidth: 1,
    });
    editorStore.commands.selectItem(item.id);
    render(<BoardLayoutInspector schemaStore={schemaStore} editorStore={editorStore} />);

    fireEvent.change(screen.getByLabelText("Startmodule"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Breedte in modules"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Positie toepassen" }));

    expect(schemaStore.getSnapshot().boardLayouts[0].placements[0]).toMatchObject({
      itemId: item.id,
      startModule: 2,
      moduleWidth: 2,
    });
  });
});
