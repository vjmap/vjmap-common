import vjmap, { Map } from "vjmap";

// 切换cad图层
export const switchCadLayers = async (map: Map, layers: {name: string; isOff: boolean}[], isVectorStyle: boolean) => {
  let svc = map.getService();
  if (isVectorStyle) {
    // 如果是矢量瓦片
    let onLayers = layers.reduce((sum, val) => {
      if (!val.isOff) {
        // @ts-ignore
        sum.push(val.name);
      }
      return sum;
    }, []); // 要开的图层
    switchVectorLayers(map, onLayers);
  } else {
    // 如果是栅格瓦片
    await map.switchLayers(svc, layers.reduce((sum, val) => {
      if (!val.isOff) {
        // @ts-ignore
        sum.push(val.name);
      }
      return sum;
    }, []))
  }
}

// 矢量瓦片切换图层 onLayers 要显示的图层名称数组
export const switchVectorLayers = (map: Map, onLayers: string[]) => {
  // 通过图层名称来查找图层id
  const getLayerIdByName = (name: string) => {
    return svc.getMapLayers().findIndex(layer => layer.name === name)
  }
  // 增加实体图层判断条件,只要满足任何一种类型即可,如 ['图层一','图层二']
  const conditionLayers = (layers: string[], inputIsIndex: boolean) => {
    if (!Array.isArray(layers)) layers = [layers];// 先转成数组，再统一用数组去算吧
    let layerIndexs: number[] = [];
    if (!inputIsIndex) {
      // 如果输入的不是图层索引，是图层名称，则需要转成图层索引
      layerIndexs = layers.map(layer => getLayerIdByName(layer)); // 把图层名称转为图层索引，在矢量瓦片中图层是用索引来表示的
    }
    if (layerIndexs.length == 0) {
      layerIndexs = [-1]; // 如果全部关闭，防止数组为空，加一个不存在的
    }
    return [
      "match",
      ['get', 'layer'],
      layerIndexs,
      true,
      false
    ]
  }
  // 获取之前的默认的矢量图层样式，然后在当前样式中，对矢量图层的数据进行图层进行过滤
  let style = map.getStyle();
  let svc = map.getService();
  let vectorStyle = svc.vectorStyle();
  let vectorLayerIds = vectorStyle.layers.map(layer => layer.id);
  let filter = conditionLayers(onLayers, false);
  for (let i = 0; i < style.layers.length; i++) {
    if (vectorLayerIds.includes(style.layers[i].id)) {
      // @ts-ignore
      style.layers[i].filter = filter; // 设置过滤条件
    }
  }
  map.setStyle(style);
}

// 设置图层透明度 opacity (0-1)
export const setLayerOpacity = (map: Map, opacity: number, rasterLayerIdMatch?: string) => {
  if (map.hasVectorLayer()) {
    // 如果是矢量图层
    const layers = map.layersBySource("vector-source");
            for(let layerId of layers) {
                const layer = map.getLayer(layerId);
                if (layer.type == "fill") {
                    map.setFillOpacity(layerId, opacity);
                } else if (layer.type == "line") {
                    map.setLineOpacity(layerId, opacity);
                } else if (layer.type == "circle")  {
                    map.setCircleOpacity(layerId, opacity);
                }
            }
  }
  if (rasterLayerIdMatch) {
    // 如果指定了栅格图层的id匹配
    const layers = map.getStyle().layers;
    const curlayers = layers.filter(ly => ly.id.indexOf(rasterLayerIdMatch) >= 0);
    for(let layer of curlayers) {
      map.setRasterOpacity(layer.id, opacity);
    }
  } else {
    const rasterLayerId = map.getService().rasterLayerId();
    if (!!map.getLayer(rasterLayerId)) {
      map.setRasterOpacity(map.getService().rasterLayerId(), opacity);
    }
  }
  
}

// 把图层置为最下面
export const  setLayerToLowest = (map: Map, layerId: string) => {
  const layers = map.getStyle().layers;
  if (layers.length == 0) return;
  // 把这个图层放至所有图层的最下面
  map.moveLayer(layerId, layers[0].id)
}