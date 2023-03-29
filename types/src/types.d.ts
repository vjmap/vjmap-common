import type { CircleLayerStyleProp, FillExtrusionLayerStyleProp, FillLayerStyleProp, HeatmapLayerStyleProp, HillshadeLayerStyleProp, IOpenMapParam, LineLayerStyleProp, MapOptions, RasterLayerStyleProp, SourceSpecification, SymbolLayerStyleProp } from "vjmap";
export interface MapConfig extends MapOptions {
    isFitMapBounds?: boolean;
}
export interface MapOpenOptions extends IOpenMapParam {
    isKeepOldLayers?: boolean;
    isVectorStyle?: boolean;
    isSetCenter?: boolean;
    isFitBounds?: boolean;
}
export interface MapSource {
    id: string;
    source: SourceSpecification;
    tag?: string;
    props?: Record<string, any>;
    visibleOff?: boolean;
    memo?: string;
    [key: string]: any;
}
export type LayerSpecification = LineLayerStyleProp | FillLayerStyleProp | CircleLayerStyleProp | SymbolLayerStyleProp | RasterLayerStyleProp | FillExtrusionLayerStyleProp | HeatmapLayerStyleProp | HillshadeLayerStyleProp;
export interface MapLayer {
    layerId: string;
    sourceId: string;
    memo?: string;
    tag?: string;
    type: string;
    before?: string;
    visibleOff?: boolean;
    [key: string]: any;
}
export type MapOption = Omit<MapOptions, "container">;
export interface MapAppConfig {
    title?: string;
    description?: string;
    serviceUrl?: string;
    serviceToken?: string;
    accessKey?: string;
    workspace?: string;
    thumbnail?: string;
    mapInitBounds?: string;
    backgroundColor?: string;
    baseMapType?: "" | "CAD" | "WGS84" | "GCJ02";
    webMapTiles?: string[];
    mapOpenOptions?: MapOpenOptions;
    mapOptions?: MapOption;
    mapSources?: MapSource[];
    mapLayers?: MapLayer[];
    controls?: {
        name: string;
        position: string;
        options?: string;
    }[];
    mapImages?: {
        key: string;
        value: string;
        options?: string;
    }[];
    program?: Record<string, string>;
}
