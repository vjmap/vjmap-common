import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";

export class SkyLayer extends LayerBase {
    sky!: vjmap.SkyLayer;
    constructor() {
        super();
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
       super.addLayer(map, mapLayer);
       this.sky = new vjmap.SkyLayer(mapLayer as any);
       this.sky.addTo(map, mapLayer.before);
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
       super.setVisible(map, layerId, visibleOff);
       if (visibleOff) {
        this.sky.hide()
       } else {
        this.sky.show();
       }
    }
    removeLayer(map: Map, layerId: string) {
        map.removeLayerEx(layerId);
        super.removeLayer(map, layerId);
    }
}