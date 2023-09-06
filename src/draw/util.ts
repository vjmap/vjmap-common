import vjmap, { GeoPoint, IDrawTool } from "vjmap";
import type { Map } from "vjmap";
import { exportDwg, addExportRefInfoInText } from "./export";
import { transformGeoJsonData } from "../utils";
import { createGeomData } from "./entity";
export { exportDwg };
export const setFeatureProperty = (
  feature: any,
  drawProperty?: Record<string, any>
) => {
  if (!drawProperty) return;
  for (let p in drawProperty) {
    feature.properties[p] = drawProperty[p];
  }
};

// 取消绘制
export const cancelDraw = (map: Map) => {
  // 给地图发送ESC键消息即可取消，模拟按ESC键
  map.fire("keyup", { keyCode: 27 });
};

// 绘制点
export const drawPoint = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>
) => {
  let ft = await vjmap.Draw.actionDrawPoint(map, options);
  if (ft.cancel) {
    return;
  }
  setFeatureProperty(ft.features[0], drawProperty);
  // 设置属性
  draw.add(ft.features[0]);
};

// 绘制线
export const drawLineSting = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>
) => {
  let ft = await vjmap.Draw.actionDrawLineSting(map, options);
  if (ft.cancel) {
    return;
  }
  setFeatureProperty(ft.features[0], drawProperty);
  // 设置属性
  draw.add(ft.features[0]);
};

// 绘制面
export const drawPolygon = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>
) => {
  let ft = await vjmap.Draw.actionDrawPolygon(map, options);
  if (ft.cancel) {
    return;
  }
  setFeatureProperty(ft.features[0], drawProperty);
  // 设置属性
  draw.add(ft.features[0]);
};

// 绘制拉伸
export const drawFillExrusion = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>
) => {
  let ft = await vjmap.Draw.actionDrawPolygon(map, options);
  if (ft.cancel) {
    return;
  }
  setFeatureProperty(ft.features[0], drawProperty);
  // 设置属性
  draw.add(ft.features[0]);
};

// 多边形转多段线实体
export const polygonToPolyline = (feature: any) => {
  if (feature.geometry.type != "Polygon") return;
  feature.geometry.type = "LineString";
  // @ts-ignore
  feature.geometry.coordinates = feature.geometry.coordinates[0];
  return feature;
};

// 绘制圆
export const drawCircle = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  isFill?: boolean
) => {
  let ft = await vjmap.Draw.actionDrawCircle(map, options);
  if (ft.cancel) {
    return;
  }
  setFeatureProperty(ft.features[0], drawProperty);
  if (!isFill) {
    // 如果不是填充，则把多边形转成多段线
    ft.features[0] = polygonToPolyline(ft.features[0]);
    setFeatureProperty(ft.features[0], {
      isCircle: undefined,
    });
  }
  // 设置属性
  draw.add(ft.features[0]);
};

// 绘制矩形
export const drawRectangle = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  isFill?: boolean
) => {
  let ft = await vjmap.Draw.actionDrawRectangle(map, options);
  if (ft.cancel) {
    return;
  }
  setFeatureProperty(ft.features[0], drawProperty);
  if (!isFill) {
    // 如果不是填充，则把多边形转成多段线
    ft.features[0] = polygonToPolyline(ft.features[0]);
  }
  draw.add(ft.features[0]);
};

// 绘制斜矩形
export const drawSlantRectangle = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  isFill?: boolean
) => {
  let ft = await vjmap.Draw.actionDrawSlantRectangle(map, options);
  if (ft.cancel) {
    return;
  }
  setFeatureProperty(ft.features[0], drawProperty);
  if (!isFill) {
    // 如果不是填充，则把多边形转成多段线
    ft.features[0] = polygonToPolyline(ft.features[0]);
  }
  draw.add(ft.features[0]);
};

// 选择多个实体进行旋转
export const selectRotate = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  showInfoFunc?: Function
) => {
  // 先进行选择，点右键确定选择
  let selected = await vjmap.Draw.actionSelect(map, draw);
  if (selected.features.length == 0) return; // 如果没有要选择的实体

  if (showInfoFunc) showInfoFunc("请指定的旋转的基点");
  let basePointRes = await vjmap.Draw.actionDrawPoint(map, {});
  if (basePointRes.cancel) {
    return; // 取消操作
  }
  if (showInfoFunc) showInfoFunc("请指定要旋转的角度");
  let basePoint = basePointRes.features[0].geometry.coordinates;
  let endPoint = basePoint;
  // 可以做一条辅助线显示
  let tempLine = new vjmap.Polyline({
    data: [basePoint, endPoint],
    lineColor: "yellow",
    lineWidth: 1,
    lineDasharray: [2, 2],
  });
  tempLine.addTo(map);

  // 先把选择的复制下，用于取消还原
  let oldSelected = vjmap.cloneDeep(selected.features);
  let rotatePointRes = await vjmap.Draw.actionDrawPoint(map, {
    ...options,
    updatecoordinate: (e: any) => {
      if (!e.lnglat) return;
      endPoint = e.lnglat;
      // 修改临时线坐标
      tempLine.setData([basePoint, endPoint]);
      let angle = map.fromLngLat(endPoint).angleTo(map.fromLngLat(basePoint));

      let updateFeatures = vjmap.cloneDeep(oldSelected); // 先用之前保存的数据，不要用更新完的数据
      // 修改选择的实体的坐标
      for (let i = 0; i < updateFeatures.length; i++) {
        let changeFeatures = vjmap.transform.convert(updateFeatures[i], (g) => {
          let pt = map.fromLngLat(g);
          let rotatePt = pt.roateAround(angle, map.fromLngLat(basePoint));
          return map.toLngLat(rotatePt);
        });
        draw.setFeatureProperty(
          updateFeatures[i].id,
          "coordinates",
          changeFeatures
        );
      }
      draw.forceRefresh();
    },
  });
  tempLine.remove(); //删除临时线
  if (rotatePointRes.cancel) {
    // 还原回来的
    for (let i = 0; i < oldSelected.length; i++) {
      draw.setFeatureProperty(oldSelected[i].id, "coordinates", oldSelected[i]);
    }
    draw.forceRefresh();
    return; // 取消操作
  }
};

