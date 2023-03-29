import { MapLayer } from "../types";
import vjmap, { DivOverlayOptions, Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";
export class DivOverlayLayer extends LayerBase {
    overlay!: vjmap.DivOverlay;
    constructor() {
        super();
    }
    createDivOverlay(properties: Record<string, any>, options: Record<string, any>, map: Map) {
        let divOverlayOpts = this.evalValue(options, properties, map);
        if (!divOverlayOpts.bounds) return;
        if (!divOverlayOpts.width) return;
        if (!divOverlayOpts.height) return;
       
        if (Array.isArray(divOverlayOpts.bounds) && divOverlayOpts.bounds.length == 2) {
            divOverlayOpts.bounds = new vjmap.GeoBounds(vjmap.geoPoint(divOverlayOpts.bounds[0]), vjmap.geoPoint(divOverlayOpts.bounds[1]))
        }
        if (divOverlayOpts.customHtml) {
            // 如果有自定义html内容
            let element = this.evalValue(options.customHtml, properties, map); 
            divOverlayOpts.element = element;
        }
        else if (divOverlayOpts.customImage) {
            if (divOverlayOpts.customImage.toLowerCase().indexOf("<svg") == 0) {
                //svg或//base64 png
                divOverlayOpts.customImage =  "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(options.customImage))) ;
            }
            const image = document.createElement( "img" );
            image.style.position = "absolute"; // 有多个divoverlay时，一定要加定位，否则会导致其他绘制不对
            image.style.left = '0px';
            image.style.top = '0px';
            image.style.width = divOverlayOpts.width + "px";
            image.style.height = divOverlayOpts.height + "px";
            image.src = divOverlayOpts.customImage
            image.style.pointerEvents = "none"
            divOverlayOpts.element = image;
        }
        if (!divOverlayOpts.element) return;

        this.overlay = new vjmap.DivOverlay(divOverlayOpts);
        this.overlay.addTo(map);
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
        super.addLayer(map, mapLayer);
        this.createDivOverlay({}, mapLayer, map); 
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        if (this.overlay) {
            this.overlay.setVisible(!visibleOff)
        }
    }
    removeLayer(map: Map, layerId: string) {
        if (this.overlay) {
            this.overlay.remove();
        }
        super.removeLayer(map, layerId);
    }
}