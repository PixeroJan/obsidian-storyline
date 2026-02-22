export interface CellData {
    id: string;
    content: string;
    bgColor: string;
    textColor: string;
    bold: boolean;
    italic: boolean;
    align: 'left' | 'center' | 'right';
    linkedSceneId?: string;
}

export interface ColumnMeta {
    id: string;
    label: string;
    width: number;
    bgColor: string;
    textColor?: string;
    bold?: boolean;
    italic?: boolean;
}

export interface RowMeta {
    id: string;
    label: string;
    height: number;
    bgColor: string;
    textColor?: string;
    bold?: boolean;
    italic?: boolean;
}

export interface PlotGridData {
    rows: RowMeta[];
    columns: ColumnMeta[];
    cells: Record<string, CellData>;
    zoom: number;
    stickyHeaders?: boolean;
}
