import { GeoBounds, IMapStyleParam, Service } from "vjmap";
import vjmap from "vjmap";
export declare enum WmsOverlayMapType {
    /** 不叠加. */
    None = "none",
    /** 直接叠加. */
    Direct = "direct",
    /** 自动叠加 */
    Auto = "auto",
    /** 四参数叠加 */
    Param = "param"
}
export interface WmsBaseMapParam {
    baseMapType?: "" | "CAD" | "WGS84" | "GCJ02";
    /** 地图ID. */
    mapid?: string;
    /** 地图版本. */
    version?: string;
    /** 地理真实范围 */
    mapbounds?: string;
}
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
    baseMapType?: "" | "CAD" | "WGS84" | "GCJ02";
    webMapTiles?: string[];
    isSetRotateZero?: boolean;
    coordinates?: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }[];
}
export interface OverMapParam {
    maps: WmsMapParam | WmsMapParam[];
    layerProps: Record<string, any>;
}
export declare const createMapStyleLayerName: (svc: Service, overMapType: WmsOverlayMapType, overMapParam: WmsMapParam | WmsMapParam[], backcolor?: number) => Promise<WmsMapParam | WmsMapParam[]>;
export declare const getWmsMapsBounds: (svc: Service, overMapType: WmsOverlayMapType, baseMapType: "" | "CAD" | "WGS84" | "GCJ02", overMapParam: WmsMapParam | WmsMapParam[]) => Promise<GeoBounds | undefined>;
export declare const getWmsDirectTileUrl: (svc: Service, overMapType: WmsOverlayMapType, baseMapParam: WmsBaseMapParam, overMapParam: WmsMapParam | WmsMapParam[], layerProps?: Record<string, any>) => Promise<string>;
export declare const getWmsAutoWebBaseMapTileUrl: (svc: Service, overMapType: WmsOverlayMapType, baseMapParam: WmsBaseMapParam, overMapParam: WmsMapParam | WmsMapParam[], layerProps?: Record<string, any>) => Promise<string>;
export declare const getWmsAutoCadBaseMapTileUrl: (svc: Service, baseMapParam: WmsBaseMapParam, overMapParam: WmsMapParam | WmsMapParam[], layerProps?: Record<string, any>) => Promise<string | undefined>;
export declare const getWmsParamTileUrl: (svc: Service, overMapType: WmsOverlayMapType, baseMapParam: WmsBaseMapParam, overMapParam: WmsMapParam | WmsMapParam[], layerProps?: Record<string, any>) => Promise<string>;
export declare const getWmsTileUrl: (svc: Service, baseMapParam: WmsBaseMapParam, overMapType: WmsOverlayMapType, overMapParam: OverMapParam) => Promise<string[] | undefined>;
export declare const cad2webCoordinate: (svc: vjmap.Service, pt: vjmap.GeoPoint, crs: string, fourParameterStr?: string, isWgs84?: boolean) => Promise<any>;
export declare const web2cadCoordinate: (svc: vjmap.Service, pt: vjmap.GeoPoint, crs: string, fourParameterStr?: string, isWgs84?: boolean) => Promise<number[]>;
export declare const overlay2BaseCoordinate: (pt: vjmap.GeoPoint, coordinates: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}[], isSetRotateZero?: boolean, basemapIsWeb?: boolean) => vjmap.GeoPoint;
export declare const base2OverlayCoordinate: (pt: vjmap.GeoPoint, coordinates: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}[], isSetRotateZero?: boolean, basemapIsWeb?: boolean) => vjmap.GeoPoint;
export declare const getEpsgRange: (type: "BEIJING54_3" | "BEIJING54_6" | "XIAN80_3" | "XIAN80_6" | "CGCS2000_3" | "CGCS2000_6") => any;
