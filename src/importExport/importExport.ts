import {
    decodeEds,
    structureFromJson,
} from "../legacy/persistence/EdsCodec";
import { DEFAULT_MAIN_BOARD_ID, type DistributionBoard } from "../domain/DistributionBoard";
import type { BoardLayout } from "../domain/BoardLayout";
import { LegacyFileService } from "../application/FileService";

export class importExportUsingFileAPI {

    saveNeeded: boolean;
    fileHandle: any;
    filename: string;
    lastsaved: string;

    constructor() {
        this.clear();
        //this.updateButtons();
    }

    clear() {
        this.saveNeeded = false;
        this.fileHandle = null;
        this.filename = null;
    }

    updateLastSaved() {
        var currentdate = new Date();
        this.lastsaved = currentdate.getHours().toString().padStart(2, '0') + ":" +
                         currentdate.getMinutes().toString().padStart(2, '0') + ":" +
                         currentdate.getSeconds().toString().padStart(2, '0');;
    }

    setSaveNeeded(input) {
        let lastSaveNeeded = this.saveNeeded;
        this.saveNeeded = input;
        //if (input !== lastSaveNeeded) this.updateButtons();
    }

    async readFile() {
        
        [this.fileHandle] = await (window as any).showOpenFilePicker({
            types: [{
                description: 'Eendraadschema (.eds)',
                accept: {'application/eds': ['.eds']},
            }],
        });

        const file = await (this.fileHandle as any).getFile();
        const contents = await file.text();

        this.filename = file.name;
        globalThis.structure.properties.filename = file.name;

        this.setSaveNeeded(false);

        this.updateLastSaved(); // Needed because EDStoStructure whipes everything   

        return contents;
    }

    async saveAs(content: string) {
        const options = {
            suggestedName: globalThis.structure.properties.filename,
            types: [{
                description: 'Eendraadschema (.eds)',
                accept: {'application/eds': ['.eds']},
            }],
            startIn: 'documents' // Suggests the Documents folder
        };

        this.fileHandle = await (window as any).showSaveFilePicker(options);
        await this.saveFile(content, this.fileHandle);      
    };

    async saveFile(content: any, handle: any) {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();

        this.filename = handle.name;
        globalThis.structure.properties.filename = handle.name;

        this.setSaveNeeded(false);

        this.updateLastSaved();
    };

    async save(content: string) {
        await this.saveFile(content, this.fileHandle);
    };
}

/** Single React-facing file adapter. The legacy file page and any future
 *  React file UI share it; it preserves the File System Access flow, the
 *  download fallback and manual autosave bookkeeping. */
export const fileService = new LegacyFileService({
    getDocument: () => globalThis.structure,
    getFileApi: () => globalThis.fileAPIobj,
    isFileApiAvailable: () => (window as any).showOpenFilePicker !== undefined,
    getManualSaver: () => globalThis.autoSaver,
    downloadFallback: (content, filename) => download_by_blob(content, filename, 'data:text/eds;charset=utf-8'),
    afterExport: (payload) => globalThis.propUpload(payload),
});

/**
 * Callback functie voor de legacy filepicker als de file API niet beschikbaar is in de browser.
 * @param event filepicker click event
 */
globalThis.importjson = (event) => {
    var input = event.target;
    var reader = new FileReader();
    var text:string = "";

    reader.onload = function(){
        EDStoStructure(reader.result.toString());
        if (globalThis.structure.sitplan) globalThis.structure.sitplan.setActivePage(1);
    };

    reader.readAsText(input.files[0]);
};

/**
 * Callback functie voor de legacy filepicker om een schema toe te voegen aan een reeds bestaand schema.
 * Dit doen we altijd via de legacy filepicker, aangezien dit toch een read-only situatie is.
 * @param event filepicker click event
 */
globalThis.appendjson = function(event) {
    var input = event.target;
    var reader = new FileReader();
    var text:string = "";

    reader.onload = function(){
        importToAppend(reader.result.toString());
    };

    reader.readAsText(input.files[0]);
};

/**
 * Wordt aangeroepen wanneer een gebruiker een bestand wil openen. Controleert of de fileAPI beschikbaar is in de browser.
 * Indien ja, wordt de fileAPI gebruikt. Indien niet, wordt de legacy functie importjson aangeroepen.
 * 
 * @returns {Promise<void>} Een promise die wordt opgelost wanneer het bestand is geladen en verwerkt.
 */
