import { MapLayer } from "../types";
import { Map } from "vjmap";
import LayerBase from "./base";
export declare class DrawLayer extends LayerBase {
    draw: any;
    sourceID: string;
    constructor();
    addLayer(map: Map, mapLayer: MapLayer): Promise<void>;
    setVisible(map: Map, layerId: string, visibleOff?: boolean): void;
    removeLayer(map: Map, layerId: string): void;
}
