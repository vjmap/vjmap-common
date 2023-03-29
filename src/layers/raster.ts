import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class RasterLayer extends LayerBase {
   
    constructor() {
        super();
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
       super.addLayer(map, mapLayer);
       map.addRasterLayer(mapLayer.layerId, mapLayer.sourceId, mapLayer as any, mapLayer.before);
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
       super.setVisible(map, layerId, visibleOff);
       if (visibleOff) {
        map.hide(layerId);
       } else {
        map.show(layerId);
       }
    }
    removeLayer(map: Map, layerId: string) {
        map.removeLayerEx(layerId);
        super.removeLayer(map, layerId);
    }
}