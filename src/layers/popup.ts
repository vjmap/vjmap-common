import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";
export class PopupLayer extends LayerBase {
    popups!: vjmap.Popup[];
    constructor() {
        super();
    }
    createPopup(lnglat: any, properties: Record<string, any>, options: Record<string, any>, map: Map) {
        let popup = new vjmap.Popup({
            offset: options.offset ?? [0, 0],
            anchor: options.anchor,
            closeButton: options.closeButton,
            closeOnClick: options.closeOnClick,
            closeOnMove: options.closeOnMove,
            focusAfterOpen: options.focusAfterOpen,
            className: options.className,
            maxWidth: options.maxWidth,
        });
        let html = options.html; //"<h3 style='color:red'>index ${props.index}</h3>"
        let htmlValue = this.evalValue("return `" + html + "`", properties, map); 
        popup.setHTML(htmlValue).setLngLat(lnglat).addTo(map);
        this.popups = this.popups || [];
        this.popups.push(popup);
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
        super.addLayer(map, mapLayer);
        let featureCollection = map.getSourceData(mapLayer.sourceId);
        let features = featureCollection.features;
        for (let i = 0; i < features.length; i++) {
            let geometry = features[i].geometry;
            if (geometry.type == 'Point') {
                this.createPopup(geometry.coordinates, features[i].properties, mapLayer, map); 
            }
            if (mapLayer.isDrawLinePoint) {
                let coordinates = []
                if (geometry.type == 'LineString' ) {
                    coordinates = geometry.coordinates;
                } else if (geometry.type == 'Polygon' ) {
                    coordinates = geometry.coordinates[0];
                }
                for(let co of coordinates) {
                    this.createPopup(co, features[i].properties, mapLayer, map); 
                }
            }
        }
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        for(let m of this.popups) {
            m.getElement().style.display = visibleOff ? "none": '';
        }
    }
    removeLayer(map: Map, layerId: string) {
        if (!this.popups) return;
        for(let m of this.popups) {
            m.remove();
        }
        this.popups = [];
        super.removeLayer(map, layerId);
    }
}