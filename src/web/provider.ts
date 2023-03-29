import { MapAppConfig } from '../types'
import vjmap, { Map } from 'vjmap'
import { getShardsTileUrl } from '../utils'
// osm地图数据提供 (WGS84坐标)
export const osmProviderTiles = () => {
    return  ["https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"]
}

//  天地图地图数据提供 (WGS84坐标)
export const tiandituProviderTiles = (isImageUrl?: boolean /* 是否为影像地址 */) => {
    // 请用自己的token，这里用几个测试的token
    const tokens = [
        "85c9d12d5d691d168ba5cb6ecaa749eb",
        "583e63953a6ed6bf304e68120db4c512",
        "93d1fdef41f93d2211deed6d22780c48",
        "7e2ced6843b376a14f69a9f5885d3d2d",
        "44964a97c8c44e4d04efdf3cba594467",
        "57f1b8146ef867f14189f3f4bb1adc1c"
    ];
    const tk = tokens[vjmap.randInt(0, tokens.length - 1)]
    return [
        !isImageUrl ? "https://t{0-7}.tianditu.gov.cn/DataServer?T=vec_w&X={x}&Y={y}&L={z}&tk=" + tk :
        "https://t{0-7}.tianditu.gov.cn/DataServer?T=img_w&X={x}&Y={y}&L={z}&tk=" + tk,
        "https://t{0-7}.tianditu.gov.cn/DataServer?T=cva_w&X={x}&Y={y}&L={z}&tk=" + tk
    ];
}

// 高德地图数据提供 (GCJ02火星坐标)
export const gaodeProviderTiles = (isImageUrl?: boolean /* 是否为影像地址 */) => {
    return !isImageUrl ? [
        "https://webrd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
    ] : [
        "https://webst0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=6&x={x}&y={y}&z={z}",
        "https://webst0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
    ]
}

export const loadWebMap = (map: Map, config: MapAppConfig) => {
    let webMapTiles = config.webMapTiles;
    if (!webMapTiles) {
        // 如果没有，则用默认的
        if (config.baseMapType == "WGS84") {
            webMapTiles = tiandituProviderTiles();
        } else if (config.baseMapType == "GCJ02") {
            webMapTiles = gaodeProviderTiles();
        }
    }
    if (!webMapTiles) return;
    for(let t = 0; t < webMapTiles.length; t++) {
        const sourceId = `${config.baseMapType}_base_webmap_source_${t}`;
        map.addRasterSource(sourceId, {
            type: "raster",
            tiles: getShardsTileUrl(webMapTiles[t], map)
        })
        const layerId = `${config.baseMapType}_base_webmap_layer_${t}`;
        map.addRasterLayer(layerId, sourceId, {});
    }
    
}
