import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Hierarchical_List } from "../Hierarchical_List";
import { undoRedo } from "../undoRedo";

describe("undo and redo", () => {
  beforeEach(() => {
    const structure = new Hierarchical_List();
    structure.properties.currentView = "test";
    Object.assign(globalThis, {
      structure,
      toggleAppView: () => undefined,
    });
  });

  afterEach(() => {
    delete (globalThis as { structure?: unknown }).structure;
    delete (globalThis as { toggleAppView?: unknown }).toggleAppView;
  });

  it("restores additions and deletions through serialized history", () => {
    const history = new undoRedo(10);
    globalThis.structure.addItem("Bord");
    history.store();

    const circuit = globalThis.structure.addItem("Kring");
    history.store();
    expect(globalThis.structure.getElectroItemById(circuit.id)?.props.type).toBe("Kring");

    history.undo();
    expect(globalThis.structure.getElectroItemById(circuit.id)).toBeNull();
    expect(history.redoStackSize()).toBe(1);

    history.redo();
    expect(globalThis.structure.getElectroItemById(circuit.id)?.props.type).toBe("Kring");
    expect(history.undoStackSize()).toBe(1);
  });
});
