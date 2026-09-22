import { Electro_Item } from "./Electro_Item";
import {
  isOmschakelaarPort,
  OMSCHAKELAAR_POLES,
  OMSCHAKELAAR_SLOT_ORDER,
  OMSCHAKELAAR_RATINGS,
} from "../application/Omschakelaar";
import type { OmschakelaarPort } from "../application/Omschakelaar";
import { htmlspecialchars, svgTextWidth } from "../general";
import { SVGelement } from "../SVGelement";

/**
 * The three ports always sit in the same slots, whatever the wiring:
 * left/top = OUT1, middle = IN, right/bottom = OUT2. Every slot has its own
 * connector item and always draws its own branch (so an extra item can be
 * added above any slot). `parent_port` only chooses which slot the incoming
 * wire (the switch's tree parent) additionally attaches to.
 */
const SLOT_ORDER: readonly OmschakelaarPort[] = OMSCHAKELAAR_SLOT_ORDER;
// Route each port on a separate lane beyond the fixed-size switch contacts.
const VERTICAL_ROUTE_LEVEL: Readonly<Record<OmschakelaarPort, number>> = { OUT1: 8, IN: 22, OUT2: 36 };
const HORIZONTAL_ROUTE_LANE_X: Readonly<Record<OmschakelaarPort, number>> = { OUT1: 124, IN: 108, OUT2: 92 };

interface Slot {
  readonly port: OmschakelaarPort;
  readonly isParent: boolean;
  readonly connector: { readonly id: number } | undefined;
  readonly svg: SVGelement;
}

interface Point { x: number; y: number }

interface Layout {
  readonly orientation: "horizontal" | "vertical";
  readonly parentPort: OmschakelaarPort;
  readonly contacts: Record<OmschakelaarPort, Point>;
  readonly ends: Record<OmschakelaarPort, Point>;
  readonly parentConductor: { from: Point; to: Point };
  readonly arm: { from: Point; to: Point };
  readonly portLabels: Record<OmschakelaarPort, Point & { anchor: "start" | "middle" }>;
  readonly rating: Point;
  readonly address: Point;
  readonly metadataAnchor: "start" | "middle";
  readonly incomingY: number;
}

export class Omschakelaar extends Electro_Item {
  resetProps(): void {
    this.clearProps();
    this.props.type = "Omschakelaar";
    this.props.aantal_polen = "4";
    this.props.amperage = "63";
    this.props.parent_port = "IN";
    this.props.adres = "";
  }

  allowedChilds(): Array<string> {
    return ["Omschakelaarpoort"];
  }

  getMaxNumChilds(): number {
    return 3;
  }

  overrideKeys(): void {
    if (!OMSCHAKELAAR_POLES.includes(this.props.aantal_polen)) this.props.aantal_polen = "4";
    if (!OMSCHAKELAAR_RATINGS.includes(this.props.amperage)) this.props.amperage = "63";
    if (!isOmschakelaarPort(this.props.parent_port)) this.props.parent_port = "IN";
    if (typeof this.props.adres !== "string") this.props.adres = "";
  }

  toSVG(): SVGelement {
    const parentPort: OmschakelaarPort = isOmschakelaarPort(this.props.parent_port) ? this.props.parent_port : "IN";
    const slots = this.getSlots(parentPort);
    const poles = OMSCHAKELAAR_POLES.includes(this.props.aantal_polen) ? this.props.aantal_polen : "4";
    const rating = OMSCHAKELAAR_RATINGS.includes(this.props.amperage) ? this.props.amperage : "63";
    const address = typeof this.props.adres === "string" ? this.props.adres.trim() : "";
    const ratingLabel = `${rating}A ${poles}P`;
    const orientation = this.getParent()?.getType() === "Kring" ? "vertical" : "horizontal";

    return orientation === "vertical"
      ? this.renderVertical(parentPort, slots, ratingLabel, address)
      : this.renderHorizontal(parentPort, slots, ratingLabel, address);
  }

  private getSlots(parentPort: OmschakelaarPort): Slot[] {
    return SLOT_ORDER.map(port => {
      const connector = this.sourcelist.data.find((candidate, index) =>
        this.sourcelist.active[index]
        && candidate.parent === this.id
        && candidate.props.type === "Omschakelaarpoort"
        && candidate.props.poort === port,
      );
      return {
        port,
        isParent: port === parentPort,
        connector,
        svg: connector === undefined ? new SVGelement() : this.sourcelist.toSVG(connector.id, "horizontal"),
      };
    });
  }

