import { TopMenu } from "./TopMenu";
import type { MenuItem } from "./TopMenu";
import { Hierarchical_List } from "./Hierarchical_List";
import { download_by_blob, fileService } from "./importExport/importExport";
import { EDStoStructure } from "./importExport/importExport";
import { AutoSaver } from "./importExport/AutoSaver";
import { showSituationPlanPage } from "./sitplan/SituationPlanView";
import { printService } from "./print/print";
import { PROP_edit_menu } from "../prop/prop_scripts";
import { CookieBanner } from "../prop/CookieBanner";
import { flattenSVGfromString, trimString } from "./general";
import { Bord } from "./List_Item/Bord";
import { Kring } from "./List_Item/Kring";
import { PROP_Contact_Text, PROP_development_options } from "../prop/prop_scripts";
import { browser_ie_detected } from "./general";
import { showDocumentationPage } from "./documentation/documentation";
import { HelperTip } from "./documentation/HelperTip";
import { Session } from "./Session";
import { MultiLevelStorage } from "./storage/MultiLevelStorage";
import { undoRedo } from "./undoRedo";
import { importExportUsingFileAPI } from "./importExport/importExport";
import { changelog } from "./changelog";
import { LocalEditorStore } from "./application/EditorStore";
import { LegacySchemaStore } from "./application/LegacySchemaStore";
import { LegacySaveStatusStore } from "./application/SaveStatusStore";
import { LegacySituationPlanStore } from "./application/LegacySituationPlanStore";
import { LocalWorkspaceStore } from "./application/WorkspaceStore";
import { LegacyHistoryStatusStore } from "./application/HistoryStatusStore";
import { LegacySituationPlanAssetService } from "./application/LegacySituationPlanAssetService";
import { mountEditorApp } from "./ui/mountEditorApp";
import { BrowserMcpBridge } from "./mcp/BrowserMcpBridge";

import "../css/all.css";

declare const BUILD_DATE: string;
console.log(BUILD_DATE);

// Global mutable variables

globalThis.session = new Session();
globalThis.appDocStorage = new MultiLevelStorage<any>('appDocStorage', {});
globalThis.undostruct = new undoRedo(100);
globalThis.fileAPIobj = new importExportUsingFileAPI();

let schemaStore: LegacySchemaStore | null = null;
let editorStore: LocalEditorStore | null = null;
let workspaceStore: LocalWorkspaceStore | null = null;
let reactSchemaHistoryEnabled = false;

function schemaCommandHistoryIsActive(): boolean {
    return reactSchemaHistoryEnabled
        && schemaStore !== null
        && globalThis.structure.properties.currentView === '2col';
}

globalThis.historyCanUndo = () => schemaCommandHistoryIsActive()
    ? schemaStore!.getSnapshot().canUndo
    : globalThis.undostruct.undoStackSize() > 0;

globalThis.historyCanRedo = () => schemaCommandHistoryIsActive()
    ? schemaStore!.getSnapshot().canRedo
    : globalThis.undostruct.redoStackSize() > 0;

function synchronizeSchemaStoreWithLegacyDocument(): void {
    schemaStore?.synchronizeLegacyDocument(globalThis.structure);
    globalThis.situationPlanStore?.synchronizeLegacyDocument(globalThis.structure);
    if (schemaStore !== null && editorStore !== null) {
        editorStore.commands.reconcileItemIds(new Set(
            schemaStore.getSnapshot().document.getAllItems().map((item) => item.id),
        ));
    }
}

// Global constants

globalThis.SITPLANVIEW_SELECT_PADDING = parseInt(trimString(getComputedStyle(document.documentElement).getPropertyValue('--selectPadding')));
globalThis.SITPLANVIEW_ZOOMINTERVAL = {MIN: 0.1, MAX: 1000};
globalThis.SITPLANVIEW_DEFAULT_SCALE = 0.7;

globalThis.CONFIGPAGE_LEFT = `
    <table border="1px" style="border-collapse:collapse;" align="center" width="100%"><tr><td style="padding-top: 0; padding-right: 10px; padding-bottom: 10px; padding-left: 10px;">
        <p><font size="+2">
          <b>Welkom op ééndraadschema</b>
        </font></p>
      <p><font size="+1">
           Deze gratis tool laat toe zowel ééndraadschema's als situatieschema's te tekenen, inclusief complexere schema's
           met bijvoorbeeld domotica. De schema's kunnen als PDF bestand worden geëxporteerd en geprint.
           Voor de experts kunnen schema's eveneens worden omgezet in SVG vectorformaat om in andere programma's verder te bewerken.
      </font></p>
      <p><font size="+1">
           Kies één van onderstaande voorbeelden om van te starten of start van een leeg schema (optie 3).
      </font></p>
      <font size="+1">
        <i>
          <b>Tip: </b>Om de mogelijkheden van het programma te leren kennen is het vaak beter eerst een voorbeeldschema te
          bekijken alvorens van een leeg schema te vertrekken.
        </i>
      </font>
    </td></tr></table>
    <div id="autoSaveRecover"></div>
    <br>
    <table border="1px" style="border-collapse:collapse" align="center" width="100%">
      <tr>
        <td width="25%" align="center" bgcolor="LightGrey">
          <b>Voorbeeld 1</b>
        </td>
        <td width="25%" align="center" bgcolor="LightGrey">
          <b>Voorbeeld 2</b>
        </td>
        <td width="25%" align="center" bgcolor="LightGrey">
          <b>Leeg schema</b>
        </td>
        <td width="25%" align="center" bgcolor="LightGrey">
          <b>Openen</b>
        </td>
      </tr>
      <tr>
        <td width="25%" align="center">
          <br>
          <img src="examples/example000.svg" height="300px"><br><br>
          Eenvoudig schema, enkel contactdozen en lichtpunten.
          <br><br>
        </td>
        <td width="25%" align="center">
          <br>
          <img src="examples/example001.svg" height="300px"><br><br>
          Iets complexer schema met teleruptoren, verbruikers achter contactdozen en gesplitste kringen.
          <br><br>
        </td>
        <td width="25%" align="center">
          <br>
          <img src="examples/gear.svg" height="100px"><br><br>
`

