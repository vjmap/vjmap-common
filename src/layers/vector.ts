import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class VectorLayer extends LayerBase {
   layers!: vjmap.AnyLayer[]
    constructor() {
        super();
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
       super.addLayer(map, mapLayer);
       const vectorStyle = map.getService().vectorStyle();
       this.layers = vectorStyle.layers;
       for(let layer of this.layers) {
        // @ts-ignore
         layer.source = mapLayer.sourceId;
         layer.id = layer.id.replace("vector-", mapLayer.layerId + "-");
         map.addLayer(layer);
       }
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
       super.setVisible(map, layerId, visibleOff);
       if (visibleOff) {
        for(let layer of this.layers) {
            map.hide(layer.id);
        }
       } else {
        for(let layer of this.layers) {
            map.show(layer.id);
        }
       }
    }
    removeLayer(map: Map, layerId: string) {
        for(let layer of this.layers) {
            map.removeLayerEx(layer.id);
        }
        super.removeLayer(map, layerId);
    }
}