import vjmap, { Map, GeoPoint } from "vjmap";
import type { IConditionQueryFeatures } from "vjmap";
import { getEntityObjectId, isAlphanumeric } from "../utils";
import { toProperties } from "./query";
export const addHighLightSourceLayer = (
  map: Map,
  layerId?: string,
  highlightColor?: string
) => {
  const name = layerId ?? "myhighlight";
  highlightColor = highlightColor ?? "#FF8957";
  //  数据源
  map.addGeoJSONSource(`${name}-source`, {
    type: "FeatureCollection",
    features: [],
  });

  map.addCircleLayer(`${name}-point-layer`, `${name}-source`, {
    circleColor: highlightColor,
    circleOpacity: 0.8,
    circleRadius: 1,
    filter: ["==", ["geometry-type"], "Point"],
  });

  map.addLineLayer(`${name}-line-layer`, `${name}-source`, {
    lineJoin: "round",
    lineCap: "round",
    lineColor: highlightColor,
    lineWidth: 3,
    lineOpacity: 0.8,
    filter: ["==", ["geometry-type"], "LineString"],
  });

  map.addFillLayer(`${name}-fill-layer`, `${name}-source`, {
    fillColor: highlightColor,
    fillOpacity: 1.0,
    filter: ["==", ["geometry-type"], "Polygon"],
  });
};
export const clearHighLightSourceLayer = (map: Map, layerId?: string) => {
  const name = layerId ?? "myhighlight";
  if (map.getSource(`${name}-source`)) {
    // @ts-ignore
    map.getSource(`${name}-source`).setData({
      type: "FeatureCollection",
      features: [],
    });
  }
};

// 获取选择上的整个实体的id数组
const getSelectedWholeEntityId = async (map: Map,
  bounds: [number, number, number, number] | undefined,
  queryParam?: IConditionQueryFeatures,
  disableSelectEntities?: Set<String> /* 不能选择的实体集合 */) => {
    const svc = map.getService();
    const isPointSel = bounds && vjmap
      .geoPoint([bounds[0], bounds[1]])
      .equals(vjmap.geoPoint([bounds[2], bounds[3]]));
    let res;
    if (isPointSel) {
      res = await svc.pointQueryFeature({
        zoom: map.getZoom(),
        x: bounds[0],
        y: bounds[1],
        limit: 100, 
        ...queryParam,
        fields: "objectid"
      });
    } else {
      const result = [];
      let beginPos = 0; // 记录查询开始位置
      // 有可能记录数会很多，这里用分页查询
      const limit = 50000; // 每次查5万条
      // eslint-disable-next-line no-constant-condition
      while(true) {
          const query = await svc.conditionQueryFeature({
            condition: ``, // 只需要写sql语句where后面的条件内容,字段内容请参考文档"服务端条件查询和表达式查询"
            bounds: bounds, //查找此范围内的实体
            fields: "objectid",
            includegeom: true, 
            realgeom: true,
            isContains: bounds && bounds[0] > bounds[2], //矩形包含才行,false是相交关系
            beginpos: beginPos, // 记录开始位置
            limit: limit, // 每次查5万条
            ...queryParam,
          });
          if (!query.result) break;
          beginPos += limit; // 开始位置位置挪动
          result.push(...query.result || []);
          if (result.length >= query.recordCount) break;
      }
      res = {
        result,
        recordCount: result.length
      };
    }

    let objectIdSet = new Set();
    let objectIdCondSet = new Set();
    if (res.result) {
      for (const ent of res.result) {
        if (ent.objectid) {
          if (disableSelectEntities && disableSelectEntities.has(ent.objectid)) {
            objectIdCondSet.add(`1 != 1`); // 加一个返回为false的条件
            continue;
          }
          let objectId = ""; 
          let k = 0;
          for(k = 0; k < ent.objectid.length; k++) { 
            if (isAlphanumeric(ent.objectid[k])) {
              objectId += ent.objectid[k]
            } else { 
              break;
            }
          } 
          if (objectId) {
            if (objectId == ent.objectid) {
              // 如果直接是id，不是块或组合实体
              objectIdSet.add(objectId);
            } else {
              // 是块或组合实体 用模糊查找，近似的
              const specialChars = ['_'];
              for(const s of specialChars) {
                objectIdCondSet.add(`objectid like '${objectId}${s}%'`);
              }
            }
          }
        }
      }
    }
    let cond1, cond2;
    if (objectIdSet.size > 0) {
      const ids = Array.from(objectIdSet).map(s => `"${s}"`).join(",");
      cond1 = ` objectid in (${ids}) `;
    }
    if (objectIdCondSet.size > 0) {
      cond2 = Array.from(objectIdCondSet).join(' or ');
    }
    if (cond1 && cond2) {
      return cond1 + " or " + cond2;
    } else if(cond1) {
      return cond1;
    } else {
      return cond2 ?? '';
    }
}

