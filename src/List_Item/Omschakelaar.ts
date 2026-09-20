import { Electro_Item } from "./Electro_Item";
import {
  isOmschakelaarPort,
  OMSCHAKELAAR_POLES,
  OMSCHAKELAAR_RATINGS,
  remainingOmschakelaarPorts,
} from "../application/Omschakelaar";
import type { OmschakelaarPort } from "../application/Omschakelaar";
import { htmlspecialchars, svgTextWidth } from "../general";
import { SVGelement } from "../SVGelement";

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
    return 2;
  }

  overrideKeys(): void {
    if (!OMSCHAKELAAR_POLES.includes(this.props.aantal_polen)) this.props.aantal_polen = "4";
    if (!OMSCHAKELAAR_RATINGS.includes(this.props.amperage)) this.props.amperage = "63";
    if (!isOmschakelaarPort(this.props.parent_port)) this.props.parent_port = "IN";
    if (typeof this.props.adres !== "string") this.props.adres = "";
  }

  toSVG(): SVGelement {
    const parentPort = isOmschakelaarPort(this.props.parent_port) ? this.props.parent_port : "IN";
    const branches = this.getRenderBranches();
    const poles = OMSCHAKELAAR_POLES.includes(this.props.aantal_polen) ? this.props.aantal_polen : "4";
    const rating = OMSCHAKELAAR_RATINGS.includes(this.props.amperage) ? this.props.amperage : "63";
    const address = typeof this.props.adres === "string" ? this.props.adres.trim() : "";
    const ratingLabel = `${rating}A ${poles}P`;
    const orientation = this.getParent()?.getType() === "Kring" ? "vertical" : "horizontal";

    return orientation === "vertical"
      ? this.renderVertical(parentPort, branches, ratingLabel, address)
      : this.renderHorizontal(parentPort, branches, ratingLabel, address);
  }

  private renderHorizontal(
    parentPort: OmschakelaarPort,
    branches: ReturnType<Omschakelaar["getRenderBranches"]>,
    ratingLabel: string,
    address: string,
  ): SVGelement {
    const upperY = Math.max(22, branches[0].svg.yup);
    const lowerY = upperY + Math.max(38, branches[0].svg.ydown + branches[1].svg.yup + 18);
    const centerY = (upperY + lowerY) / 2;
    const contactX = 58;
    const endpointX = contactX + 30 + Math.max(branches[0].svg.xleft, branches[1].svg.xleft);
    const labelBottom = lowerY + (address === "" ? 24 : 38);
    const width = Math.max(
      endpointX + branches[0].svg.xright,
      endpointX + branches[1].svg.xright,
      88 + svgTextWidth(htmlspecialchars(address), 10, ""),
    );
    const svg = new SVGelement();
    svg.xleft = 1;
    svg.xright = width - svg.xleft;
    svg.yup = centerY;
    svg.ydown = labelBottom - centerY;
    svg.data = this.renderComponent(
      "horizontal",
      parentPort,
      branches,
      { x: 26, y: centerY },
      [
        { x: contactX, y: upperY, endpointX, endpointY: upperY },
        { x: contactX, y: lowerY, endpointX, endpointY: lowerY },
      ],
      ratingLabel,
      address,
      { x: 44, ratingY: lowerY + 15, addressY: lowerY + 29 },
    );
    return svg;
  }

  private renderVertical(
    parentPort: OmschakelaarPort,
    branches: ReturnType<Omschakelaar["getRenderBranches"]>,
    ratingLabel: string,
    address: string,
  ): SVGelement {
    const endpointY = Math.max(18, branches[0].svg.yup, branches[1].svg.yup);
    const contactY = endpointY + 24;
    const leftX = Math.max(34, branches[0].svg.xleft);
    const rightX = leftX + Math.max(
      72,
      branches[0].svg.xright + branches[1].svg.xleft + 28,
    );
    const centerX = (leftX + rightX) / 2;
    const commonY = contactY + 34;
    const ratingY = commonY + 4;
    const addressY = commonY + 18;
    const incomingY = commonY + (address === "" ? 22 : 32);
    const labelX = centerX + 20;
    const labelWidth = Math.max(
      svgTextWidth(htmlspecialchars(ratingLabel), 10, ""),
      svgTextWidth(htmlspecialchars(address), 10, ""),
    );
    const width = Math.max(
      leftX + branches[0].svg.xright,
      rightX + branches[1].svg.xright,
      labelX + labelWidth,
    );
    const svg = new SVGelement();
    svg.xleft = centerX;
    svg.xright = width - centerX;
    svg.yup = incomingY;
    svg.ydown = 0;
    svg.data = this.renderComponent(
      "vertical",
      parentPort,
      branches,
      { x: centerX, y: commonY },
      [
        { x: leftX, y: contactY, endpointX: leftX, endpointY },
        { x: rightX, y: contactY, endpointX: rightX, endpointY },
      ],
      ratingLabel,
      address,
      { x: labelX, ratingY, addressY },
      incomingY,
    );
    return svg;
  }

  private getRenderBranches() {
    const parentPort = isOmschakelaarPort(this.props.parent_port) ? this.props.parent_port : "IN";
    return remainingOmschakelaarPorts(parentPort).map(port => {
      const connector = this.sourcelist.data.find((candidate, index) =>
        this.sourcelist.active[index]
        && candidate.parent === this.id
        && candidate.props.type === "Omschakelaarpoort"
        && candidate.props.poort === port,
      );
      return {
        port,
        connector,
        svg: connector === undefined
          ? new SVGelement()
          : this.sourcelist.toSVG(connector.id, "horizontal"),
      };
    });
  }

  private renderComponent(
    orientation: "horizontal" | "vertical",
    parentPort: OmschakelaarPort,
    branches: ReturnType<Omschakelaar["getRenderBranches"]>,
    common: { x: number; y: number },
    outputs: Array<{ x: number; y: number; endpointX: number; endpointY: number }>,
    ratingLabel: string,
    address: string,
    labels: { x: number; ratingY: number; addressY: number },
    incomingY = common.y,
  ): string {
    const escapedParentPort = htmlspecialchars(parentPort);
    let data = `<g data-component="omschakelaar" data-position="neutral" data-orientation="${orientation}">`;
    data += orientation === "vertical"
      ? `<line data-input-conductor="${escapedParentPort}" x1="${common.x}" y1="${incomingY}" x2="${common.x}" y2="${common.y}" stroke="black" stroke-linecap="round" />`
      : `<line data-input-conductor="${escapedParentPort}" x1="1" y1="${common.y}" x2="${common.x}" y2="${common.y}" stroke="black" stroke-linecap="round" />`;
    data += `<circle data-switch-contact="${escapedParentPort}" cx="${common.x}" cy="${common.y}" r="2.5" fill="black" />`;

    branches.forEach((branch, index) => {
      const output = outputs[index];
      const escapedPort = htmlspecialchars(branch.port);
      data += `<circle data-switch-contact="${escapedPort}" cx="${output.x}" cy="${output.y}" r="2.5" fill="black" />`;
      data += `<line data-output-conductor="${escapedPort}" x1="${output.x}" y1="${output.y}" x2="${output.endpointX}" y2="${output.endpointY}" stroke="black" stroke-linecap="round" />`;
    });

    const armEndX = orientation === "vertical" ? common.x : common.x + 20;
    const armEndY = orientation === "vertical" ? common.y - 18 : common.y;
    data += `<line data-selector-arm="true" x1="${common.x}" y1="${common.y}" x2="${armEndX}" y2="${armEndY}" stroke="black" />`;

    if (orientation === "vertical") {
      data += `<text x="${common.x + 7}" y="${common.y + 4}" font-family="Arial, Helvetica, sans-serif" font-size="9">${escapedParentPort}</text>`;
      branches.forEach((branch, index) => {
        const output = outputs[index];
        data += `<text x="${output.x}" y="${output.y - 7}" style="text-anchor:middle" font-family="Arial, Helvetica, sans-serif" font-size="9">${htmlspecialchars(branch.port)}</text>`;
      });
    } else {
      data += `<text x="5" y="${common.y - 7}" font-family="Arial, Helvetica, sans-serif" font-size="9">${escapedParentPort}</text>`;
      branches.forEach((branch, index) => {
        const output = outputs[index];
        data += `<text x="${output.x + 7}" y="${output.y - 5}" font-family="Arial, Helvetica, sans-serif" font-size="9">${htmlspecialchars(branch.port)}</text>`;
      });
    }

    const metadataAnchor = orientation === "vertical" ? "start" : "middle";
    data += `<text data-switch-rating="true" x="${labels.x}" y="${labels.ratingY}" text-anchor="${metadataAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="10">${htmlspecialchars(ratingLabel)}</text>`;
    if (address !== "") {
      data += `<text data-switch-address="true" x="${labels.x}" y="${labels.addressY}" text-anchor="${metadataAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="10">${htmlspecialchars(address)}</text>`;
    }

    branches.forEach((branch, index) => {
      const output = outputs[index];
      const branchX = output.endpointX - branch.svg.xleft;
      const branchY = output.endpointY - branch.svg.yup;
      data += `<g data-branch-origin="${htmlspecialchars(branch.port)}" data-x="${output.endpointX}" data-y="${output.endpointY}">`;
      if (branch.svg.data !== "") {
        data += `<svg x="${branchX}" y="${branchY}">${branch.svg.data}</svg>`;
      }
      data += "</g>";
    });

    branches.forEach((branch, index) => {
      if (branch.connector === undefined) return;
      const output = outputs[index];
      data += `<g data-schema-item-id="${branch.connector.id}" data-explicit-port-anchor="${htmlspecialchars(branch.port)}" data-schema-anchor-x="${output.endpointX}" data-schema-anchor-y="${output.endpointY}" data-schema-end-x="${output.endpointX}" data-schema-width="0" data-schema-height="0"></g>`;
    });
    return data + "</g>";
  }
}