globalThis.CONFIGPAGE_RIGHT = `
          <br><br>
        </td>
        <td width="25%" align="center">
          <br>
          <img src="examples/import_icon.svg" height="100px"><br><br>
          Open een schema dat u eerder heeft opgeslagen op uw computer (EDS-bestand). Enkel bestanden aangemaakt na 12 juli 2019 worden herkend.
          <br><br>
        </td>
      </tr>
      <tr>
        <td width="25%" align="center">
          <br>
          <button onclick="load_example(0)">Verdergaan met deze optie</button>
          <br><br>
        </td>
        <td width="25%" align="center">
          <br>
          <button onclick="load_example(1)">Verdergaan met deze optie</button>
          <br><br>
        </td>
        <td width="25%" align="center">
          <br>
          <button onclick="read_settings()">Verdergaan met deze optie</button>
          <br><br>
        </td>
        <td width="25%" align="center">
          <br>
          <button onclick="loadClicked()">Verdergaan met deze optie</button>
          <br><br>
        </td>
      </tr>
    </table>
  `;

globalThis.EXAMPLE0 = `EDS0040000eJztWW1v2zYQ/iuCvk4L9JZkNoZhSQZ0Q7ehQIZsQFEItHS2GVGkQVF2XpD99t2RsiWjrptqcbYUAYJAOpLH4/M8vKOpez9vtAZprjis/LHvB74AOTNzfxyNAr9ghvnj9/c+L9AQ+AtGff1xGPhcFuvHXAnBFjVgnykTNWA/rRa1P773pUanP/HpFB2zxij7XjHZAIjW9FZzOfudsWqrxdwuAA1nTNai4Qa7UHcmDRPZQmGM2BijaQJ1PgddUYexX+BMQCHy1n+1AM1m5CkNW69ZySYgMskyA0IABRTfRCfYujU6K0AYlvU8JCG5YIWG2iFlvW1PiRFjA2K6hIwWVzFmXOdt57zOahCQ49t0g1qptLGrXeKC1MyuMcGh0oGzHf9SKd2tANvmDa/nqsGw+XXpj41u0OWU1RS6/xD4tWp0jo01BiQbIR4CR2vc0Rp1tEafp3UgpedKF/iGCMyAMXxuQ+1WuYF4T9SkznXYcRd2fLCwbePTahAtf12de8mbODh+jPxoMJR1KygnA6FyhgPQVBsmCwvoFyrTOUI+uMwmKKINbv9CsnvF2JsS0VzBHZ9tHLYqsCljn2jDnmpHHf/JM8p2O+JH6va0J9vwU7p1cA0Jm94HaNYJwnC0bSs23qnYiwv2eNX2ZfsWmhJD+Fi8v0hvhfL9lHR3Kfdip3QddM+q3K30dbaP/KTH/ukXiTbq09+S/FnJXiikPTeFUvWuhIuGkkJAXLnoFuLEsp6zq3atiAgKwrvgILMKQKOBBm/lnznA1GCnGUxUsyogQ2GxEgQ2bxaI08+ZmK6YAV3wfG76LT3HrdG5RDR3zL0eJzMks0AMJmqzQffQkcZD6Yhf6TgAHUlHR9qr6enBcvqV5tfgueTUJak/CYJSlXiwCvwldclsU9aOulPEkleywvaYK83viFoBGaYTTBvSJdUco9fg+li0elkWsgk2FYb8zZEoMlOm7qwnoRPJEraYwDRY99PYY2pOGg3VefKq8wPoPBxKR/pKx9PTkYyG0nH8SsfT03Hysg7I9uLgEwfk6MsPyFegBcHuwvpqT8nne3/a9yRwcvhT8q+Ed851jqvspNDtjbp1bCHvbxm/aCa4TBSNLd29Xem2Be4CyXB5RJ5Axq/hEdvMDUW0S8FLPIJ8PBDPFOWOndvGbdWzaKSxVEV7cT4divOg4+9jcI534gyyfMEwJ/FQmAedvobL+WXDHEe7C0f6AgvHgJuVc1aUrLI/Nr7aqnGxl//eNot7F9nHr5cr/8k5Lk4H8/F6u3IIPkaD+XjmOrT7WHW54DCzE/zP69EH7I3pcIlu31uRHewfzkTMvo+COIhGAVa90yA5DdI4SJMgjYI0DPDH7UmAB2o86+E5BHnHNIk7Mx59IJK5NJlhEwFE9Rz4jKA6PsFMWrGbFS/oM3D6XUo5v14IdruwlQeLK0gadYYacKa2rOJzbT8Xb/nCvaLdh+Ia+1uPBBL1rphGFmqHHM6qCkByDM/tnmRCAG1m6+B24+G29btgWAtrfme/E6fEBcmWhoPV7pRjUcaaSEebGyRaQBiGR1CQS7WS9rvplVKaqot3hsSCffx+on+4NBoLoRfSMw4KPQwVcLsAGf4AMfa+SWIP7es/sr+5/G1t326AbyvGccyyneyIbSb7sVAVcHk0AUpaElfaftDlBVRUmTGraUVgkCPbZ6ooRXo3XpyEV97fx6H3852r4d13fAengBnLby/7W85lBOpsb6KOHeaEUGG3ac0NEi3XHtrX61pJmw2a6p3jOFqL/J3lH18LmLJGGIc8Ru2IibClRjZJNkf4e0Mrw+h6M8Qg8NhQYcSkmA8Pm7mWmwU8/ANHMC6N`;
globalThis.EXAMPLE1 = `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`;
globalThis.EXAMPLE_DEFAULT = `EDS0040000eJytVN9v00AM/leieyWM/GgniBCivICE4GVoL9MUuTk3PfVyF91dunbT+NuxkzZZAQ0VqKLq4rM/f/7s+EFoNHVYi2IWCwkBRHHzIJQURRqLFhyaIIokFsrI47GyWkPrkXxWoD2Sn7OtF8WDME4UQsQi7Fuk0wKM150KytRkBDABdNlayiiKLBZL9NUaXcPXhZBqtULOpxA1uzctOqgJ53I+IJYbWKIuDZQBtUbOle3SS/I9iS0l6gDlFJ8nxBqkQz+xK0/T9faqc1ssoQu2AQiD7RRZ+dKjxoreVmP1G+tCX+aWarE1F8eRBqB5km/gvrXWTezFYyy87VyFWnlKaDqtH+NB/mySP53kT8+R/4N1kt6IdI0AdC6C6/Aps1GUZ4jkE5FsIpKdQ+Sz+68T8LvO/NpzisCNP7RxUF/bCsidTF9fLc4chAGBtFSmXHbKj0X//YSMkKTLHd6regw4duiZtsymtuRTW/J/m4+f0v9hQG7pngrdEtZNP1mnf3TNRG/SOIvzeHbLRJQJZYClRqaDhk8LkrntezZM5xpVveZRv3wTiwZ2d0ryekpfp6y1bzXsB/eEFaiZHm2skygfwA27yhN2H8tk2bsBt0HnhwoI30qkpgRVAfce6MP04gCwHxH2B9wWaLy8uu9324w1YWk5HHt9V4oGGxq+RjTSAUie7wYuUDKsvTP9d39NW4A1jhbVOmB/fLt0764CRYQo4XNCv4joEk5ANnxDXUQv8iwi+/Fh+8erL0f76QW+bEBRzPaQ7ALGZO+lbVCZiyVy+w1Ve1hISmLD829NcJYFYaDeZ2V520a7KMuT6+j7PIk+3bMA9Klwk+eDlFy4VEE8/gDGURmI`;


