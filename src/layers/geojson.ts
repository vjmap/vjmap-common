import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class GeojsonLayer extends LayerBase {
  sourceId!: string;
  constructor() {
    super();
  }
  async addLayer(map: Map, mapLayer: MapLayer) {
    super.addLayer(map, mapLayer);
    let featureCollection = map.getSourceData(mapLayer.sourceId);
    let sourceId = "geojson_source_" + vjmap.RandomID();
    this.sourceId = sourceId;
    map.addGeoJSONSource(sourceId, featureCollection);
    // 填充图层
    let fillOptionsKeys = Object.keys(mapLayer).filter(
      (key) => key.indexOf("fill") == 0
    );
    let fillOptions: any = {};
    for (let key of fillOptionsKeys) {
      fillOptions[key] = mapLayer[key];
    }
    map.addFillLayer(sourceId + "-layer-polygons", sourceId, {
      source: sourceId,
      ...fillOptions,
      filter: ["==", ["geometry-type"], "Polygon"],
    });

    // 线图层
    let lineOptionsKeys = Object.keys(mapLayer).filter(
      (key) => key.indexOf("line") == 0
    );
    let lineOptions: any = {};
    for (let key of lineOptionsKeys) {
      lineOptions[key] = mapLayer[key];
    }
    map.addLineLayer(sourceId + "-layer-lines", sourceId, {
      source: sourceId,
      ...lineOptions,
      filter: ["==", ["geometry-type"], "LineString"],
    });

    // 点符号图层
    let circleOptionsKeys = Object.keys(mapLayer).filter(
      (key) => key.indexOf("circle") == 0
    );
    let circleOptions: any = {};
    for (let key of circleOptionsKeys) {
      circleOptions[key] = mapLayer[key];
    }
    map.addCircleLayer(sourceId + "-layer-points", sourceId, {
      source: sourceId,
      ...circleOptions,
      filter: ["==", ["geometry-type"], "Point"],
    });
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
    if (!this.sourceId) return;
    if (visibleOff) {
      map.hideSource(this.sourceId);
    } else {
      map.showSource(this.sourceId);
    }
  }
  removeLayer(map: Map, layerId: string) {
    if (this.sourceId) {
      map.removeSourceEx(this.sourceId);
      // @ts-ignore
      this.sourceId = undefined;
    }
    super.removeLayer(map, layerId);
  }
}