export const getHighlightEntities = async (
  map: Map,
  bounds: [number, number, number, number] | undefined,
  useGeomCoord?: boolean,
  queryParam?: IConditionQueryFeatures,
  includeWholeEntity?: boolean, /* 选择时是否选择上整个实体对象 */
  disableSelectEntities?: Set<String>, /* 不能选择的实体集合 */
  isClearOld?: boolean,
  layerId?: string,
  highlightColor?: string
) => {
  const name = layerId ?? "myhighlight";
  const svc = map.getService();
  const isPointSel = bounds && vjmap
    .geoPoint([bounds[0], bounds[1]])
    .equals(vjmap.geoPoint([bounds[2], bounds[3]]));
  let queryIdContion;
  if (includeWholeEntity) {
    // 选择上整个实体对象
    queryIdContion = await getSelectedWholeEntityId(map, bounds, queryParam, disableSelectEntities);
  }
  let res;
  if (isPointSel && !queryIdContion) {
    res = await svc.pointQueryFeature({
      zoom: map.getZoom(),
      x: bounds[0],
      y: bounds[1],
      limit: 100, 
      ...queryParam,
    });
    
  } else {
    let result = [];
    let beginPos = 0; // 记录查询开始位置
    // 有可能记录数会很多，这里用分页查询
    const limit = 50000; // 每次查5万条
    // eslint-disable-next-line no-constant-condition
    while(true) {
      let query;
      if (!queryIdContion) {
        query = await svc.conditionQueryFeature({
          condition: ``, // 只需要写sql语句where后面的条件内容,字段内容请参考文档"服务端条件查询和表达式查询"
          bounds: bounds, //查找此范围内的实体
          fields: "",
          includegeom: useGeomCoord, // 是否返回几何数据,为了性能问题，realgeom为false时，如果返回条数大于1.只会返回每个实体的外包矩形，如果条数为1的话，会返回此实体的真实geojson；realgeom为true时每条都会返回实体的geojson
          realgeom: useGeomCoord,
          isContains: bounds && bounds[0] > bounds[2], //矩形包含才行,false是相交关系
          beginpos: beginPos, // 记录开始位置
          limit: limit, // 每次查5万条
          ...queryParam,
        });
      } else {
        // 如果是选择上整个实体对象，因为之前已经查到了所有objectid,所以这里条件应该是objectid了
        query = await svc.conditionQueryFeature({
          condition: queryIdContion,
          fields: "",
          includegeom: useGeomCoord, // 是否返回几何数据,为了性能问题，realgeom为false时，如果返回条数大于1.只会返回每个实体的外包矩形，如果条数为1的话，会返回此实体的真实geojson；realgeom为true时每条都会返回实体的geojson
          realgeom: useGeomCoord,
          beginpos: beginPos, // 记录开始位置
          limit: limit, // 每次查5万条
          ...queryParam,
        });
      }
       
        if (!query.result) break;
        beginPos += limit; // 开始位置位置挪动
        result.push(...query.result || []);
        if (result.length >= query.recordCount) break;
    }
    
    res = {
      result,
      recordCount: result.length
    };
  }
  
  if (disableSelectEntities && res.result) {
    res.result = res.result.filter((s: any) => !disableSelectEntities.has(s.objectid));
    res.recordCount = res.result.length;
  }

  const drawGeom = {
    features: [],
    type: "FeatureCollection",
  };

  const drawCoord = {
    features: [],
    type: "FeatureCollection",
  };

 
  if (res && res.result && res.result.length > 0) {
    if (!map.getSource(`${name}-source`)) {
      addHighLightSourceLayer(map, layerId, highlightColor); // 第一次初始化
    }

    for (const ent of res.result) {
      if (ent.geom && ent.geom.geometries) {
        for(const idx in ent.geom.geometries) {
          const feature = {
            type: "Feature",
            id: ent.id + "_" + idx,
            properties: toProperties(ent),
            geometry: ent.geom.geometries[idx]
          }
          // @ts-ignore
          drawGeom.features.push(feature);
        }
        
      }
      if (!useGeomCoord) {
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
              }
            }
            // @ts-ignore
            drawCoord.features.push(feature);
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
              }
            }
            // @ts-ignore
            drawCoord.features.push(feature);
          }
        }
      }
    }
    const mapDrawData = useGeomCoord ? drawGeom : drawCoord;
    if (mapDrawData.features.length > 0) {
      // @ts-ignore
      if (!isClearOld && map.getSource(`${name}-source`)?._data?.features) {
        // @ts-ignore
        map.getSource(`${name}-source`).setData({
            // @ts-ignore
            features: [
            // @ts-ignore
            // eslint-disable-next-line no-unsafe-optional-chaining
            ...map.getSource(`${name}-source`)?._data?.features,
            // @ts-ignore
            ...mapDrawData.features,
          ],
          type: "FeatureCollection",
        });
      } else {
        // @ts-ignore
        map.getSource(`${name}-source`).setData(mapDrawData);
      }
    } else {
      if (isClearOld) clearHighLightSourceLayer(map, name);
    }
  } else {
    if (isClearOld) clearHighLightSourceLayer(map, name);
  }
  map.triggerRepaint();
  return useGeomCoord ? drawGeom : drawCoord;
};

export const clearHighlight = (map: Map, layerId?: string) => {
  const name = layerId ?? "myhighlight";
  clearHighLightSourceLayer(map, name);
  map.triggerRepaint();
};