// 转贝塞尔曲线
export const toBezierCurve = (map: Map, draw: IDrawTool) => {
  let selected = draw
    .getSelected()
    .features.filter(
      (e) => e.geometry.type == "LineString" || e.geometry.type == "Polygon"
    );
  if (selected.length == 0) return;
  let preFeatures = vjmap.cloneDeep(selected);
  for (let i = 0; i < selected.length; i++) {
    let feature = selected[i] as any;
    if (feature.geometry.type == "LineString") {
      // 把曲线上的点转为贝塞尔曲线参数
      const c = vjmap.polylineToBezierCurve(
        map.fromLngLat(feature.geometry.coordinates).map((e: any) => [e.x, e.y])
      );
      // 据贝塞尔曲线参数离散成线
      const curvePath = vjmap.bezierCurveToPolyline(c, 100);
      draw.setFeatureProperty(
        feature.id,
        "coordinates",
        map.toLngLat(curvePath)
      );
    } else {
      let coordinates = [];
      for (let p = 0; p < feature.geometry.coordinates.length; p++) {
        // 把曲线上的点转为贝塞尔曲线参数
        const c = vjmap.polylineToBezierCurve(
          map
            .fromLngLat(feature.geometry.coordinates[p])
            .map((e: any) => [e.x, e.y])
        );
        // 据贝塞尔曲线参数离散成线
        const curvePath = vjmap.bezierCurveToPolyline(c, 1000);
        coordinates.push(map.toLngLat(curvePath));
      }
      draw.setFeatureProperty(feature.id, "coordinates", coordinates);
    }
  }
  // 重新再获取一次所选择的实体数据
  let newFeatures = draw
    .getSelected()
    .features.filter(
      (e) => e.geometry.type == "LineString" || e.geometry.type == "Polygon"
    );
  // 用于撤销，重做
  map.fire("draw.update", {
    action: "toBezierCurve",
    features: vjmap.cloneDeep(newFeatures), // 更新后的数据
    prevFeatures: preFeatures, // 更新前的数据
    styleId: draw.options.styleId,
  });
  draw.changeMode("simple_select");
};

