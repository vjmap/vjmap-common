import { MapLayer } from "./types";
import vjmap, { Map } from 'vjmap'
import * as common from './export'
export function toMapLayer(
  layer: MapLayer,
  props: Record<string, any>
): MapLayer {
  return {
    layerId: layer.layerId,
    sourceId: layer.sourceId,
    tag: layer.tag,
    type: layer.type,
    before: layer.before,
    visibleOff: layer.visibleOff,
    ...props,
  };
}


export function sleep(ms?: number) {
  return new Promise(resolve => setTimeout(resolve, ms ?? 100))
}

// 执行代码
export async function execProgram(code: string, map: Map, mapApp: any, context?: any) {
  // 通过新的方法创建异步函数
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  // 使用
  const asyncFunc = new AsyncFunction("vjmap", "map", "mapApp", "context", "vjcommon", code);
  let result = await asyncFunc(vjmap, map, mapApp, context, common);
  return result;
}

// 获取ShardsUrl
export const getShardsTileUrl = (tileUrl: string, map?: Map) => {
  if (!tileUrl) return [tileUrl];
  if (map) {
    let svc = map.getService();
    tileUrl = tileUrl.replace("{serviceUrl}", svc.serverUrl);
    tileUrl = tileUrl.replace("{accessToken}", svc.accessToken);
  }
  let reg = /{(\d+-\d+)}/g;
  let matched = reg.exec(tileUrl);
  if (!matched) return [ tileUrl ];
  let match = matched[0];
  if (!match) return [ tileUrl ];
  match = match.replace("{", "");
  match = match.replace("}", "");
  let items = match.split("-");
  if (items.length != 2) return [ tileUrl ];
  let n1 = +items[0];
  let n2 = +items[1];
  if (n2 <= n1) return [ tileUrl ];
  let urls = [];
  for(let n = n1 ; n <= n2; n++) {
    urls.push(tileUrl.replace(matched[0], n + ""));
  }
  return urls;
}

// 获取TileShards
export const getTileShards = (tileUrl: string) => {
  if (!tileUrl) return {
    tileUrl,
    tileShards: ""
  };
  let reg = /{(\d+-\d+)}/g;
  let matched = reg.exec(tileUrl);
  if (!matched) return {
    tileUrl,
    tileShards: ""
  };
  let match = matched[0];
  if (!match) return {
    tileUrl,
    tileShards: ""
  };
  const newTileUrl = tileUrl.replace(match, "{s}");
  match = match.replace("{", "");
  match = match.replace("}", "");
  let items = match.split("-");
  if (items.length != 2) return {
    tileUrl,
    tileShards: ""
  };;
  let n1 = +items[0];
  let n2 = +items[1];
  if (n2 <= n1) return {
    tileUrl,
    tileShards: ""
  };
  let tileShards = [];
  for(let n = n1 ; n <= n2; n++) {
    tileShards.push(n);
  }
  return {
    tileUrl: newTileUrl,
    tileShards: tileShards.join(",")
  };
}
// 判断一个字符是英文字符或数字
export const isAlphanumeric = (char: string) => {
  return /^[a-zA-Z0-9]+$/.test(char);
}

// 底图是否为互联网底图
export const isWebBaseMap = (baseMapType?: string) => {
  return !(baseMapType == "" || baseMapType == "CAD" || baseMapType === undefined)
}

// 得到实体的objectID，在几何模式打开的情况下objectid有可能是块，会分成多个实体，而实际中是同一个，这里获取的是cad实体的objectid
export const getEntityObjectId = (id: string) => {
  // id如 A0F$A10 或 380#26F&26C 这种格式，只要前面的一部分就是cad的实体objectid
  let objectId = "";  
  let k = 0;
  for(k = 0; k < id.length; k++) { 
    if (isAlphanumeric(id[k])) {
      objectId += id[k]
    } else { 
      break;
    }
  } 
  return objectId;
}


// data geojson数据；basePt基点，destPt要移动至的位置；scale 缩放倍数，angle旋转角度, isGeoCoord传入的是否为几何坐标
export const transformGeoJsonData = (
  map: Map,
  data: any,
  basePt: any,
  destPt: any,
  scale = 1.0,
  angle = 0.0,
  isGeoCoord = false
) => {
  return vjmap.transform.convert(data, (pt) => {
    let point = isGeoCoord === true ? vjmap.geoPoint(pt) : map.fromLngLat(vjmap.geoPoint(pt));
    point.transform(basePt, destPt, scale, angle);
    return isGeoCoord === true ? [point.x, point.y] : map.toLngLat(point);
  });
};

// data geojson数据；basePt基点，destPt要移动至的位置；scale 缩放倍数，angle旋转角度, isGeoCoord传入的是否为几何坐标
export const transformFourParam = (
  map: Map,
  data: any,
  fourParam: any,
  isGeoCoord = false
) => {
  return vjmap.transform.convert(data, (pt) => {
    let point = isGeoCoord === true ? vjmap.geoPoint(pt) : map.fromLngLat(vjmap.geoPoint(pt));
    let newPoint  = vjmap.coordTransfromByFourParamter(point, fourParam);
    return isGeoCoord === true ? [newPoint.x, newPoint.y] : map.toLngLat(newPoint);
  });
};