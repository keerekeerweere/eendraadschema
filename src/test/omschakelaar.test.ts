// @vitest-environment node

import { describe, expect, it } from "vitest";
import { Hierarchical_List, PUBLIC_ELECTRO_ITEM_TYPES } from "../Hierarchical_List";
import { LegacySchemaStore } from "../application/LegacySchemaStore";
import { SchemaCommandError } from "../application/SchemaStore";
import { LegacySchemaDocumentReader } from "../application/LegacySchemaDocumentReader";
import { validateSchemaDocument } from "../application/SchemaValidation";
import { structureFromJson } from "../legacy/persistence/EdsCodec";

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

  it("exposes and updates the approved switch properties", () => {
    const { store, circuitId } = createCircuitStore();
    const switchId = store.commands.addItem(circuitId, "Omschakelaar");

    expect(store.getSnapshot().properties.getConfiguredItem(switchId)).toMatchObject({
      type: "Omschakelaar",
      values: {
        poleCount: "4",
        amperage: "63",
        parentPort: "IN",
        address: "",
      },
    });

    store.commands.updateConfiguredItem(switchId, {
      poleCount: "2",
      amperage: "100",
      parentPort: "OUT1",
      address: "Bypass",
    });

    expect(store.getSnapshot().properties.getConfiguredItem(switchId)?.values).toMatchObject({
      poleCount: "2",
      amperage: "100",
      parentPort: "OUT1",
      address: "Bypass",
    });
    expect(store.getSnapshot().document.getChildren(switchId).map(port => port.label)).toEqual([
      "IN",
      "OUT2",
    ]);
  });

  it("rejects changing the parent-side port after a connector is wired", () => {
    const { store, circuitId } = createCircuitStore();
    const switchId = store.commands.addItem(circuitId, "Omschakelaar");
    const firstPortId = store.getSnapshot().document.getChildren(switchId)[0].id;
    store.commands.addItem(firstPortId, "Kring");
    const revisionBefore = store.getSnapshot().revision;

    expectInvalidChange(() => store.commands.updateConfiguredItem(switchId, {
      parentPort: "OUT1",
    }));
    expect(store.getSnapshot().revision).toBe(revisionBefore);
    expect(store.getSnapshot().properties.getConfiguredItem(switchId)?.values.parentPort).toBe("IN");
    expect(store.getSnapshot().document.getChildren(switchId).map(port => port.label)).toEqual([
      "OUT1",
      "OUT2",
    ]);
  });

  it.each([
    ["poleCount", "3"],
    ["amperage", "50"],
    ["parentPort", "GRID"],
  ])("rejects unsupported %s values", (key, value) => {
    const { store, circuitId } = createCircuitStore();
    const switchId = store.commands.addItem(circuitId, "Omschakelaar");

    expectInvalidChange(() => store.commands.updateConfiguredItem(switchId, { [key]: value }));
  });

  it("reports malformed connector topology without crashing", () => {
    const { store, circuitId } = createCircuitStore();
    const switchId = store.commands.addItem(circuitId, "Omschakelaar");
    const structure = store.getLegacyDocument();
    const [firstPort, secondPort] = store.getSnapshot().document.getChildren(switchId);

    structure.getElectroItemById(secondPort.id)!.props.poort = "OUT1";
    const invalidChild = structure.createItem("Contactdoos");
    structure.insertChildAfterId(invalidChild, firstPort.id);

    const issues = validateSchemaDocument(new LegacySchemaDocumentReader(structure));
    expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "OMSCHAKELAAR_DUPLICATE_PORT",
      "OMSCHAKELAAR_INVALID_PORT_CHILD",
    ]));
  });

  it("reports a missing connector and a parent-port conflict", () => {
    const { store, circuitId } = createCircuitStore();
    const switchId = store.commands.addItem(circuitId, "Omschakelaar");
    const structure = store.getLegacyDocument();
    const [firstPort, secondPort] = store.getSnapshot().document.getChildren(switchId);

    structure.deleteById(secondPort.id);
    structure.getElectroItemById(switchId)!.props.parent_port = "OUT1";
    structure.getElectroItemById(firstPort.id)!.props.poort = "OUT1";

    const issues = validateSchemaDocument(new LegacySchemaDocumentReader(structure));
    expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "OMSCHAKELAAR_PORT_COUNT",
      "OMSCHAKELAAR_PARENT_PORT_CONFLICT",
    ]));
  });

  it("round trips switch properties, port identities, wiring, and stable IDs", () => {
    const { store, circuitId } = createCircuitStore();
    const switchId = store.commands.addItem(circuitId, "Omschakelaar");
    store.commands.updateConfiguredItem(switchId, {
      poleCount: "2",
      amperage: "80",
      address: "Victron bypass",
    });
    const portIds = store.getSnapshot().document.getChildren(switchId).map(port => port.id);
    const branchId = store.commands.addItem(portIds[1], "Kring");

    const restored = structureFromJson(store.getLegacyDocument().toJsonObject(false), null, 6);
    const restoredStore = new LegacySchemaStore(restored);

    expect(restoredStore.getSnapshot().properties.getConfiguredItem(switchId)?.values).toMatchObject({
      poleCount: "2",
      amperage: "80",
      parentPort: "IN",
      address: "Victron bypass",
    });
    expect(restoredStore.getSnapshot().document.getChildren(switchId).map(port => port.id)).toEqual(portIds);
    expect(restoredStore.getSnapshot().document.getItem(branchId)?.parentId).toBe(portIds[1]);
  });
});
