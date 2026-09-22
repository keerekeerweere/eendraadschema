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

function renderTransferSwitchControls() {
  const structure = new Hierarchical_List();
  const board = structure.addItem("Bord");
  const store = new LegacySchemaStore(structure);
  const circuitId = store.commands.addItem(board.id, "Kring");
  const switchId = store.commands.addItem(circuitId, "Omschakelaar");
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

  return { store, circuitId, switchId };
}

describe("SchematicInsertControls", () => {
  it("previews an insertion without changing the document or undo history", () => {
    const { store, circuitId } = renderControls();
    const before = store.getSnapshot();
    const serialized = store.getLegacyDocument().toJsonObject(false);
    const preview = store.previewInsertion({ kind: "child", parentId: circuitId, type: "Omvormer", position: 0 });
    expect(preview.svg).toContain(`data-schema-item-id="${preview.itemId}"`);
    expect(store.getSnapshot()).toBe(before);
    expect(store.getLegacyDocument().toJsonObject(false)).toBe(serialized);
    expect(store.getSnapshot().document.getItem(preview.itemId)).toBeUndefined();
  });
  it("lets the user explicitly choose a parallel circuit or insertion in the connection", () => {
    const { store, circuitId } = renderControls();
    const parentId = store.getSnapshot().document.getItem(circuitId)!.parentId;
    fireEvent.click(screen.getByRole("button", { name: /Onderdeel vóór Kring.*invoegen/ }));
    const dialog = screen.getByRole("dialog", { name: "Onderdeel toevoegen" });
    expect(within(dialog).getByRole("combobox")).toHaveValue("parallel");
    fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "before" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Kring" }));
    const inserted = store.getSnapshot().document.getChildren(parentId)[0];
    expect(store.getSnapshot().document.getItem(circuitId)?.parentId).toBe(inserted.id);
  });

  it("keeps plus controls at a shared junction separately clickable", () => {
    renderControls();
    const positions = screen.getAllByRole("button", { name: /^Onderdeel .* (toevoegen|invoegen)$/ })
      .map(button => parseFloat((button as HTMLElement).style.left))
      .sort((a, b) => a - b);

    expect(positions.length).toBeGreaterThan(2);
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index] - positions[index - 1]).toBeGreaterThanOrEqual(28);
    }
  });

  it("adds a board at the chosen start of a circuit and opens that board", () => {
    const { store, editorStore, circuitId, socketId } = renderControls();

    fireEvent.click(screen.getByRole("button", { name: /Onderdeel aan het begin van Kring.*toevoegen/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Bord" }));

    const [boardRoot] = store.getSnapshot().document.getChildren(circuitId);
    expect(boardRoot.type).toBe("Bord");
    expect(store.getSnapshot().document.getChildren(circuitId)[1]?.id).toBe(socketId);
    expect(editorStore.getSnapshot().activeBoardId).toBe(store.getSnapshot().document.getBoardForItem(boardRoot.id)?.id);
    expect(editorStore.getSnapshot().selectedItemId).toBe(boardRoot.id);
  });

  it("adds an item at the end of a drawn branch", () => {
    const { store, editorStore, socketId } = renderControls();

    fireEvent.click(screen.getByRole("button", { name: /na Contactdoos 1 toevoegen/ }));
    const dialog = screen.getByRole("dialog", { name: "Onderdeel toevoegen" });
    const lightButton = within(dialog).getByRole("button", { name: "Lichtpunt" });
    expect(lightButton.querySelector("svg use")?.getAttribute("href")).toBe("#lamp");
    fireEvent.click(lightButton);

    const child = store.getSnapshot().document.getChildren(socketId)[0];
    expect(child.type).toBe("Lichtpunt");
    expect(editorStore.getSnapshot().selectedItemId).toBe(child.id);
  });

  it("inserts an item between two items in the drawn branch", () => {
    const { store, editorStore, circuitId, socketId } = renderControls();

    fireEvent.click(screen.getByRole("button", { name: /vóór Contactdoos 1 invoegen/ }));
    const dialog = screen.getByRole("dialog", { name: "Onderdeel toevoegen" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lichtpunt" }));

    const inserted = store.getSnapshot().document.getChildren(circuitId)[0];
    expect(inserted.type).toBe("Lichtpunt");
    expect(store.getSnapshot().document.getItem(socketId)?.parentId).toBe(inserted.id);
    expect(editorStore.getSnapshot().selectedItemId).toBe(inserted.id);
  });

  it("adds circuits to the selected physical transfer-switch output", () => {
    const { store, switchId } = renderTransferSwitchControls();
    const ports = store.getSnapshot().document.getChildren(switchId);
    const out1 = ports.find(port => port.label === "OUT1")!;
    const out2 = ports.find(port => port.label === "OUT2")!;

    fireEvent.click(screen.getByRole("button", { name: "Onderdeel na OUT1 toevoegen" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kring" }));
    fireEvent.click(screen.getByRole("button", { name: "Onderdeel na OUT2 toevoegen" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kring" }));

    expect(store.getSnapshot().document.getChildren(out1.id)[0]?.type).toBe("Kring");
    expect(store.getSnapshot().document.getChildren(out2.id)[0]?.type).toBe("Kring");
  });

  it("inserts a connection between a circuit and its changeover switch", () => {
    const { store, circuitId, switchId } = renderTransferSwitchControls();
    expect(store.getSnapshot().document.getItem(switchId)?.capabilities.allowedInsertBeforeTypes).toContain("Aansluiting");
    expect(document.querySelector(`[data-schema-item-id="${switchId}"]`)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Onderdeel vóór Omschakelaar.*invoegen/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Aansluiting" }));

    const connection = store.getSnapshot().document.getChildren(circuitId)[0];
    expect(connection.type).toBe("Aansluiting");
    expect(store.getSnapshot().document.getItem(switchId)?.parentId).toBe(connection.id);
  });

  it("filters available item icons by name", () => {
    renderControls();

    fireEvent.click(screen.getByRole("button", { name: /na Contactdoos 1 toevoegen/ }));
    const dialog = screen.getByRole("dialog", { name: "Onderdeel toevoegen" });
    fireEvent.change(within(dialog).getByRole("searchbox", { name: "Zoek onderdeel" }), {
      target: { value: "licht" },
    });

    expect(within(dialog).getByRole("button", { name: "Lichtpunt" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Contactdoos" })).not.toBeInTheDocument();
  });

  it("reveals an on-item minus only while Ctrl is held and deletes a leaf", () => {
    const { store, editorStore, circuitId, socketId } = renderControls();
    editorStore.commands.selectItem(socketId);

    expect(screen.queryByRole("button", { name: "Contactdoos 1 verwijderen" })).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Control", ctrlKey: true });

    expect(screen.getByRole("button", { name: "Contactdoos 1 verwijderen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kring.*verwijderen/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bord.*verwijderen/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Contactdoos 1 verwijderen" }));
    expect(store.getSnapshot().document.getItem(socketId)).toBeUndefined();
    expect(store.getSnapshot().document.getItem(circuitId)).toBeDefined();
    expect(editorStore.getSnapshot().selectedItemId).toBeNull();

    store.commands.undo();
    expect(store.getSnapshot().document.getItem(socketId)).toBeDefined();
    fireEvent.keyUp(window, { key: "Control", ctrlKey: false });
    expect(screen.queryByRole("button", { name: "Contactdoos 1 verwijderen" })).not.toBeInTheDocument();
  });
});
