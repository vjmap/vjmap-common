import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";
export class MarkerLayer extends LayerBase {
    markers!: vjmap.Marker[];
    constructor() {
        super();
    }
    createMarker(lnglat: any, properties: Record<string, any>, options: Record<string, any>, map: Map) {
        options = this.evalValue(options, properties, map);
        if (options.customHtml) {
            // 如果有自定义html内容
            let element = this.evalValue(options.customHtml, properties, map); 
            options.element = element;
        }
        else if (options.customImage) {
            let el = document.createElement('div');
            el.className = 'marker';
            if (options.customImage.toLowerCase().indexOf("<svg") == 0) {
                //svg或//base64 png
                options.customImage =  "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(options.customImage))) ;
            }
            el.style.backgroundImage =
                `url("${options.customImage}")`;
            el.style.width = (options.customImageWidth ?? 40) + 'px';
            el.style.height = (options.customImageHeight ?? 40) + 'px';
            el.style.backgroundSize = '100%';
            options.element = el;
        }
        let marker = vjmap.createMarker(options);
        marker.setLngLat(lnglat).addTo(map);

        if (options.animationType) {
            marker.setAnimation(options.animationType);
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
            marker.setPopup(popup);
        }
       
        this.markers = this.markers || [];
        this.markers.push(marker);
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
        super.addLayer(map, mapLayer);
        let featureCollection = map.getSourceData(mapLayer.sourceId);
        let features = featureCollection.features;
        for (let i = 0; i < features.length; i++) {
            let geometry = features[i].geometry;
            if (geometry.type == 'Point') {
                this.createMarker(geometry.coordinates, features[i].properties, mapLayer, map); 
            }
            if (mapLayer.isDrawLinePoint) {
                let coordinates = []
                if (geometry.type == 'LineString' ) {
                    coordinates = geometry.coordinates;
                } else if (geometry.type == 'Polygon' ) {
                    coordinates = geometry.coordinates[0];
                }
                for(let co of coordinates) {
                    this.createMarker(co, features[i].properties, mapLayer, map); 
                }
            }
        }
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        for(let m of this.markers) {
           m.setVisible(!visibleOff, true);
        }
    }
    removeLayer(map: Map, layerId: string) {
        if (!this.markers) return;
        for(let m of this.markers) {
            m.remove();
        }
        this.markers = [];
        super.removeLayer(map, layerId);
    }
}