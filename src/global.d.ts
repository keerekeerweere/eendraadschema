import { Session } from "./Session";
import { MultiLevelStorage } from "./storage/MultiLevelStorage";
import { importExportUsingFileAPI } from "./importExport/importExport";
import { Hierarchical_List } from "./Hierarchical_List";
import { TopMenu } from "./TopMenu";
import { AutoSaver } from "./importExport/AutoSaver";
import { LegacySituationPlanStore } from "./application/LegacySituationPlanStore";

declare global {
    
    interface GlobalThis {
        session: Session;
        appDocStorage: MultiLevelStorage<any>;
        undostruct: any;
        structure: Hierarchical_List;
        topMenu: TopMenu;
        autoSaver: AutoSaver;
        situationPlanStore: LegacySituationPlanStore;
        CONFIGPAGE_LEFT: string;
        CONFIGPAGE_RIGHT: string;
        SITPLANVIEW_SELECT_PADDING: number;
        SITPLANVIEW_ZOOMINTERVAL: {MIN: number, MAX: number};
        SITPLANVIEW_DEFAULT_SCALE: number;
        fileAPIobj: importExportUsingFileAPI;
        EXAMPLE0: string;
        EXAMPLE1: string;
        EXAMPLE_DEFAULT: string;
        loadFromText: () => void;
        HLRedrawTree: () => void;
        HLRedrawTreeSVG: () => void;
        HLRedrawTreeHTML: () => void;
        HLRedrawTreeHTMLLight: () => void;
        toggleAppView: (type: '2col' | 'config' | 'draw') => void;
        load_example: (nr: number) => void;
        undoClicked: () => void;
        redoClicked: () => void;
        historyCanUndo: () => boolean;
        historyCanRedo: () => boolean;
        read_settings: () => void;
        propUpload: (text: string) => void;
        loadFileFromText: () => void;
    }
}

export{}