const drawEllipse = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function,
  isFill?: boolean,
  isSetAngle?: boolean
) => {
  let centerPt = await vjmap.Draw.actionDrawPoint(map, {
    ...options,
  });
  if (centerPt.cancel) {
    return; // 取消操作
  }
  let center = map.fromLngLat(centerPt.features[0].geometry.coordinates);

  let ellipse: any;
  if (isFill) {
    // @ts-ignore
    ellipse = new vjmap.EllipseFill({
      center: center,
      majorAxisRadius: 0,
      minorAxisRadius: 0,
      fillColor: drawProperty?.color ?? "green",
      fillOpacity: drawProperty?.opacity ?? 0.8,
      fillOutlineColor: drawProperty?.outlineColor ?? "#f00",
    });
  } else {
    // @ts-ignore
    ellipse = new vjmap.EllipseEdge({
      center: center,
      majorAxisRadius: 0,
      minorAxisRadius: 0,
      lineColor: drawProperty?.outlineColor ?? "red",
      lineWidth: drawProperty?.line_width ?? 3,
    });
  }
  ellipse.addTo(map);

  let ellipseMajorAxisPt = await vjmap.Draw.actionDrawPoint(map, {
    ...options,
    updatecoordinate: (e: any) => {
      if (!e.lnglat) return;
      const co = map.fromLngLat(e.lnglat);
      ellipse.setMinorAxisRadius(center.distanceTo(co));
      ellipse.setMajorAxisRadius(center.distanceTo(co));
    },
  });
  if (ellipseMajorAxisPt.cancel) {
    ellipse.remove();
    return; // 取消操作
  }

  let ellipseMinorAxisPt = await vjmap.Draw.actionDrawPoint(map, {
    ...options,
    updatecoordinate: (e: any) => {
      if (!e.lnglat) return;
      const co = map.fromLngLat(e.lnglat);
      ellipse.setMinorAxisRadius(center.distanceTo(co));
    },
  });
  if (ellipseMinorAxisPt.cancel) {
    ellipse.remove();
    return; // 取消操作
  }

  if (isSetAngle) {
    let ellipseStartPt = await vjmap.Draw.actionDrawPoint(map, {
      ...options,
      updatecoordinate: (e: any) => {
        if (!e.lnglat) return;
        const co = map.fromLngLat(e.lnglat);
        ellipse.setStartAngle(vjmap.radiansToDegrees(co.angleTo(center)));
      },
    });
    if (ellipseStartPt.cancel) {
      ellipse.remove();
      return; // 取消操作
    }

    let ellipseEndPt = await vjmap.Draw.actionDrawPoint(map, {
      ...options,
      updatecoordinate: (e: any) => {
        if (!e.lnglat) return;
        const co = map.fromLngLat(e.lnglat);
        ellipse.setEndAngle(vjmap.radiansToDegrees(co.angleTo(center)));
      },
    });
    if (ellipseEndPt.cancel) {
      ellipse.remove();
      return; // 取消操作
    }
  }

  // 下面指定旋转角度
  // 先获取所有椭圆的点，然后围绕椭圆圆心旋转一定角度
  // 获取之前椭圆的点
  let data = ellipse.getData();
  let ellipseRotatePt = await vjmap.Draw.actionDrawPoint(map, {
    ...options,
    updatecoordinate: (e: any) => {
      if (!e.lnglat) return;
      // 然后围绕椭圆圆心旋转一定角度
      const co = map.fromLngLat(e.lnglat);
      let angle = co.angleTo(center);
      let newData = vjmap.cloneDeep(data);
      let coordinates;
      if (isFill) {
        coordinates = newData.features[0].geometry.coordinates[0];
      } else {
        coordinates = newData.features[0].geometry.coordinates;
      }
      for (let i = 0; i < coordinates.length; i++) {
        let pt = map.fromLngLat(coordinates[i]);
        pt = pt.roateAround(angle, center);
        pt = map.toLngLat(pt);
        coordinates[i] = pt; //修改原来的值
      }
      ellipse.setData(newData);
    },
  });
  if (ellipseRotatePt.cancel) {
    ellipse.remove();
    return; // 取消操作
  }

  let feature = ellipse.getData().features[0]; // 获取数据
  feature.id = vjmap.RandomID(10);
  feature.properties = {
    ...drawProperty,
  };
  draw.add(feature);
  ellipse.remove(); // 移除临时绘制的
};

// 绘制填充椭圆
export const drawEllipseFill = (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function
) => {
  drawEllipse(map, draw, options, drawProperty, showInfoFunc, true);
};
// 绘制椭圆
export const drawEllipseEdge = (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function
) => {
  drawEllipse(map, draw, options, drawProperty, showInfoFunc, false);
};

// drawEllipseFillArc
export const drawEllipseFillArc = (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function
) => {
  drawEllipse(map, draw, options, drawProperty, showInfoFunc, true, true);
};
// 绘制椭圆弧
export const drawEllipseArc = (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function
) => {
  drawEllipse(map, draw, options, drawProperty, showInfoFunc, false, true);
};

// 获取一个geojson的外包矩形
export const getGeoJsonBounds = (data: any) => {
  let pts: any = [];
  vjmap.transform.convert(data, (pt) => {
    pts.push(vjmap.geoPoint(pt));
    return pt; // 只求范围，不做转化，返回原来的
  });
  let bounds = new vjmap.GeoBounds();
  bounds.update(pts);
  return bounds;
};

