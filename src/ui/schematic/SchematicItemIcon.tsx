/** Preview the same electrical symbols that the schematic renderer puts in its SVG defs. */
const symbolByType: Readonly<Record<string, string>> = {
  Aansluitpunt: "aansluitpunt",
  Aardingsonderbreker: "aardingsonderbreker",
  Aftakdoos: "aftakdoos",
  Batterij: "batterij_nieuw",
  Bel: "bel",
  Boiler: "boiler",
  Contactdoos: "contactdoos",
  Diepvriezer: "diepvriezer",
  Domotica: "relais",
  "Domotica module (verticaal)": "relais",
  "Domotica gestuurde verbruiker": "verbruiker",
  Droogkast: "droogkast",
  Drukknop: "drukknop",
  Elektriciteitsmeter: "elektriciteitsmeter",
  "Elektrische oven": "oven",
  "EV lader": "EVlader",
  Ketel: "verbruiker",
  Koelkast: "koelkast",
  Kookfornuis: "kookfornuis",
  Lichtcircuit: "lamp",
  Lichtpunt: "lamp",
  "Meerdere verbruikers": "verbruiker",
  Media: "luidspreker",
  Microgolfoven: "microgolf",
  Motor: "motor",
  Omvormer: "omvormer",
  Overspanningsbeveiliging: "overspanningsbeveiliging",
  Schakelaars: "schakelaar_enkel",
  Stoomoven: "stoomoven",
  Transformator: "transformator",
  "USB lader": "usblader",
  Vaatwasmachine: "vaatwasmachine",
  Ventilator: "ventilator",
  Verwarmingstoestel: "verwarmingstoestel",
  Verbruiker: "verbruiker",
  "Warmtepomp/airco": "verbruiker",
  Wasmachine: "wasmachine",
  "Zeldzame symbolen": "deurslot",
  "Zekering/differentieel": "zekering_smelt_horizontaal",
  Zonnepaneel: "zonnepaneel",
};

const compactSymbols = new Set(["lamp", "bel", "aansluitpunt", "aftakdoos", "drukknop", "luidspreker", "schakelaar_enkel", "transformator"]);
const wideSymbols = new Set(["usblader", "verwarmingstoestel"]);

function StructuralIcon({ type }: { readonly type: string }) {
  const lines: Record<string, React.ReactNode> = {
    Aansluiting: <><circle cx="5" cy="20" r="4" /><path d="M9 20h30" /></>,
    Bord: <><rect x="7" y="5" width="30" height="30" rx="2" /><path d="M17 5v30M27 5v30" /></>,
    Kring: <><path d="M3 20h12m12 0h14M15 20l12-10" /><circle cx="15" cy="20" r="2" /></>,
    Leiding: <><path d="M3 20h38" /><circle cx="3" cy="20" r="2" /><circle cx="41" cy="20" r="2" /></>,
    Omschakelaar: <><rect x="4" y="5" width="36" height="30" rx="2" /><path d="M9 13h8l10 7M9 27h8l10-7M27 20h9" /></>,
    Splitsing: <><path d="M4 20h18m0-12v24m0-24h18m-18 24h18" /><circle cx="22" cy="20" r="2" /></>,
    Verlenging: <><path d="M3 20h34m-9-7 9 7-9 7" /></>,
    "Vrije ruimte": <rect x="5" y="8" width="34" height="24" rx="2" strokeDasharray="4 3" />,
    "Vrije tekst": <><path d="M8 8h28M22 8v26M15 34h14" /></>,
  };

  return (
    <svg className="size-10 shrink-0" viewBox="0 0 44 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {lines[type] ?? <><rect x="5" y="5" width="34" height="30" rx="2" /><path d="M12 20h20" /></>}
    </svg>
  );
}

export function SchematicItemIcon({ type }: { readonly type: string }) {
  const symbol = symbolByType[type];
  if (!symbol) return <StructuralIcon type={type} />;
  return (
    <svg
      className="size-10 shrink-0"
      viewBox={compactSymbols.has(symbol) ? "-15 -20 42 40" : wideSymbols.has(symbol) ? "-4 -28 72 56" : "-4 -24 52 48"}
      aria-hidden="true"
    >
      <use href={`#${symbol}`} />
    </svg>
  );
}