globalThis.loadClicked = async () => {
    if ((window as any).showOpenFilePicker) { // Use fileAPI
        let data = await fileService.openDocumentText();
        EDStoStructure(data);
        if (globalThis.structure.sitplan) globalThis.structure.sitplan.setActivePage(1);
    } else { // Legacy
        document.getElementById('importfile').click();
        (document.getElementById('importfile') as HTMLInputElement).value = "";
    }
}


/**
 * function importToAppendClicked() 
 * 
 * Vraagt om een EDS bestand op de machine te kiezen en voegt de inhoud toe aan het reeds geopende schema.
 * We gebruiken hier bewust niet de fileAPI aangezien die reeds gebruikt wordt voor het reeds geopende schema.
 */
globalThis.importToAppendClicked = async () => {
    document.getElementById('appendfile').click();
    (document.getElementById('appendfile') as HTMLInputElement).value = "";
}


/**
 * Exporteert de huidige structuur naar een bestand in het EDS-formaat.
 * @param {boolean} saveAs - Indien true, wordt de gebruiker gevraagd waar het bestand moet worden opgeslagen; anders wordt het bestand opgeslagen onder de bekende bestandsnaam.
 */
globalThis.exportjson = (saveAs: boolean = true) => { // Indien de boolean false is en de file API is geïnstalleerd, wordt een normale opslag uitgevoerd (bekende bestandsnaam)
    fileService.saveDocument(saveAs).catch((error) => {
        // A dismissed file picker rejects; that is not an application error.
        if ((error as { name?: string }).name !== "AbortError") console.error(error);
    });
}

/** @deprecated Import from legacy/persistence/EdsCodec in UI-independent code. */
export const json_to_structure = structureFromJson;

export function loadFromText(text: string, version: number, redraw = true) {
    globalThis.structure = structureFromJson(text, globalThis.structure, version);
    if (redraw == true) globalThis.topMenu.selectMenuItemByName('Eéndraadschema'); // Ga naar het bewerken scherm, dat zal automatisch voor hertekenen zorgen.
}

/**
 * Converteert een string in EDS formaat naar een json string.
 * De string kan eventueel eerst entropy gecodeerd en base64 encoded zijn.
 * De string kan ook een header hebben met een versie en een identificatie.
 * 
 * @param {string} mystring - De string die uit een bestand of een json string is geladen.
 * @returns {Object} - Een object met twee attributen: text en version. Text is de json string en version is de versie van de string.
 */
/** @deprecated Import from legacy/persistence/EdsCodec in UI-independent code. */
export const EDStoJson = decodeEds;

/* FUNCTION EDStoStructure
   
   Starts from a string that can be loaded from disk or from a file and is in EDS-format.
   puts the content in the javascript structure called "structure".
   Will redraw everything if the redraw flag is set.

*/

export function EDStoStructure(mystring: string, redraw = true, askUserToSave = false) {

    if (globalThis.autoSaver) globalThis.autoSaver.reset();

    let JSONdata = decodeEds(mystring);
    
    // Dump the json in into the structure and redraw if needed
    loadFromText(JSONdata.text, JSONdata.version, redraw);

    // Clear the undo stack and push this one on top
    globalThis.undostruct.clear();
    globalThis.undostruct.store();

    // Scroll to top left for the SVG and HTML, this can only be done at the end because "right col" has to actually be visible
    const leftelem = document.getElementById("left_col");
    if (leftelem != null) {
      leftelem.scrollTop = 0;
      leftelem.scrollLeft = 0;
    }
    
    const rightelem = document.getElementById("right_col");
    if (rightelem != null) {
      rightelem.scrollTop = 0;
      rightelem.scrollLeft = 0;
    }

    // Make a manual save in the autoSaver
    if (globalThis.autoSaver && !askUserToSave) globalThis.autoSaver.saveManually();
    if (askUserToSave) {
        globalThis.autoSaver.forceHasChangesSinceLastManualSave();
        globalThis.structure.updateRibbon();
    } 

}

/** Merge secondary boards from an appended document, remapping item IDs by `idOffset`
 *  and board IDs/feeder references so they stay unique and point at the merged items.
 *  Feederless (main) boards of the appended document are not copied: their root items
 *  become top-level items of the target main board. */