globalThis.HLRedrawTreeHTML = () => {
    globalThis.toggleAppView('2col');
    const settings = document.getElementById("settings");
    if (settings !== null) settings.innerHTML = "";
    const left_col_inner = document.getElementById("left_col_inner");
    if (left_col_inner !== null) left_col_inner.replaceChildren();
}

globalThis.HLRedrawTreeHTMLLight = () => {
    // React subscribes to SchemaStore and renders interactive HTML itself.
}

globalThis.HLRedrawTreeSVG = () => {
    const legendButton = 'inline-flex size-6 items-center justify-center rounded border border-neutral-300 bg-neutral-100 align-middle text-sm font-bold';
    let str:string = '<b>Tekening: </b>Gebruik de + knoppen op de lijnen om een onderdeel tussen twee symbolen of aan het einde van een tak toe te voegen. Ga naar het print-menu om de tekening af te printen of te exporteren als SVG vector graphics.<br><br>'
                   + '<div id="EDS">' + flattenSVGfromString(globalThis.structure.toSVG(0,"horizontal").data,10) + '</div>'
                   + '<h2>Legende:</h2>'
                   + `<button class="${legendButton}">↑</button> Item hierboven invoegen (zelfde niveau)<br>`
                   + `<button class="${legendButton}">↓</button> Item hieronder invoegen (zelfde niveau)<br>`
                   + `<button class="${legendButton}">↳</button> Afhankelijk item hieronder toevoegen (niveau dieper)<br>`
                   + `<button class="${legendButton}">🗑</button> Item verwijderen<br>`
                   + '<i><br><small>Versie: ' + BUILD_DATE
                   + ' (C) Ivan Goethals -- <a href="license.html" target="popup" onclick="window.open(\'license.html\',\'popup\',\'width=800,height=600\'); return false;">Terms</a></small></i><br><br>';

    const right_col_inner = document.getElementById("right_col_inner");
    if (right_col_inner != null) right_col_inner.innerHTML = str;
    synchronizeSchemaStoreWithLegacyDocument();
}

globalThis.HLRedrawTree = () => {
    globalThis.HLRedrawTreeHTML();
    globalThis.HLRedrawTreeSVG();
}

