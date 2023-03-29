import { getTileShards, isWebBaseMap } from "../utils";
import { GeoBounds, IMapStyleParam, Service } from "vjmap";
import vjmap from "vjmap";

// wms叠加地图的方式 
export enum WmsOverlayMapType {
    /** 不叠加. */
    None = "none",
    /** 直接叠加. */
    Direct = "direct",
    /** 自动叠加 */
    Auto = "auto",
    /** 四参数叠加 */
    Param = "param"
}


// wms地图底图参数
export interface WmsBaseMapParam {
    // 底图类型
    baseMapType?: "" | "CAD" | "WGS84" | "GCJ02"/*| "BD09"*/; // 底图为cad，或者为互联网地图的wgs84坐标（如osm、天地图)、或火星坐标如GCJ02(高德)。为空时默认为CAD图做为底图
    /** 地图ID. */
    mapid?: string;
    /** 地图版本. */
    version?: string;
    /** 地理真实范围 */
    mapbounds?: string;
}

// wms需要叠加的地图参数
export interface WmsMapParam {
    /** 地图ID(为空时采用当前打开的mapid) */
    mapid: string;
    /** 地图版本(为空时采用当前打开的地图版本). */
    version?: string;
    /** 图层样式名称. (如果图层样式名称为空时，则根据下面的样式去获取图层样式名称) */
    layer?: string;
    /** 图层样式. */
    style?: IMapStyleParam;
    /** cad图的坐标系 */
    crs?: string;
    /** 四参数(x偏移,y偏移,缩放，旋转弧度)*/
    fourParameterX?: number;
    fourParameterY?: number;
    fourParameterScale?: number;
    fourParameterRotate?: number;
    // 底图类型
    baseMapType?: "" | "CAD" | "WGS84" | "GCJ02"/*| "BD09"*/; // 底图为cad，或者为互联网地图的wgs84坐标（如osm、天地图)、或火星坐标如GCJ02(高德)。为空时默认为CAD图做为底图
    // 底图为互联网地图时，数据瓦片地址
    webMapTiles?: string[];
    isSetRotateZero?: boolean; // 公共点叠加时是否允许旋转
    coordinates?: {x1: number;y1: number;x2: number;y2: number;}[] // 公共点坐标 x1,y1底图坐标, x2,y2对应点坐标
}

export interface OverMapParam {
    maps: WmsMapParam | WmsMapParam[],
    layerProps: Record<string, any>
}


export const createMapStyleLayerName = async (svc: Service, overMapType: WmsOverlayMapType, overMapParam: WmsMapParam | WmsMapParam[], backcolor?: number) => {
    if (!Array.isArray(overMapParam)) {
        if (!overMapParam.layer) {
            if (!overMapParam.style) {
                overMapParam.style = {
                    backcolor: backcolor ?? 0
                }
            }
            let res = await svc.createStyle(overMapParam.style, overMapParam.mapid, overMapParam.version);
            overMapParam.layer = res.stylename;
        }
    } else {
        for await (let item of overMapParam) {
            if (!item.layer) {
                if (!item.style) {
                    item.style = {
                        backcolor: backcolor ?? 0
                    }
                }
                let res = await svc.createStyle(item.style, item.mapid, item.version);
                item.layer = res.stylename;
            }
        }
    }
    return overMapParam;
}