export function mergeAppendedBoards(
    targetBoards: readonly DistributionBoard[],
    appendedBoards: readonly DistributionBoard[],
    idOffset: number,
): DistributionBoard[] {
    const { targetMainBoardId, newIdByOldId } = createAppendedBoardIdMap(
        targetBoards, appendedBoards, idOffset);
    const mergedBoards = [...targetBoards];
    for (const board of appendedBoards) {
        if (board.feeder === undefined) continue;
        mergedBoards.push({
            ...board,
            id: newIdByOldId.get(board.id)!,
            rootItemIds: board.rootItemIds.map((itemId) => itemId + idOffset),
            feeder: {
                ...board.feeder,
                sourceBoardId: newIdByOldId.get(board.feeder.sourceBoardId) ?? targetMainBoardId,
                sourceCircuitId: board.feeder.sourceCircuitId + idOffset,
            },
        });
    }
    return mergedBoards;
}

export function mergeAppendedBoardLayouts(
    targetLayouts: readonly BoardLayout[],
    appendedLayouts: readonly BoardLayout[],
    targetBoards: readonly DistributionBoard[],
    appendedBoards: readonly DistributionBoard[],
    idOffset: number,
): BoardLayout[] {
    const { newIdByOldId } = createAppendedBoardIdMap(targetBoards, appendedBoards, idOffset);
    const mergedLayouts = targetLayouts.map(layout => ({
        ...layout,
        rails: [...layout.rails],
        placements: [...layout.placements],
    }));

    for (const appendedLayout of appendedLayouts) {
        const boardId = newIdByOldId.get(appendedLayout.boardId);
        if (!boardId) continue;
        const existing = mergedLayouts.find(layout => layout.boardId === boardId);
        const usedRailIds = new Set(existing?.rails.map(rail => rail.id) ?? []);
        const railIdMap = new Map<string, string>();
        const rails = appendedLayout.rails.map((rail) => {
            let id = rail.id;
            let suffix = 2;
            while (usedRailIds.has(id)) id = `${rail.id}-${suffix++}`;
            usedRailIds.add(id);
            railIdMap.set(rail.id, id);
            return { ...rail, id };
        });
        const placements = appendedLayout.placements.flatMap((placement) => {
            const railId = railIdMap.get(placement.railId);
            return railId
                ? [{ ...placement, itemId: placement.itemId + idOffset, railId }]
                : [];
        });
        if (existing) {
            existing.rails.push(...rails);
            existing.placements.push(...placements);
        } else {
            mergedLayouts.push({ boardId, rails, placements });
        }
    }
    return mergedLayouts;
}

function createAppendedBoardIdMap(
    targetBoards: readonly DistributionBoard[],
    appendedBoards: readonly DistributionBoard[],
    idOffset: number,
): Readonly<{ targetMainBoardId: string; newIdByOldId: ReadonlyMap<string, string> }> {
    const targetMainBoardId = (
        targetBoards.find((board) => board.id === DEFAULT_MAIN_BOARD_ID)
        ?? targetBoards.find((board) => board.feeder === undefined)
    )?.id ?? DEFAULT_MAIN_BOARD_ID;

    const usedIds = new Set(targetBoards.map((board) => board.id));
    const newIdByOldId = new Map<string, string>();
    for (const board of appendedBoards) {
        if (board.feeder === undefined) {
            newIdByOldId.set(board.id, targetMainBoardId);
            continue;
        }
        const preferredId = board.rootItemIds.length > 0
            ? `board-${board.rootItemIds[0] + idOffset}`
            : board.id;
        let candidateId = preferredId;
        let suffix = 2;
        while (usedIds.has(candidateId)) candidateId = `${preferredId}-${suffix++}`;
        usedIds.add(candidateId);
        newIdByOldId.set(board.id, candidateId);
    }
    return { targetMainBoardId, newIdByOldId };
}