// 交互式创建CAD几何对象
export const interactiveCreateGeom = async (
  data: any,
  map: Map,
  options?: Record<string, any>,
  showInfoFunc?: Function,
  param?: {
    disableScale?: boolean /*禁止指定缩放 */;
    disableRotate?: boolean /*禁止指定旋转 */;
    drawInitPixelLength?: number /*绘制的初始在地图上的像素距离 */;
    tempLineColor?: string /*绘制临时线的颜色 */;
    baseAlign?: "leftBottom" | "center" | "leftTop" /*绘制的基点的位置方向 */;
    keepGeoSize?: boolean /*保持原来的大小，不进行缩放至像素距离 */;
    position?: GeoPoint /* 如果指定了位置，则不需交互拾取位置  */
    scaleValue?: number /* 如果禁止指定缩放并且 指定了缩放倍数  */
    angleValue?: number /* 如果禁止指定旋转并且 指定了旋转角度  */
    unCombineFeature?: boolean /*  不组合成一个新实体 */
  }
) => {
  const tempDraw = map.createDrawLayer(); // 创建一个临时的绘图图层
  param = param ?? {};
  // 取消操作
  const cancelDraw = () => {
    if (tempDraw) map.removeDrawLayer(tempDraw); // 把临时图层删除了
    map.setIsInteracting(false);
  };
  try {
    // 获取数据范围
    let dataBounds = getGeoJsonBounds(data);
    let geoDataBounds: any;
    let drawData;
    if (param.keepGeoSize !== true) {
      //  先获取地图的中心点
      let basePt = map.fromLngLat(map.getCenter());
      // 要生成的像素大小
      let length = map.pixelToGeoLength(
        param.drawInitPixelLength ?? 100,
        map.getZoom()
      );
      let dataGeoBounds = map.fromLngLat(dataBounds);
      let scalex = length / dataGeoBounds.width(); // 缩放的比例
      let scaley = length / dataGeoBounds.height(); // 缩放的比例
      let dblScale = Math.min(scalex, scaley);
      if (vjmap.isZero(dblScale)) dblScale = 1.0;

      let basePoint = dataBounds.center();
      if (param.baseAlign == "leftBottom") {
        basePoint = dataBounds.min;
      } else if (param.baseAlign == "leftTop") {
        basePoint = vjmap.geoPoint([dataBounds.min.x, dataBounds.max.y]);
      }
      drawData = transformGeoJsonData(
        map,
        vjmap.cloneDeep(data),
        map.fromLngLat(basePoint),
        basePt,
        dblScale
      );
      
    } else {
      // 把数据增加至临时绘图层
      drawData = data;
    }
    geoDataBounds = map.fromLngLat(getGeoJsonBounds(drawData)); // 获取当前绘制的数据几何范围
    let geoCenter = geoDataBounds.center(); // 获取当前绘制的数据几何中心点
    if (param.baseAlign == "leftBottom") {
      geoCenter = geoDataBounds.min;
    } else if (param.baseAlign == "leftTop") {
      geoCenter = vjmap.geoPoint([geoDataBounds.min.x, geoDataBounds.max.y]);
    }
    // 把数据增加至临时绘图层
    if (param.unCombineFeature) {
      tempDraw.set(drawData);
    } else {
      addFeaturesToDraw(drawData, tempDraw);
    }
    
    let oldData = vjmap.cloneDeep(tempDraw.getAll()); // 复制下以前的数据
    let destPt: any;
    if (param.position) {
      tempDraw.deleteAll();
      const co = param.position;
      let drawData = transformGeoJsonData(
        map,
        vjmap.cloneDeep(oldData),
        geoCenter,
        co
      );
      tempDraw.set(drawData); // 设置成新的数据
      destPt = param.position;
    } else {
      if (showInfoFunc) {
        showInfoFunc("请移动鼠标至指定位置点击进行绘制");
      }
  
      // 设置地图正在交互
      map.setIsInteracting(true);
  
      let drawDestPt = await vjmap.Draw.actionDrawPoint(map, {
        ...options,
        updatecoordinate: (e: any) => {
          if (!e.lnglat) return;
          tempDraw.deleteAll();
          const co = map.fromLngLat(e.lnglat);
          let drawData = transformGeoJsonData(
            map,
            vjmap.cloneDeep(oldData),
            geoCenter,
            co
          );
          tempDraw.set(drawData); // 设置成新的数据
        },
      });
      if (drawDestPt.cancel) {
        cancelDraw();
        return; // 取消操作
      }
      destPt = map.fromLngLat(drawDestPt.features[0].geometry.coordinates);
    }
   
    // 下面获取缩放系数
    // 可以做一条辅助线显示
    let tempLine: any;
    if (!param.disableScale || !param.disableRotate) {
      tempLine = new vjmap.Polyline({
        data: map.toLngLat([destPt, destPt]),
        lineColor: param.tempLineColor ?? "yellow",
        lineWidth: 1,
        lineDasharray: [2, 2],
      });
      tempLine.addTo(map);
    }
   
    let scale = 1.0;
    if (!param.disableScale) {
      let drawScalePoint = await vjmap.Draw.actionDrawPoint(map, {
        ...options,
        updatecoordinate: (e: any) => {
          tempDraw.deleteAll();
          if (!e.lnglat) return;
          const co = map.fromLngLat(e.lnglat);
          let dist = co.distanceTo(destPt);
          let scale = dist / (geoDataBounds.width() / 2.0);
          let drawData = transformGeoJsonData(
            map,
            vjmap.cloneDeep(oldData),
            geoCenter,
            destPt,
            scale
          );
          tempDraw.set(drawData); // 设置成新的数据
          // 修改临时线坐标
          tempLine.setData(map.toLngLat([destPt, co]));
        },
      });

      if (drawScalePoint.cancel) {
        if (drawScalePoint.isEnterKey) {
          // 如果是按回车键。不是按ESC键取消的，就用默认值
          scale = 1.0;
        } else {
          // ESC键取消的
          cancelDraw();
          tempLine.remove(); // 绘制完成，删除
          return; // 取消操作
        }
      } else {
        // 已经获取了缩放系数
        let scalePt = map.fromLngLat(
          drawScalePoint.features[0].geometry.coordinates
        );
        let dist = scalePt.distanceTo(destPt);
        scale = dist / (geoDataBounds.width() / 2.0);
        if (scale < 0.0001) scale = 0.1;
      }
      tempLine.setData(map.toLngLat([destPt, destPt]));
    } else {
      scale = param.scaleValue ?? 1;
      tempDraw.deleteAll();
      let drawData = transformGeoJsonData(
        map,
        vjmap.cloneDeep(oldData),
        geoCenter,
        destPt,
        scale
      );
      tempDraw.set(drawData); // 设置成新的数据
    }

    let angle = 0;
    if (!param.disableRotate) {
      // 下面获取旋转系数
      let drawRotatePoint = await vjmap.Draw.actionDrawPoint(map, {
        ...options,
        updatecoordinate: (e: any) => {
          tempDraw.deleteAll();
          if (!e.lnglat) return;
          const co = map.fromLngLat(e.lnglat);
          angle = (co.angleTo(destPt) * 180.0) / Math.PI;
          let drawData = transformGeoJsonData(
            map,
            vjmap.cloneDeep(oldData),
            geoCenter,
            destPt,
            scale,
            angle
          );
          tempDraw.set(drawData); // 设置成新的数据
          // 修改临时线坐标
          tempLine.setData(map.toLngLat([destPt, co]));
        },
      });
      tempLine.remove(); // 绘制完成，删除
      if (drawRotatePoint.cancel) {
        if (!drawRotatePoint.isEnterKey) {
          // ESC键取消的
          cancelDraw();
          return; // 取消操作
        }
        // 不设置旋转默认为0
        angle = 0;
        let drawData = transformGeoJsonData(
          map,
          vjmap.cloneDeep(oldData),
          geoCenter,
          destPt,
          scale,
          angle
        );
        tempDraw.set(drawData);
      }
    }  else {
      angle = param.angleValue ?? 0;
      tempDraw.deleteAll();
      let drawData = transformGeoJsonData(
        map,
        vjmap.cloneDeep(oldData),
        geoCenter,
        destPt,
        scale,
        angle
      );
      tempDraw.set(drawData); // 设置成新的数据
    }
    map.setIsInteracting(false);

    // 把临时绘图层的数据加至当前地图绘制图层中
    let drawFeatures = tempDraw.getAll() as any;
    map.removeDrawLayer(tempDraw);
    return {
      feature: drawFeatures,
      rotation: angle,
    };
  } catch (e: any) {
    cancelDraw();
    if (showInfoFunc) showInfoFunc(e?.message ?? e);
  }
};

