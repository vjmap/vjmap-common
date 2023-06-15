import vjmap, { Map } from "vjmap";
import { cacheStorage } from "../cache";

// 从后台查询地图数据
export async function queryMapData(
  map: Map,
  queryParam: {
    condition?: string /* 查询 sql 条件 */;
    bounds?: string /* 查询 范围，为空表示不限制 */;
    isContains?: boolean /* 相交或包含 */;
    coordType?: 0 | 1 /* 0 查询位置坐标 1 查询几何坐标 */;
    clearPropData?: boolean /* 是否清空属性数据 */;
    disableCacheData?: boolean /* 是否禁用本地缓存数据 */;
  },
  condition?: Record<string, any>
) {
  let svc = map.getService();
  // 先从缓存中去查询。如果缓存中有，则直接从缓存中获取就可能了
  const cacheKey = {
    mapId: svc.currentMapParam()?.mapid,
    version: svc.currentMapParam()?.version,
    workspace: svc.getCurWorkspaceName(),
    layername: svc.currentMapParam()?.layer,
    ...queryParam,
    ...condition
  };
  if (queryParam.disableCacheData === true) {
    let cahceResult = await cacheStorage.getValueByKey(cacheStorage.toStringKey(cacheKey, "query_"), true);
    if (cahceResult) return cahceResult; // 返回缓存结果
  }
  let res: any;
  const result = [];
  let beginPos = 0; // 记录查询开始位置
  // 有可能记录数会很多，这里用分页查询
  const limit = 50000; // 每次查5万条
  let bounds: any;
  if (queryParam.bounds) {
    bounds = vjmap.GeoBounds.fromString(queryParam.bounds).toArray();
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = await svc.conditionQueryFeature({
      condition: queryParam.condition ?? '', // 只需要写sql语句where后面的条件内容,字段内容请参考文档"服务端条件查询和表达式查询"
      bounds: bounds, //查找此范围内的实体
      fields: "",
      includegeom: queryParam.coordType == 1, // 是否返回几何数据,为了性能问题，realgeom为false时，如果返回条数大于1.只会返回每个实体的外包矩形，如果条数为1的话，会返回此实体的真实geojson；realgeom为true时每条都会返回实体的geojson
      realgeom: queryParam.coordType == 1,
      isContains: queryParam.isContains, //矩形包含才行,false是相交关系
      beginpos: beginPos, // 记录开始位置
      limit: limit, // 每次查5万条
      ...queryParam,
    });
    if (!query.result) break;
    beginPos += limit; // 开始位置位置挪动
    result.push(...(query.result || []));
    if (result.length >= query.recordCount) break;
  }
  res = {
    result,
    recordCount: result.length,
  };

  let retResult = ProcessDataToFeatureCollection(map, res, queryParam.coordType == 1);
  if (queryParam.disableCacheData === true) {
    await cacheStorage.setValueByKey(cacheStorage.toStringKey(cacheKey, "query_"), retResult, true);
  }
  return retResult;
}

export const toProperties = (param: Record<string, any>) => {
  const excludeKeys = new Set([
    "id",
    "isEnvelop",
    "envelop",
    "geojson",
    "geom",
    "isPoint",
    "isline",
    "points"
  ]);
  const props: Record<string, any> = {};
  for (const k in param) {
    if (excludeKeys.has(k)) continue;
    props[k] = param[k];
  }
  return props;
};
// 把后台查询的数据转成Geojson数据
export function ProcessDataToFeatureCollection(map: Map, res: any /* 后台查询的数据结果 */, isUseGeomCoord: boolean /* 是否是几何坐标 */) {
  const FeatureCollection = {
    features: [],
    type: "FeatureCollection",
  };

  
  if (res && res.result && res.result.length > 0) {
    for (const ent of res.result) {
      if (isUseGeomCoord) {
        // 几何坐标
        if (ent.geom && ent.geom.geometries) {
          let ft: any = {
              id: ent.id,
              type: "Feature",
              properties: toProperties(ent)
          }
          if (ent.geom.geometries.length == 1) {
             ft = {
                  ...ft,
                  geometry: ent.geom.geometries[0],
             };
          } else {
              ft = {
                  ...ft,
                  geometry: {
                      geometries: ent.geom.geometries,
                      type: "GeometryCollection"
                  },
              };
          }
          // @ts-ignore
          FeatureCollection.features.push(ft);
        }
      } else {
        // 使用位置坐标
        const coord =
          ent.points || ent.positon || ent.location || ent.origin || ent.center;
        if (coord) {
          const pts = coord.split(";");
          const points = [];
          for(let p of pts) {
            if (p.indexOf(",") > 0)
            points.push(map.toLngLat(vjmap.GeoPoint.fromString(p)))
          }

          if (points.length == 1) {
            const feature = {
              type: "Feature",
              id: ent.id,
              properties: toProperties(ent),
              geometry: {
                // @ts-ignore
                type: "Point",
                // @ts-ignore
                coordinates: points[0],
              },
            };
            // @ts-ignore
            FeatureCollection.features.push(feature);
          } else if (points.length > 1) {
            const feature = {
              type: "Feature",
              id: ent.id,
              properties: toProperties(ent),
              geometry: {
                // @ts-ignore
                type: "LineString",
                // @ts-ignore
                coordinates: points,
              },
            };
            // @ts-ignore
            FeatureCollection.features.push(feature);
          }
        }
      }
    }
  }
  let retResult = map.fromLngLat(FeatureCollection);
  return retResult;
}

