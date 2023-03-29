import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
export declare class DivOverlayLayer extends LayerBase {
    overlay: vjmap.DivOverlay;
    constructor();
    createDivOverlay(properties: Record<string, any>, options: Record<string, any>, map: Map): void;
    addLayer(map: Map, mapLayer: MapLayer): Promise<void>;
    setVisible(map: Map, layerId: string, visibleOff?: boolean): void;
    removeLayer(map: Map, layerId: string): void;
}
