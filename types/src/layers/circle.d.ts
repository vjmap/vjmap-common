import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
export declare class CircleLayer extends LayerBase {
    circle: vjmap.Circle;
    constructor();
    addLayer(map: Map, mapLayer: MapLayer): Promise<void>;
    setVisible(map: Map, layerId: string, visibleOff?: boolean): void;
    removeLayer(map: Map, layerId: string): void;
    onSourceDataChange(map: Map, sourceId?: string, forceUpdate?: boolean, timerUpdate?: boolean): void;
}
