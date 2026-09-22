import type { SchematicRenderStore } from "../../application/SchematicRenderStore";
import { useSchematicRenderSnapshot } from "../useSchematicRenderSnapshot";

interface SchematicViewportProps {
  readonly renderStore: SchematicRenderStore;
  readonly buildDate: string;
}

const legendItems = [
  ["↑", "Item hierboven invoegen (zelfde niveau)"],
  ["↓", "Item hieronder invoegen (zelfde niveau)"],
  ["↳", "Afhankelijk item hieronder toevoegen (niveau dieper)"],
  ["🗑", "Item verwijderen"],
] as const;

export function SchematicViewport({ renderStore, buildDate }: SchematicViewportProps) {
  const { svg } = useSchematicRenderSnapshot(renderStore);

  return (
    <section aria-label="Eéndraadschema" className="relative grid min-h-full content-start gap-4 bg-white p-3 text-black">
      <details className="absolute right-3 top-3 z-10 rounded-lg border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-xs font-semibold text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700 [&::-webkit-details-marker]:hidden">Tekentips ▾</summary>
        <div className="absolute right-0 top-[calc(100%+0.4rem)] w-[min(22rem,80vw)] rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-xl">
          <p className="m-0">Gebruik de plusknoppen op de lijnen om onderdelen toe te voegen. Houd Ctrl ingedrukt om de verwijderknop op eenvoudige onderdelen te tonen.</p>
          <p className="mb-0 mt-2">Gebruik Afdrukken en exporteren in het menu voor papier, PDF of SVG.</p>
        </div>
      </details>
      <div
        id="EDS"
        className="relative min-w-max pt-10"
        // This boundary accepts markup only from the internal electrical SVG renderer.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <aside aria-label="Legende van het eendraadschema" className="max-w-xl">
      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700">Legende en sneltoetsen</summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
          {legendItems.map(([symbol, description]) => (
            <div key={symbol} className="contents">
              <dt className="flex size-7 items-center justify-center rounded border border-neutral-300 bg-white font-bold" aria-hidden="true">{symbol}</dt>
              <dd className="m-0">{description}</dd>
            </div>
          ))}
        </dl>
      </details>
      </aside>
      <footer className="pb-3 text-xs italic text-neutral-500">
        Versie: {buildDate} · © Ivan Goethals, Keerekeerweere ·{" "}
        <a className="underline hover:text-blue-800" href="license.html" target="_blank" rel="noopener noreferrer">Voorwaarden</a>
      </footer>
    </section>
  );
}
