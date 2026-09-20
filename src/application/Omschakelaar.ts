export const OMSCHAKELAAR_CONNECTOR_PORTS = ["OUT1", "OUT2"] as const;
export const OMSCHAKELAAR_POLES = ["2", "4"] as const;
export const OMSCHAKELAAR_RATINGS = ["16", "25", "32", "40", "63", "80", "100"] as const;

export type OmschakelaarConnectorPort = typeof OMSCHAKELAAR_CONNECTOR_PORTS[number];

export function isOmschakelaarConnectorPort(value: unknown): value is OmschakelaarConnectorPort {
  return typeof value === "string" && OMSCHAKELAAR_CONNECTOR_PORTS.includes(value as OmschakelaarConnectorPort);
}
