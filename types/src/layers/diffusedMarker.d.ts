import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
export declare class DiffusedMarkerLayer extends LayerBase {
    markers: vjmap.Marker[];
    constructor();
    createMarker(lnglat: any, properties: Record<string, any>, options: Record<string, any>, map: Map): void;
    addLayer(map: Map, mapLayer: MapLayer): Promise<void>;
    setVisible(map: Map, layerId: string, visibleOff?: boolean): void;
    removeLayer(map: Map, layerId: string): void;
}
