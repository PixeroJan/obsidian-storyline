export interface CellData {
    id: string;
    content: string;
    bgColor: string;
    textColor: string;
    bold: boolean;
    italic: boolean;
    align: 'left' | 'center' | 'right';
    linkedSceneId?: string;
    /** When true, sync will not overwrite this cell's content */
    manualContent?: boolean;
}

export interface ColumnMeta {
    id: string;
    label: string;
    width: number;
    bgColor: string;
    textColor?: string;
    bold?: boolean;
    italic?: boolean;
    /** Background color for the header cell only (independent of column color) */
    headerBgColor?: string;
    /** 'auto' = created by Sync from Scenes, 'manual' = user-created */
    sourceType?: 'auto' | 'manual';
    /** For auto columns: the character name, tag, or location this column represents */
    sourceId?: string;
}

export interface RowMeta {
    id: string;
    label: string;
    height: number;
    bgColor: string;
    textColor?: string;
    bold?: boolean;
    italic?: boolean;
    /** Background color for the header cell only (independent of row color) */
    headerBgColor?: string;
    /** 'auto' = created by Sync from Scenes, 'manual' = user-created */
    sourceType?: 'auto' | 'manual';
    /** For auto rows: the scene filePath this row represents */
    sourceId?: string;
}

export interface PlotGridData {
    rows: RowMeta[];
    columns: ColumnMeta[];
    cells: Record<string, CellData>;
    zoom: number;
    stickyHeaders?: boolean;
}
