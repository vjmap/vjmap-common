import { Map } from "vjmap";
export declare function queryMapData(map: Map, queryParam: {
    condition?: string;
    bounds?: string;
    isContains?: boolean;
    coordType?: 0 | 1;
    clearPropData?: boolean;
}, condition?: Record<string, any>): Promise<any>;
export declare const toProperties: (param: Record<string, any>) => Record<string, any>;
export declare function ProcessDataToFeatureCollection(map: Map, res: any, isUseGeomCoord: boolean): any;
export declare function requestChangeData(map: Map, param: {
    reqType: 'GET' | 'POST' | "SOURCE";
    url: string;
    data?: any;
    header?: Record<string, string>;
    processJS?: string;
    fromSourceId?: string;
}, mapApp?: any): Promise<any>;
export declare const convertArrayToGeoJson: (value: Array<[number, number]>) => any;
export declare function evalDataConvert(featureCollection: any, code: string, map: Map, mapApp: any): Promise<any>;
