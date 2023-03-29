import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class AnimateFillLayer extends LayerBase {
    animateFill!: vjmap.ICreateFillAnimateLayerResult;
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
        this.animateFill = vjmap.createAnimateFillLayer(map, featureCollection, {
            animateImages,
            // @ts-ignore
            speed: mapLayer.speed ?? 1,
            ...options,
        });
    }
    getLayerId() {
        return this.animateFill.layerId;
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        if (visibleOff) {
            this.animateFill.stopAnimation();
            this.animateFill.polygon.hide()
        } else {
            this.animateFill.polygon.show();
            this.animateFill.startAnimation();
        }
    }
    removeLayer(map: Map, layerId: string) {
       this.animateFill.remove();
       super.removeLayer(map, layerId);
    }
}