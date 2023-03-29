import { Map, IDrawTool } from 'vjmap';
export declare const deleteOrModifyCadEntity: (map: Map, draw: IDrawTool, updateMapStyleObj: any, isDelete: boolean, showInfoFunc?: Function, dlgConfirmInfo?: Function) => Promise<void>;
export declare const deleteCadEntity: (map: Map, draw: IDrawTool, updateMapStyleObj: any, showInfoFunc?: Function, dlgConfirmInfo?: Function) => Promise<void>;
export declare const modifyCadEntity: (map: Map, draw: IDrawTool, updateMapStyleObj: any, showInfoFunc?: Function, dlgConfirmInfo?: Function) => Promise<void>;
export declare const createGeomData: (map: Map, entities?: any, docMapBounds?: any, environment?: any, linetypes?: any, dbFrom?: any) => Promise<{
    type: string;
    features: {
        id: string;
        type: string;
        properties: any;
        geometry: any;
    }[];
}>;
export declare const loadDataToDraw: (map: Map, draw: IDrawTool, data: string, updateMapStyleObj: any) => Promise<void>;
