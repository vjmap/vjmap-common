import { MapLayer } from "../types";
import vjmap, { Map } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";

export class SymbolClusterLayer extends LayerBase {
    sourceId!: string;
    events!: Array<[string, string, any]>
    constructor() {
        super();
        this.events = [];
    }
    async createCluster(map: Map, mapLayer: MapLayer) {
        this.sourceId = 'cluster-points' + vjmap.RandomID();
        let geoDatas = map.getSourceData(mapLayer.sourceId);
        map.addSource(this.sourceId, {
            type: 'geojson',
            data: geoDatas,
            cluster: true,
            clusterMaxZoom: mapLayer.clusterMaxZoom ?? 10,
            clusterRadius: mapLayer.clusterRadius ?? 60
        });
    
        //添加聚合图层
        let outerColors =  mapLayer.outerColors ?? [[1000, 'rgba(253, 156, 115, 0.6)'], [100, 'rgba(241, 211, 87, 0.6)'], [0, 'rgba(181, 226, 140, 0.6)']];
    
        outerColors.forEach( (color: any, i: number) => {
            map.addLayer({
                "id": "point-outer-cluster-" + this.sourceId + i,
                "type": "circle",
                "source": this.sourceId,
                "paint": {
                    "circle-color": color[1],
                    "circle-radius": mapLayer.outerCircleRadius ?? 20
                },
                "filter": i === 0 ?
                    [">=", "point_count", color[0]] :
                    ["all", [">=", "point_count", color[0]], ["<", "point_count", outerColors[i - 1][0]]]
            });
        });
        let innerColors =  mapLayer.innerColors ??[[1000, 'rgba(241, 128, 23, 0.6)'], [100, 'rgba(240, 194, 12, 0.6)'], [0, 'rgba(110, 204, 57, 0.6)']];
    
        innerColors.forEach((color: any, i: number) => {
            map.addLayer({
                "id": "point-inner-cluster-" + this.sourceId + i,
                "type": "circle",
                "source": this.sourceId,
                "paint": {
                    "circle-color": color[1],
                    "circle-radius": mapLayer.innerCircleRadius ?? 15
                },
                "filter": i === 0 ?
                    [">=", "point_count", color[0]] :
                    ["all", [">=", "point_count", color[0]], ["<", "point_count", innerColors[i - 1][0]]]
            });
        });
    
    
        map.addLayer({
            id: 'cluster-count' + this.sourceId,
            type: 'symbol',
            source: this.sourceId,
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['simsun'],
                'text-size': mapLayer.clusterTextSize ?? 12
            }
        });
    
        map.addLayer({
            // 使用map.properties 把属性 驼峰式 写法改成 kebab-case 写法
            ...map.properties({
                ...mapLayer
            }),
            id: 'unclustered-point' + this.sourceId,
            type: 'symbol',
            source: this.sourceId,
            filter: ['!', ['has', 'point_count']],
        });
    
        for(let i = 0; i < outerColors.length; i++) {
            let clusterLayer = "point-outer-cluster-" + this.sourceId + i;
            const click = (e: any) => {
                let features = map.queryRenderedFeatures(e.point, {
                    layers: [clusterLayer]
                });
                // @ts-ignore
                let clusterId = features[0].properties.cluster_id;
                // @ts-ignore
                map.getSource(this.sourceId)?.getClusterExpansionZoom(
                    clusterId,
                     (err: any, zoom: number) => {
                        if (err) return;
                        map.easeTo({
                            // @ts-ignore
                            center: features[0].geometry.coordinates,
                            zoom: zoom
                        });
                    }
                );
            }
            map.on('click', clusterLayer, click);
            this.events.push(["click", clusterLayer, click]);
    
            const mouseenter = (e: any) => {
                map.getCanvas().style.cursor = 'pointer';
            }
            map.on('mouseenter', clusterLayer, mouseenter);
            this.events.push(["mouseenter", clusterLayer, mouseenter]);

            const mouseleave = (e: any) => {
                map.getCanvas().style.cursor = '';
            }
            map.on('mouseleave', clusterLayer, mouseleave);
            this.events.push(["mouseleave", clusterLayer, mouseleave]);
        }
    
    
        const clickUnclustered = (e: any) => {
            // @ts-ignore
            let coordinates = e.features[0].geometry.coordinates.slice();
            // @ts-ignore
            let index = e.features[0].properties.index;
    
            if (mapLayer.popupHtml) {
                let popup = new vjmap.Popup({
                    offset: mapLayer.popupOffset ?? [0, 0],
                    anchor: mapLayer.popupAnchor,
                    closeButton: mapLayer.closeButton,
                    closeOnClick: mapLayer.closeOnClick,
                    closeOnMove: mapLayer.closeOnMove,
                    focusAfterOpen: mapLayer.focusAfterOpen,
                    className: mapLayer.className,
                    maxWidth: mapLayer.maxWidth,
                });
                popup.setLngLat(coordinates)
                let html = mapLayer.popupHtml; //"<h3 style='color:red'>index ${props.index}</h3>"
                // @ts-ignore
                let htmlValue = this.evalValue("return `" + html + "`", e.features[0].properties, this.map);  
                popup.setHTML(htmlValue)
                .addTo(map);
            }
        }
        map.on('click', 'unclustered-point' + this.sourceId, clickUnclustered);
        this.events.push(["click", 'unclustered-point' + this.sourceId, clickUnclustered]);
    
        const mouseenterUnclustered = () => {
            map.getCanvas().style.cursor = 'pointer';
        }
        map.on('mouseenter', 'unclustered-point' + this.sourceId,  mouseenterUnclustered);
        this.events.push(["mouseenter", 'unclustered-point' + this.sourceId, mouseenterUnclustered]);

        const mouseleaveUnclustered = () => {
            map.getCanvas().style.cursor = '';
        }
        map.on('mouseleave', 'unclustered-point' + this.sourceId, mouseleaveUnclustered );
        this.events.push(["mouseleave", 'unclustered-point' + this.sourceId, mouseleaveUnclustered]);
    }
    async addLayer(map: Map, mapLayer: MapLayer) {
        super.addLayer(map, mapLayer);
        this.createCluster(map, mapLayer);
    }
    setVisible(map: Map, layerId: string, visibleOff?: boolean) {
        super.setVisible(map, layerId, visibleOff);
        if (visibleOff) {
            map.hideSource(this.sourceId);
        } else {
            map.showSource(this.sourceId);
        }
    }
    removeLayer(map: Map, layerId: string) {
        if (this.events) {
            for(let event of this.events) {
                // @ts-ignore
                map.off(event[0], event[1], event[1]);// 取消之前绑定的事件
            }
            this.events = [];
        }
        map.removeSourceEx(this.sourceId);
        super.removeLayer(map, layerId);
    }
}