// 获取wms图层叠加后的在底图上面的范围
export const getWmsMapsBounds = async (svc: Service, overMapType: WmsOverlayMapType, baseMapType: "" | "CAD" | "WGS84" | "GCJ02"/*| "BD09"*/, overMapParam: WmsMapParam | WmsMapParam[]) => {
    let bounds: vjmap.GeoBounds | undefined;
    const getMapBounds = async (omp: WmsMapParam) => {
        if (!omp.mapid) return
        let metadata = await svc.metadata(omp.mapid, omp.version);
        let mapbounds = vjmap.GeoBounds.fromString(metadata.bounds);
        if (overMapType == WmsOverlayMapType.Auto) {
            // 自动叠加
            if (isWebBaseMap(baseMapType)) {
                let fourParam =  omp.fourParameterX !== undefined ? [omp.fourParameterX ?? 0, omp.fourParameterY ?? 0, omp.fourParameterScale ?? 1, omp.fourParameterRotate ?? 0].join(",") : undefined
                let points = mapbounds.toPointArray();
                let b = new vjmap.GeoBounds();
                for await(let p of points) {
                    let pt = await cad2webCoordinate(svc, vjmap.geoPoint(p), omp.crs ?? '', fourParam, baseMapType == "WGS84" );
                    b.update([vjmap.geoPoint(pt)]);
                }
                return b;
            } else {
                // cad为底图叠加互联网地图，不需限制wms范围
                return
            }
        } else if(overMapType == WmsOverlayMapType.Param) {
            // 参数叠加
            if (isWebBaseMap(omp.baseMapType)) {
                // 如果要叠加的是互联网地图
                return
            }
            let points = mapbounds.toPointArray();
            let b;
            for (let p of points) {
                if (omp.coordinates) {
                    let pt = overlay2BaseCoordinate(vjmap.geoPoint(p), omp.coordinates, omp.isSetRotateZero, isWebBaseMap(baseMapType));
                    if (!b) {
                        b = new vjmap.GeoBounds();
                    }
                    b.update([vjmap.geoPoint(pt)]);
                }
            }
            return b;
        }
        return mapbounds;
    }
    if (!Array.isArray(overMapParam)) {
        let extent = await getMapBounds(overMapParam);
        if (!extent) return;
        if (!bounds) {
            bounds = new vjmap.GeoBounds();
        }
        bounds.updateByBounds(extent);
    } else {
        for await (let item of overMapParam) {
            let extent = await getMapBounds(item);
            if (!extent) return;
            if (!bounds) {
                bounds = new vjmap.GeoBounds();
            }
            bounds.updateByBounds(extent);
        }
    }
    return bounds;
}

const getMapInfo = (overMapType: WmsOverlayMapType, baseMapParam: WmsBaseMapParam, overMapParam: WmsMapParam | WmsMapParam[]) => {
    const getFourParam = (item: WmsMapParam) => {
        if (overMapType == WmsOverlayMapType.Param) {
            if (!item.coordinates || item.coordinates.length <= 1) return;
            // 如果是公共点叠加，需要通过公共点计算四参数
            if (isWebBaseMap(baseMapParam.baseMapType)) {
                // 互联网为底图
                let epsg3857Points = item.coordinates.map(w => vjmap.geoPoint(vjmap.Projection.lngLat2Mercator([w.x1, w.y1])));
                let cadPoints = item.coordinates.map(w => vjmap.geoPoint([w.x2, w.y2]));
                let param = vjmap.coordTransfromGetFourParamter(epsg3857Points, cadPoints, item.isSetRotateZero ?? false, true);
                return [param.dx, param.dy, param.scale, param.rotate]
            } else {
                let basePoints = item.coordinates.map(w => vjmap.geoPoint([w.x1, w.y1]));
                let cadPoints = item.coordinates.map(w => vjmap.geoPoint([w.x2, w.y2]));
                let param = vjmap.coordTransfromGetFourParamter(basePoints, cadPoints, item.isSetRotateZero ?? false, true);
                return [param.dx, param.dy, param.scale, param.rotate]
            }
        } else {
            return item.fourParameterX !== undefined ? [item.fourParameterX ?? 0, item.fourParameterY ?? 0, item.fourParameterScale ?? 1, item.fourParameterRotate ?? 0] : undefined
        }
    }
    if (!Array.isArray(overMapParam)) {
        return {
            mapid: overMapParam.mapid,
            version: overMapParam.version,
            layers: overMapParam.layer,
            crs: overMapParam.crs,
            fourParameter: getFourParam(overMapParam)
        }
    } else {
        if (overMapParam.length == 1) {
            return {
                mapid: overMapParam[0].mapid,
                version: overMapParam[0].version,
                layers: overMapParam[0].layer,
                crs: overMapParam[0].crs,
                fourParameter: getFourParam(overMapParam[0])
            }
        } else {
            let mapids = [], versions = [], layers = [], crss = [], fourParameters = [];
            for(let i = 0; i < overMapParam.length; i++) {
                mapids.push(overMapParam[i].mapid);
                versions.push(overMapParam[i].version);
                layers.push(overMapParam[i].layer);
                crss.push(overMapParam[i].crs);
                fourParameters.push( getFourParam(overMapParam[i]))
            }
            return {
                mapid: mapids,
                version: versions,
                layers: layers,
                crs: crss,
                fourParameter: fourParameters
            }
        }
    }
}
// 获取wms直接叠加瓦片地址
export const getWmsDirectTileUrl = async (svc: Service, overMapType: WmsOverlayMapType, baseMapParam: WmsBaseMapParam, overMapParam: WmsMapParam | WmsMapParam[], layerProps?: Record<string, any>) => {
   await createMapStyleLayerName(svc, overMapType, overMapParam);
   return svc.wmsTileUrl(
    {
        ...getMapInfo(overMapType, baseMapParam, overMapParam) as any,
        mapbounds: baseMapParam.mapbounds,
        ...layerProps
    }
   )
}

