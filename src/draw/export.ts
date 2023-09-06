import vjmap, { IDrawTool } from "vjmap";
import type { Map } from "vjmap";
import { drawText } from "./util";
import { transformFourParam, transformGeoJsonData } from "../utils";

const creatPoint = (coordinates: any, properties: any, radius: number, isGeometryCollection?: boolean, map?: Map) => {
    if (properties.symbol && properties.text && map) {
        // 如果是符号中的文本
        return createMText(coordinates, properties, map);
    }
    // 点我们用始点和终点相同的线来表示，也可以根据属性内容用文字也可以
    const ent = new vjmap.DbLine({
        // "#FF0000",去了前面的#，把十六进制转成十进制数字
        color: properties.color ? parseInt(properties.color.substring(1), 16) : 0,
        start: coordinates,
        end: coordinates,
        alpha: (properties.opacity ?? 1.0) * 255// 设置个透明度
    });
    fixColor(ent);
    return [ent];
}

const creatLineString = (coordinates: any, properties: any, isGeometryCollection?: boolean) => {
    const cadLineWidths = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211] ;// cad支持的线宽，单位mm
    let line_width = properties.line_width ? properties.line_width * 10 : undefined; // cad的线宽是mm，这里是像素，大致转下
    if (line_width) {
        for(let i = 1; i < cadLineWidths.length; i++) {
            if (line_width < cadLineWidths[i]) {
                line_width = cadLineWidths[i - 1];
                break;
            }
        }
    }
    let opacity = isGeometryCollection ? properties.line_opacity : properties.opacity;
    if (properties.center && properties.pointInCircle) {
        // 如果是圆
        const circile = createCircle(coordinates, properties, line_width, opacity);
        return circile;
    }
    const ent = new vjmap.Db2dPolyline({
        // "#FF0000",去了前面的#，把十六进制转成十进制数字
        color: properties.color ? parseInt(properties.color.substring(1), 16) : 0,
        points: coordinates,
        lineWidth: line_width,
        alpha: (opacity ?? 1.0) * 255,// 设置个透明度
        elevation: properties.elevation,
    })
    fixColor(ent);
    return [ent]
}

const creatPolygon = (coordinates: any, properties: any, isGeometryCollection?: boolean) => {
    let ents = [];
    let color = isGeometryCollection ? properties.fillColor : properties.color;
    let fill =  new vjmap.DbHatch({
        // "#FF0000",去了前面的#，把十六进制转成十进制数字
        color: color ? parseInt(color.substring(1), 16) : 0,
        points: coordinates.length == 1 ? coordinates[0] : coordinates,
        pattern: "SOLID",
        alpha: (properties.opacity ?? 1.0) * 255// 设置个透明度
    });
    fixColor(fill);
    ents.push(fill);
    if (!isGeometryCollection &&  !properties.noneOutline && properties.color != properties.outlineColor) {
        // 如果有边框
        let outline = new vjmap.Db2dPolyline({
            // "#FF0000",去了前面的#，把十六进制转成十进制数字
            color: properties.outlineColor ? parseInt(properties.outlineColor.substring(1), 16) : 0,
            points: coordinates,
            alpha: (properties.opacity ?? 1.0) * 255// 设置个透明度
        })
        fixColor(outline);
        ents.push(outline);
    }
    return ents;
}

const createMText = (coordinates: any, properties: any, map: Map) => {
    const fontHeight = properties.text_size_zoom1 ? map.pixelToGeoLength(properties.text_size_zoom1, 1) : map.getGeoBounds().height() / 80;
    coordinates[1] -= fontHeight / 2.0;
    const text = new vjmap.DbMText({
        // "#FF0000",去了前面的#，把十六进制转成十进制数字
        color: properties.color ? parseInt(properties.color.substring(1), 16) : 0,
        location: [coordinates[0], coordinates[1]],
        attachment: 2, // 默认是水平居中。垂直顶部
        contents: properties.text,
        rotation: vjmap.degreesToRadians(-parseFloat(properties.text_rotate)),
        textHeight: fontHeight
    });
    fixColor(text);
    return [ text];
}

