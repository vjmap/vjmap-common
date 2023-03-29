import { MapLayer } from "../types";
import { Map } from "vjmap";
import LayerBase from "./base";
export declare class SymbolClusterLayer extends LayerBase {
    sourceId: string;
    events: Array<[string, string, any]>;
    constructor();
    createCluster(map: Map, mapLayer: MapLayer): Promise<void>;
    addLayer(map: Map, mapLayer: MapLayer): Promise<void>;
    setVisible(map: Map, layerId: string, visibleOff?: boolean): void;
    removeLayer(map: Map, layerId: string): void;
}
