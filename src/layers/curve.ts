import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class CurveLayer extends LayerBase {
  polyline!: vjmap.Polyline;
  constructor() {
    super();
  }
  async addLayer(map: Map, mapLayer: MapLayer) {
    super.addLayer(map, mapLayer);
    let featureCollection = map.getSourceData(mapLayer.sourceId);
    let geoDatas = [];
    // 遍历里面所有的线
    let features = featureCollection.features;
    for (let i = 0; i < features.length; i++) {
      let geometry = features[i].geometry;
      if (geometry.type != "LineString") continue;
      let curvePath = geometry.coordinates;
      if (geometry.coordinates.length > 2) {
        // 把曲线上的点转为贝塞尔曲线参数
        const c = vjmap.polylineToBezierCurve(map.fromLngLat(geometry.coordinates).map((c: any) => [c.x, c.y]));
        // 据贝塞尔曲线参数离散成线
        curvePath = vjmap.bezierCurveToPolyline(c);
        geoDatas.push({
            points: map.toLngLat(curvePath),
            properties: geometry.properties,
          });
      } else {
        geoDatas.push({
            points: curvePath,
            properties: geometry.properties,
          });
      }
    }
    let options = { ...mapLayer };
    // layerId和sourceId内部会自动生成，无需再传
    // @ts-ignore
    delete options.layerId;
    // @ts-ignore
    delete options.sourceId;
    this.polyline = new vjmap.Polyline({
      data: geoDatas,
      ...options,
    });
    this.polyline.addTo(map, mapLayer.before);
  }
  getLayerId() {
      return this.polyline.layerId;
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
    if (visibleOff) {
      this.polyline.hide();
    } else {
      this.polyline.show();
    }
  }
  removeLayer(map: Map, layerId: string) {
    if (this.polyline) {
        this.polyline.remove();
    }
    super.removeLayer(map, layerId);
  }
}
