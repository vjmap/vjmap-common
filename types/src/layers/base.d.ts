import { MapLayer } from "../types";
import { Map, Marker } from "vjmap";
export default class LayerBase {
    map: Map;
    mapLayer: MapLayer;
    visibleOff?: boolean;
    constructor();
    addLayer(map: Map, mapLayer: MapLayer): Promise<void>;
    setLayerStyle(map: Map, layerId: string, layerProps: Record<string, any>, oldLayer: MapLayer): void;
    setVisible(map: Map, layerId: string, visibleOff?: boolean): void;
    removeLayer(map: Map, layerId: string): void;
    getLayerId(): string | string[] | undefined;
    onSourceDataChange(map: Map, sourceId?: string, forceUpdate?: boolean, timerUpdate?: boolean): void;
    loadUrlImage(src: string): Promise<HTMLImageElement>;
    evalValue(options: Record<string, any> | string, properties: Record<string, any>, map: Map): any;
    createAnimateImages(map: Map, mapLayer: MapLayer): Promise<string[] | ImageData[]>;
    setMarkerOptions(marker: Marker, options: Record<string, any>): void;
}