  private renderHorizontal(
    parentPort: OmschakelaarPort,
    slots: Slot[],
    ratingLabel: string,
    address: string,
  ): SVGelement {
    const [top, middle, bottom] = slots;
    const contactX = 58;
    const commonX = 26;
    const upperY = Math.max(22, top.svg.yup);
    const centerY = upperY + Math.max(19, top.svg.ydown + middle.svg.yup + 14);
    const lowerY = centerY + Math.max(19, middle.svg.ydown + bottom.svg.yup + 14);
    const contactY: Record<OmschakelaarPort, number> = { OUT1: 22, IN: 41, OUT2: 60 };
    // Leave a routing bay to the right of the fixed contacts before branch content begins.
    const endpointX = contactX + 80 + Math.max(...slots.map(slot => slot.svg.xleft));
    const labelBottom = contactY.OUT2 + (address === "" ? 24 : 38);
    const branchBottom = Math.max(
      upperY + top.svg.ydown,
      centerY + middle.svg.ydown,
      lowerY + bottom.svg.ydown,
    );
    const width = Math.max(
      ...slots.map(slot => endpointX + slot.svg.xright),
      88 + svgTextWidth(htmlspecialchars(address), 10, ""),
    );
    const parentY = contactY[parentPort];
    const contact = (port: OmschakelaarPort): Point => ({ x: port === "IN" ? commonX : contactX, y: contactY[port] });
    const layout: Layout = {
      orientation: "horizontal",
      parentPort,
      contacts: { OUT1: contact("OUT1"), IN: contact("IN"), OUT2: contact("OUT2") },
      ends: {
        OUT1: { x: endpointX, y: upperY },
        IN: { x: endpointX, y: centerY },
        OUT2: { x: endpointX, y: lowerY },
      },
      parentConductor: { from: { x: 1, y: parentY }, to: contact(parentPort) },
      arm: { from: { x: commonX, y: contactY.IN }, to: { x: commonX + 20, y: contactY.IN } },
      portLabels: {
        OUT1: { x: contactX + 7, y: contactY.OUT1 - 5, anchor: "start" },
        IN: { x: 5, y: contactY.IN - 7, anchor: "start" },
        OUT2: { x: contactX + 7, y: contactY.OUT2 - 5, anchor: "start" },
      },
      rating: { x: 44, y: contactY.OUT2 + 15 },
      address: { x: 44, y: contactY.OUT2 + 29 },
      metadataAnchor: "middle",
      incomingY: parentY,
    };
    const svg = new SVGelement();
    svg.xleft = 1;
    svg.xright = width - svg.xleft;
    svg.yup = parentY;
    svg.ydown = Math.max(labelBottom, branchBottom) - parentY;
    svg.data = this.renderComponent(layout, slots, ratingLabel, address);
    return svg;
  }

  private renderVertical(
    parentPort: OmschakelaarPort,
    slots: Slot[],
    ratingLabel: string,
    address: string,
  ): SVGelement {
    const [left, middle, right] = slots;
    const endpointY = Math.max(18, ...slots.map(slot => slot.svg.yup));
    // The space below the branches holds three horizontal routing layers and the port labels.
    const contactY = endpointY + 64;
    const commonY = contactY + 34;
    const leftX = Math.round(Math.max(34, left.svg.xleft));
    const centerX = Math.round(leftX + Math.max(36, left.svg.xright + middle.svg.xleft + 28));
    const rightX = Math.round(centerX + Math.max(36, middle.svg.xright + right.svg.xleft + 28));
    const contactX: Record<OmschakelaarPort, number> = { OUT1: 34, IN: 70, OUT2: 106 };
    const parentX = contactX[parentPort];
    // The port label ("IN"/"OUT1"/"OUT2") sits on its own line next to its
    // contact; the rating/address labels start a full line below it so long
    // text like "63A 4P" never collides with the port label.
    const ratingY = commonY + 16;
    const addressY = commonY + 30;
    const incomingY = commonY + (address === "" ? 24 : 38);
    const labelX = parentX + 20;
    const labelWidth = Math.max(
      svgTextWidth(htmlspecialchars(ratingLabel), 10, ""),
      svgTextWidth(htmlspecialchars(address), 10, ""),
    );
    const width = Math.max(
      leftX + left.svg.xright,
      centerX + middle.svg.xright,
      rightX + right.svg.xright,
      labelX + labelWidth,
    );
    const contact = (port: OmschakelaarPort): Point => ({ x: contactX[port], y: port === "IN" ? commonY : contactY });
    const layout: Layout = {
      orientation: "vertical",
      parentPort,
      contacts: { OUT1: contact("OUT1"), IN: contact("IN"), OUT2: contact("OUT2") },
      ends: {
        OUT1: { x: leftX, y: endpointY },
        IN: { x: centerX, y: endpointY },
        OUT2: { x: rightX, y: endpointY },
      },
      parentConductor: { from: { x: parentX, y: incomingY }, to: contact(parentPort) },
      arm: { from: { x: contactX.IN, y: commonY }, to: { x: contactX.IN, y: commonY - 18 } },
      portLabels: {
        OUT1: { x: contactX.OUT1, y: contactY - 7, anchor: "middle" },
        IN: { x: contactX.IN + 7, y: commonY + 4, anchor: "start" },
        OUT2: { x: contactX.OUT2, y: contactY - 7, anchor: "middle" },
      },
      rating: { x: labelX, y: ratingY },
      address: { x: labelX, y: addressY },
      metadataAnchor: "start",
      incomingY,
    };
    const svg = new SVGelement();
    svg.xleft = parentX;
    svg.xright = width - parentX;
    svg.yup = incomingY;
    svg.ydown = 0;
    svg.data = this.renderComponent(layout, slots, ratingLabel, address);
    return svg;
  }

