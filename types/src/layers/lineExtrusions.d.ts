import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
export declare class LineExtrusionsLayer extends LayerBase {
    fillExtrusion: vjmap.FillExtrusion;
    anim: any;
    constructor();
    addLayer(map: Map, mapLayer: MapLayer): Promise<void>;
    setLayerStyle(map: Map, layerId: string, layerProps: Record<string, any>, oldLayer: MapLayer): void;
    setVisible(map: Map, layerId: string, visibleOff?: boolean): void;
    removeLayer(map: Map, layerId: string): void;
}