export const getTextRefCo = (feature: any) => {
    let refCo1, refCo2;
    if (feature.geometry.type == "Polygon") {
        refCo1 = feature.geometry.coordinates[0][0];
        refCo2 = feature.geometry.coordinates[feature.geometry.coordinates.length - 1][1];
    } else if (feature.geometry.type == "MultiPolygon") {
        refCo1 = feature.geometry.coordinates[0][0][0];
        let g = feature.geometry.coordinates[feature.geometry.coordinates.length - 1];
        refCo2 = g[g.length - 1][1];
    } else if (feature.geometry.type == "MultiLineString") {
        refCo1 = feature.geometry.coordinates[0][0];
        refCo2 = feature.geometry.coordinates[feature.geometry.coordinates.length - 1][1];
    }  else if (feature.geometry.type == "GeometryCollection") {
        let f1 = feature.geometry.geometries[0];
        if (f1.type == "LineString") {
            refCo1 = f1.coordinates[0];
        } else  if (f1.type == "Polygon") {
            refCo1 = f1.coordinates[0][0];
        }
        let f2 = feature.geometry.geometries[feature.geometry.geometries.length - 1];
        if (f2.type == "LineString") {
            refCo2 = f2.coordinates[1];
        } else  if (f2.type == "Polygon") {
            refCo2 = f2.coordinates[f2.coordinates.length - 1][1];
        }
    }
    return {
        refCo1, refCo2
    }
}
const createText = (feature: any, properties: any, map: Map) => {
    let textAttr = properties.export || {};
    if (!textAttr.refCo1 || !textAttr.refCo2 || !textAttr.height || !textAttr.position) return;
    let x, y, height;
    // 取数据上的二个点参考点，和之前保存的参考点计算旋转和缩放系数，用来确定文字的位置和高度属性
    let { refCo1, refCo2 } = getTextRefCo(feature);
    if (!refCo1 || !refCo2) return;
    // 通过之前保存的对应点和现在的对应点，计算缩放和旋转及平移参数
    let param = vjmap.coordTransfromGetFourParamter([vjmap.geoPoint(textAttr.refCo1), vjmap.geoPoint(textAttr.refCo2)],
        [vjmap.geoPoint(refCo1), vjmap.geoPoint(refCo2)], false, true);
    let baseCo = vjmap.coordTransfromByFourParamter(vjmap.geoPoint(textAttr.position), param);
    x = baseCo.x;
    y = baseCo.y; 
    height = textAttr.height * param.scale;
   
    let text;
    let attr = {
        ...textAttr,
        rotation: (param.rotate ?? 0) + (textAttr.textRotate ?? 0),
        color: properties.color ? parseInt(properties.color.substring(1), 16) : 0,
    }
    if (!textAttr.isMText) {
        text = new vjmap.DbText({
            ...attr,
            position: [x, y],
            height: height,
        });
    } else {
        text = new vjmap.DbMText({
            ...attr,
            location: [x, y],
            textHeight: height,
        });
    }
    
    fixColor(text);
    return [ text];
}

const createCircle = (coordinates: any, properties: any, line_width?: number, opacity?: number) => {
    const p1 = coordinates[0];
    const p2 = coordinates[coordinates.length /2];
    const circle = new vjmap.DbCircle({
        color: properties.color ? parseInt(properties.color.substring(1), 16) : 0,
        center: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2],
        radius: vjmap.geoPoint(p1).distanceTo(vjmap.geoPoint(p2)) / 2.0,
        lineWidth: line_width,
        alpha: (opacity ?? 1.0) * 255// 设置个透明度
    })
    fixColor(circle);
    return [ circle];
}

// 修正颜色，如果颜色为白色或黑色，则置颜色为自动反色
const fixColor = (ent: any) => {
    if (ent.color == 0 || ent.color == 0xFFFFFF) {
        ent.colorIndex = 7;// cad中颜色索引为7表示自动反色
        delete ent.color;
    }
    return ent;
}

// 修改图中已绘制的文本
export const modifyDrawText = async (map: Map,  draw: IDrawTool, promptFunc?: Function /* 显示函数。返回promise<string>*/, message?: Function) => {
    // 先进行选择，点右键确定选择
    message = message || console.log;
    message("请选择要选择的绘制文字，按右键结束");
    let selected = await vjmap.Draw.actionSelect(map, draw);
    if (selected.features.length == 0) return; // 如果没有要选择的实体
    if (!(selected.features[0].properties.export && selected.features[0].properties.export.contents)) {
        message("选择的不是绘制的文本类型");
        return;
    }
    let prop = selected.features[0].properties.export;
    let content;
    if (promptFunc) {
      content = await promptFunc(prop.contents);
    } else {
      content  = prompt(
        "请输入要修改的文字内容",
        prop.contents
      );
    }
    
    if (content == "" || content == null || content == prop.contents) {
      return; // 没有改变
    } 

    let feature = selected.features[0];

    // 取数据上的二个点参考点，和之前保存的参考点计算旋转和缩放系数，用来确定文字的位置和高度属性
    let { refCo1, refCo2 } = getTextRefCo(feature);
    if (!refCo1 || !refCo2) return;
    // 通过之前保存的对应点和现在的对应点，计算缩放和旋转及平移参数
    let fourParam = vjmap.coordTransfromGetFourParamter([vjmap.geoPoint(prop.mapRefCo1), vjmap.geoPoint(prop.mapRefCo2)],
        [vjmap.geoPoint(map.fromLngLat(refCo1)), vjmap.geoPoint(map.fromLngLat(refCo2))], false, false);

    let textData = await drawText(map, draw, {}, {
        color: selected.features[0].properties.color,// 颜色
        text: content,
        height: prop.height
    }, undefined, true);

    let geoTextData = textData;
    let newTextData = transformFourParam(
        map,
        vjmap.cloneDeep(geoTextData),
        fourParam,
      );
      newTextData.features[0].id = selected.features[0].id;
      draw.delete(selected.features[0].id);
      draw.add(newTextData)
}

