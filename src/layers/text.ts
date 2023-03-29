import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";
export class TextLayer extends LayerBase {
    texts!: vjmap.Text[];
    constructor() {
        super();
    }
    createText(lnglat: any, properties: Record<string, any>, options: Record<string, any>, map: Map) {
        options = this.evalValue(options, properties, map);
        let content = options.text || ''; //"<h3 style='color:red'>index ${props.index}</h3>"
        let contentValue = this.evalValue("return `" + content + "`", properties, map); 
        
        let text = new vjmap.Text({
            ...options,
            text: contentValue
        });
        this.setMarkerOptions(text as any, options);
        text.setLngLat(lnglat).addTo(map);

        if (options.animationType) {
            text.setAnimation(options.animationType);
        }

        if (options.popupHtml) {
            let popup = new vjmap.Popup({
                offset: options.popupOffset ?? [0, 0],
                anchor: options.popupAnchor,
                closeButton: options.closeButton,
                closeOnClick: options.closeOnClick,
                closeOnMove: options.closeOnMove,
                focusAfterOpen: options.focusAfterOpen,
                className: options.className,
                maxWidth: options.maxWidth,
            });
            let html = options.popupHtml; //"<h3 style='color:red'>index ${props.index}</h3>"
            let htmlValue = this.evalValue("return `" + html + "`", properties, map); 
            popup.setHTML(htmlValue);
            text.setPopup(popup);
        }
       
        this.texts = this.texts || [];
        this.texts.push(text);
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
        super.addLayer(map, mapLayer);
        let featureCollection = map.getSourceData(mapLayer.sourceId);
        let features = featureCollection.features;
        for (let i = 0; i < features.length; i++) {
            let geometry = features[i].geometry;
            if (geometry.type == 'Point') {
                this.createText(geometry.coordinates, features[i].properties, mapLayer, map); 
            }
            if (mapLayer.isDrawLinePoint) {
                let coordinates = []
                if (geometry.type == 'LineString' ) {
                    coordinates = geometry.coordinates;
                } else if (geometry.type == 'Polygon' ) {
                    coordinates = geometry.coordinates[0];
                }
                for(let co of coordinates) {
                    this.createText(co, features[i].properties, mapLayer, map); 
                }
            }
        }
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        for(let m of this.texts) {
            if (visibleOff) {
              m.hide()
            } else {
              m.show();
            }
        }
    }
    removeLayer(map: Map, layerId: string) {
        if (!this.texts) return;
        for(let m of this.texts) {
            m.remove();
        }
        this.texts = [];
        super.removeLayer(map, layerId);
    }
}