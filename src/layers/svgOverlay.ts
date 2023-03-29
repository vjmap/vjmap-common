import { MapLayer } from "../types";
import vjmap, { Map, SvgOverlayOptions } from "vjmap";
import LayerBase from "./base";
export class SvgOverlayLayer extends LayerBase {
    overlay!: vjmap.SvgOverlay;
    constructor() {
        super();
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
        super.addLayer(map, mapLayer);
        this.overlay = new vjmap.SvgOverlay(mapLayer as SvgOverlayOptions);
        this.overlay.addTo(map);
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        if (this.overlay && this.overlay.divOverlay) {
            this.overlay.divOverlay.setVisible(!visibleOff)
        }
    }
    removeLayer(map: Map, layerId: string) {
        if (this.overlay) {
            this.overlay.remove();
        }
        super.removeLayer(map, layerId);
    }
}