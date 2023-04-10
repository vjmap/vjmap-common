import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class LineExtrusionsLayer extends LayerBase {
  fillExtrusion!: vjmap.FillExtrusion;
  anim: any;
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
      let lineCoords = []
      if (geometry.type == "LineString") {
        lineCoords.push(geometry.coordinates)
      } else if (geometry.type == "MultiLineString") {
        lineCoords.push(...geometry.coordinates)
      } else {
        continue;
      }
      if (mapLayer.isBreakLine) {
        // 打断线
        let splitLineCoords = []
        for(let c of lineCoords) {
          for(let k = 0; k < c.length - 1; k++) {
            splitLineCoords.push([c[k], c[k + 1]])
          }
          lineCoords = splitLineCoords;
        }
      }
      for(const coord of lineCoords) {
        let coordinates = map.fromLngLat(coord);
        let path = vjmap.polylineMarginToPolygon(coordinates, {
          offset: mapLayer.offsetLine ?? 10,
        });
  
        geoDatas.push({
          points: map.toLngLat(path),
          properties: {
            ...features[i].properties,
            path: path, // 把点坐标保存进属性中
          },
        });
      }
    }
    let options = { ...mapLayer };
    // layerId和sourceId内部会自动生成，无需再传
    // @ts-ignore
    delete options.layerId;
    // @ts-ignore
    delete options.sourceId;
    this.fillExtrusion = new vjmap.FillExtrusion({
      data: geoDatas,
      ...options,
    });
    this.fillExtrusion.addTo(map, mapLayer.before);

    if (mapLayer.anmiDuration) {
      // 复制下初始数据，防止以后更新
      const initData: any = vjmap.cloneDeep(this.fillExtrusion.getData());
      this.anim = vjmap.createAnimation({
        from: 0,
        to: 1,
        repeatType: mapLayer.anmiRepeatType ?? "reverse", // 交替反转动画
        repeat: mapLayer.anmiRepeat || Infinity,
        duration: mapLayer.anmiDuration * 1000,
        ease: vjmap.linear, //线性
        onUpdate: (latest: number) => {
          const data: any = this.fillExtrusion.getData();
          for (let i = 0; i < data.features.length; i++) {
            const value = latest;
            const prop = initData.features[i].properties;
            const path = vjmap.interpolatePointsByRatio(prop.path, value);
            if (path.length > 1) {
              const polyPath = vjmap.polylineMarginToPolygon(path, {
                offset: mapLayer.offsetLine ?? 10,
              });
              const geojson: any = vjmap.createPolygonGeoJson(
                map.toLngLat(polyPath)
              );
              if (geojson.features[0] && geojson.features[0].geometry) {
                data.features[i].geometry.coordinates =
                  geojson.features[0].geometry.coordinates;
              }
            }
          }
          this.fillExtrusion.setData(data);
        },
      });
    }
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
      this.fillExtrusion.hide();
      if (this.anim) {
        this.anim.stop();
      }
    } else {
      this.fillExtrusion.show();
      if (this.anim) {
        this.anim.start();
      }
    }
  }
  removeLayer(map: Map, layerId: string) {
    if (this.fillExtrusion) this.fillExtrusion.remove();
    if (this.anim) {
      this.anim.stop();
      this.anim = null;
    }
    super.removeLayer(map, layerId);
  }
}
