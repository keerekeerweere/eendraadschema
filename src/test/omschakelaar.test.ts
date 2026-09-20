// @vitest-environment node

import { describe, expect, it } from "vitest";
import { Hierarchical_List, PUBLIC_ELECTRO_ITEM_TYPES } from "../Hierarchical_List";

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
});