function buildNewStructure(structure: Hierarchical_List) {

    // Eerst het hoofddifferentieel maken
    let itemCounter:number = 0;
    structure.addItem("Aansluiting");
    structure.data[0].props.type  = "Aansluiting";
    structure.data[0].props.naam = "";
    structure.data[0].props.bescherming  = "differentieel";
    structure.data[0].props.aantal_polen  = CONF_aantal_fazen_droog;
    structure.data[0].props.amperage  = CONF_hoofdzekering;
    structure.data[0].props.type_kabel_na_teller  = CONF_aantal_fazen_droog+"x16";
    structure.data[0].props.differentieel_delta_amperage = CONF_differentieel_droog;
    itemCounter++;

    // Dan het hoofdbord maken
    structure.insertChildAfterId(new Bord(structure),itemCounter);
    structure.data[itemCounter].props.type = "Bord";
    itemCounter++;

    // Nat bord voorzien
    structure.insertChildAfterId(new Kring(structure),itemCounter);
    structure.data[itemCounter].props.type  = "Kring";
    structure.data[itemCounter].props.autoKringNaam  = "manueel";
    structure.data[itemCounter].props.bescherming  = "differentieel";
    structure.data[itemCounter].props.aantal_polen  = CONF_aantal_fazen_nat;
    structure.data[itemCounter].props.amperage  = CONF_hoofdzekering;
    structure.data[itemCounter].props.kabel_is_aanwezig = false;
    structure.data[itemCounter].props.differentieel_delta_amperage = CONF_differentieel_nat;
    itemCounter++;
    structure.insertChildAfterId(new Bord(structure),itemCounter);
    structure.data[itemCounter].props.type = "Bord";
    structure.data[itemCounter].props.is_geaard = false; // Geaard
    itemCounter++;

    // Pas info aan
    switch (CONF_aantal_fazen_droog) {
        case 2: structure.properties.info = '2 x 230V ~50 Hz'; break;
        case 3: structure.properties.info = '3 x 230V ~50 Hz'; break;
        case 4: structure.properties.info = '3 x 400V + N ~50 Hz';
    }
}

function reset_all() {
    if (globalThis.structure != null) globalThis.structure.dispose();
    globalThis.structure = new Hierarchical_List();
    buildNewStructure(globalThis.structure);
    globalThis.topMenu.selectMenuItemByName('Eéndraadschema');
    globalThis.undostruct.clear();
    globalThis.undostruct.store();
}

function openContactForm() {
    var strleft: string = PROP_Contact_Text;
    strleft = strleft.replace(/Bewerken/g, "Eéndraadschema");
    const configsection = document.getElementById("configsection");
    if (configsection != null) configsection.innerHTML = strleft;
    globalThis.toggleAppView('config');
}

function restart_all() {
    var strleft: string = globalThis.CONFIGPAGE_LEFT;

    strleft +=
    `
      Hoofddifferentieel (in mA) <input id="differentieel_droog" type="text" size="5" maxlength="5" value="300"><br><br>
      Hoofdzekering (in A) <input id="hoofdzekering" type="text" size="4" maxlength="4" value="65"><br><br>
      Aantal fazen:
      <select id="aantal_fazen_droog"><option value="2">2p</option><option value="3">3p</option><option value="4">4p (3p+n)</option></select>`;

    strleft += globalThis.CONFIGPAGE_RIGHT;

    strleft += PROP_development_options();

    // --- Changelog section ---
    strleft += `<h2>Recent toegevoegde functionaliteiten</h2>`;
    if (Array.isArray(changelog)) {
        strleft += `<table style="width:100%;border-collapse:collapse;">`;
        for (let i = 0; i < Math.min(10, changelog.length); i++) {
            const entry = changelog[i];
            strleft += `
                <tr>
                    <td style="vertical-align:top; font-weight:bold; white-space:nowrap; padding-right:10px;">${entry.date}</td>
                    <td style="vertical-align:top;">${entry.msg}</td>
                </tr>
            `;
        }
        strleft += `</table>`;
    }

    const configsection = document.getElementById("configsection");
    if (configsection != null) configsection.innerHTML = strleft;
    globalThis.toggleAppView('config');

    if (browser_ie_detected()) {
       alert("Deze appicatie werkt niet in Internet Explorer. Wij raden aan een moderne browser te gebruiken zoals Edge, Firefox, Google Chrome, Opera, Vivaldi, ...");
    }
}