// 请求动态数据
export async function requestChangeData(
  map: Map,
  param: {
    reqType: 'GET' | 'POST' | "SOURCE";
    url: string;
    data?: any;
    header?: Record<string, string>; // 请求头
    processJS?: string; // 处理数据的js代码
    fromSourceId?: string; // 来源数据源ID
  },
  mapApp?: any
) {
  let res: any;
  if (param.reqType == "SOURCE") {
    // 数据源数据
    if (param.fromSourceId) {
      res = await mapApp.getSourceData(param.fromSourceId);
    }
  } else {
    if (param.data && typeof param.data == "string") {
      param.data = JSON.parse(param.data);
    }
    if (param.header && typeof param.header == "string") {
      param.header = JSON.parse(param.header);
    }
    let args = {
      headers: {"Accept": "application/json", "Content-Type":"application/json", ...param.header}
    }
    if (param.url) {
      if (param.reqType == "POST") {
        res = await vjmap.httpHelper.post(param.url, param.data, args)
      } else {
        res = await vjmap.httpHelper.get(param.url, param.data, args)
      }
    }
  }
  
  if (param.processJS) {
    res = await evalDataConvert(res, param.processJS, map, mapApp);
  }
  return res;
}


export const convertArrayToGeoJson = (value: Array<[number, number]>) => {
  let colls: any = {
      type: "FeatureCollection",
      features: []
  }
  // 点
  for(let i = 0; i < value.length; i++) {
      let item = value[i];
      if (Array.isArray(item) && item.length == 2 && typeof(item)[0] == 'number') {
          // 数组项格式为[x,y]，则为点
          colls.features.push({
              "type": "Feature",
              "id": i + 1,
              "properties": {
                  "index": i + 1
              },
              "geometry": {
                  "type": "Point",
                  "coordinates": item
              }
          })
      } else if (Array.isArray(item) && Array.isArray(item[0]) && typeof(item[0][0]) == 'number') {
          // 数组项格式为[[x1,y1], [x2,y2],...]，则为线
          colls.features.push({
              "type": "Feature",
              "id": i + 1,
              "properties": {
                  "index": i + 1
              },
              "geometry": {
                  "type": "LineString",
                  "coordinates": value[i]
              }
          })
      } else if (Array.isArray(item) && Array.isArray(item[0]) && Array.isArray(item[0][0]) && typeof(item[0][0][0]) == 'number') {
          // 数组项格式为[[[x1,y1], [x2,y2],...]]，则为多边形
          colls.features.push({
              "type": "Feature",
              "id": i + 1,
              "properties": {
                  "index": i + 1
              },
              "geometry": {
                  "type": "Polygon",
                  "coordinates": value[i]
              }
          })
      }
  }
  return colls
}

// 执行数据转换代码
export async function evalDataConvert(featureCollection: any, code: string, map: Map, mapApp: any) {
  // 如果是数组，则统一为geojson
  if (Array.isArray(featureCollection)) {
    featureCollection = convertArrayToGeoJson(featureCollection)
  }
  // 通过新的方法创建异步函数
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  // 使用
  const asyncFunc = new AsyncFunction("data", "vjmap", "map", "mapApp", "utils", code);
  const utils = {
    ProcessDataToFeatureCollection,
    convertArrayToGeoJson
  }
  let result = await asyncFunc(featureCollection, vjmap, map, mapApp, utils);
  return result;
}
