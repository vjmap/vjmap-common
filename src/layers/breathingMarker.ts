import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";
export class BreathingMarkerLayer extends LayerBase {
    markers!: vjmap.Marker[];
    constructor() {
        super();
    }
    createMarker(lnglat: any, properties: Record<string, any>, options: Record<string, any>, map: Map) {
        options = this.evalValue(options, properties, map);
        let content = options.text || ''; //"<h3 style='color:red'>index ${props.index}</h3>"
        let contentValue = this.evalValue("return `" + content + "`", properties, map);
        let marker = new vjmap.BreathingApertureMarker({
            lngLat: lnglat,
            text: contentValue
        }, {
            ...options,
            colors: [options.color1, options.color2],
            height: options.markerHeight
        }).createMarker();
        marker.addTo(map);
        this.setMarkerOptions(marker, options);
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