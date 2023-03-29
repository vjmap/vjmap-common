import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class ArrowLineLayer extends LayerBase {
  polylineArrows!: vjmap.PolylineArrow[];
  constructor() {
    super();
  }
  async addLayer(map: Map, mapLayer: MapLayer) {
    super.addLayer(map, mapLayer);
    this.polylineArrows = this.polylineArrows || [];
    let featureCollection = map.getSourceData(mapLayer.sourceId);
    // 遍历里面所有的线
    let features = featureCollection.features;
    
    for (let i = 0; i < features.length; i++) {
      let geometry = features[i].geometry;
      if (geometry.type != "LineString") continue;
      await map.onLoad(true);
      let coordinates = geometry.coordinates;
      let options = this.evalValue(mapLayer, features[i].properties, map);
      // layerId和sourceId内部会自动生成，无需再传
      // @ts-ignore
      delete options.layerId;
      // @ts-ignore
      delete options.sourceId;
      let polylineArrow = new vjmap.PolylineArrow({
        ...options,
        path: coordinates,
      });
      polylineArrow.addTo(map, mapLayer.before);
      this.polylineArrows.push(polylineArrow);
    }
  }
  getLayerId() {
      return this.polylineArrows.map(p => p.id);
  }
  setLayerStyle(
    map: Map,
    layerId: string,
    layerProps: Record<string, any>,
    oldLayer: MapLayer
  ) {
    super.setLayerStyle(map, layerId, layerProps, oldLayer);
    this.removeLayer(map, layerId);
    this.addLayer(map, toMapLayer(oldLayer, layerProps));
  }
  setVisible(map: Map, layerId: string, visibleOff?: boolean) {
    super.setVisible(map, layerId, visibleOff);
    if (this.polylineArrows && this.polylineArrows.length) {
      for (let arrow of this.polylineArrows) {
        if (visibleOff) {
          arrow.hide();
        } else {
          arrow.show();
        }
      }
    }
  }
  removeLayer(map: Map, layerId: string) {
    if (this.polylineArrows && this.polylineArrows.length) {
      for (let arrow of this.polylineArrows) {
        arrow.remove();
      }
      this.polylineArrows = [];
    }
    super.removeLayer(map, layerId);
  }
}
