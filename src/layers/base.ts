import { MapLayer } from "../types";
import vjmap, { Map, Marker } from "vjmap";
import { toMapLayer } from "../utils";
export default class LayerBase {
    public map!: Map;
    public mapLayer!: MapLayer;
    public visibleOff?: boolean;
    constructor() {
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
        this.map = map;
        this.mapLayer = mapLayer;
    }
    setLayerStyle(map: Map, layerId: string, layerProps: Record<string, any>, oldLayer: MapLayer) {
        this.mapLayer = toMapLayer(oldLayer, layerProps);
        this.removeLayer(map, layerId);
        this.addLayer(map, toMapLayer(oldLayer, layerProps));
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
      this.visibleOff = visibleOff;
    }
    removeLayer(map: Map, layerId: string) {

    }
    getLayerId(): string | string[] | undefined {
        return this.mapLayer.layerId;
    }
    onSourceDataChange(map: Map, sourceId?: string, forceUpdate?: boolean, timerUpdate?: boolean) {
        if (!this.mapLayer || !this.map) return;
        if (sourceId && this.mapLayer.sourceId != sourceId) return;
        if (this.mapLayer.disableTimerUpdate) return;
        if (this.visibleOff === true) return;
        this.removeLayer(map, this.mapLayer.layerId);
        this.addLayer(map, this.mapLayer);
    }
    async loadUrlImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = src;
            image.onload = () => {
                resolve(image)
            }
            image.onerror = ()=> {
                reject(`load image ${src} error`)
            }
        })
    }
    // 执行字段中要执行的脚本值，包含"return "字符串的，都当成脚本处理
    evalValue(options: Record<string, any> | string, properties: Record<string, any>, map: Map) {
        if  (typeof options == "string") {
            try {
                return new Function("props", "map", "vjmap", options)(properties, map, vjmap);
            } catch (error) {
            } 
        } else {
            let newOpts: Record<string, any> = {};
            for(let key in options) {
                let value = options[key]
                if (typeof(value) == "string" && value.indexOf("return ") >= 0) {
                    try {
                        value = new Function("props", "map", "vjmap", value)(properties, map, vjmap);
                    } catch (error) {
                        
                    }
                    
                }
                newOpts[key] = value;
            }
            return newOpts;
        }
    }
    async createAnimateImages(map: Map, mapLayer: MapLayer) {
        let animateImages;
        // 过滤出以animateImages_开头的属性做为创建动画集的属性
        let animateImagesOptionsKeys = Object.keys(mapLayer).filter(key => key.indexOf("animateImages_") == 0);
        let animateImagesOptions: any = {};
        
        for(let key of animateImagesOptionsKeys) {
            animateImagesOptions[key.replace("animateImages_", "")] = mapLayer[key];
        }
        if (mapLayer.animateImagesType == "arrow") {
            animateImages = vjmap.createArrowAnimateImages(animateImagesOptions);
        } else if (mapLayer.animateImagesType == "antpath") {
            animateImages = vjmap.createAntPathAnimateImages(animateImagesOptions);
        } else if (mapLayer.animateImagesType == "customImage") {
            // 自定义图片
            let img = await this.loadUrlImage(mapLayer.customImageUrl);
            let createImagesOptions = {
                ...animateImagesOptions,
                draw: (context: any, width: number, height: number, opts: Record<string, any>) => {
                    // 绘制图片回调，只需绘制第一帧的内容 context为canvas上下文，width,height为图片宽高，opts为上面传入的选项值
                    // 填充背景色
                    if (opts.fillColor) {
                        context.fillStyle = opts.fillColor;
                        context.fillRect(0, 0, width, height );
                    }
                    // 图片居中显示
                    context.drawImage(img, 0, 0, img.width, img.height, 0, height / 2.0 - img.height / 2.0, width, img.height)
                }
            };
            animateImages = vjmap.createAntPathAnimateImages(createImagesOptions);
        } else if (mapLayer.animateImagesType == "animateImages") {
            // 多个图片生成动画 
            // 直接通过加载url图片来生成动画图片集
            animateImages = [];
            for(let i = 0; i < mapLayer.animateImageUrls?.length; i++) {
                let imageId = `image_animate_${mapLayer.layerId}_${i}`;
                if (map.hasImage(imageId)) {
                    map.removeImage(imageId);
                }
                await map.loadImageEx(imageId, mapLayer.animateImageUrls[i]);
                animateImages.push(imageId)
            }
        } else if (mapLayer.animateImagesType == "imageSprites") {
            // 同一个图片精灵动画集
            let img = await this.loadUrlImage(mapLayer.imageSpriteUrl);
            animateImages = vjmap.createAntPathAnimateImages({
                fromImage: img,
                ...animateImagesOptions
            });
        } else {
            animateImages = vjmap.createAnimateImages(animateImagesOptions);
        }
        return animateImages
    }
    setMarkerOptions(marker: Marker, options: Record<string, any>) {
        if (options?.minZoom !== undefined) {
            // @ts-ignore
            marker.setMinZoom(options?.minZoom);
        }
        if (options?.maxZoom !== undefined) {
            // @ts-ignore
            marker.setMaxZoom(options?.maxZoom);
        }
        if (options?.scaleMaxZoom !== undefined) {
            // @ts-ignore
            marker.setScaleMaxZoom(options?.scaleMaxZoom);
        }
        if (options?.height !== undefined) {
            // @ts-ignore
            marker.setHeight(options?.height);
        }
        if (options?.removeWhenNoInMapView !== undefined) {
            // @ts-ignore
            marker.setRemoveWhenNoInMapView(options?.removeWhenNoInMapView, options?.removeWhenNoInMapViewPadding);
        }
        if (options?.rotation !== undefined) {
            marker.setRotation(options?.rotation);
        }
        if (options?.animationType !== undefined) {
            marker.setAnimation(options?.animationType);
        }
        if (options?.draggable !== undefined) {
            marker.setDraggable(options?.draggable);
        }
        if (options?.rotationAlignment !== undefined) {
            marker.setRotationAlignment(options?.rotationAlignment);
        }
        if (options?.pitchAlignment !== undefined) {
            marker.setPitchAlignment(options?.pitchAlignment);
        }
    }
}