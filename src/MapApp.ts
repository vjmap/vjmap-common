import vjmap, { Service, Map, MapOptions, Control, IControl, LngLatBounds } from "vjmap";
import { MapAppConfig, MapLayer, MapOpenOptions, MapOption, MapSource } from "./types";
import { providerLayers } from "./layers";
import { execProgram, getShardsTileUrl, toMapLayer } from "./utils";
import { requestChangeData, queryMapData } from "./map/query";
import sysImages from "./sysImages";
import { loadWebMap } from "./web/provider";
import { locale } from "./map/setting"
import LayerBase from "./layers/base";
import { getWmsMapsBounds, getWmsTileUrl } from "./map/wms";
import { listenKeyEvent } from "./map/keyboard";
// 地图应用类
export class MapApp {
  public config!: MapAppConfig;
  public svc!: Service;
  public map!: Map;
  public sources!: MapSource[];
  public layers!: MapLayer[];
  public controls!: (Control | IControl | null)[];
  public layersInst!: Record<string, LayerBase>;
  public projectKey: string | undefined;
  public containerId!: string;
  private timeMgr: Record<string, any>; // 定时器管理
  public isEditorMode?: boolean; // 是否为编辑模式
  public isDisableRunProgram?: boolean; // 是否不运行自定义的程序代码
  public context?: any; // 上下文环境
  private programCleaner?: Function[]; //函数清理回调
  private oldCacheImages?: Record<string, any>;
  public keyEvent?: ReturnType<typeof listenKeyEvent>; // 键盘事件
  constructor(config?: MapAppConfig) {
    this.config = config || {};
    this.sources = [];
    this.layers = [];
    this.layersInst = {};
    this.timeMgr = {};
    this.config.mapSources = [];
    this.config.mapLayers = [];
  }

  public mount(
    containerId: string,
    env?: { serviceUrl: string; serviceToken: string }
  ) {
    if (this.svc) return; // 如果已经挂载过
    if (!this.keyEvent) this.keyEvent = listenKeyEvent();
    this.containerId = containerId;
    if (this.config?.backgroundColor) {
      const element = document.getElementById(containerId);
      if (element) element.style.backgroundColor = this.config?.backgroundColor;
    }
    this.svc = new vjmap.Service(
      this.config.serviceUrl ?? env?.serviceUrl ?? "",
      this.config.serviceToken ?? env?.serviceToken ?? ""
    );

    if (this.config.workspace) {
      this.svc.switchWorkspace(this.config.workspace);
    }
    if (this.config.accessKey) {
      this.config.accessKey
        .split(";")
        .map((key: string) => this.svc.addAccessKey(key));
    }
    const mapBounds = this.config.mapInitBounds ?? "[-10000,-10000,10000,10000]";
    const mapExtent = vjmap.GeoBounds.fromString(mapBounds);
    // 建立坐标系
    const prj = new vjmap.GeoProjection(mapExtent);
    // 新建地图对象
    this.map = new vjmap.Map({
      container: containerId, // container ID
      style: {
        version: this.svc.styleVersion(),
        glyphs: this.svc.glyphsUrl(),
        sources: {},
        layers: [],
      },
      center: prj.toLngLat(mapExtent.center()), // 中心点
      zoom: 2,
      renderWorldCopies: false,
      preserveDrawingBuffer: this.isEditorMode ? true : undefined, // 保存地图截图需要设置参数。非编辑模式不要设置此参数，会影响绘制性能
      doubleClickZoom: false,
      locale, 
      ...this.config.mapOptions,
    });
    // 地图关联服务对象和坐标系
    this.map.attach(this.svc, prj);
  }

  // 关联一个已有的地图对象
  public attachMap(map: Map) {
    this.map = map;
    this.svc = this.map.getService();
    if (!this.keyEvent) this.keyEvent = listenKeyEvent();
  }

