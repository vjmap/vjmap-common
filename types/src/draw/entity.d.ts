import { Map, IDrawTool } from 'vjmap';
export declare const editCadEntity: (map: Map, draw: IDrawTool, updateMapStyleObj: any, editOp: "delete" | "modify" | "copy", showInfoFunc?: Function, dlgConfirmInfo?: Function, isRectSel?: boolean, promptFunc?: Function) => Promise<void>;
export declare const deleteCadEntity: (map: Map, draw: IDrawTool, updateMapStyleObj: any, showInfoFunc?: Function, dlgConfirmInfo?: Function, isRectSel?: boolean, promptFunc?: Function) => Promise<void>;
export declare const modifyCadEntity: (map: Map, draw: IDrawTool, updateMapStyleObj: any, showInfoFunc?: Function, dlgConfirmInfo?: Function, isRectSel?: boolean, promptFunc?: Function) => Promise<void>;
export declare const copyCadEntity: (map: Map, draw: IDrawTool, updateMapStyleObj: any, showInfoFunc?: Function, dlgConfirmInfo?: Function, isRectSel?: boolean, promptFunc?: Function) => Promise<void>;
export declare const createGeomData: (map: Map, entities?: any, docMapBounds?: any, environment?: any, linetypes?: any, dbFrom?: any, asFeatureCollection?: boolean) => Promise<{
    type: string;
    features: {
        id: any;
        type: string;
        properties: any;
    }[];
}>;
export declare const loadDataToDraw: (map: Map, draw: IDrawTool, data: string, updateMapStyleObj: any) => Promise<void>;
