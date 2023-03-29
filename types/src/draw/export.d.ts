import { IDrawTool } from "vjmap";
import type { Map } from "vjmap";
export declare const exportDwg: (map: Map, draw: IDrawTool, newMapId?: string) => Promise<any>;
export declare const isTrackFeature: (feature: any) => boolean;
export declare const setTrackFeatureProperty: (draw: IDrawTool, props: Record<string, any>) => void;
export declare const getTrackFeatureProperty: (draw: IDrawTool, key?: string) => any;
export declare const addExportRefInfoInText: (prj: any, data: any) => any;
