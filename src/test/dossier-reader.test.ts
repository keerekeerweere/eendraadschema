import { describe, expect, it, beforeEach } from "vitest";
import { createDossierSnapshot } from "../application/DossierReader";
import { LegacySchemaStore } from "../application/LegacySchemaStore";
import { LegacySituationPlanStore } from "../application/LegacySituationPlanStore";
import { loadFixture } from "./helpers";

beforeEach(() => {
  globalThis.SITPLANVIEW_DEFAULT_SCALE = 1;
});

describe("dossier read model", () => {
  it("reports missing situation-plan links for field items but not graph structure", () => {
    const structure = loadFixture("example001.eds");
    globalThis.structure = structure;
    const schema = new LegacySchemaStore(structure);
    const situation = new LegacySituationPlanStore(structure);

    const dossier = createDossierSnapshot(schema.getSnapshot(), situation.getSnapshot());
    const circuit = schema.getSnapshot().document.getAllItems().find(item => item.type === "Kring")!;

    expect(dossier.items.find(item => item.itemId === circuit.id)).toMatchObject({
      presentation: "structural",
      circuitId: circuit.id,
    });
    expect(dossier.issues.some(issue => issue.code === "MISSING_SITUATION_PLACEMENT")).toBe(true);
  });

  it("does not need a second persisted link when an occurrence is present", () => {
    const structure = loadFixture("example001.eds");
    globalThis.structure = structure;
    const schema = new LegacySchemaStore(structure);
    const situation = new LegacySituationPlanStore(structure);
    const fieldItem = schema.getSnapshot().document.getAllItems().find(item => (
      item.role === "item" && item.type === "Contactdoos"
    ))!;
    const defaults = structure.sitplan.getDefaults();
    structure.sitplan.addElementFromElectroItem(fieldItem.id, 1, 10, 10, "auto", "", "rechts", defaults.fontsize, defaults.scale, defaults.rotate);
    situation.synchronizeLegacyDocument();

    const dossier = createDossierSnapshot(schema.getSnapshot(), situation.getSnapshot());
    expect(dossier.items.find(item => item.itemId === fieldItem.id)?.situationOccurrenceIds).toHaveLength(1);
    expect(dossier.issues.some(issue => issue.itemId === fieldItem.id && issue.code === "MISSING_SITUATION_PLACEMENT")).toBe(false);
  });
});
