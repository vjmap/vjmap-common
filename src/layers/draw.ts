import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class DrawLayer extends LayerBase {
    draw: any;
    sourceID!: string;
    constructor() {
        super();
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
        super.addLayer(map, mapLayer);
        this.sourceID = mapLayer.sourceId;
        let featureCollection = map.getSourceData(mapLayer.sourceId);
        if (mapLayer.entColorToHtmlColor && featureCollection && featureCollection.features) {
            featureCollection.features.forEach((f: any) => {
                if (f.properties && typeof f.properties.color == "number") {
                    f.properties.color = map.entColorToHtmlColor(f.properties.color);
                }
            })
        }
        const opts = vjmap.cloneDeep(vjmap.Draw.defaultOptions()) as any;
        opts.isActionDrawMode = true; // 按钮都隐藏，界面用自己的
        // @ts-ignore
        this.draw = new vjmap.Draw.Tool(opts);
        map.addControl(this.draw, 'top-right');
        this.draw.set(featureCollection);
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        if (!this.draw) return;
        if (visibleOff) {
            this.draw.set({
                type: "FeatureCollection",
                features: []
            });
        } else {
            let featureCollection = map.getSourceData(this.sourceID);
            this.draw.set(featureCollection);
        }
    }
    removeLayer(map: Map, layerId: string) {
        if (this.draw) {
            this.map.removeControl(this.draw);
            this.draw = null;
        }
        super.removeLayer(map, layerId);
    }
}