// 导出成dwg图
export const exportDwg = async (map: Map,  draw: IDrawTool, newMapId?: string) => {
    let entsJson = draw.getAll();
    entsJson = map.fromLngLat(entsJson);
    let mapBounds = map.getGeoBounds();
    const defaultRadius = mapBounds.width() / 200 // 取地图宽的200分之一做为半径;
    let addEntitys = [];
    for(let i = 0; i < entsJson.features.length; i++) {
        // 绘制的元素转为cad的元素，demo中只考虑了部分实体类型，可以根据自己的需要扩展
        let feature = entsJson.features[i] as any;
        if (isTrackFeature(feature)) {
            // 如果是数据埋点的实体，此实体只是用来记录一些属性，无需处理。
            // 如果有被删除的实体属性
            const delEnts = getTrackFeatureProperty(draw, "deleteEntitys");
            if (delEnts) {
                Array.from(new Set(delEnts)).forEach((entId: any) => {
                    addEntitys.push({
                        objectid: entId,// 实体句柄，如传了实体句柄，是表示修改或删除此实体.
                        delete: true // 表示删除
                    });
                })
            }
            continue;
        }
        if (feature.geometry.type == "Point") {
            // 点我们用起点和终点相同的线来表示，也可以根据属性内容用文字也可以
            addEntitys.push(...creatPoint(feature.geometry.coordinates, feature.properties, defaultRadius, false, map));
        } else if (feature.geometry.type == "LineString") {
            addEntitys.push(...creatLineString(feature.geometry.coordinates, feature.properties));
        }  else if (feature.geometry.type == "Polygon") {
            if (feature.properties.export) {
                // 如果是文字
                const text = createText(feature, feature.properties, map);
                if (text && text.length > 0) {
                    addEntitys.push(...text);
                    continue;// 文字创建成功，否则继续往下执行
                }
            } 
            addEntitys.push(...creatPolygon(feature.geometry.coordinates, feature.properties));
        }  else if (feature.geometry.type == "MultiPoint") {
            for(let coord of feature.geometry.coordinates) {
                addEntitys.push(...creatPoint(coord, feature.properties, defaultRadius, false, map));
            }
        } else if (feature.geometry.type == "MultiLineString") {
            if (feature.properties.export) {
                // 如果是文字
                const text = createText(feature, feature.properties, map);
                if (text && text.length > 0) {
                    addEntitys.push(...text);
                    continue;// 文字创建成功，否则继续往下执行
                }
            } 
            for(let coord of feature.geometry.coordinates) {
                addEntitys.push(...creatLineString(coord, feature.properties));
            }
        }  else if (feature.geometry.type == "MultiPolygon") {
            if (feature.properties.export) {
                // 如果是文字
                const text = createText(feature, feature.properties, map);
                if (text && text.length > 0) {
                    addEntitys.push(...text);
                    continue;// 文字创建成功，否则继续往下执行
                }
            } 
            for(let coord of feature.geometry.coordinates) {
                addEntitys.push(...creatPolygon(coord, feature.properties));
            }
        }else if (feature.geometry.type == "GeometryCollection") {
            if (feature.properties.export) {
                // 如果是文字
                const text = createText(feature, feature.properties, map);
                if (text && text.length > 0) {
                    addEntitys.push(...text);
                    continue;// 文字创建成功，否则继续往下执行
                }
            } 

            // 先遍历多边形，再绘制点线，防止多边形把点线覆盖了
            for(let k = 0; k < feature.geometry.geometries.length; k++) {
                let subFeature = feature.geometry.geometries[k];
                if (subFeature.type == "Polygon") {
                    addEntitys.push(...creatPolygon(subFeature.coordinates, feature.properties, true));
                } else if (subFeature.type == "MultiPolygon") {
                    for(let coord of subFeature.coordinates) {
                        addEntitys.push(...creatPolygon(coord, feature.properties, true));
                    }
                }
            }
            for(let k = 0; k < feature.geometry.geometries.length; k++) {
                let subFeature = feature.geometry.geometries[k];
                if (subFeature.type == "Point") {
                    // 点我们用圆来表示，也可以根据属性内容用文字也可以
                    addEntitys.push(...creatPoint(subFeature.coordinates, feature.properties, defaultRadius, true, map));
                } else if (subFeature.type == "LineString") {
                    addEntitys.push(...creatLineString(subFeature.coordinates, feature.properties, true));
                } else if (subFeature.type == "MultiPoint") {
                    for(let coord of subFeature.coordinates) {
                        addEntitys.push(...creatPoint(coord, feature.properties, defaultRadius, true, map));
                    }
                } else if (subFeature.type == "MultiLineString") {
                    for(let coord of subFeature.coordinates) {
                        addEntitys.push(...creatLineString(coord, feature.properties, true));
                    }
                }
            }
        } else {
            console.warn("unknow FeatureCollection type:" + feature.geometry.type)
        }
    }
    let doc = new vjmap.DbDocument();
    /** 来源于哪个图，会在此图的上面进行修改或新增删除，格式如 形式为 mapid/version,如 exam/v1 . */
    let svc = map.getService();
    let param = svc.currentMapParam();

    if (param?.mapid) {
        if (!param.maptype) {
           // 如果来源于某cad图, 如果是图像不需要传
           doc.from = `${param?.mapid}/${param?.version}`; // 当前地图的地图id和版本
        }
    }
    doc.appendEntity(addEntitys); // 把要绘制的实体加上
  
    // 创建一个新的服务类，否则会影响之前的服务对象
    let service = svc.clone();
    // js代码
    let res = await service.updateMap({
        mapid: newMapId ? newMapId : vjmap.getTempMapId(60, true), // 绘制的导出的用临时图形吧，临时图形不浏览情况下过期自动删除时间，单位分钟。默认30,
        filedoc: doc.toDoc(),
        mapopenway: vjmap.MapOpenWay.Memory,
        style: {
            backcolor: 0 // 如果div背景色是浅色，则设置为oxFFFFFF
        }
    })
    return res;
}