// 交互式创建箭头
export const drawArrow = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function,
  param?: Record<string, any>
) => {
  param = param || {};
  let linetype = new vjmap.DbLineType();
  linetype.name = "my_arrow_dash";
  linetype.comments = "虚线";

  linetype.style = [
    {
      method: "numDashes", //组成线型的笔画数目
      parameter: 4,
    },
    {
      method: "patternLength", // 线型总长度
      parameter: 1.0,
    },
    {
      method: "dashLengthAt", //0.5个单位的划线
      parameter: [0, 0.5],
    },
    {
      method: "dashLengthAt", //0.25个单位的空格
      parameter: [1, -0.2],
    },
    {
      method: "dashLengthAt", //0.1个单位的划线 (如果是一个点的话，则输入0即可）
      parameter: [2, 0.1],
    },
    {
      method: "dashLengthAt", //0.25个单位的空格
      parameter: [3, -0.2],
    },
  ] as any;
  let entities = [];

  let points = param.arrowShape ?? [
    [10, 60],
    [150, 20],
    [140, 40],
    [190, 0],
    [140, -40],
    [150, -20],
    [10, -40],
    [10, 60],
  ];
  let bounds = vjmap.getGeoBounds(points.map((p: any) => vjmap.geoPoint(p)));
  let docBounds = bounds.scale(3).toArray(); // [0, -100, 200, 100]; // 文档坐标范围，可以根据需要自己定。保证下面绘制的实体在此范围内
  let polyline = new vjmap.DbPolyline();
  polyline.lineWidth = param.lineWidth ?? 50;
  // @ts-ignore
  polyline.points = points;
  if (!param.noLineType) {
    // 可以是实线的话，可以不用设置线型
    polyline.linetype = "my_arrow_dash"; //线型名称是上面定义的
    polyline.linetypeScale = 30; // 线型比例放大30倍
  }
  polyline.color = map.htmlColorToEntColor(
    drawProperty?.outlineColor ?? vjmap.randomColor()
  );

  let fillColor = drawProperty?.color ?? vjmap.randomColor();
  let hatch = new vjmap.DbHatch();
  hatch.pattern = "SOLID";
  hatch.color = map.htmlColorToEntColor(fillColor);
  // @ts-ignore
  hatch.points = points;
  hatch.alpha = 100 * (drawProperty?.opacity ?? 1.0);

  entities.push(polyline, hatch);
  if (!param.noText) {
    let text = new vjmap.DbText({
      position: param.textPositon ?? [100, 70],
      contents: param.contents ?? "箭头",
      color: map.htmlColorToEntColor(fillColor),
      horizontalMode: 4,
      height: param.textHeight ?? 20,
    });
    entities.push(text);
  }

  let linetypes = [linetype]; //要创建的线型

  let data = await createGeomData(
    map,
    entities,
    docBounds,
    { LWDISPLAY: true },
    linetypes
  ); // 显示线宽

  let res = await interactiveCreateGeom(data, map, options, showInfoFunc);
  if (!res) return;
  draw.add(res?.feature); // 加至地图当前绘制的图层中
};

