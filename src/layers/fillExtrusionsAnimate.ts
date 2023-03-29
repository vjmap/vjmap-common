import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class FillExtrusionsAnimateLayer extends LayerBase {
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
      if (geometry.type != "Polygon") continue;
      geoDatas.push({
        points: geometry.coordinates,
        properties: {
          ...geometry.properties,
        },
      });
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
      fillExtrusionHeight:['get', 'height'],
    });
    this.fillExtrusion.addTo(map, mapLayer.before);

    if (mapLayer.anmiDuration) {
      const initData = vjmap.cloneDeep(this.fillExtrusion.getData()) as any;

      const mapProgressToValues = (idx: number) =>
        vjmap.interpolate(
          [0, 1],
          [
            { height: 0 },
            { height: initData.features[idx].properties.height || 500000 },
          ]
        );
      this.anim = vjmap.createAnimation({
        from: 0,
        to: 1,
        repeatType: mapLayer.anmiRepeatType ?? "loop", // 交替反转动画
        repeat: mapLayer.anmiRepeat || Infinity,
        duration: mapLayer.anmiDuration * 1000,
        onUpdate: (latest: number) => {
          const data = this.fillExtrusion.getData() as any;
          for (let i = 0; i < data.features.length; i++) {
            const value = mapProgressToValues(i)(latest);
            data.features[i].properties.height = value.height;
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