  private renderComponent(
    layout: Layout,
    slots: Slot[],
    ratingLabel: string,
    address: string,
  ): string {
    const { parentPort } = layout;
    const escapedParentPort = htmlspecialchars(parentPort);
    const line = (attribute: string, from: Point, to: Point) =>
      `<line ${attribute} x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="black" stroke-linecap="round" />`;
    let data = `<g data-component="omschakelaar" data-position="neutral" data-orientation="${layout.orientation}">`;
    data += line(`data-input-conductor="${escapedParentPort}"`, layout.parentConductor.from, layout.parentConductor.to);

    for (const slot of slots) {
      const escapedPort = htmlspecialchars(slot.port);
      const contact = layout.contacts[slot.port];
      const end = layout.ends[slot.port];
      const firstBend = layout.orientation === "vertical"
        ? { x: contact.x, y: end.y + VERTICAL_ROUTE_LEVEL[slot.port] }
        : { x: HORIZONTAL_ROUTE_LANE_X[slot.port], y: contact.y };
      const secondBend = layout.orientation === "vertical"
        ? { x: end.x, y: firstBend.y }
        : { x: firstBend.x, y: end.y };
      data += `<circle data-switch-contact="${escapedPort}" cx="${contact.x}" cy="${contact.y}" r="2.5" fill="black" />`;
      data += line(`data-output-conductor="${escapedPort}"`, contact, firstBend);
      data += line(`data-output-conductor="${escapedPort}"`, firstBend, secondBend);
      data += line(`data-output-conductor="${escapedPort}"`, secondBend, end);
    }

    data += `<line data-selector-arm="true" x1="${layout.arm.from.x}" y1="${layout.arm.from.y}" x2="${layout.arm.to.x}" y2="${layout.arm.to.y}" stroke="black" />`;

    for (const slot of slots) {
      const label = layout.portLabels[slot.port];
      const anchor = label.anchor === "middle" ? ' style="text-anchor:middle"' : "";
      data += `<text x="${label.x}" y="${label.y}"${anchor} font-family="Arial, Helvetica, sans-serif" font-size="9">${htmlspecialchars(slot.port)}</text>`;
    }

    data += `<text data-switch-rating="true" x="${layout.rating.x}" y="${layout.rating.y}" text-anchor="${layout.metadataAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="10">${htmlspecialchars(ratingLabel)}</text>`;
    if (address !== "") {
      data += `<text data-switch-address="true" x="${layout.address.x}" y="${layout.address.y}" text-anchor="${layout.metadataAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="10">${htmlspecialchars(address)}</text>`;
    }

    for (const slot of slots) {
      const end = layout.ends[slot.port];
      const branchX = end.x - slot.svg.xleft;
      const branchY = end.y - slot.svg.yup;
      data += `<g data-branch-origin="${htmlspecialchars(slot.port)}" data-x="${end.x}" data-y="${end.y}">`;
      if (slot.svg.data !== "") {
        data += `<svg x="${branchX}" y="${branchY}">${slot.svg.data}</svg>`;
      }
      data += "</g>";
    }

    for (const slot of slots) {
      if (slot.connector === undefined) continue;
      const end = layout.ends[slot.port];
      data += `<g data-schema-item-id="${slot.connector.id}" data-explicit-port-anchor="${htmlspecialchars(slot.port)}" data-schema-anchor-x="${end.x}" data-schema-anchor-y="${end.y}" data-schema-end-x="${end.x}" data-schema-width="0" data-schema-height="0"></g>`;
    }
    return data + "</g>";
  }
}