// 创建有线型的线段
export const createLineTypePolyline = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function,
  param?: Record<string, any>
) => {
  param = param || {};
  let coordinate;

  // 直接指定坐标
  if (param.coordinates) {
    coordinate = param.coordinates;
  } else {
    // 先交互式绘制线段
    let drawLine = await vjmap.Draw.actionDrawLineSting(map, {
      ...options,
    });
    if (drawLine.cancel) {
      return; // 取消了
    }
    coordinate = map.fromLngLat(drawLine.features[0].geometry.coordinates);
  }
  let dbEnt: any = {};
  // @ts-ignore
  dbEnt.objectid = param.objectid; // 表示要修改此实体 sys_symbols图中的objectid
  if (drawProperty?.color) {
    dbEnt.color = vjmap.htmlColorToEntColor(
      drawProperty?.color
    );
  }
  if (param.linetypeScale ) {
    dbEnt.linetypeScale = param.linetypeScale
  }
 
  if (param.isCurve) {
    if (param.curveUseControlPoints) {
      dbEnt.controlPoints = coordinate.map((p: any) => {
        return [p.x, p.y];
      }); // 拟合点 用fitPoints; 控制点 用 controlPoints
    } else {
      dbEnt.fitPoints = coordinate.map((p: any) => {
        return [p.x, p.y];
      }); // 拟合点 用fitPoints; 控制点 用 controlPoints
    }
  } else {
    dbEnt.points = coordinate.map((p: any) => {
      return [p.x, p.y];
    });
  }

  if (dbEnt) {
    let data = await createGeomData(map, [dbEnt], null, null, null, {
      mapid: param.mapid, // 上面的要修改的实体，来源于此图id
      version: param.version ?? "v1",
    });
    addFeaturesToDraw(data, draw);
  }
};

const throttle = (method: Function, delay: number, duration: number) => {
  let timer: any = null;
  let begin = new Date();
  return function () {
    // @ts-ignore
    let context: any = this;
    let args: any = arguments;
    let current = new Date();
    clearTimeout(timer);
    // @ts-ignore
    if (current - begin >= duration) {
      method.apply(context, args);
      begin = current;
    } else {
      timer = setTimeout(function () {
        method.apply(context, args);
      }, delay);
    }
  };
};

export const createLineTypeCurve = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function,
  param?: Record<string, any>
) => {
  param = param ?? {};
  // 先交互式绘制线段
  let color = vjmap.htmlColorToEntColor(
    drawProperty?.color ?? vjmap.randomColor()
  );
  const createCurve = async (coordinate: any, color: any) => {
    let dbEnt: any = {}; // 也可以直接赋属性也行不要new对象,只不过没有参数提示了
    dbEnt.objectid = param?.objectid ?? "40E"; // 表示要修改此实体 sys_symbols图中的objectid
    dbEnt.color = color;
    dbEnt.linetypeScale = param?.linetypeScale ?? 100; // 线型比例
    // 如果要修改坐标，请用下面的代码，此示例演示还是用以前的坐标数据
    dbEnt.fitPoints = coordinate.map((p: any) => {
      return [p.x, p.y];
    }); // 拟合点 用fitPoints; 控制点 用 controlPoints

    if (dbEnt) {
      return await createGeomData(map, [dbEnt], null, null, null, {
        mapid: param?.mapid ?? "sys_symbols", // 上面的要修改的实体，来源于此图id
        version: param?.version ?? "v1",
      });
    }
  };

  let tempDraw: any = map.createDrawLayer(); // 创建一个临时的绘图图层
  let drawLine = await vjmap.Draw.actionDrawLineSting(map, {
    ...options,
    updatecoordinate: throttle(
      async (e: any) => {
        let coordinate = map.fromLngLat(e.feature.coordinates);
        let data = await createCurve(coordinate, color);
        if (tempDraw) tempDraw.set(data);
      },
      200,
      300
    ),
  });
  map.removeDrawLayer(tempDraw); // 把临时图层删除了
  tempDraw = null;
  if (drawLine.cancel) {
    return; // 取消了
  }
  let coordinate = map.fromLngLat(drawLine.features[0].geometry.coordinates);
  let data = await createCurve(coordinate, color);
  if (data) {
    addFeaturesToDraw(data, draw);
  }
};

export const createHatch = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function,
  param?: Record<string, any>
) => {
  param = param ?? {};
  let coordinate;
  if (param.coordinates) // 直接指定坐标 
  {
    coordinate = param.coordinates;
  }
  else {
    let drawPolygon = await vjmap.Draw.actionDrawPolygon(map, {
      ...options,
    });
    if (drawPolygon.cancel) {
      return; // 取消了
    }
  
    coordinate  = map.fromLngLat(
      drawPolygon.features[0].geometry.coordinates[0]
    );
  }
  
  let dbEnt = new vjmap.DbHatch();
  // @ts-ignore
  dbEnt.objectid = param.objectid ?? "42F"; // 表示要修改此实体 sys_symbols图中的objectid
  if (drawProperty?.color) {
    dbEnt.color = vjmap.htmlColorToEntColor(
      drawProperty?.color
    );
  }
  if (param.patternScale) {
    dbEnt.patternScale = param.patternScale; // 填充比例
  }
 
  // 如果要修改坐标，请用下面的代码，此示例演示还是用以前的坐标数据
  dbEnt.points = coordinate.map((p: any) => {
    return [p.x, p.y];
  });

  if (dbEnt) {
    let data = await createGeomData(map, [dbEnt], null, null, null, {
      mapid: param.mapid ?? "sys_symbols", // 上面的要修改的实体，来源于此图id
      version: param.version ?? "v1",
    });
    addFeaturesToDraw(data, draw);
  }
};

