import type { Map } from "vjmap";
import vjmap from "vjmap";
import { clearHighlight, getHighlightEntities } from "./highlight";
import { getMapSnapPoints } from "./snap";

// 选择实体
export const selectFeatures = async (
  map: Map,
  useGeomCoord?: boolean, /* 返回几何坐标还是位置坐标 */
  includeWholeEntity?: boolean, /* 选择时是否选择上整个实体对象 */
  isPointSel?: boolean, /* 点选还是框选 */
  disableSnap?: boolean, /* 是否禁用捕捉 */
  disableSelectEntities?: Set<String> /* 不能选择的实体集合 */
) => {
  if (
    map.getService().currentMapParam()?.mapopenway == vjmap.MapOpenWay.Memory
  ) {
    console.error(
      "内存打开模式不支持选择实体，请切换至几何栅格或几何矢量方式打开图形"
    );
    return;
  }

  const snapObj = {}; // 设置的捕捉的实体
  if (!disableSnap) {
    getMapSnapPoints(map, snapObj);
  }
  // @ts-ignore
  map._selectFeatures = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let co;
    // @ts-ignore
    if (!(isPointSel ?? map._isPointSel)) {
      const drawRect = (await vjmap.Draw.actionDrawRectangle(map, {
        api: {
          getSnapFeatures: snapObj, //要捕捉的数据项在后面，通过属性features赋值
        },
        contextMenu: (e: any) => {
          // 给地图发送Enter键消息即可取消，模拟按Enter键
          map.fire("keyup", { keyCode: 13 });
        },
      })) as any;
      if (drawRect.cancel) {
        break;
      }
      co = drawRect.features[0].geometry.coordinates[0];
    } else {
      const drawPoint = (await vjmap.Draw.actionDrawPoint(map, {
        api: {
          getSnapFeatures: snapObj, //要捕捉的数据项在后面，通过属性features赋值
        },
        contextMenu: (e: any) => {
          // 给地图发送Enter键消息即可取消，模拟按Enter键
          map.fire("keyup", { keyCode: 13 });
        },
      })) as any;
      if (drawPoint.cancel) {
        break;
      }
      // 构造成四个一样的点，这样可以和矩形一样，统一调用 下面的接口
      co = [
        drawPoint.features[0].geometry.coordinates,
        drawPoint.features[0].geometry.coordinates,
        drawPoint.features[0].geometry.coordinates,
        drawPoint.features[0].geometry.coordinates,
      ];
    }
    co = map.fromLngLat(co);

    const geom = await getHighlightEntities(
      map,
      [co[0].x, co[0].y, co[2].x, co[1].y],
      useGeomCoord,
      undefined,
      // @ts-ignore
      includeWholeEntity ?? map._includeWholeEntity,
      disableSelectEntities
    );

    // @ts-ignore
    map._selectFeatures.push(
      ...geom.features
    );
  }

  // 清空之前临时高亮和实体
  // clearHighlight(map);
  // @ts-ignore
  return map._selectFeatures;
};