function importToAppend(mystring: string, redraw = true) {
    let JSONdata = decodeEds(mystring);
    let structureToAppend = structureFromJson(JSONdata.text, null, JSONdata.version);

    //get the Maximal ID in array structure.id and call it maxID
    let maxID = 0;
    for (let i = 0; i < globalThis.structure.id.length; i++) {
        if (globalThis.structure.id[i] > maxID) maxID = globalThis.structure.id[i];
    }
    
    //then increase the ID's in structureToAppend accordingly
    for (let i = 0; i < structureToAppend.id.length; i++) {
        structureToAppend.id[i] += maxID;
        structureToAppend.data[i].id += maxID;
        if (structureToAppend.data[i].parent != 0) {
            structureToAppend.data[i].parent += maxID;
        }
    }
    globalThis.structure.curid += structureToAppend.curid;

    //then merge information for the eendraadschema
    globalThis.structure.length = globalThis.structure.length + structureToAppend.length;
    globalThis.structure.active = globalThis.structure.active.concat(structureToAppend.active);
    globalThis.structure.id = globalThis.structure.id.concat(structureToAppend.id);
    globalThis.structure.data = globalThis.structure.data.concat(structureToAppend.data);

    //then merge secondary distribution boards; the appended main board's items simply
    //become extra top-level items of the current main board
    const targetBoards = globalThis.structure.boards;
    globalThis.structure.boardLayouts = mergeAppendedBoardLayouts(
        globalThis.structure.boardLayouts,
        structureToAppend.boardLayouts,
        targetBoards,
        structureToAppend.boards,
        maxID,
    );
    globalThis.structure.boards = mergeAppendedBoards(
        targetBoards, structureToAppend.boards, maxID);

    //update the sourcelist
    globalThis.structure.data.forEach((item) => {
        item.sourcelist = globalThis.structure;
    });

    //then set the printer to autopage
    globalThis.structure.print_table.enableAutopage = true;

    //then merge the situation plans but only if both exist
    if (globalThis.structure.sitplan != null) {
        if (structureToAppend.sitplan != null) {

            // Eerst oude situationplanview leeg maken, anders blijven oude div's hangen
            if (globalThis.structure.sitplanview != null) globalThis.structure.sitplanview.dispose(); 

            // dan nieuw situationplan maken en bij openen van het schema zal automatisch een nieuw situationplanview gecreëerd wordne
            globalThis.structure.sitplanjson = globalThis.structure.sitplan.toJsonObject();
            structureToAppend.sitplanjson = structureToAppend.sitplan.toJsonObject();
            
            for (let i = 0; i < structureToAppend.sitplanjson.elements.length; i++) {
                if (structureToAppend.sitplanjson.elements[i].electroItemId != null)
                    structureToAppend.sitplanjson.elements[i].electroItemId += maxID;
                structureToAppend.sitplanjson.elements[i].page += globalThis.structure.sitplanjson.numPages;
            }

            if ( (globalThis.structure.sitplanjson != null) && (structureToAppend.sitplanjson != null) ) {
                globalThis.structure.sitplanjson.numPages += structureToAppend.sitplanjson.numPages;
                globalThis.structure.sitplanjson.elements = globalThis.structure.sitplanjson.elements.concat(structureToAppend.sitplanjson.elements);
            }
            globalThis.structure.sitplan.fromJsonObject(globalThis.structure.sitplanjson);
            
            globalThis.structure.sitplanjson = null;
        }
    }
    
    globalThis.structure.reSort();
    
    //then remove the pointer from structureToAppend and let the garbage collector do its work
    structureToAppend = null;   

    //redraw if needed
    if (redraw) globalThis.topMenu.selectMenuItemByName('Eéndraadschema');

    // Store only after having redrawn, anders worden we naar de print-pagina gestuurd bij undo
    globalThis.undostruct.store();
}

/** FUNCTION download_by_blob
 *
 *  Downloads an EDS file to the user's PC
 *
 */

export function download_by_blob(text, filename, mimeType): void {
    
    var element = document.createElement('a');
    if ((navigator as any).msSaveBlob) {
        (navigator as any).msSaveBlob(new Blob([text], {
        type: mimeType
        }), filename);
    } else if (URL && 'download' in element) {
        let uriContent = URL.createObjectURL(new Blob([text], {type : mimeType}));
        element.setAttribute('href', uriContent);
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        setTimeout(() => document.body.removeChild(element), 1000); // 1-second delay
    } else {
        this.location.go(`${mimeType},${encodeURIComponent(text)}`);
    }
    
}
