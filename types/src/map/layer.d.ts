import { Map } from "vjmap";
export declare const switchCadLayers: (map: Map, layers: {
    name: string;
    isOff: boolean;
}[], isVectorStyle: boolean) => Promise<void>;
export declare const switchVectorLayers: (map: Map, onLayers: string[]) => void;
export declare const setLayerOpacity: (map: Map, opacity: number, rasterLayerIdMatch?: string) => void;
export declare const setLayerToLowest: (map: Map, layerId: string) => void;
