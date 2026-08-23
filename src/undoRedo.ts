import { loadFromText } from "./importExport/importExport";
import { showSituationPlanPage } from "./sitplan/SituationPlanView";
import { DocumentSnapshotHistory } from "./application/DocumentSnapshotHistory";

class LargeStringStore {
    private data:string[] = [];

    push(text: string): number {
        this.data.push(text);
        return (this.data.length-1);
    }

    pushIfNotExists(text: string): number {
        let index = this.data.indexOf(text);
        if (index == -1) {
            this.data.push(text);
            return (this.data.length-1);
        } else {
            return index;
        }
    }

    get(index: number): string {
        return this.data[index];
    }

    clear() {
        this.data = [];
    }
}

export class undoRedo {
    private historyEds: DocumentSnapshotHistory;
    private historyOptions: DocumentSnapshotHistory;
    private largeStrings: LargeStringStore = new LargeStringStore();

    private samenVoegSleutel: string|null = null; // Indien de store functie wordt opgeroepen met deze string wordt geen nieuwe undo stap gecreëerd maar de vorige aangepast

    constructor(maxSteps: number = 100) {
        this.historyEds = new DocumentSnapshotHistory(undefined, maxSteps, false);
        this.historyOptions = new DocumentSnapshotHistory(undefined, maxSteps, false);
    }

    replaceSVGsByStringStore() {
        if (globalThis.structure.sitplan != null) {
            for (let element of globalThis.structure.sitplan.getElements()) {
                if (!element.isEendraadschemaSymbool()) element.svg = this.largeStrings.pushIfNotExists(element.getUnscaledSVGifNotElectroItem()).toString();
            }
        }
    }

    replaceStringStoreBySVGs() {
        if (globalThis.structure.sitplan != null) {
            for (let element of globalThis.structure.sitplan.getElements()) {
                if (!element.isEendraadschemaSymbool()) element.svg = this.largeStrings.get(parseInt(element.svg));
            }
        }
    }

    getOptions(): string {
        let options:any = {};

        if (globalThis.structure.sitplanview != null) {
            options.selectedBoxesOrdinals = globalThis.structure.sitplanview.getSelectedBoxesOrdinals();
            if ((globalThis.structure.sitplanview.sideBar as any).getUndoRedoOptions != null) {
                Object.assign(options,(globalThis.structure.sitplanview.sideBar as any).getUndoRedoOptions());
            }
        }

        return(JSON.stringify(options));
    }

    store(sleutel: string|null = null) {
        let overschrijfVorige = false;

        if ( (sleutel != null) && (sleutel == this.samenVoegSleutel) ) overschrijfVorige = true;
        this.samenVoegSleutel = sleutel;

        // We store the current state of the globalThis.structure in the history but we replace the SVGs by a reference to a large string store
        this.replaceSVGsByStringStore();

        if (!overschrijfVorige) {
            this.historyEds.record(globalThis.structure.toJsonObject(false)); // needs to call with false as we want to keep currentView info
            this.historyOptions.record(this.getOptions());
        } else {
            this.historyEds.replace(globalThis.structure.toJsonObject(false)); // needs to call with false as we want to keep currentView info
            this.historyOptions.replace(this.getOptions());
        }
        
        this.replaceStringStoreBySVGs();

        if ( (globalThis.structure.properties.currentView == 'draw') && (globalThis.structure.sitplanview != null) ) globalThis.structure.sitplanview.updateRibbon();
        else if (globalThis.structure.properties.currentView == '2col') globalThis.structure.updateRibbon(); 
    }

    updateSelectedBoxes() {
        this.historyOptions.replace(this.getOptions());
    }

    reload(text: string|null, options: any) {
        this.samenVoegSleutel = null;

        let lastView = globalThis.structure.properties.currentView;
        let lastmode = globalThis.structure.mode;
        if (text != null) loadFromText(text, 0, false);
        
        // We replace the references to the large string store by the actual SVGs
        this.replaceStringStoreBySVGs();
        // We need to resort and clean the globalThis.structure to avoid bad references
        globalThis.structure.reSort();

        globalThis.structure.mode = lastmode;
        if (globalThis.structure.properties.currentView != lastView) globalThis.toggleAppView(globalThis.structure.properties.currentView as '2col' | 'config' | 'draw');
        switch (globalThis.structure.properties.currentView) {
            case 'draw': 
                globalThis.topMenu.selectMenuItemByOrdinal(3);
                showSituationPlanPage();
                
                if ((globalThis.structure.sitplanview.sideBar as any).setUndoRedoOptions != null) (globalThis.structure.sitplanview.sideBar as any).setUndoRedoOptions(options);

                if (options.selectedBoxesOrdinals == null) break;

                for (let selectedBox of options.selectedBoxesOrdinals) {
                    if (globalThis.structure.sitplan.getElements().length <= selectedBox) break;
                    let element = globalThis.structure.sitplan.getElements()[selectedBox];
                    if (element == null) break;
                    let htmlId = element.id;
                    if (htmlId == null) break;
                    let div = document.getElementById(htmlId);
                    if (div != null) globalThis.structure.sitplanview.selectBox(div);
                }

                break;
            case '2col': globalThis.topMenu.selectMenuItemByOrdinal(2); globalThis.HLRedrawTree(); break;
            case 'config':
                globalThis.structure.properties.currentView = '2col';
                globalThis.toggleAppView('2col');
                globalThis.topMenu.selectMenuItemByOrdinal(2);
                globalThis.HLRedrawTree();
                break;
        }
    }

    undo() {
        let text:string|null = this.historyEds.undo() ?? null;
        let optionsString: string | null = this.historyOptions.undo() ?? null;
        let options: any = optionsString ? JSON.parse(optionsString) : {};
        this.reload(text,options);
    }

    redo() { 
        let text:string|null = this.historyEds.redo() ?? null;
        let optionsString: string | null = this.historyOptions.redo() ?? null;
        let options: any = optionsString ? JSON.parse(optionsString) : {};
        this.reload(text,options);
    }

    clear() {
        this.samenVoegSleutel = null;

        this.historyEds.clear();
        this.historyOptions.clear();
        this.largeStrings.clear();
        globalThis.structure.updateRibbon();
    }

    undoStackSize():number {return(this.historyEds.undoCount());}
    redoStackSize():number {return(this.historyEds.redoCount());}

}
