import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
export declare class AnimateSymbolLayer extends LayerBase {
    animateSymbol: vjmap.ICreateSymbolAnimateLayerResult;
    constructor();
    addLayer(map: Map, mapLayer: MapLayer): Promise<void>;
    getLayerId(): string;
    setVisible(map: Map, layerId: string, visibleOff?: boolean): void;
    removeLayer(map: Map, layerId: string): void;
}
