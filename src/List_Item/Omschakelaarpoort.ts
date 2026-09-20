import { Electro_Item } from "./Electro_Item";
import { isOmschakelaarPort } from "../application/Omschakelaar";
import { SVGelement } from "../SVGelement";

export class Omschakelaarpoort extends Electro_Item {
  resetProps(): void {
    this.clearProps();
    this.props.type = "Omschakelaarpoort";
    this.props.poort = "OUT1";
  }

  allowedChilds(): Array<string> {
    return ["", "Kring"];
  }

  getMaxNumChilds(): number {
    return 1;
  }

  overrideKeys(): void {
    if (!isOmschakelaarPort(this.props.poort)) this.props.poort = "OUT1";
  }

  toSVG(): SVGelement {
    const svg = new SVGelement();
    svg.xleft = 1;
    svg.xright = 24;
    svg.yup = 10;
    svg.ydown = 10;
    svg.data = '<line x1="1" y1="10" x2="25" y2="10" stroke="black" />';
    return svg;
  }
}