// 获取wms自动叠加瓦片地址(互联网为底图,CAD图进行叠加适配)
export const getWmsAutoWebBaseMapTileUrl = async (svc: Service,overMapType: WmsOverlayMapType, baseMapParam: WmsBaseMapParam, overMapParam: WmsMapParam | WmsMapParam[], layerProps?: Record<string, any>) => {
    await createMapStyleLayerName(svc, overMapType, overMapParam);
    const mapInfos =  vjmap.cloneDeep(getMapInfo(overMapType, baseMapParam, overMapParam)) as any;
    if (mapInfos.fourParameter) {
        // xy的偏移量应该是反算，所以得减去设置的值
        if (Array.isArray(mapInfos.mapid)) {
            for(let i  = 0; i < mapInfos.fourParameter.length; i++) {
                if (typeof(mapInfos.fourParameter[i][0]) == "number") {
                    mapInfos.fourParameter[i][0] = - mapInfos.fourParameter[i][0] ;
                }
                if (typeof(mapInfos.fourParameter[i][1]) == "number") {
                    mapInfos.fourParameter[i][1] = - mapInfos.fourParameter[i][1] ;
                }
                mapInfos.fourParameter[i][0] = mapInfos.fourParameter[i][0]  || 0
                mapInfos.fourParameter[i][1] = mapInfos.fourParameter[i][1]  || 0
                mapInfos.fourParameter[i][2] = mapInfos.fourParameter[i][2]  || 1
                mapInfos.fourParameter[i][3] = mapInfos.fourParameter[i][3]  || 0
            }
        } else {
            if (typeof(mapInfos.fourParameter[0]) == "number") {
                mapInfos.fourParameter[0] = - mapInfos.fourParameter[0] ;
            }
            if (typeof(mapInfos.fourParameter[1]) == "number") {
                mapInfos.fourParameter[1] = - mapInfos.fourParameter[1] ;
            }
            mapInfos.fourParameter[0] = mapInfos.fourParameter[0]  || 0
            mapInfos.fourParameter[1] = mapInfos.fourParameter[1]  || 0
            mapInfos.fourParameter[2] = mapInfos.fourParameter[2]  || 1
            mapInfos.fourParameter[3] = mapInfos.fourParameter[3]  || 0
        }
    }
    return svc.wmsTileUrl(
     {
         ...mapInfos as any,
         srs: "EPSG:3857", 
         webMapType: baseMapParam.baseMapType, // 底图类型
         ...layerProps
     }
    )
 }

 
