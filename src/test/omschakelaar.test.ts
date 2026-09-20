// @vitest-environment node

import { describe, expect, it } from "vitest";
import { Hierarchical_List, PUBLIC_ELECTRO_ITEM_TYPES } from "../Hierarchical_List";
import { LegacySchemaStore } from "../application/LegacySchemaStore";
import { SchemaCommandError } from "../application/SchemaStore";

function createCircuitStore() {
  const structure = new Hierarchical_List();
  const board = structure.addItem("Bord");
  const store = new LegacySchemaStore(structure);
  const circuitId = store.commands.addItem(board.id, "Kring");
  return { store, circuitId };
}

function expectInvalidChange(action: () => unknown) {
  expect(action).toThrowError(expect.objectContaining({
    name: "SchemaCommandError",
    code: "INVALID_CHANGE",
  } satisfies Partial<SchemaCommandError>));
}

describe("Omschakelaar", () => {
  it("registers a public switch and an internal connector with safe defaults", () => {
    const structure = new Hierarchical_List();

    const item = structure.createItem("Omschakelaar");
    const port = structure.createItem("Omschakelaarpoort");

    expect(item.getType()).toBe("Omschakelaar");
    expect(item.props).toMatchObject({
      aantal_polen: "4",
      amperage: "63",
      parent_port: "IN",
      adres: "",
    });
    expect(port.getType()).toBe("Omschakelaarpoort");
    expect(port.props).toMatchObject({ poort: "OUT1" });
    expect(PUBLIC_ELECTRO_ITEM_TYPES).toContain("Omschakelaar");
    expect(PUBLIC_ELECTRO_ITEM_TYPES).not.toContain("Omschakelaarpoort");
  });

  it.each([
    "Aansluiting",
    "Aftakdoos",
    "Domotica module (verticaal)",
    "Kring",
    "Meerdere verbruikers",
    "Omvormer",
  ])("allows a switch wherever %s allows a split", (type) => {
    const structure = new Hierarchical_List();
    const parent = structure.createItem(type);

    expect(parent.allowedChilds()).toContain("Splitsing");
    expect(parent.allowedChilds()).toContain("Omschakelaar");
  });

  it("creates both physical connector ports in the same undoable revision", () => {
    const { store, circuitId } = createCircuitStore();
    const revisionBefore = store.getSnapshot().revision;

    const switchId = store.commands.addItem(circuitId, "Omschakelaar");

    const connectors = store.getSnapshot().document.getChildren(switchId);
    expect(connectors.map(connector => connector.type)).toEqual([
      "Omschakelaarpoort",
      "Omschakelaarpoort",
    ]);
    expect(connectors.map(connector => (
      store.getLegacyDocument().getElectroItemById(connector.id)?.props.poort
    ))).toEqual(["OUT1", "OUT2"]);
    expect(store.getSnapshot().revision).toBe(revisionBefore + 1);

    store.commands.undo();
    expect(store.getSnapshot().document.getItem(switchId)).toBeUndefined();
    expect(store.getSnapshot().document.getChildren(circuitId)).toEqual([]);
  });

  it("keeps connector rows named and protects their structure", () => {
    const { store, circuitId } = createCircuitStore();
    const switchId = store.commands.addItem(circuitId, "Omschakelaar");
    const connectors = store.getSnapshot().document.getChildren(switchId);
    const firstPort = connectors[0];

    expect(connectors.map(connector => connector.label)).toEqual(["OUT1", "OUT2"]);
    expect(firstPort.capabilities).toMatchObject({
      canAddChild: true,
      canInsertBefore: false,
      canDelete: false,
      canDuplicate: false,
      canMove: false,
      allowedChildTypes: ["Kring"],
      allowedItemTypes: [],
    });

    expectInvalidChange(() => store.commands.addItem(switchId, "Omschakelaarpoort"));
    expectInvalidChange(() => store.commands.deleteItem(firstPort.id));
    expectInvalidChange(() => store.commands.moveItem(firstPort.id, { targetParentId: circuitId }));
    expectInvalidChange(() => store.commands.duplicateItem(firstPort.id));
    expectInvalidChange(() => store.commands.changeItemType(firstPort.id, "Kring"));
  });
});
