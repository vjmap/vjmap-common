import { MapLayer } from "./types";
import { Map } from 'vjmap';
export declare function toMapLayer(layer: MapLayer, props: Record<string, any>): MapLayer;
export declare function sleep(ms?: number): Promise<unknown>;
export declare function execProgram(code: string, map: Map, mapApp: any, context?: any): Promise<any>;
export declare const getShardsTileUrl: (tileUrl: string, map?: Map) => string[];
export declare const getTileShards: (tileUrl: string) => {
    tileUrl: string;
    tileShards: string;
};
export declare const isAlphanumeric: (char: string) => boolean;
export declare const isWebBaseMap: (baseMapType?: string) => boolean;
export declare const getEntityObjectId: (id: string) => string;
export declare const transformGeoJsonData: (map: Map, data: any, basePt: any, destPt: any, scale?: number, angle?: number) => any;