// 获取wms自动叠加瓦片地址(CAD图为底图,互联网进行叠加适配)
export const getWmsAutoCadBaseMapTileUrl = async (svc: Service, baseMapParam: WmsBaseMapParam, overMapParam: WmsMapParam | WmsMapParam[], layerProps?: Record<string, any>) => {
    let overMap: WmsMapParam | undefined;
    if (Array.isArray(overMapParam)) {
        overMap = overMapParam.find(o => isWebBaseMap(o.baseMapType));
    } else {
        overMap = overMapParam;
    }
    if (!overMap) return;
    const tiles = overMap.webMapTiles?.map(t => getTileShards(t)) || [];
    return svc.webMapUrl({
        tileCrs: overMap.baseMapType == "GCJ02" ? "gcj02" : "wgs84",
        tileUrl:  tiles?.map(t => t.tileUrl) ?? '',
        tileSize: 256,
        tileRetina: 1,
        tileMaxZoom: 18,
        tileShards: (tiles.length >= 0) ? tiles[0].tileShards : '',
        tileToken: "",
        tileFlipY: false,
        mapbounds: baseMapParam.mapbounds,
        srs: overMap.crs,
        fourParameterBefore: overMap.fourParameterX !== undefined ? [overMap.fourParameterX ?? 0, overMap.fourParameterY ?? 0, overMap.fourParameterScale?? 1, overMap.fourParameterRotate ?? 0].join(",") : undefined
    });
 }

 // 获取wms参数叠加瓦片地址
export const getWmsParamTileUrl = async (svc: Service, overMapType: WmsOverlayMapType, baseMapParam: WmsBaseMapParam, overMapParam: WmsMapParam | WmsMapParam[], layerProps?: Record<string, any>) => {
    await createMapStyleLayerName(svc, overMapType, overMapParam);
    let mapbounds;
    if (!isWebBaseMap(baseMapParam.baseMapType) ) {
        mapbounds = baseMapParam.mapbounds
        if (mapbounds) {
            mapbounds = mapbounds.replace("[", "");
            mapbounds = mapbounds.replace("]", "");
        }
    }
    return svc.wmsTileUrl(
     {
         ...getMapInfo(overMapType, baseMapParam, overMapParam) as any,
         mapbounds: mapbounds,
         ...layerProps
     }
    )
 }

// 获取wms瓦片地址
export const getWmsTileUrl = async (svc: Service, baseMapParam: WmsBaseMapParam, overMapType: WmsOverlayMapType, overMapParam: OverMapParam) => {
    let tileUrl;
    if (overMapType == WmsOverlayMapType.Direct) {
        // 直接叠加
        tileUrl = await getWmsDirectTileUrl(svc, overMapType, baseMapParam, overMapParam.maps, overMapParam.layerProps);
    } else if (overMapType == WmsOverlayMapType.Auto) {
        // 自动叠加
        if (isWebBaseMap(baseMapParam.baseMapType)) {
            tileUrl = await getWmsAutoWebBaseMapTileUrl(svc, overMapType, baseMapParam, overMapParam.maps, overMapParam.layerProps);
        } else {
            tileUrl = await getWmsAutoCadBaseMapTileUrl(svc, baseMapParam, overMapParam.maps, overMapParam.layerProps);
        }
    }  else if (overMapType == WmsOverlayMapType.Param) {
        tileUrl = await getWmsParamTileUrl(svc, overMapType, baseMapParam, overMapParam.maps, overMapParam.layerProps);
    }
    if (!tileUrl) return;
    return [tileUrl]
}


// cad转web坐标，isWgs84是否为wgs84 4326坐标，如天地图；否的话为gcj02火星坐标,如高德地图  crs为epsg代号 fourParameter "x,y,scale,rotate"
export const cad2webCoordinate = async (svc: vjmap.Service, pt: vjmap.GeoPoint, crs: string, fourParameterStr?: string, isWgs84?: boolean) => {
    if (fourParameterStr) {
        let fourParameter = fourParameterStr.split(",");
        pt = vjmap.coordTransfromByFourParamter(pt, {
            dx: +fourParameter[0],
            dy: +fourParameter[1],
            scale: +fourParameter[2],
            rotate: +fourParameter[3]
        })
    }
    // 通过坐标转换把4527转成wgs84 4326坐标
    let res = await svc.cmdTransform(crs, "EPSG:4326",pt); // 如果不想调服务转，也可以在前端用proj4库
    // 如果为火星坐标，还需要从4326转火星
    let webPt = res[0];// 返回的第1条结果
    if (isWgs84 === false) {
        webPt = vjmap.transform.convert(webPt, vjmap.transform.CRSTypes.EPSG4326, vjmap.transform.CRSTypes.AMap)
    }
    return webPt;
}

