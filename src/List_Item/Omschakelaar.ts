import { Electro_Item } from "./Electro_Item";
import {
  isOmschakelaarPort,
  OMSCHAKELAAR_POLES,
  OMSCHAKELAAR_RATINGS,
  remainingOmschakelaarPorts,
} from "../application/Omschakelaar";
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
    const children = this.sourcelist.toSVG(this.id, "vertical");
    const height = Math.max(children.yup + children.ydown, 40);
    const centerY = height / 2;
    const parentPort = isOmschakelaarPort(this.props.parent_port) ? this.props.parent_port : "IN";
    const outputPorts = remainingOmschakelaarPorts(parentPort);
    const branches = outputPorts.map((port, index) => ({
      port,
      y: height - (children.connectorPos[index] ?? (index === 0 ? centerY - 12 : centerY + 12)),
    })).sort((left, right) => left.y - right.y);
    const poles = OMSCHAKELAAR_POLES.includes(this.props.aantal_polen) ? this.props.aantal_polen : "4";
    const rating = OMSCHAKELAAR_RATINGS.includes(this.props.amperage) ? this.props.amperage : "63";
    const address = typeof this.props.adres === "string" ? this.props.adres.trim() : "";
    const ratingLabel = `${rating}A ${poles}P`;
    const shift = 92;

    const svg = new SVGelement();
    svg.xleft = 1;
    svg.xright = shift + children.xleft + children.xright - svg.xleft;
    svg.yup = height / 2;
    svg.ydown = height / 2 + (address === "" ? 18 : 32);
    svg.connectorPos = [...children.connectorPos];
    svg.data = `<svg x="${shift}" y="0">${children.data}</svg>`;

    const escapedParentPort = htmlspecialchars(parentPort);
    const escapedOutput1 = htmlspecialchars(branches[0].port);
    const escapedOutput2 = htmlspecialchars(branches[1].port);
    const escapedRating = htmlspecialchars(ratingLabel);
    svg.data += `<g data-component="omschakelaar" data-position="neutral">`
      + `<line x1="1" y1="${centerY}" x2="23" y2="${centerY}" stroke="black" />`
      + `<circle data-switch-contact="${escapedParentPort}" cx="26" cy="${centerY}" r="2.5" fill="black" />`
      + `<circle data-switch-contact="${escapedOutput1}" cx="61" cy="${branches[0].y}" r="2.5" fill="black" />`
      + `<circle data-switch-contact="${escapedOutput2}" cx="61" cy="${branches[1].y}" r="2.5" fill="black" />`
      + `<line data-selector-arm="true" x1="29" y1="${centerY}" x2="48" y2="${branches[0].y + 3}" stroke="black" />`
      + `<line data-selector-arm="true" x1="29" y1="${centerY}" x2="48" y2="${branches[1].y - 3}" stroke="black" />`
      + `<line x1="64" y1="${branches[0].y}" x2="${shift + 1}" y2="${branches[0].y}" stroke="black" />`
      + `<line x1="64" y1="${branches[1].y}" x2="${shift + 1}" y2="${branches[1].y}" stroke="black" />`
      + `<text x="5" y="${centerY - 6}" font-family="Arial, Helvetica, sans-serif" font-size="9">${escapedParentPort}</text>`
      + `<text x="67" y="${branches[0].y - 4}" font-family="Arial, Helvetica, sans-serif" font-size="9">${escapedOutput1}</text>`
      + `<text x="67" y="${branches[1].y - 4}" font-family="Arial, Helvetica, sans-serif" font-size="9">${escapedOutput2}</text>`
      + `<text x="43" y="${height + 13}" style="text-anchor:middle" font-family="Arial, Helvetica, sans-serif" font-size="10">${escapedRating}</text>`;
    if (address !== "") {
      svg.data += `<text x="43" y="${height + 27}" style="text-anchor:middle" font-family="Arial, Helvetica, sans-serif" font-size="10">${htmlspecialchars(address)}</text>`;
      svg.xright = Math.max(svg.xright, svgTextWidth(htmlspecialchars(address), 10, "") + 12);
    }
    svg.data += "</g>";
    return svg;
  }
}