// 是否是数据埋点的实体，此实体只是用来记录一些属性，无需显示。
export const isTrackFeature = (feature: any) => {
    // id并且是__data_track__
    // 数据埋点的实体
    // 必须是点类型
    // 点坐标必须是[0,0]
    // 属性中，要是隐藏，并且是不能选择锁定状态
    if (!feature) return false;
    return feature.id == '__data_track__';
}

//  设置数据埋点的实体属性，此实体只是用来记录一些属性，无需显示。
export const setTrackFeatureProperty = (draw: IDrawTool, props: Record<string, any>) => {
    let entsJson = draw.getAll();
    let trackFeature = entsJson.features.find(f => isTrackFeature(f));
    if (!trackFeature) {
        draw.add({
            "id": "__data_track__",
            "type": "Feature",
            "properties": {
                ...props,
                "radius_inactive": 1,
                "radius_static": 1,
                "opacity": 0,
                "_hover_opacity": 0,
                "isOff": true,
                "isLocked": true
            },
            "geometry": {
                "coordinates": [
                    0,
                    0
                ],
                "type": "Point"
            }
        })
    } else if (trackFeature?.id) {
        for(let k in props) {
            draw.setFeatureProperty(trackFeature?.id as any, k, props[k])
        }
    }
}

//  获取数据埋点的实体属性
export const getTrackFeatureProperty = (draw: IDrawTool, key?: string) => {
    let entsJson = draw.getAll();
    let trackFeature = entsJson.features.find(f => isTrackFeature(f)) as any;
    if (trackFeature && trackFeature.properties) {
        if (key) {
            return trackFeature.properties[key];
        } else {
            return trackFeature.properties;
        }
    } 
}


// 增加文字导出信息参考点
export const addExportRefInfoInText = (prj: any, data: any) => {
    let textAttr: any ={};
    if (data.features.length > 0 ) {
      let f = data.features[0];
      if (f.geometry.type == "Polygon") {
        textAttr.refCo1 = prj.fromLngLat(f.geometry.coordinates[0][0]);
      } else if (f.geometry.type == "LineString") {
        textAttr.refCo1 = prj.fromLngLat(f.geometry.coordinates[0]);
      }
      f = data.features[data.features.length - 1];
      if (f.geometry.type == "Polygon") {
        textAttr.refCo2 = prj.fromLngLat(f.geometry.coordinates[f.geometry.coordinates.length - 1][1]);
      } else  if (f.geometry.type == "LineString") {
        textAttr.refCo2 = prj.fromLngLat(f.geometry.coordinates[1]);
      }
    }
    return textAttr;
  }