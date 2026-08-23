import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LocalEditorStore } from "../application/EditorStore";
import { LegacySchemaStore } from "../application/LegacySchemaStore";
import { Hierarchical_List } from "../Hierarchical_List";
import { SchematicInsertControls } from "../ui/schematic/SchematicInsertControls";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

function renderControls() {
  const structure = new Hierarchical_List();
  const board = structure.addItem("Bord");
  const store = new LegacySchemaStore(structure);
  const circuitId = store.commands.addItem(board.id, "Kring");
  const socketId = store.commands.addItem(circuitId, "Contactdoos");
  const editorStore = new LocalEditorStore();
  const previewElement = document.createElement("div");
  previewElement.innerHTML = store.getLegacyDocument().toSVG(0, "horizontal").data;
  const overlayElement = document.createElement("div");
  document.body.append(previewElement, overlayElement);

  render(
    <SchematicInsertControls
      schemaStore={store}
      editorStore={editorStore}
      previewElement={previewElement}
      overlayElement={overlayElement}
    />,
    { container: overlayElement },
  );

  return { store, editorStore, circuitId, socketId };
}

describe("SchematicInsertControls", () => {
  it("adds an item at the end of a drawn branch", () => {
    const { store, editorStore, socketId } = renderControls();

    fireEvent.click(screen.getByRole("button", { name: /na Contactdoos 1 toevoegen/ }));
    const dialog = screen.getByRole("dialog", { name: "Onderdeel toevoegen" });
    fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "Lichtpunt" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Toevoegen" }));

    const child = store.getSnapshot().document.getChildren(socketId)[0];
    expect(child.type).toBe("Lichtpunt");
    expect(editorStore.getSnapshot().selectedItemId).toBe(child.id);
  });

  it("inserts an item between two items in the drawn branch", () => {
    const { store, editorStore, circuitId, socketId } = renderControls();

    fireEvent.click(screen.getByRole("button", { name: /vóór Contactdoos 1 invoegen/ }));
    const dialog = screen.getByRole("dialog", { name: "Onderdeel toevoegen" });
    fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "Lichtpunt" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Toevoegen" }));

    const inserted = store.getSnapshot().document.getChildren(circuitId)[0];
    expect(inserted.type).toBe("Lichtpunt");
    expect(store.getSnapshot().document.getItem(socketId)?.parentId).toBe(inserted.id);
    expect(editorStore.getSnapshot().selectedItemId).toBe(inserted.id);
  });
});