globalThis.toggleAppView = (type: '2col' | 'config' | 'draw') => {
    let lastview = globalThis.structure.properties.currentView;
    if ((globalThis.structure.sitplanview != null) && (globalThis.structure.sitplanview.contextMenu != null)) globalThis.structure.sitplanview.contextMenu.hide();

    globalThis.structure.properties.currentView = type;
    if (type === "2col") workspaceStore?.commands.selectTab("schema");
    if (type === "draw") workspaceStore?.commands.selectTab("situation");

    const configsection = document.getElementById("configsection");
    const outerdiv = document.getElementById("outerdiv");
    const ribbon = document.getElementById("ribbon");
    const canvas_2col = document.getElementById("canvas_2col");
    const workspaceSidebar = document.getElementById("react-workspace-sidebar");
    const workspaceInspector = document.getElementById("properties_col");
    const workspaceCommandBar = document.getElementById("react-workspace-commandbar-root");
    const boardLayout = document.getElementById("react-board-layout-root");
    const left_col_inner = document.getElementById("left_col_inner");
    const EDSSVG = document.getElementById("EDSSVG");
    boardLayout?.classList.add("hidden");

    if (type === '2col') {
        if (configsection == null) return;
        if (outerdiv == null) return;
        if (ribbon == null) return;
        if (canvas_2col == null) return;

        if (canvas_2col.style.display === 'none') {
            ribbon.style.display = 'flex';
            canvas_2col.style.display = 'flex';
            workspaceSidebar?.classList.remove("hidden");
            workspaceInspector?.classList.remove("hidden");
            workspaceCommandBar?.classList.remove("hidden");
            configsection.style.display = 'none';
            outerdiv.style.display = 'none';

            configsection.innerHTML = '';

            globalThis.structure.updateRibbon();
        }

    } else if (type === 'config') {
        if (configsection == null) return;
        if (outerdiv == null) return;
        if (ribbon == null) return;
        if (left_col_inner == null) return;
        if (canvas_2col == null) return;

        if (configsection.style.display === "none") {
            configsection.style.display = 'block';
            outerdiv.style.display = 'none';
            ribbon.style.display = 'none';
            workspaceSidebar?.classList.add("hidden");
            workspaceInspector?.classList.add("hidden");
            workspaceCommandBar?.classList.add("hidden");

            ribbon.innerHTML = ''; // Voor performance redenen
        }

        left_col_inner.innerHTML = ''; // Voor performance redenen

        // We zetten bewist het SVG element EDS niet op nul want is nodig voor het print-voorbeeld

        canvas_2col.style.display = 'none';
    } else if (type === 'draw') {
        if (configsection == null) return;
        if (outerdiv == null) return;
        if (ribbon == null) return;
        if (left_col_inner == null) return;
        if (canvas_2col == null) return;

        if (outerdiv.style.display === 'none') {
            outerdiv.style.display = 'flex';
            ribbon.style.display = 'flex';
            configsection.style.display = 'none';
            canvas_2col.style.display = 'none';
            workspaceSidebar?.classList.remove("hidden");
            workspaceInspector?.classList.remove("hidden");
            workspaceCommandBar?.classList.remove("hidden");

            configsection.innerHTML = "";
            left_col_inner.innerHTML = ''; // Voor performance redenen

            if (EDSSVG !== null) EDSSVG.innerHTML = ''; // Deze is nodig anders wil het situatieschema het patroon VerticalStripe niet laden wegens dubbel gedefinieerd
                                                        // We maken de EDSSVG leeg en niet de EDS-DIV want anders onthoudt de browser de positie van de scrollbars niet
        }
    }

    if ( (['2col','draw'].includes(type)) && (['2col','draw'].includes(lastview)) && (type !== lastview) )
        globalThis.undostruct.store();

}

globalThis.load_example = (nr: number) => {
    switch (nr) {
        case 0:
            EDStoStructure(globalThis.EXAMPLE0);
            globalThis.fileAPIobj.clear();
            break;
        case 1:
            EDStoStructure(globalThis.EXAMPLE1);
            globalThis.fileAPIobj.clear();
            break;
    }
}

globalThis.undoClicked = () => {
    if ((globalThis.structure.sitplanview != null) && (globalThis.structure.sitplanview.contextMenu != null)) globalThis.structure.sitplanview.contextMenu.hide();
    if (schemaCommandHistoryIsActive()) schemaStore!.commands.undo();
    else globalThis.undostruct.undo();
}

globalThis.redoClicked = () => {
    if ((globalThis.structure.sitplanview != null) && (globalThis.structure.sitplanview.contextMenu != null)) globalThis.structure.sitplanview.contextMenu.hide();
    if (schemaCommandHistoryIsActive()) schemaStore!.commands.redo();
    else globalThis.undostruct.redo();
}

globalThis.read_settings = () => {
  CONF_aantal_fazen_droog = parseInt((document.getElementById("aantal_fazen_droog") as HTMLInputElement).value);
  CONF_aantal_fazen_nat = CONF_aantal_fazen_droog;
  CONF_hoofdzekering = parseInt((document.getElementById("hoofdzekering") as HTMLInputElement).value);
  CONF_differentieel_droog = parseInt((document.getElementById("differentieel_droog") as HTMLInputElement).value);
  globalThis.fileAPIobj.clear();
  reset_all();
}

//--- MAIN PROGRAM ---

// Define content of index.html container

const container = document.getElementById('container');

if (container == null) throw new Error("HTML element container is null");

