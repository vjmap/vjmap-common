import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";

export class BackgroundLayer extends LayerBase {
    background!: vjmap.BackgroundLayer;
    constructor() {
        super();
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
       super.addLayer(map, mapLayer);
       this.background = new vjmap.BackgroundLayer(mapLayer as any);
       this.background.addTo(map, mapLayer.before);
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
       super.setVisible(map, layerId, visibleOff);
       if (visibleOff) {
        this.background.hide()
       } else {
        this.background.show();
       }
    }
    removeLayer(map: Map, layerId: string) {
        map.removeLayerEx(layerId);
        super.removeLayer(map, layerId);
    }
}