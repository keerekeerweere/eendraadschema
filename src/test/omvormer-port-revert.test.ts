import { describe, expect, it } from "vitest";
import { Hierarchical_List } from "../Hierarchical_List";

describe("retiring temporary inverter terminal wrappers", () => {
  it("keeps connected items in the inverter chain and removes the wrappers", () => {
    const structure = new Hierarchical_List();
    const board = structure.addItem("Bord");
    const circuit = structure.createItem("Kring");
    structure.insertChildAfterId(circuit, board.id);
    const inverter = structure.createItem("Omvormer");
    structure.insertChildAfterId(inverter, circuit.id);
    const firstPort = structure.createItem("Omvormerpoort");
    firstPort.props.type = "Omvormerpoort";
    firstPort.props.portId = "ac-out";
    structure.insertChildAfterId(firstPort, inverter.id);
    const switchItem = structure.createItem("Omschakelaar");
    structure.insertChildAfterId(switchItem, firstPort.id);

    structure.voegAttributenToeAlsNodigEnReSort();

    expect(structure.getElectroItemById(switchItem.id)?.parent).toBe(inverter.id);
    expect(structure.data.some((item, index) => structure.active[index] && item.props.type === "Omvormerpoort")).toBe(false);
    expect(inverter.props.aansluitingen).toBeUndefined();
  });
});
