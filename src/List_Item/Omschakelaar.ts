import { Electro_Item } from "./Electro_Item";
import {
  isOmschakelaarPort,
  OMSCHAKELAAR_POLES,
  OMSCHAKELAAR_RATINGS,
} from "../application/Omschakelaar";

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
}
