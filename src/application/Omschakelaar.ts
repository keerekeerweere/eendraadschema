export const OMSCHAKELAAR_PORTS = ["IN", "OUT1", "OUT2"] as const;
export const OMSCHAKELAAR_POLES = ["2", "4"] as const;
export const OMSCHAKELAAR_RATINGS = ["16", "25", "32", "40", "63", "80", "100"] as const;

export type OmschakelaarPort = typeof OMSCHAKELAAR_PORTS[number];

export function isOmschakelaarPort(value: unknown): value is OmschakelaarPort {
  return typeof value === "string" && OMSCHAKELAAR_PORTS.includes(value as OmschakelaarPort);
}

export function remainingOmschakelaarPorts(
  parentPort: OmschakelaarPort,
): readonly OmschakelaarPort[] {
  return OMSCHAKELAAR_PORTS.filter(port => port !== parentPort);
}