container.innerHTML = `
<div id="react-editor-root"></div>
<div id="topmenu" class="flex h-[var(--menu-height)] w-full items-center border-b border-neutral-300 bg-neutral-200 px-2 select-none"><ul id="minitabs" class="m-0 flex h-full list-none items-center whitespace-nowrap p-0 text-left font-semibold"></ul></div>
<div id="app" class="flex-1 overflow-hidden">
<svg id="svgdefs"></svg> <!-- Bevat SVG patronen die app-wide gebruikt worden -->
<div id="configsection" class="absolute inset-x-0 bottom-0 top-[calc(var(--react-shell-height)+var(--menu-height))] overflow-auto bg-slate-50">
    <div class="flex h-screen items-center justify-center text-center text-lg font-bold">
    De App wordt geladen.<br><br>Even geduld..
    </div>
</div> <!-- Full page configuratie -->
<div id="ribbon" class="absolute inset-x-0 top-[calc(var(--react-shell-height)+var(--menu-height))] h-[var(--ribbon-height)] items-center justify-between border-b border-neutral-300 bg-neutral-50 select-none" style="display:none;">
    <div id="left-icons" class="flex h-full w-full items-center justify-start"></div>
    <div id="right-icons" class="flex h-full w-full items-center justify-end"></div>
</div> <!-- Ribbon -->
<div id="react-workspace-commandbar-root" class="fixed top-[calc(var(--react-shell-height)+var(--menu-height))] right-0 left-0 z-30 hidden h-[var(--ribbon-height)]"></div>
<aside id="react-workspace-sidebar" class="fixed top-[var(--total-offset)] bottom-0 left-0 z-10 hidden w-80 overflow-auto border-r border-neutral-300 bg-white">
    <div id="react-hierarchy-root"></div>
</aside>
<main id="react-board-layout-root" class="fixed top-[var(--total-offset)] right-80 bottom-0 left-80 z-0 hidden overflow-hidden"></main>
<div id="canvas_2col" class="absolute top-[var(--total-offset)] right-80 bottom-0 left-80 flex-row overflow-hidden bg-white pb-9 max-[52rem]:overflow-x-auto" style="display:none;"> <!-- Eendraadschema-->
    <div id="left_col" class="flex-[0.4] overflow-auto max-[52rem]:flex-[0_0_20rem]">
    <div id="left_col_inner" class="p-2.5 text-black"></div>
    </div>
    <div id="right_col" class="relative flex-[0.7] overflow-auto max-[52rem]:flex-[0_0_20rem]">
    <div id="right_col_inner" class="p-2.5 text-black"></div>
    <div id="react-schematic-controls-root" class="pointer-events-none absolute inset-0 z-[2]"></div>
    </div>
    <div id="react-statusbar-root" class="absolute inset-x-0 bottom-0"></div>
</div>
<div id="outerdiv" class="absolute top-[var(--total-offset)] right-80 bottom-0 left-80 flex-row bg-white" style="display:none;"> <!-- Situatieschets -->
    <div id="sidebar" class="h-full w-[var(--sideBarWidth)]"></div>
    <div id="canvas" class="absolute inset-y-0 right-0 left-[var(--sideBarWidth)] flex flex-row overflow-auto bg-white">
    <div id="paper" class="absolute top-[var(--paperPadding)] left-[var(--paperPadding)] h-[150mm] w-[277mm] rounded-md bg-white shadow-xl"></div>
    </div>
</div>
<aside id="properties_col" class="fixed top-[var(--total-offset)] right-0 bottom-0 z-10 hidden w-80 min-w-72 flex-[0.4] overflow-auto border-l border-neutral-300 bg-white max-[52rem]:flex-[0_0_20rem]" aria-label="Eigenschappen van het geselecteerde onderdeel">
    <div id="react-properties-root"></div>
</aside>
</div>`

// Configure the app-zone in the HTML

const svgdefs = document.getElementById('svgdefs');
if (svgdefs == null) throw new Error("HTML element svgdefs is null");

svgdefs.innerHTML =
    '<pattern id="VerticalStripe" x="5" y="0" width="5" height="10" patternUnits="userSpaceOnUse" >' +
    '<line x1="0" y1="0" x2="0" y2="10" stroke="black" />' +
    '</pattern>';

// Add file input elements

if (!document.getElementById('importfile')) {
  document.body.innerHTML += `
    <input id="importfile" type="file" accept=".eds" onchange="importjson(event)" style="display:none;">
    <input id="appendfile" type="file" accept=".eds" onchange="appendjson(event)" style="display:none;">
    <input type="file" id="fileInput" accept="image/*" style="display:none;">
  `;
}

// Some general variables that are only used in main.ts

//declare var CONF_builddate: any; //needed to be able to read the variable from the builddate.js file (otherwise compiler will complain)

var CONF_aantal_fazen_droog = 2;
var CONF_aantal_fazen_nat = 2;
var CONF_hoofdzekering = 65;
var CONF_differentieel_droog = 300;
var CONF_differentieel_nat = 30;

// Build the menu

let menuItems: MenuItem[]

menuItems = [
    { name: 'Nieuw', callback: restart_all },
    { name: 'Bestand', callback: () => workspaceStore?.commands.openDialog("file") },
    { name: 'Eéndraadschema', callback: globalThis.HLRedrawTree },
    { name: 'Situatieschema', callback: showSituationPlanPage },
    { name: 'Print', callback: () => workspaceStore?.commands.openDialog("print") },
    { name: 'Documentatie', callback: showDocumentationPage },
    { name: 'Info/Contact', callback: openContactForm }
];

PROP_edit_menu(menuItems);

globalThis.topMenu = new TopMenu('minitabs', 'menu-item', menuItems);

EDStoStructure(globalThis.EXAMPLE_DEFAULT,false); //Just in case the user doesn't select a scheme and goes to drawing immediately, there should be something there

schemaStore = new LegacySchemaStore(globalThis.structure);
globalThis.situationPlanStore = new LegacySituationPlanStore(globalThis.structure);
editorStore = new LocalEditorStore();
workspaceStore = new LocalWorkspaceStore();
if (new URLSearchParams(window.location.search).get("mcp") === "on") {
    new BrowserMcpBridge(schemaStore, globalThis.situationPlanStore).connect();
}
const reactEditorRoot = document.getElementById("react-editor-root");
const reactHierarchyRoot = document.getElementById("react-hierarchy-root");
const reactPropertiesRoot = document.getElementById("react-properties-root");
const reactPropertiesColumn = document.getElementById("properties_col");
const reactStatusBarRoot = document.getElementById("react-statusbar-root");
const reactEditorCanvas = document.getElementById("canvas_2col");
const reactCommandBarRoot = document.getElementById("react-workspace-commandbar-root");
const reactBoardLayoutRoot = document.getElementById("react-board-layout-root");
const situationPaperElement = document.getElementById("paper");
const legacyHierarchyRoot = document.getElementById("left_col_inner");
const legacyHierarchyColumn = document.getElementById("left_col");
const svgPreviewElement = document.getElementById("right_col_inner");
const schematicControlsRoot = document.getElementById("react-schematic-controls-root");
const reactHierarchyIsEnabled = reactHierarchyRoot !== null;
reactSchemaHistoryEnabled = reactHierarchyIsEnabled;