  // 底图是否为互联网底图
  public isWebBaseMap(config?: MapAppConfig) {
    let cfg = config ?? this.config ?? {};
    return !(cfg.baseMapType == "" || cfg.baseMapType == "CAD" || cfg.baseMapType === undefined)
  }

  // 设置配置
  public async setConfig(config?: MapAppConfig, noSetMapOptions?: boolean /* 是否不设置地图选项，如果不想让地图位置设置后回到初始位置，可设置为true */) {
    // if (this.config && config) return; // 如果配置构造函数里面传过
    if (!config) {
      config = vjmap.cloneDeep(this.config); //先备份所有数据
    }
    if (!this.map) return;
    // 清空之前的所有数据
    await this.map.onLoad();
    this.clearData();
    if (config) {
      this.config = config;
    }
    if (this.config?.backgroundColor) {
      const element = this.map.getContainer();
      if (element) element.style.backgroundColor = this.config?.backgroundColor;
    }
    const mapSources = [...(config?.mapSources ?? [])];
    const mapLayers = [...(config?.mapLayers ?? [])];
    this.svc = new vjmap.Service(
      this.config.serviceUrl ?? this.svc?.serverUrl ?? "",
      this.config.serviceToken ?? this.svc?.accessToken ?? ""
    );
    if (!this.isWebBaseMap()) {
      if (!this.config.mapOpenOptions?.mapid) {
        // 用默认打开时地图初始范围
        if (this.config.mapInitBounds) {
          const mapBounds = this.config.mapInitBounds;
          const mapExtent = vjmap.GeoBounds.fromString(mapBounds);
          const prj = new vjmap.GeoProjection(mapExtent);
          this.map.setMapProjection(prj);
        }
      } 
      this.map.attach(this.svc, this.map.getMapProjection());
    } else {
      // 建立互联网的经纬度投影坐标系
      let prj = new vjmap.LnglatProjection();
      this.map.attach(this.svc, prj);
      loadWebMap(this.map, this.config);
    }
    if (this.config.workspace) {
      this.svc.switchWorkspace(this.config.workspace);
    }

    if (this.config.accessKey) {
      this.config.accessKey
        .split(";")
        .map((key: string) => this.svc.addAccessKey(key));
    }

    if (!this.isWebBaseMap()) {
      // 如果是以cad图为底图
      // @ts-ignore
      this.config.mapOpenOptions = this.config.mapOpenOptions || {};
      if (!this.config.mapOpenOptions?.style) {
        // @ts-ignore
        this.config.mapOpenOptions.style = vjmap.openMapDarkStyle(); // 如果没有设置样式，则默认为暗黑样式
      }
      if (this.config.mapOpenOptions?.mapid) {
        // 如果有地图id
        const res = await this.switchMap(this.config.mapOpenOptions);
        if (res?.error) {
          return {
            error: res.error,
          };
        }
      }
    }
    if (!noSetMapOptions) {
      this.setMapOptions(this.config.mapOptions ?? {});
    }
    await this.map.onLoad(true);
    await this.addMapImages();
    let addSourcesNoDeps: any = [];
    let addSourcesDeps: any = [];
    // 没数据依赖的数据源放前面
    mapSources
      .filter(
        (s) => !(s.tag == "change" && s.change && s.change.reqType == "SOURCE")
      )
      .forEach((source) => addSourcesNoDeps.push(this.addSource(source, true)));
    await Promise.all(addSourcesNoDeps);
    // 有数据依赖的数据源放后面
    mapSources
      .filter(
        (s) => s.tag == "change" && s.change && s.change.reqType == "SOURCE"
      )
      .forEach((source) => addSourcesDeps.push(this.addSource(source, true)));
    await Promise.all(addSourcesDeps);
    for (let layer of mapLayers) {
      await this.addLayer(layer, true);
    }
    this.addControls();
    await this.execProgram();
  }

