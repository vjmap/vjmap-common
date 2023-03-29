import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class SymbolPathAnimateLayer extends LayerBase {
  line!: vjmap.Polyline;
  symbol!: vjmap.Symbol;
  anim: any;
  constructor() {
    super();
  }
  async addLayer(map: Map, mapLayer: MapLayer) {
    super.addLayer(map, mapLayer);
    let featureCollection = map.getSourceData(mapLayer.sourceId);
    // 遍历里面所有的线
    let features = featureCollection.features;
    let geoPointDatas = [];
    let geoLineDatas = [];
    
    for (let i = 0; i < features.length; i++) {
      let geometry = features[i].geometry;
      
      if (geometry.type != "LineString") continue;
      let coordinates = map.fromLngLat(geometry.coordinates);

      if (mapLayer.drawPath) {
        // 线
        geoLineDatas.push({
          points: map.toLngLat(coordinates),
          properties: {
            ...features[i].properties,
          },
        });
      }

      // 点
      // 获取角度
      const angle = vjmap
        .geoPoint(coordinates[1])
        .angleTo(vjmap.geoPoint(coordinates[0]));
      geoPointDatas.push({
        point: map.toLngLat(coordinates[0]),
        properties: {
          ...features[i].properties,
          bearing: vjmap.radToDeg(-angle),
          path: coordinates,
        },
      });
    }

    if (geoLineDatas.length > 0) {
        let lineOptionsKeys = Object.keys(mapLayer).filter(key => key.indexOf("line") == 0);
        let lineOptions: any = {};
        for(let key of lineOptionsKeys) {
            lineOptions[key] = mapLayer[key];
        }
       
        this.line = new vjmap.Polyline({
            data: geoLineDatas,
            ...lineOptions,
        });
        this.line.addTo(map);
    }

    let symbolOptionsKeys = Object.keys(mapLayer).filter(key => key.indexOf("symbol") == 0 || key.indexOf("icon") == 0 || key.indexOf("text") == 0);
    let symbolOptions: any = {};
    for(let key of symbolOptionsKeys) {
        symbolOptions[key] = mapLayer[key];
    }
    this.symbol = new vjmap.Symbol({
      data: geoPointDatas,
      iconAllowOverlap: true,
      iconRotationAlignment: "map",
      ...symbolOptions,
      iconRotate: ["get", "bearing"],
    });
    this.symbol.addTo(map, mapLayer.before);

    const initData = vjmap.cloneDeep(this.symbol.getData()) as any;
    let lastValue = 0;
    this.anim = vjmap.createAnimation({
      from: 0,
      to: 1,
      repeatType: mapLayer.anmiRepeatType ?? "reverse", // 交替反转动画
      repeat: mapLayer.anmiRepeat || Infinity,
      duration: mapLayer.anmiDuration * 1000,
      ease: vjmap.linear, //线性
      onUpdate: (latest: number) => {
        // 是否反转动画了,反转动画需要把车的方向改了
        let isReverse = lastValue > latest;
        lastValue = latest;
        const data = this.symbol.getData() as any;
        for (let i = 0; i < data.features.length; i++) {
          const value = latest;
          const prop = initData.features[i].properties;
          const path = vjmap.interpolatePointsByRatio(prop.path, value);
          if (path.length > 1) {
            let start = path[path.length - 2];
            let end = path[path.length - 1];
            let angle = 0;
            if (isReverse) {
              angle = vjmap.geoPoint(start).angleTo(vjmap.geoPoint(end));
            } else {
              angle = vjmap.geoPoint(end).angleTo(vjmap.geoPoint(start));
            }
            // 更改方位
            data.features[i].properties.bearing = vjmap.radToDeg(-angle);

            // 更新坐标
            const geojson = vjmap.createPointGeoJson(map.toLngLat(end)) as any;
            if (geojson.features[0] && geojson.features[0].geometry) {
              data.features[i].geometry.coordinates =
                geojson.features[0].geometry.coordinates;
            }
          }
        }
        this.symbol.setData(data);
      },
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
    if (visibleOff) {
      this.anim.stop();
      this.symbol.hide();
      if (this.line) this.line.hide();
    } else {
      if (this.line)this.line.show();
      this.symbol.show();
      this.anim.start();
    }
  }
  removeLayer(map: Map, layerId: string) {
    this.anim.stop();
    this.symbol.remove();
    if (this.line) this.line.remove();
    super.removeLayer(map, layerId);
  }
}
