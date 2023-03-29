import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class AnimateSymbolLayer extends LayerBase {
    animateSymbol!: vjmap.ICreateSymbolAnimateLayerResult;
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
        this.animateSymbol = vjmap.createAnimateSymbolLayer(map, featureCollection, {
            animateImages,
            speed: mapLayer.speed ?? 1,
            ...options,
        });
    }
    getLayerId() {
        return this.animateSymbol.layerId;
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        if (visibleOff) {
            this.animateSymbol.stopAnimation();
            this.animateSymbol.symbol.hide()
        } else {
            this.animateSymbol.symbol.show();
            this.animateSymbol.startAnimation();
        }
    }
    removeLayer(map: Map, layerId: string) {
       this.animateSymbol.remove();
       super.removeLayer(map, layerId);
    }
}