  // 设置地图打开参数
  public async setMapOpenOptions(option: Partial<MapOpenOptions>) {
    // @ts-ignore
    this.config.mapOpenOptions = {
      ...this.config.mapOpenOptions,
      ...option,
    };
    await this.setConfig();
  }

  // 设置地图参数
  public setMapOptions(option: MapOption) {
    this.config.mapOptions = {
      ...this.config.mapOptions,
      ...option,
    };
    if (!this.map) return;
    if (option.center) {
      this.map.setCenter(option.center);
    } else if (this.isWebBaseMap()) {
      // 互联网地图，开始默认设置到中国
      this.map.setCenter([116.3912, 39.9073]);
    }
    if (option.zoom !== undefined) {
      this.map.setZoom(option.zoom);
    } else if (this.isWebBaseMap()) {
      // 互联网地图，开始默认设置到中国
      this.map.setZoom(8);
    }
    if (option.bearing !== undefined) {
      this.map.setBearing(option.bearing);
    }
    if (option.pitch !== undefined) {
      this.map.setPitch(option.pitch);
    }
    if (option.dragRotate === false && this.map.dragRotate.isEnabled()) {
      // 如果不允许旋转
      this.map.dragRotate.disable();
      this.map.touchZoomRotate.disableRotation();
      // 如果不允许旋转时，禁止系统默认右键弹出
      this.map.getCanvasContainer().oncontextmenu = (e) => {
        e.preventDefault();
      };
    } else if (option.dragRotate && !this.map.dragRotate.isEnabled()) {
      // 如果允许旋转
      this.map.dragRotate.enable();
      this.map.touchZoomRotate.enableRotation();
      this.map.getCanvasContainer().oncontextmenu = () => {};
    }
    if (option.pitchWithRotate === false) {
      // 如果不允许旋转
      this.map.setMaxPitch(0);
    } else {
      this.map.setMaxPitch(85);
    }
  }

