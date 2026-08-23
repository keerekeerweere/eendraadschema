import { LegacyPrintService } from "../application/PrintService";

/** Single React-facing print adapter over the authoritative legacy document. */
export const printService = new LegacyPrintService(() => globalThis.structure);
