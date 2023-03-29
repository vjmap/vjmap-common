import { Service, Map, Control, IControl } from "vjmap";
import { MapAppConfig, MapLayer, MapOpenOptions, MapOption, MapSource } from "./types";
import LayerBase from "./layers/base";
import { listenKeyEvent } from "./map/keyboard";
export declare class MapApp {
    config: MapAppConfig;
    svc: Service;
    map: Map;
    sources: MapSource[];
    layers: MapLayer[];
    controls: (Control | IControl | null)[];
    layersInst: Record<string, LayerBase>;
    projectKey: string | undefined;
    containerId: string;
    private timeMgr;
    isEditorMode?: boolean;
    isDisableRunProgram?: boolean;
    context?: any;
    private programCleaner?;
    private oldCacheImages?;
    keyEvent?: ReturnType<typeof listenKeyEvent>;
    constructor(config?: MapAppConfig);
    mount(containerId: string, env?: {
        serviceUrl: string;
        serviceToken: string;
    }): void;
    attachMap(map: Map): void;
    isWebBaseMap(config?: MapAppConfig): boolean;
    setConfig(config?: MapAppConfig, noSetMapOptions?: boolean): Promise<{
        error: any;
    } | undefined>;
    setMapOpenOptions(option: Partial<MapOpenOptions>): Promise<void>;
    setMapOptions(option: MapOption): void;
    /**
     * 增加地图图像资源
     */
    addMapImages(): Promise<void>;
    /**
     * 清空地图上的所有数据
     */
    clearData(): Promise<void>;
    /**
     * 移除所有逻辑程序段
     */
    removePrograms(): void;
    /**
     * 移除所有逻辑程序段
     */
    execProgram(): Promise<void>;
    /**
     * 销毁
     */
    destory(): Promise<void>;
    /**
     * 切换地图
     * @param param 打开选项
     */
    switchMap(param: MapOpenOptions): Promise<any>;
    /**
     * 增加数据源
     */
    addSource(source: MapSource, isUpdateConfig?: boolean): Promise<boolean>;
    /**
     * 获取数据源数据
     */
    getSourceData(sourceId: string): Promise<any>;
    /**
     * 设置数据源数据
     */
    setSourceData(sourceId: string, data?: any, isUpdateConfig?: boolean): Promise<void>;
    /**
     * 更新除geojson之外的数据源
     */
    updateSource(source: MapSource, isRemove?: boolean): Promise<void>;
    /**
     * 删除数据源
     */
    removeSource(sourceId: string, isUpdateConfig?: boolean): void;
    /**
     * 增加图层
     */
    addLayer(layer: MapLayer, isUpdateConfig?: boolean): Promise<void>;
    /**
     * 设置图层属性
     */
    setLayerStyle(layerId: string, layerProps: Record<string, any>, isUpdateConfig?: boolean): Promise<void>;
    /**
     * 设置图层开关
     */
    setLayerVisible(layerId: string, visibleOff?: boolean, isUpdateConfig?: boolean): Promise<void>;
    /**
     * 设置数据源开关
     */
    setSourceVisible(sourceId: string, visibleOff?: boolean, isUpdateConfig?: boolean): Promise<void>;
    /**
     * 删除图层
     */
    removeLayer(layerId: string, isUpdateConfig?: boolean): void;
    /**
     * 增加定时器
     */
    addTimer(mapSource: MapSource): void;
    /**
     * 清空定时器
     */
    clearTimer(sourceId: string): void;
    /**
     * 移除所有控件
     */
    removeControls(): void;
    /**
     * 增加控件
     */
    addControls(): void;
    /**
     * 获取配置
     */
    getConfig(): MapAppConfig;
    private findDepsSourceId;
    /**
     * 通知数据源数据改变
     */
    notifySourceDataChange(sourceId?: string, forceUpdate?: boolean, timerUpdate?: boolean): Promise<void>;
    getSysImages(): string[];
    static guid(digit?: number): string;
}