const saveStatusStore = new LegacySaveStatusStore(() => ({
    hasUnsavedChanges: globalThis.autoSaver !== undefined
        && globalThis.autoSaver.hasChangesSinceLastManualSave(),
    filename: globalThis.structure.properties.filename,
}));
const situationHistoryStore = new LegacyHistoryStatusStore(() => ({
    canUndo: globalThis.undostruct.undoStackSize() > 0,
    canRedo: globalThis.undostruct.redoStackSize() > 0,
}));
const situationPlanAssetService = situationPaperElement === null
    ? null
    : new LegacySituationPlanAssetService(
        schemaStore,
        globalThis.situationPlanStore,
        situationPaperElement,
        () => situationHistoryStore.refresh(),
    );

if (legacyHierarchyRoot !== null) legacyHierarchyRoot.hidden = true;
if (legacyHierarchyColumn !== null) legacyHierarchyColumn.hidden = true;
if (reactHierarchyRoot !== null) reactHierarchyRoot.hidden = false;
if (reactPropertiesRoot !== null) reactPropertiesRoot.hidden = false;
reactPropertiesColumn?.classList.remove("hidden");
if (reactEditorRoot !== null) {
    mountEditorApp(
        reactEditorRoot,
        schemaStore,
        editorStore,
        reactHierarchyIsEnabled ? reactHierarchyRoot : null,
        {
            propertiesMountElement: reactHierarchyIsEnabled ? reactPropertiesRoot : null,
            saveStatusStore,
            statusBarMountElement: reactStatusBarRoot,
            zoomTargetElement: svgPreviewElement,
            schematicControlsMountElement: schematicControlsRoot,
            situationPlanStore: globalThis.situationPlanStore,
            onSituationPlanMutation: (historyKey) => {
                globalThis.undostruct.store(historyKey);
                situationHistoryStore.refresh();
            },
            onSituationPlanZoomIn: () => {
                globalThis.structure.sitplanview?.contextMenu?.hide();
                globalThis.structure.sitplanview?.zoomIncrement(0.1);
            },
            onSituationPlanZoomOut: () => {
                globalThis.structure.sitplanview?.contextMenu?.hide();
                globalThis.structure.sitplanview?.zoomIncrement(-0.1);
            },
            onSituationPlanZoomToFit: () => {
                globalThis.structure.sitplanview?.contextMenu?.hide();
                globalThis.structure.sitplanview?.zoomToFit();
            },
            onSituationPlanItemsDeleted: (itemIds) => {
                if (itemIds.length === 0) return;
                schemaStore?.synchronizeLegacyDocument(globalThis.structure);
                editorStore?.commands.reconcileItemIds(new Set(
                    schemaStore?.getSnapshot().document.getAllItems().map(item => item.id) ?? [],
                ));
            },
            onSituationPlanSelectAll: () => {
                const view = globalThis.structure.sitplanview;
                if (!view) return;
                view.clearSelection();
                const activePage = globalThis.structure.sitplan.getActivePage();
                for (const element of globalThis.structure.sitplan.getElements()) {
                    if (element.page === activePage) view.selectBox(element.boxref);
                }
            },
            onSituationPlanClearSelection: () => {
                globalThis.structure.sitplanview?.clearSelection();
                workspaceStore?.commands.selectSituationElement(null);
            },
            onSituationPlanSendBackward: () => {
                globalThis.structure.sitplanview?.contextMenu?.hide();
                globalThis.structure.sitplanview?.sendToBack();
            },
            onSituationPlanBringForward: () => {
                globalThis.structure.sitplanview?.contextMenu?.hide();
                globalThis.structure.sitplanview?.bringToFront();
            },
            workspaceStore,
            onSelectWorkspaceTab: (tab) => {
                if (tab === "schema") globalThis.HLRedrawTree();
                else if (tab === "situation") showSituationPlanPage();
                else {
                    globalThis.toggleAppView("2col");
                    workspaceStore?.commands.selectTab("board");
                    reactEditorCanvas?.style.setProperty("display", "none");
                    reactBoardLayoutRoot?.classList.remove("hidden");
                }
            },
            canCreateSituationOccurrence: (itemId) => {
                const item = globalThis.structure.getElectroItemById(itemId);
                return item !== null
                    && globalThis.structure.sitplan.countByElectroItemId(itemId) < item.maxSituationPlanElements();
            },
            onCreateSituationOccurrence: (itemId) => {
                showSituationPlanPage();
                const defaults = globalThis.structure.sitplan.getDefaults();
                globalThis.structure.sitplanview?.addElectroItem(
                    itemId,
                    "auto",
                    "",
                    "rechts",
                    defaults.fontsize,
                    defaults.scale,
                    defaults.rotate,
                );
                globalThis.structure.placementTasks = globalThis.structure.placementTasks.filter(task => !(task.itemId === itemId && task.destination === "situation"));
                globalThis.situationPlanStore.synchronizeLegacyDocument(globalThis.structure);
                schemaStore?.synchronizeLegacyDocument(globalThis.structure);
                const created = globalThis.structure.sitplan.getElements()
                    .filter(candidate => candidate.getElectroItemId() === itemId)
                    .at(-1);
                workspaceStore?.commands.selectSituationElement(created?.id ?? null);
            },
            onRevealSituationOccurrence: (occurrenceId) => {
                showSituationPlanPage();
                const element = globalThis.structure.sitplan.getElements()
                    .find(candidate => candidate.id === occurrenceId);
                if (!element) return;
                globalThis.structure.sitplanview?.selectPage(element.page);
                globalThis.structure.sitplanview?.selectOneBox(element.boxref);
                workspaceStore?.commands.selectSituationElement(element.id);
            },
            onRevealBoardItem: (itemId) => {
                const boardId = schemaStore?.getSnapshot().document.getBoardForItem(itemId)?.id;
                if (!boardId) return;
                globalThis.toggleAppView("2col");
                workspaceStore?.commands.selectTab("board");
                editorStore?.commands.selectBoard(boardId, itemId);
                reactEditorCanvas?.style.setProperty("display", "none");
                reactBoardLayoutRoot?.classList.remove("hidden");
            },
            situationPaperElement,
            commandBarMountElement: reactCommandBarRoot,
            boardLayoutMountElement: reactBoardLayoutRoot,
            situationHistoryStore,
            onSituationUndo: () => {
                globalThis.undoClicked();
                situationHistoryStore.refresh();
            },
            onSituationRedo: () => {
                globalThis.redoClicked();
                situationHistoryStore.refresh();
            },
            onSave: () => {
                fileService.saveDocument(false).catch((error) => {
                    if ((error as { name?: string }).name !== "AbortError") console.error(error);
                });
            },
            onOpenFile: () => workspaceStore?.commands.openDialog("file"),
            situationPlanAssetService,
            fileService,
            printService,
            onOpenDocument: () => globalThis.loadClicked(),
            onAppendDocument: () => globalThis.importToAppendClicked(),
            onDownloadPrintSvg: (svg, filename) => {
                download_by_blob(svg, filename, "data:image/svg+xml;charset=utf-8");
            },
        },
    );
}
if (reactHierarchyIsEnabled) {
    schemaStore.subscribe(() => {
        globalThis.structure = schemaStore!.getLegacyDocument();
        globalThis.HLRedrawTreeSVG();
        globalThis.structure.updateRibbon();
        saveStatusStore.refresh();
    });
}
globalThis.situationPlanStore.subscribe(() => {
    if (globalThis.structure.properties.currentView === 'draw') {
        const selectedIds = workspaceStore?.getSnapshot().selectedSituationElementIds ?? [];
        const view = globalThis.structure.sitplanview;
        view?.redraw();
        for (const elementId of selectedIds) {
            const element = globalThis.structure.sitplan.getElements()
                .find(candidate => candidate.id === elementId);
            view?.selectBox(element?.boxref ?? null);
        }
    }
});
// Filename edits and legacy-view mutations bypass the schema store; a coarse
// timer keeps the React save status in sync with them.
window.setInterval(() => {
    saveStatusStore.refresh();
    situationHistoryStore.refresh();
}, 2000);

