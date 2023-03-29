import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class AnimateLineLayer extends LayerBase {
    animateLine!: vjmap.ICreateLineAnimateLayerResult;
    constructor() {
        super();
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
        super.addLayer(map, mapLayer);
        let featureCollection = map.getSourceData(mapLayer.sourceId);
        let animateImages = await this.createAnimateImages(map, mapLayer);
        let options = {...mapLayer};
        // layerId和sourceId内部会自动生成，无需再传
        // @ts-ignore
        delete options.layerId;
        // @ts-ignore
        delete options.sourceId;
        this.animateLine = vjmap.createAnimateLineLayer(map, featureCollection, {
            animateImages,
            speed: mapLayer.speed ?? 1,
            ...options,
        });
    }
    getLayerId() {
        return this.animateLine.layerId;
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        if (visibleOff) {
         this.animateLine.stopAnimation();
         this.animateLine.polyline.hide()
        } else {
         this.animateLine.polyline.show();
         this.animateLine.startAnimation();
        }
    }
    removeLayer(map: Map, layerId: string) {
       this.animateLine.remove();
       super.removeLayer(map, layerId);
    }
}