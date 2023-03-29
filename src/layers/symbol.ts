import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class SymbolLayer extends LayerBase {
    symbol!: vjmap.Symbol;
    constructor() {
        super();
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
       super.addLayer(map, mapLayer);
       this.symbol = new vjmap.Symbol(mapLayer as any);
       this.symbol.addTo(map, mapLayer.before);
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        if (visibleOff) {
         this.symbol.hide()
        } else {
         this.symbol.show();
        }
    }
    removeLayer(map: Map, layerId: string) {
        map.removeLayerEx(layerId);
        super.removeLayer(map, layerId);
    }
    onSourceDataChange(map: Map, sourceId?: string, forceUpdate?: boolean, timerUpdate?: boolean) {
        if (forceUpdate) {
            super.onSourceDataChange(map, sourceId, forceUpdate, timerUpdate);
        }
        // 因为数据源改了，数据会自动变化 ，所以不需要调用基类的移除再增加了，提高效率。
    }
}