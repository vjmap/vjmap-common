import type { Map } from "vjmap";

// 创建一个更新样式
export const createUpdateMapStyleObj = (
  map: Map,
  option?: Record<string, any>
) => {
  if (map.hasVectorLayer()) {
    // 如果底图是矢量瓦片
    return createUpdateMapStyleVectorObj(map, option);
  } else {
    // 如果底图是栅格瓦片
    return createUpdateMapStyleRasterObj(map, option);
  }
};

// 栅格样式
export const createUpdateMapStyleRasterObj = (
  map: Map,
  option?: Record<string, any>
) => {
  option = option || {};
  const svc = map.getService();
  // 需要不可见的实体id数组
  const hideObjectIds: Set<string> = new Set();

  // 更改样式
  let expression = ""; // 表达式数组
  let curStyle = {};
  const updateStyle = (style?: any) => {
    curStyle = {
      backcolor: svc.currentMapParam()?.darkMode ? 0 : 0xffffff,
      expression: expression,
      ...style,
      ...option?.style
    };
    map.updateStyle(svc, {
      name: option?.styleName ?? "myCustomStyle_temp", // 临时样式图层，用来临时修改，保持的时候，会把此样式的数据复制到myCustomStyle 样式
      ...curStyle,
    });
  };

  // 修改是否显示
  const modifyVisible = (visible: boolean) => {
    let result = "";
    if (visible !== undefined) {
      result += `gOutVisible:=${visible ? 1 : 0};`;
    }
    return result;
  };

  // 增加实体对象id判断条件,只要满足任何一种类型即可,如 ['283','285']
  const conditionObjectIds = (objectIds: string[]) => {
    if (!Array.isArray(objectIds)) objectIds = [objectIds]; // 先转成数组，再统一用数组去算吧
    let strObjectIds = objectIds.join("||");
    return `gInObjectId  in  '${strObjectIds}'`;
  };

  const refresh = async () => {
    // objectId
    if (hideObjectIds.size == 0) {
      expression = "";
      await updateStyle();
    } else {
      let condition = conditionObjectIds(Array.from(hideObjectIds));
      let value1 = modifyVisible(false);
      expression = `if(${condition}) {${value1} } `;
      await updateStyle();
    }
  };

  const addHideObjectIds = async (
    objectIds: string[],
    noUpdate?: boolean,
    isClear?: boolean
  ) => {
    if (isClear) {
      hideObjectIds.clear();
    }
    objectIds.forEach((id) => hideObjectIds.add(id));
    if (!noUpdate) {
      await refresh();
    }
  };

  const getClipBounds = () => {
    if (option?.style?.clipbounds) {
      return option?.style?.clipbounds
    }
  }
  return {
    addHideObjectIds,
    refresh,
    hideObjectIds,
    getClipBounds
  };
};

// 矢量样式
export const createUpdateMapStyleVectorObj = (
  map: Map,
  option?: Record<string, any>
) => {
  const svc = map.getService();
  // 需要不可见的实体id数组
  const hideIds: Set<string> = new Set();
  // 增加实体id判断条件,只要满足任何一种类型即可,如 [28, 29]
  const conditionFeatureIds = (featureIds: any) => {
    if (!Array.isArray(featureIds)) featureIds = [featureIds]; // 先转成数组，再统一用数组去算吧
    return ["match", ["id"], featureIds, true, false];
  };

  const refresh = async () => {
    // 获取所有矢量图层id
    let layers = svc.vectorStyle().layers.map((layer) => layer.id);
    let featureId = Array.from(hideIds);
    map.setFilterEx(layers, ["!", conditionFeatureIds(featureId)]); // 取反，相当于过滤掉这些id
  };

  const addHideObjectIds = async (
    objectIds: string[],
    noUpdate?: boolean,
    isClear?: boolean
  ) => {
    if (isClear) {
      hideIds.clear();
    }
    objectIds.forEach((id) => hideIds.add(id));
    if (!noUpdate) {
      await refresh();
    }
  };
  
  const getClipBounds = () => {
    if (option?.style?.clipbounds) {
      return option?.style?.clipbounds
    }
  }
  return {
    addHideObjectIds,
    refresh,
    hideObjectIds: hideIds,
    getClipBounds
  };
};