// web转cad坐标，isWgs84是否为wgs84 4326坐标，如天地图；否的话为gcj02火星坐标,如高德地图 crs为epsg代号 fourParameter "x,y,scale,rotate"
export const web2cadCoordinate = async (svc: vjmap.Service, pt: vjmap.GeoPoint, crs: string, fourParameterStr?: string, isWgs84?: boolean) => {
    // (上面计算过程的逆过程), 如果为火星坐标，还需要从火星转4326，再通过坐标转换把wgs84 4326转成4527坐标, 4527坐标先通过四参数，得到cad坐标
    if (isWgs84 === false) {
        pt = vjmap.transform.convert(pt, vjmap.transform.CRSTypes.AMap, vjmap.transform.CRSTypes.EPSG4326);
    }
    // 通过坐标转换把4527转成wgs84 4326坐标
    let res = await svc.cmdTransform("EPSG:4326",crs,vjmap.geoPoint(pt)); // 如果不想调服务转，也可以在前端用proj4库
    let cadPt = res[0];// 返回的第1条结果
   
    if (fourParameterStr) {
        // 四参数反算
        let fourParameter = fourParameterStr.split(",");
        cadPt = vjmap.coordTransfromByFourParamter(vjmap.geoPoint(cadPt), {
            dx: +fourParameter[0],
            dy: +fourParameter[1],
            scale: +fourParameter[2],
            rotate: +fourParameter[3]
        })
    }
    return vjmap.geoPoint(cadPt).toArray()
}

// 四参数中坐标转换-叠加点转底图点
export const overlay2BaseCoordinate =  (pt: vjmap.GeoPoint,
    coordinates: {x1: number /* 底图公共点x*/;y1: number/* 底图公共点y*/;x2: number /* 叠加公共点x*/;y2: number;/* 叠加公共点x*/}[], 
    isSetRotateZero?: boolean/* 是否允许旋转*/, basemapIsWeb?: boolean /* 底图是否为互联网地图*/) => {
    let basePoints;
    if (basemapIsWeb) {
        basePoints = coordinates.map(w => vjmap.geoPoint(vjmap.Projection.lngLat2Mercator([w.x1, w.y1])));
    } else {
        basePoints = coordinates.map(w => vjmap.geoPoint([w.x1, w.y1]));
    }
    let cadPoints = coordinates.map(w => vjmap.geoPoint([w.x2, w.y2]));
    if (basePoints.length == 0 || cadPoints.length == 0) return vjmap.geoPoint(pt)
    let param = vjmap.coordTransfromGetFourParamter(cadPoints, basePoints, isSetRotateZero ?? false, true);
    let co = vjmap.coordTransfromByFourParamter(pt, param);
    if (basemapIsWeb) {
        co = vjmap.geoPoint(vjmap.Projection.mercator2LngLat(co));
    }
    return co;
}

// 四参数中坐标转换-底图点转叠加点
export const base2OverlayCoordinate =  (pt: vjmap.GeoPoint,
    coordinates: {x1: number /* 底图公共点x*/;y1: number/* 底图公共点y*/;x2: number /* 叠加公共点x*/;y2: number;/* 叠加公共点x*/}[], 
    isSetRotateZero?: boolean/* 是否允许旋转*/, basemapIsWeb?: boolean /* 底图是否为互联网地图*/) => {
    let basePoints;
    if (basemapIsWeb) {
        basePoints = coordinates.map(w => vjmap.geoPoint(vjmap.Projection.lngLat2Mercator([w.x1, w.y1])));
    } else {
        basePoints = coordinates.map(w => vjmap.geoPoint([w.x1, w.y1]));
    }
    let cadPoints = coordinates.map(w => vjmap.geoPoint([w.x2, w.y2]));
    if (basePoints.length == 0 || cadPoints.length == 0) return vjmap.geoPoint(pt)
    let param = vjmap.coordTransfromGetFourParamter(basePoints, cadPoints, isSetRotateZero ?? false, true);
    if (basemapIsWeb) {
        pt = vjmap.geoPoint(vjmap.Projection.lngLat2Mercator(pt));
    }
    return vjmap.coordTransfromByFourParamter(pt, param);
}