// 从后台查询几何数据
export const getQueryGeomData = async (
  map: Map,
  queryParam: any,
  propData?: Record<string, any>
) => {
  propData = propData ?? {};
  let res = await map.getService().conditionQueryFeature({
    fields: "",
    includegeom: true, // 是否返回几何数据,为了性能问题，realgeom为false时，如果返回条数大于1.只会返回每个实体的外包矩形，如果条数为1的话，会返回此实体的真实geojson；realgeom为true时每条都会返回实体的geojson
    realgeom: true,
    limit: 10000, //设置很大，相当于把所有的圆都查出来。不传的话，默认只能取100条
    ...queryParam,
  });
  const features = [];
  if (res && res.result && res.result.length > 0) {
    for (let ent of res.result) {
      if (ent.geom && ent.geom.geometries) {
        let clr = map.entColorToHtmlColor(ent.color); // 实体颜色转html颜色
        for (let g = 0; g < ent.geom.geometries.length; g++) {
          features.push({
            id: vjmap.RandomID(10),
            type: "Feature",
            properties: {
              objectid: ent.objectid + "_" + g,
              color: clr,
              alpha: ent.alpha / 255,
              opacity: ent.alpha / 255,
              lineWidth: 1,
              name: ent.name,
              isline: ent.isline,
              layerindex: ent.layerindex,
              ...propData, // 把额外的属性数据加上
            },
            geometry: ent.geom.geometries[g],
          });
        }
      }
    }
  }
  return {
    type: "FeatureCollection",
    features: features,
  };
};

// 创建外部符号
export const createOutSymbol = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function,
  param?: Record<string, any>
) => {
  param = param ?? {};
  if (showInfoFunc)
    showInfoFunc("请移动鼠标将要绘制的符号移动至指定位置点击进行绘制");
  let symbolMapId = param.mapid ?? "sys_symbols";
  let symbolMapVer = param.version ?? "v1";
  let svc = map.getService();
  let styleName = await svc.getStyleLayerName(symbolMapId, symbolMapVer, true);
  // 获取到的数据，如果条件不变，建议加上缓存，不要每次去后台获取，这里演示就直接每次去获取了
  let data = await getQueryGeomData(
    map,
    {
      mapid: symbolMapId,
      version: symbolMapVer,
      layer: styleName,
      condition: param.condition ?? "layerindex=1", // 只需要写sql语句where后面的条件内容,字段内容请参考文档"服务端条件查询和表达式查询"
      simplifyTolerance: param.simplifyTolerance
    },
    {
      symbolId: vjmap.RandomID(),
    }
  );

  let res = await interactiveCreateGeom(data, map, options, showInfoFunc, {
    ...drawProperty,
    baseAlign: "center",
    position: param.position,
    angleValue: param.angleValue,
    scaleValue: param.scaleValue
  });
  if (!res) return;
  let innerProps = new Set(["disableScale", "disableRotate", "drawInitPixelLength", "tempLineColor", "baseAlign", "keepGeoSize", "position", "scaleValue", "angleValue", "unCombineFeature"])
  if (drawProperty?.unCombineFeature) {
    let ids: any = []
    for(let i = 0; i < res.feature.features.length; i++) {
      let addFeatureID = res.feature.features[i].id as string;
      ids.push(addFeatureID);
      draw.add(res.feature.features[i]);
      for (let prop in drawProperty) {
        if (innerProps.has(prop)) continue;
        draw.setFeatureProperty(addFeatureID, prop, drawProperty[prop]);
      }
    }
    return ids;
  } else {
    addFeaturesToDraw(res.feature, draw);
    let features = draw.getAll().features;
    let addFeatureID = features[features.length - 1].id as string;
    for (let prop in drawProperty) {
      if (innerProps.has(prop)) continue;
      draw.setFeatureProperty(addFeatureID, prop, drawProperty[prop]);
    }
    return [addFeatureID]
  }
};

