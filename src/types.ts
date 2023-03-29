
import type {
  CircleLayerStyleProp,
  FillExtrusionLayerStyleProp,
  FillLayerStyleProp,
  HeatmapLayerStyleProp,
  HillshadeLayerStyleProp,
  IOpenMapParam,
  LineLayerStyleProp,
  MapOptions,
  RasterLayerStyleProp,
  SourceSpecification,
  SymbolLayerStyleProp,
} from "vjmap";


export interface MapConfig extends MapOptions {
  isFitMapBounds?: boolean;
}

export interface MapOpenOptions extends IOpenMapParam {
  isKeepOldLayers?: boolean; //  是否保留之前的图层数据，默认false
  isVectorStyle?: boolean; //  是否为矢量样式
  isSetCenter?: boolean; //  是否默认设置为地图中心点
  isFitBounds?: boolean; //  默认是否缩放
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

export type LayerSpecification =
  | LineLayerStyleProp
  | FillLayerStyleProp
  | CircleLayerStyleProp
  | SymbolLayerStyleProp
  | RasterLayerStyleProp
  | FillExtrusionLayerStyleProp
  | HeatmapLayerStyleProp
  | HillshadeLayerStyleProp;

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
  // 项目名称
  title?: string;
  // 项目描述
  description?: string;
  // 服务地址
  serviceUrl?: string;
  // 服务token
  serviceToken?: string;
  // 访问key,[如果多个时用;分开。访问有密码保护的图如果key正确将不会弹密码输入框]
  accessKey?: string;
  // 工作区名称
  workspace?: string;
  // 缩略图地址
  thumbnail?: string;
  // 默认打开时地图初始范围 默认为[-10000,-10000,10000,10000]
  mapInitBounds?: string
  // div背景色
  backgroundColor?: string;
  // 底图类型
  baseMapType?: "" | "CAD" | "WGS84" | "GCJ02"/*| "BD09"*/; // 底图为cad，或者为互联网地图的wgs84坐标（如osm、天地图)、或火星坐标如GCJ02(高德)。为空时默认为CAD图做为底图
  // 底图为互联网地图时，数据瓦片地址
  webMapTiles?: string[];
  // 地图打开
  mapOpenOptions?: MapOpenOptions;
  // 地图选项
  mapOptions?: MapOption;
  // 数据源
  mapSources?: MapSource[];
  // 图层
  mapLayers?: MapLayer[];
  // 控件
  controls?: {name:string,position:string,options?:string}[];
  // 图像资源
  mapImages?: {key:string,value:string,options?:string}[];
  // 代码逻辑
  program?: Record<string, string>;
}