  /**
   * 增加地图图像资源
   */
  public async addMapImages() {
    try {
      if (!this.config.mapImages) return;
      this.oldCacheImages = this.oldCacheImages || {};
      let mapImages = [...this.config.mapImages];
      mapImages = mapImages.filter((img) => img.key && img.value);
      // 如果没有修改过，就不用再加了
      mapImages = mapImages.filter((img) => {
        const val = img.value + "_" + img.options ?? "";
        // @ts-ignore
        return this.oldCacheImages[img.key] != val;
      });
      // 先移除之前的图片资源
      for (let img of mapImages) {
        if (this.map.hasImage(img.key)) this.map.removeImage(img.key);
      }
      let loadImages: any = [];

      for (let img of mapImages) {
        let options;
        this.oldCacheImages[img.key] = img.value + "_" + img.options ?? "";
        if (typeof img.options == "string") {
          try {
            options = JSON.parse(img.options);
          } catch (error) {
            console.error(error);
          }
        }
        let createSysImg = sysImages[img.value];
        if (createSysImg) {
          // 如果是系统图片资源
          loadImages.push(
            this.map.addImage(img.key, createSysImg(this.map, options), options)
          );
        } else {
          loadImages.push(this.map.loadImageEx(img.key, img.value, options))
        }
      }
      await Promise.all(loadImages);
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * 清空地图上的所有数据
   */
  public async clearData() {
    if (!this.map) return;
    const { sources } = this.map.getStyle();
    this.removePrograms();
    for (const layerId in this.layersInst) {
      const inst = this.layersInst[layerId];
      if (inst) {
        inst.removeLayer(this.map, layerId);
      }
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const item in sources) {
      this.map.removeSourceEx(item);
    }
    this.map.removeMarkers();
    this.map.removePopups();
    this.removeControls();
    this.sources = [];
    this.layers = [];
    // @ts-ignore
    this.layersInst = [];
    this.config.mapSources = [];
    this.config.mapLayers = [];
    this.oldCacheImages = {};
    for (let k in this.timeMgr) {
      clearInterval(this.timeMgr[k]);
    }
    this.timeMgr = {};
  }

  /**
   * 移除所有逻辑程序段
   */
  public removePrograms() {
    if (this.programCleaner) {
      for (let p of this.programCleaner) {
        if (p) p();
      }
      this.programCleaner = [];
    }
  }

  /**
   * 移除所有逻辑程序段
   */
  public async execProgram() {
    if (this.isDisableRunProgram) return;
    this.removePrograms();
    // 加载完成后，如果有代码逻辑，则执行
    if (this.config.program && this.config.program.onMapLoaded) {
      let cleaner = await execProgram(
        this.config.program.onMapLoaded,
        this.map,
        this,
        this.context
      );
      if (typeof cleaner == "function") {
        this.programCleaner = this.programCleaner || [];
        this.programCleaner.push(cleaner);
      }
    }
  }
  /**
   * 销毁
   */
  public async destory() {
    this.clearData();
    if (this.map) {
      this.map.remove();
      // @ts-ignore
      this.map = null;
    }
    if (this.keyEvent) this.keyEvent.removeEventListener();
  }

  /**
   * 切换地图
   * @param param 打开选项
   */
  public async switchMap(param: MapOpenOptions) {
    this.config.mapOpenOptions = param;
    // 如果有地图id
    const res = await this.map.switchMap(
      param,
      param.isKeepOldLayers,
      param.isVectorStyle,
      param.isSetCenter,
      param.isFitBounds
    );
    if (res?.error) {
      return {
        error: res.error,
      };
    }
    return res;
  }

  /**
   * 增加数据源
   */
  public async addSource(source: MapSource, isUpdateConfig?: boolean) {
    const mapSource = vjmap.cloneDeep(source);
    const idx = this.sources.findIndex((s) => s.id === mapSource.id);
    if (idx >= 0) return false; // 如果已在
    this.sources.push(vjmap.cloneDeep(mapSource));
    if (isUpdateConfig) {
      const index = this.config.mapSources?.findIndex(
        (s) => s.id === mapSource.id
      );
      if (index == -1) {
        this.config.mapSources?.push(vjmap.cloneDeep(mapSource));
      }
    }
    if (mapSource.tag === "query") {
      // 如果是数据查询
      let data = await queryMapData(this.map, mapSource.query);
      // @ts-ignore
      mapSource.source.data = data;
    } else if (mapSource.tag === "change") {
      // 如果是动态数据
      let data = await requestChangeData(this.map, mapSource.change, this);
      // @ts-ignore
      mapSource.source.data = data;
      this.addTimer(mapSource);
    }
    if (mapSource.source.type === "geojson") {
      // 如果是geojson，则需要把data转成lnglat
      const source = vjmap.cloneDeep(mapSource.source);
      source.data = this.map.toLngLat(source.data);
      for (let k in mapSource.props) {
        // @ts-ignore
        source[k] = mapSource.props[k];
      }
      this.map.addSourceEx(mapSource.id, source);
    } else {
      await this.updateSource(mapSource);
    }
    return true;
  }

  /**
   * 获取数据源数据
   */
  public async getSourceData(sourceId: string) {
    const idx = this.sources.findIndex((s) => s.id === sourceId);
    if (idx < 0) return; // 如果不存在
    const mapSource = this.sources[idx];
    if (mapSource.tag === "query") {
      // 如果是数据查询
      return await queryMapData(this.map, mapSource.query);
    } else if (mapSource.tag === "change") {
      // 如果是动态数据
      return await requestChangeData(this.map, mapSource.change, this);
    } else if (mapSource.source.type === "geojson") {
      const source = vjmap.cloneDeep(mapSource.source);
      return source.data;
    }
  }

  /**
   * 设置数据源数据
   */
  public async setSourceData(
    sourceId: string,
    data?: any,
    isUpdateConfig?: boolean
  ) {
    const idx = this.sources.findIndex((s) => s.id === sourceId);
    if (idx < 0) return; // 如果不存在
    let index = -1;
    if (isUpdateConfig) {
      index = this.config.mapSources?.findIndex((s) => s.id === sourceId) ?? -1;
    }
    let isSetData = true;
    if (this.sources[idx].tag === "query") {
      // 如果是数据查询
      this.sources[idx].query = data;
      if (index >= 0 && this.config.mapSources) {
        this.config.mapSources[index].query = vjmap.cloneDeep(data);
      }
      data = await queryMapData(this.map, this.sources[idx].query);
    } else if (this.sources[idx].tag === "change") {
      // 如果是动态查询
      this.sources[idx].change = data;
      if (index >= 0 && this.config.mapSources) {
        this.config.mapSources[index].change = vjmap.cloneDeep(data);
      }
      data = await requestChangeData(this.map, this.sources[idx].change, this);
      this.addTimer(this.sources[idx]);
    } else {
      if (this.sources[idx].source.type === "geojson") {
        // @ts-ignore
        this.sources[idx].source.data = data;
        if (index >= 0 && this.config.mapSources) {
          // @ts-ignore
          this.config.mapSources[index].source.data = vjmap.cloneDeep(data);
        }
      } else {
        if (this.sources[idx].tag === "wms") {
          // 如果是wms
          const sourceType = this.sources[idx].source.type;
          this.sources[idx].wms = data.wms;
          this.sources[idx].source = {
            ...data.source,
          };
          if (sourceType) this.sources[idx].source.type = sourceType;
          if (index >= 0 && this.config.mapSources) {
            this.config.mapSources[index].wms = vjmap.cloneDeep(data.wms);
            this.config.mapSources[index].source = {
              type: this.sources[index].source.type,
              ...data.source
            }
            if (sourceType) this.config.mapSources[index].source.type = sourceType;// type不让修改
          }
        } else {
          const sourceType = this.sources[idx].source.type;
          this.sources[idx].source = vjmap.cloneDeep(data);
          if (sourceType) this.sources[idx].source.type = sourceType;
          if (index >= 0 && this.config.mapSources) {
            // @ts-ignore
            this.config.mapSources[index].source = vjmap.cloneDeep(data);
            if (sourceType) this.config.mapSources[index].source.type = sourceType;// type不让修改
          }
        }
        await this.updateSource(this.sources[idx], true); // 更新数据源
        isSetData = false;
      }
    }
    if (isSetData) {
      this.map.setData(sourceId, this.map.toLngLat(data));
    }
    await this.notifySourceDataChange(sourceId, !isSetData);
  }

  /**
   * 更新除geojson之外的数据源
   */
  public async updateSource(source: MapSource, isRemove?: boolean) {
    let mapSource = vjmap.cloneDeep(source);
    if (isRemove) {
      this.map.removeSourceEx(mapSource.id);
    }
    if (mapSource.source.type === "raster" || mapSource.source.type === "vector") {
      if (mapSource.source.bounds) {
        const p1 = this.map.toLngLat([mapSource.source.bounds[0], mapSource.source.bounds[1]]);
        const p2 = this.map.toLngLat([mapSource.source.bounds[2], mapSource.source.bounds[3]]);
        mapSource.source.bounds = [p1[0], p1[1], p2[0], p2[1]];
      }
      if (mapSource.tag == "wms") {
        mapSource.source.tiles = await getWmsTileUrl(this.svc, 
          {
            baseMapType: this.config.baseMapType,
            mapid: this.config.mapOpenOptions?.mapid,
            version: this.config.mapOpenOptions?.version,
            mapbounds: this.map.getGeoBounds(1.0).toString()
          },
          mapSource.wms?.overlayType,
          mapSource.wms?.param);
          if (!mapSource.source.bounds) {
            // 设置wms地图的范围，超过此范围了，就不会加载wms瓦片了
            let wmsBounds = await getWmsMapsBounds(this.svc, mapSource.wms?.overlayType, this.config.baseMapType ?? '', mapSource.wms?.param?.maps)
            if (wmsBounds) {
            let bounds = this.map.toLngLat(wmsBounds).toArray();
              mapSource.source.bounds = [bounds[0][0], bounds[0][1],bounds[1][0],bounds[1][1]];
            }
          }
      }
      if (!mapSource.source.tiles) {
        mapSource.source.tiles = getShardsTileUrl(mapSource.source.tiles as any, this.map);
      }
      if (mapSource.source.type === "raster") {
        this.map.addRasterSource(mapSource.id, mapSource.source);
      } else {
        this.map.addVectorSource(mapSource.id, mapSource.source, {}) ;
      }
    } else if (mapSource.source.type === "image" || mapSource.source.type === "video") {
      if (mapSource.source.coordinates) {
        mapSource.source.coordinates = this.map.toLngLat(mapSource.source.coordinates);
      }
      if (mapSource.source.type === "image") {
        this.map.addImageSource(mapSource.id, mapSource.source);
      } else {
        this.map.addVideoSource(mapSource.id, mapSource.source) ;
      }
    } else {
      this.map.addSourceEx(mapSource.id, mapSource.source);
    }
  }
  /**
   * 删除数据源
   */
  public removeSource(sourceId: string, isUpdateConfig?: boolean) {
    // 先删除所有数据源相关的图层
    for (let k = this.layers.length - 1; k >= 0; k--) {
      if (this.layers[k].sourceId == sourceId) {
        this.removeLayer(this.layers[k].layerId, true);
      }
    }
    this.map.removeSourceEx(sourceId); // 删除数据源及相关图层
    const idx = this.sources.findIndex((y) => y.id === sourceId);
    if (idx >= 0) {
      this.sources.splice(idx, 1);
    }
    if (isUpdateConfig) {
      const index = this.config.mapSources?.findIndex((y) => y.id === sourceId);
      if (index !== undefined && index >= 0) {
        this.config.mapSources?.splice(index, 1);
      }
    }
    this.clearTimer(sourceId);
  }

  /**
   * 增加图层
   */
  public async addLayer(layer: MapLayer, isUpdateConfig?: boolean) {
    const mapLayer = vjmap.cloneDeep(layer);
    const idx = this.layers.findIndex((y) => y.layerId === mapLayer.layerId);
    if (idx < 0) {
      this.layers.push(vjmap.cloneDeep(mapLayer)); // 如果不存在
    }
    if (isUpdateConfig) {
      const index = this.config.mapLayers?.findIndex(
        (y) => y.layerId === mapLayer.layerId
      );
      if (index == -1) {
        this.config.mapLayers?.push(vjmap.cloneDeep(mapLayer));
      }
    }
    if (mapLayer.visibleOff || this.layersInst[mapLayer.layerId]) {
      return; // 如果不可见或如果实例已存在
    }

    let layerClass = providerLayers[mapLayer.type];
    if (!layerClass) {
      console.error(`图层类型 ${mapLayer.type} 未注册`);
    }
    let layerInst = new layerClass();
    await layerInst.addLayer(this.map, mapLayer);
    this.layersInst[mapLayer.layerId] = layerInst; //把图层实例保存起来
    // 如果图层是设置了置底，则把图层移动至最下面
    if (layer.isLowest && layerInst.getLayerId()) {
      // 把这个图层放至所有图层的最下面
      let allStyleLayers = this.map.getStyle().layers;
      let lyIds = layerInst.getLayerId() ?? [];
      if (!Array.isArray(lyIds)) lyIds = [lyIds];//全转成数组格式
      for(let k = 0; k < allStyleLayers.length - 1; k ++) {
        if (allStyleLayers.findIndex(ly => ly.id == lyIds[k]) >= 0) {
          this.map.moveLayer(lyIds[k], allStyleLayers[0].id);
        }
      }
    }
  }

  /**
   * 设置图层属性
   */
  public async setLayerStyle(
    layerId: string,
    layerProps: Record<string, any>,
    isUpdateConfig?: boolean
  ) {
    const idx = this.layers.findIndex((y) => y.layerId === layerId);
    if (idx < 0) return; // 如果不在
    if (!this.layersInst[layerId]) {
      // 如果之前没创建
      this.layers[idx] = toMapLayer(this.layers[idx], layerProps);
      await this.addLayer(this.layers[idx], isUpdateConfig);
    } else {
      this.layersInst[layerId].setLayerStyle(
        this.map,
        layerId,
        layerProps,
        this.layers[idx]
      );
      this.layers[idx] = toMapLayer(this.layers[idx], layerProps);
    }
    if (isUpdateConfig) {
      const index = this.config.mapLayers?.findIndex(
        (y) => y.layerId === layerId
      );
      if (index !== undefined && index >= 0 && this.config.mapLayers) {
        this.config.mapLayers[index] = vjmap.cloneDeep(this.layers[idx]);
      }
    }
  }
  /**
   * 设置图层开关
   */
  public async setLayerVisible(
    layerId: string,
    visibleOff?: boolean,
    isUpdateConfig?: boolean
  ) {
    const idx = this.layers.findIndex((y) => y.layerId === layerId);
    if (idx < 0) return; // 如果不在
    this.layers[idx].visibleOff = visibleOff;
    if (!this.layersInst[layerId]) {
      // 如果之前没创建
      await this.addLayer(this.layers[idx], isUpdateConfig);
    }
    this.layersInst[layerId].setVisible(this.map, layerId, visibleOff);
    if (isUpdateConfig) {
      const index = this.config.mapLayers?.findIndex(
        (y) => y.layerId === layerId
      );
      if (index !== undefined && index >= 0 && this.config.mapLayers) {
        this.config.mapLayers[index].visibleOff = visibleOff;
      }
    }
  }
  /**
   * 设置数据源开关
   */
  public async setSourceVisible(
    sourceId: string,
    visibleOff?: boolean,
    isUpdateConfig?: boolean
  ) {
    for (let layer of this.layers) {
      if (layer.sourceId == sourceId) {
        await this.setLayerVisible(layer.layerId, visibleOff);
      }
    }
  }
  /**
   * 删除图层
   */
  public removeLayer(layerId: string, isUpdateConfig?: boolean) {
    if (!this.layersInst[layerId]) return; // 如果不在
    this.layersInst[layerId].removeLayer(this.map, layerId);
    delete this.layersInst[layerId];
    const idx = this.layers.findIndex((y) => y.layerId === layerId);
    if (idx >= 0) {
      this.layers.splice(idx, 1);
    }
    if (isUpdateConfig) {
      const index = this.config.mapLayers?.findIndex(
        (y) => y.layerId === layerId
      );
      if (index !== undefined && index >= 0) {
        this.config.mapLayers?.splice(index, 1);
      }
    }
  }

  /**
   * 增加定时器
   */
  public addTimer(mapSource: MapSource) {
    this.clearTimer(mapSource.id);
    if (mapSource.change.interval > 0) {
      this.timeMgr[mapSource.id] = setInterval(async () => {
        if (!this.map) return;
        let data = await requestChangeData(this.map, mapSource.change, this);
        if (this.map.getSource(mapSource.id) !== undefined) {
          this.map.setData(mapSource.id, this.map.toLngLat(data));
          await this.notifySourceDataChange(mapSource.id, false, true);
        }
      }, mapSource.change.interval * 1000);
    }
  }

  /**
   * 清空定时器
   */
  public clearTimer(sourceId: string) {
    if (this.timeMgr[sourceId]) {
      clearInterval(this.timeMgr[sourceId]);
      delete this.timeMgr[sourceId];
    }
  }

  /**
   * 移除所有控件
   */
  public removeControls() {
    if (this.controls) {
      for (let c of this.controls) {
        if (c) {
          this.map.removeControl(c);
        }
      }
      this.controls = [];
    }
  }

  /**
   * 增加控件
   */
  public addControls() {
    this.removeControls();
    if (!this.config.controls) return;
    this.controls = this.controls || [];
    for (let c of this.config.controls) {
      let ctrl: any;
      let controlName = c.name;
      let options = c.options ? JSON.parse(c.options) : {};
      if (controlName == "DrawTool") {
        ctrl = new vjmap.Draw.Tool(options);
      } else {
        if (controlName == "Custom") {
          controlName = options.controlName;
          if (!controlName) {
            console.warn(
              "custom control options need include controlName field "
            );
            this.controls.push(null);
            continue;
          }
        } else if (controlName == "MiniMapControl") {
          if (!options.containerStyle) {
            // 设置默认样式
            options.containerStyle = {
              background: this.config.backgroundColor,
              transform: "scale(0.6)",
              transformOrigin: `${
                c.position.indexOf("left") >= 0 ? "0%" : "100%"
              } ${c.position.indexOf("top") >= 0 ? "0%" : "100%"}`,
            };
          }
        }
        if (!controlName) continue;
        // @ts-ignore
        if (!vjmap[controlName]) {
          console.warn(`${controlName} is not vjmap class`);
          this.controls.push(null);
          continue;
        }
        // @ts-ignore
        ctrl = new vjmap[controlName](options);
      }
      if (options?.locale) {
        // 自定义控件显示文字
        // @ts-ignore
        this.map._locale = {
          // @ts-ignore
          ...this.map._locale,
          ...options?.locale,
        };
      }
      // @ts-ignore
      this.map.addControl(ctrl, c.position);
      this.controls.push(ctrl);
    }
  }

  /**
   * 获取配置
   */
  public getConfig() {
    return this.config;
  }

  private findDepsSourceId(sourceId: string, set: Set<string>) {
    if (!sourceId) return;
    // 找出依赖此数据源的所有数据源id
    for (let i = 0; i < this.sources.length; i++) {
      if (
        this.sources[i].tag === "change" &&
        this.sources[i].change?.fromSourceId == sourceId
      ) {
        // 如果是动态查询
        let fromSourceId = this.sources[i].id;
        if (fromSourceId && !set.has(fromSourceId)) {
          set.add(fromSourceId);
          this.findDepsSourceId(fromSourceId, set);
        }
      }
    }
  }
  /**
   * 通知数据源数据改变
   */
  public async notifySourceDataChange(
    sourceId?: string,
    forceUpdate?: boolean,
    timerUpdate?: boolean
  ) {
    if (!sourceId) return;
    let sourceSet: Set<string> = new Set();
    sourceSet.add(sourceId);
    this.findDepsSourceId(sourceId, sourceSet);
    for (let sId of sourceSet) {
      const idx = this.sources.findIndex((s) => s.id === sId);
      if (
        idx >= 0 &&
        this.sources[idx].tag === "change" &&
        this.sources[idx].change?.fromSourceId
      ) {
        const data = await requestChangeData(
          this.map,
          this.sources[idx].change,
          this
        );
        this.map.setData(sId, this.map.toLngLat(data));
      }
    }
    for (let layerId in this.layersInst) {
      for (let sId of sourceSet) {
        this.layersInst[layerId]?.onSourceDataChange(
          this.map,
          sId,
          forceUpdate,
          timerUpdate
        );
      }
    }
  }

  // 获取系统的图片资源
  public getSysImages() {
    return Object.keys(sysImages);
  }

  static guid(digit = 8): string {
    return "x".repeat(digit).replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 3) | 8;
      return v.toString(16);
    });
  }
}