// 绘制文本
export const drawText = async (
  map: Map,
  draw: IDrawTool,
  options?: Record<string, any>,
  drawProperty?: Record<string, any>,
  showInfoFunc?: Function,
  disableInteractive?: boolean
) => {
  drawProperty = drawProperty || {};
  if (!drawProperty.text) return;
  let docBounds: [number, number, number, number] = [-1000, -1000, 1000, 1000]; // 文档坐标范围，可以根据需要自己定，但要保证是正方形。保证下面绘制的实体在此范围内

  let entities = [];
  let textAttr: Record<string, any> = {
    position: [0, 0],
    contents: drawProperty.text,
    color: map.htmlColorToEntColor(drawProperty.color),
    horizontalMode: vjmap.DbTextHorzMode.kTextLeft,
    verticalMode: vjmap.DbTextVertMode.kTextBottom,
    height: drawProperty.height || 50,
  };
 
  let text = new vjmap.DbText(textAttr);
  entities.push(text);

  let data = await createGeomData(map, entities, docBounds); // 显示线宽
  const docProj = new vjmap.GeoProjection(vjmap.GeoBounds.fromArray(docBounds));
  // 需要取数据上的二个点做为参考点，如果以后要导出dwg的时候，创建文字的时候，计算旋转和缩放系数，用来确定文字的位置和高度属性
  let props = addExportRefInfoInText(docProj, data); // 相对于创建文档的参考点坐标
  let refInfo = addExportRefInfoInText(map, data);// 相对于当前地图的参考点坐标
  textAttr = { ...textAttr, ...props, mapRefCo1: refInfo.refCo1, mapRefCo2: refInfo.refCo2 };

  if (disableInteractive === true) {
    // 如果是直接返回刚创建的，不用交互
    const tempDraw = map.createDrawLayer(); 
    addFeaturesToDraw(data, tempDraw);
    let geojson = tempDraw.getAll();
    let features = geojson.features;
    map.removeDrawLayer(tempDraw);
    if (features.length > 0) {
      features[0].properties = features[0].properties ?? {};
      features[0].properties.export = textAttr;
    }
    return geojson;
  }

  let res = await interactiveCreateGeom(data, map, options, showInfoFunc, {
    ...drawProperty,
    baseAlign: "leftBottom",
    drawInitPixelLength: drawProperty.height ?? 50,
    disableRotate: drawProperty?.disableRotate,
    disableScale: drawProperty?.disableScale,
  });
  if (!res) return;
  res.feature.features[0].properties = res.feature.features[0].properties ?? {};
  res.feature.features[0].properties.export = textAttr;
  draw.add(res.feature); // 加至地图当前绘制的图层中
};

// 增加绘图对象，并组合成一个实体
export const addFeaturesToDraw = (
  data: any,
  drawLayer: any,
  combineInObject?: boolean /*按objectid合成一个组*/
) => {
  const objectIdSet = new Set();
  if (combineInObject) {
    // 按objectid合成一个组
    data.features.forEach((feature: any) => {
      if (feature && feature.properties && feature.properties.objectid) {
        objectIdSet.add(feature.properties.objectid);
      }
    });
  }
  if (!combineInObject || objectIdSet.size == 0) {
    let addFeatureIds: any = [];
    data.features.forEach((feature: any) => {
      addFeatureIds.push(...drawLayer.add(feature));
    });
    // 先选中此实体
    drawLayer.changeMode("simple_select", { featureIds: addFeatureIds });
    // 然后组合成一个
    try {
      // 忽略合并中的错误
      drawLayer.combineFeatures();
      // @ts-ignore
    } catch (error) {}
    return addFeatureIds.length;
  } else {
    // 按objectid合成一个组
    // 获取所有的objectid
    let oldSize = drawLayer.getAll().features.length;
    for (let objectid of objectIdSet) {
      let addFeatureIds: any = [];
      data.features.forEach((feature: any) => {
        if (feature.properties.objectid == objectid) {
          addFeatureIds.push(...drawLayer.add(feature));
        }
      });
      if (addFeatureIds.length == 0) continue;
      // 先选中此实体
      drawLayer.changeMode("simple_select", { featureIds: addFeatureIds });
      // 然后组合成一个
      try {
        // 忽略合并中的错误
        drawLayer.combineFeatures();
        // @ts-ignore
      } catch (error) {}
    }
    let featureIds: any = [];
    let drawFeatures = drawLayer.getAll().features;
    for (let k = oldSize; k < drawFeatures.length; k++) {
      featureIds.push(drawFeatures[k].id);
    }
    drawLayer.changeMode("simple_select", { featureIds: featureIds });
    return objectIdSet.size;
  }
};

// 获取点的半径为1个像素的缺省绘制样式。
export const getPointOnePixelDrawStyleOption = () => {
  const opts = vjmap.Draw.defaultOptions();
  // 修改默认样式，把点的半径改成1，没有边框，默认为5
  let pointIdx = opts.styles.findIndex(
    (s: any) => s.id === "gl-draw-point-point-stroke-inactive"
  );
  if (pointIdx >= 0) {
    opts.styles[pointIdx]["paint"]["circle-radius"][3][3] = 0;
  }
  pointIdx = opts.styles.findIndex(
    (s: any) => s.id === "gl-draw-point-inactive"
  );
  if (pointIdx >= 0) {
    opts.styles[pointIdx]["paint"]["circle-radius"][3][3] = 1;
  }
  pointIdx = opts.styles.findIndex(
    (s: any) => s.id === "gl-draw-point-stroke-active"
  );
  if (pointIdx >= 0) {
    opts.styles[pointIdx]["paint"]["circle-radius"][3] = 0;
  }
  pointIdx = opts.styles.findIndex((s: any) => s.id === "gl-draw-point-active");
  if (pointIdx >= 0) {
    opts.styles[pointIdx]["paint"]["circle-radius"][3] = 1;
  }
  return opts;
};
