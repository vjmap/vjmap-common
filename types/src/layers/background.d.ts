import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
export declare class BackgroundLayer extends LayerBase {
    background: vjmap.BackgroundLayer;
    constructor();
    addLayer(map: Map, mapLayer: MapLayer): Promise<void>;
    setVisible(map: Map, layerId: string, visibleOff?: boolean): void;
    removeLayer(map: Map, layerId: string): void;
}
