import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class PathAnimateLayer extends LayerBase {
  polylineArrows!: vjmap.PolylineArrow[];
  symbolSourcedIds!: string[];
  anims!: any[];
  constructor() {
    super();
  }
  async addLayer(map: Map, mapLayer: MapLayer) {
    super.addLayer(map, mapLayer);
    this.polylineArrows = this.polylineArrows || [];
    this.symbolSourcedIds = this.symbolSourcedIds || [];
    this.anims = this.anims || [];
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

      let symbolSourceid: any;
      if (mapLayer.iconImage) {
        let symbolOptionsKeys = Object.keys(mapLayer).filter(key => key.indexOf("symbol") == 0 || key.indexOf("icon") == 0 || key.indexOf("text") == 0);
        let symbolOptions: any = {};
        for(let key of symbolOptionsKeys) {
          symbolOptions[key] = mapLayer[key];
        }
  
        let randID = vjmap.RandomID();
        symbolSourceid = "path_animi_source_" + randID;
        map.addGeoJSONSource(symbolSourceid);
        map.addSymbolLayer("path_animi_layer_" + randID, symbolSourceid, {
            iconRotate: ['get', 'bearing'],
            iconRotationAlignment: 'map',
            iconAllowOverlap: true,
            iconIgnorePlacement: true,
            ...symbolOptions
        })
        this.symbolSourcedIds.push(symbolSourceid);
      }
      

      let curFps = options.fps || 10;
      const anim = polylineArrow.animate(100, curFps, true, status => {}, (status, context) => {
        if (status !== vjmap.FrameAnimationStatus.Run || !symbolSourceid) return
        // 动画每帧回调，在这里可以实时改变车的位置
        // 获取角度
        const angle = vjmap.geoPoint(context.endPnt).angleTo(vjmap.geoPoint(context.startPnt));
        // 生成新的数据
        const carGeoJson = vjmap.createPointGeoJson({
            point: context.endPnt,
            properties: { ...features[i].properties, bearing: vjmap.radToDeg(-angle)}
        });
        // 更新车的数据
        map.setData(symbolSourceid, carGeoJson); // 更新位置
      })
      this.anims.push(anim);
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
    if (this.anims && this.anims.length) {
      for (let anim of this.anims) {
        if (visibleOff) {
          anim.stop();
        } else {
          anim.start();
        }
      }
    }
    if (this.polylineArrows && this.polylineArrows.length) {
      for (let arrow of this.polylineArrows) {
        if (visibleOff) {
          arrow.hide();
        } else {
          arrow.show();
        }
      }
      for (let symbolSourceId of this.symbolSourcedIds) {
        if (visibleOff) {
          map.hideSource(symbolSourceId);
        } else {
          map.showSource(symbolSourceId);
        }
      }
      
    }
  }
  removeLayer(map: Map, layerId: string) {
    if (this.anims && this.anims.length) {
      for (let anim of this.anims) {
        anim.stop();
      }
      this.anims = [];
    }
    if (this.polylineArrows && this.polylineArrows.length) {
      for (let arrow of this.polylineArrows) {
        arrow.remove();
      }
      this.polylineArrows = [];
    }
    if (this.symbolSourcedIds && this.symbolSourcedIds.length) {
      for (let symbolSourceId of this.symbolSourcedIds) {
        map.removeSourceEx(symbolSourceId);
      }
      this.symbolSourcedIds = [];
    }
    super.removeLayer(map, layerId);
  }
  
}
