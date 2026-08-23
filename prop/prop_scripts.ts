import { EDStoStructure } from '../src/importExport/importExport';
import type { MenuItem } from '../src/TopMenu.js';

export var PROP_Contact_Text = `<section class="mx-auto max-w-3xl p-8 text-neutral-800 [&_a]:text-blue-700 [&_a]:underline [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_p]:mb-3">
    <h2>Een &eacute;&eacute;ndraadschema tekenen.</h2>
    <p class="text-neutral-600">Een cr&eacute;atie van <a target="_blank" href="https://ivan.goethals-jacobs.be">Ivan Goethals</a></p>
    <p>Dit is een standalone versie (development) waarbij enkele functionaliteiten zijn uitgeschakeld.</p>
    <p>Gebruik de online versie op <a href="https://eendraadschema.goethals-jacobs.be">https://eendraadschema.goethals-jacobs.be</a> om toegang te krijgen tot het contactformulier.</p>
    <p>Kies <b>Bewerken</b> in het menu om verder te gaan met tekenen.</p>
  </section>`

export function PROP_GDPR() {
  return("");
}

export function PROP_getCookieText() {
  return("");
}

export function PROP_edit_menu(menuItems: MenuItem[]) {}

//--- START OF DEVELOPMENT OPTIONS ---

export function PROP_development_options() {
  let outstr:string = '<section class="mx-auto max-w-3xl p-8"><h2 class="mb-3 text-xl font-semibold">Expert ontwikkel opties, gebruik enkel indien u weet wat u doet.</h2>'
                    + '<textarea id="HL_loadfromtext" class="mb-3 h-32 w-full rounded-md border border-neutral-300 p-2 font-mono"></textarea><br>'
                    + '<button class="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800" onclick="loadFileFromText()">Load from input</button></section>';
  return outstr;
}

globalThis.loadFileFromText = () => {
  let str:string = (document.getElementById('HL_loadfromtext') as HTMLInputElement).value;
  EDStoStructure(str);
  globalThis.fileAPIobj.clear();
}

/// --- END OF DEVELOPMENT OPTIONS ---

globalThis.propUpload = (text: string) => {
  return(0);
  //Does nothing in the serverless version, only used on https://eendraadschema.goethals-jacobs.be
  
  //avoid warning on text never used
  text;
}

export class CookieBanner {
  run() {} //Does nothing in the serverless version, only used on https://eendraadschema.goethals-jacobs.be
}