// Create the autoSaver
// - the constructor takes a function that points it to the latest globalThis.structure whenever it asks for it
// - We also add a callback function that is called after each save performed by the autoSaver.  This function will update the Save icon in the ribbon when needed

globalThis.autoSaver = new AutoSaver(5, () => {return(globalThis.structure);}); // Als globale variabele moet dit een var zijn en geen let
globalThis.autoSaver.setCallbackAfterSave((() => { // Update ribbons after each save (automatic or manual) by the autoSaver, but only if the lastSavedType changed
    let lastSavedType = globalThis.autoSaver.getSavedType();
    function updateRibbons(){
        saveStatusStore.refresh();
        const currentSavedType = globalThis.autoSaver.getSavedType();
        if (lastSavedType === currentSavedType) return; // Only update the ribbons if the type changed
        lastSavedType = currentSavedType;
        globalThis.structure.updateRibbon();
        if (globalThis.structure.sitplanview) globalThis.structure.sitplanview.updateRibbon();
    }
    return updateRibbons;
})());

// Finally check if there is anything in the autosave and load it

let recoveryAvailable = false
let lastSavedStr:string|null = null;
let lastSavedInfo:any = null;

(async () => {
    [lastSavedStr, lastSavedInfo] = await globalThis.autoSaver.loadLastSaved();
    if ((lastSavedStr != null) /* && (lastSavedInfo.recovery == true) */ ) recoveryAvailable = true;
})().then(() => {
    if (!recoveryAvailable) {
        EDStoStructure(globalThis.EXAMPLE_DEFAULT,false);
        restart_all();
        let myCookieBanner = new CookieBanner();
        myCookieBanner.run();
    } else {
        const helperTip = new HelperTip(globalThis.appDocStorage);
        helperTip.show( 'file.autoRecovered',
                        `<h3>Laatste schema geladen uit browsercache</h3>` +
                        `<p>Deze tool vond een schema in de browsercache. `+
                            `Dit schema dateert van <b>${lastSavedInfo.currentTimeStamp}</b> ` +
                            `met als naam <b>${lastSavedInfo.filename}</b>. ` +
                            `U kan op dit gerecupereerde schema verder werken of een ander schema laden in het "Bestand"-menu.</p>` +
                        `<p><b>Opgelet! </b>De browsercache is een tijdelijke opslag, en wordt occasioneel gewist. ` +
                            `Het blijft belangrijk uw werk regelmatig op te slaan om gegevensverlies te voorkomen.</p>`
                        ,false,(() => {
                            let myCookieBanner = new CookieBanner();
                            myCookieBanner.run();
                        }).bind(this));
        if (lastSavedStr == null) return;
        EDStoStructure(lastSavedStr, true, true);
        if (globalThis.structure.sitplan) globalThis.structure.sitplan.setActivePage(1);
    }
    globalThis.autoSaver.start();
});
