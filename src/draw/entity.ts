import vjmap, { Map, IDrawTool } from 'vjmap'
import { addExportRefInfoInText, getTrackFeatureProperty, setTrackFeatureProperty } from "./export";
import { selectFeatures } from "../map/select";
import { getEntityObjectId } from '../utils';
import { clearHighlight } from '../map/highlight';
import { addFeaturesToDraw, cancelDraw } from './util';
// 修改或删除cad底图的实体元素，先通过修改样式的方式，使之在前端不可见。然后最后导出为dwg的时候，再从底图删除。
// 如果是修改，则把cad的数据通过绘图绘制到前端进行修改
export const deleteOrModifyCadEntity = async (
    map: Map, // 地图对象
    draw: IDrawTool, // 绘图对象
    updateMapStyleObj: any, // 通过 createUpdateMapStyleObj 获取
    isDelete: boolean, // 是否删除，删除或修改
    showInfoFunc?: Function, // 显示信息的函数名
    dlgConfirmInfo?: Function, // 显示确认对话框的函数名
    isRectSel?: boolean, /* 点选还是框选 */
  ) => {
    if (showInfoFunc) showInfoFunc(
      `请选择要${isDelete ? "删除" : "修改"}的CAD实体对象，按右键结束`
    );
    cancelDraw(map);
    const hideObjectIds =  getTrackFeatureProperty(draw, "hideEntityObjectIds");
    const selected = await selectFeatures(map, true, true, !isRectSel, true, hideObjectIds ? new Set(hideObjectIds) : undefined);
    if (!selected || selected.length == 0) return;
    const memoryObjectidSet = new Set(); // 内存模式下面的objectid
    const geomObjectidSet = new Set(); // 几何渲染栅格瓦片的objectid
    const geomIdSet = new Set(); // 几何渲染矢量瓦片的id
    selected.forEach((f: any) => {
      if (f.properties.objectid) {
        // 几何打开模式栅格的objectid
        geomObjectidSet.add(f.properties.objectid);
      }
      if (f.id) {
        // 几何渲染矢量瓦片的id
        geomIdSet.add(parseInt(f.id));
      }
      // 内存打开模式下的objectid
      const id = getEntityObjectId(f.properties.objectid);
      if (id) {
        memoryObjectidSet.add(id);
      }
    });
    const onOk = async (modifyProps?: Record<string, any>, isModifyText?: Boolean) => {
      if (map.hasVectorLayer()) {
        // 几何渲染矢量瓦片
        await updateMapStyleObj.addHideObjectIds(Array.from(geomIdSet));
      } else {
        // 几何渲染栅格瓦片
        await updateMapStyleObj.addHideObjectIds(Array.from(geomObjectidSet));
      }
  
      // 把要加从cad原图删除的实体id保存到数据埋点的实体上，此实体只是用来记录一些属性，无需显示。等导出为dwg图时才处理。
      const deleteEntitys = getTrackFeatureProperty(draw, "deleteEntitys") || [];
      deleteEntitys.push(...Array.from(memoryObjectidSet));
      const hideEntityObjectIds =
        getTrackFeatureProperty(draw, "hideEntityObjectIds") || [];
      hideEntityObjectIds.push(...Array.from(geomObjectidSet));
      const hideEntityIds = getTrackFeatureProperty(draw, "hideEntityIds") || [];
      hideEntityIds.push(...Array.from(geomObjectidSet));
      setTrackFeatureProperty(draw, {
        deleteEntitys: Array.from(new Set(deleteEntitys)),
        hideEntityObjectIds: Array.from(new Set(hideEntityObjectIds)),
        hideEntityIds: Array.from(new Set(hideEntityIds)),
      });
      if (!isDelete) {
        // 如果是修改
        let param = map.getService().currentMapParam() as any;
        let props = {};
        if (isModifyText && modifyProps) {
          props = modifyProps[0];
        }
        const data = await createGeomData(
          map,
          Array.from(memoryObjectidSet).map((e: any) => {
            return {
              objectid: e,
              ...props
            };
          }),
          updateMapStyleObj?.getClipBounds(),
          null,
          null,
          `${param.mapid}/${param.version}`
        );
        let oldFeatureLength = draw.getAll().features.length;
        addFeaturesToDraw(data, draw, true);
        if (modifyProps) {
          // 如果是单行文本或多行文本，把属性挂至export上面，这样导出dwg的时候，可以根据属性创建text对象了，否则会把文字变成多边形填充对象
          const features = draw.getAll().features;
          for(let k = oldFeatureLength; k < features.length; k++) {
            let idx = k - oldFeatureLength;
            if (!modifyProps[idx]) continue; // 不是文字
            const addFeatureId = features[k].id as string;
            draw.setFeatureProperty(addFeatureId, "export", {
              ...modifyProps[idx].export,
              ...addExportRefInfoInText(map, {
                features: data.features.filter(f => f.properties?.objectid == features[k]?.properties?.objectid)
              })
            })
          }
          
        }
      }
      clearHighlight(map);
    };
    const onCancel = () => {
      clearHighlight(map);
    };
  
    // 如果是单行文本或多行文本，则弹出修改文本的框，其余的直接获取实体绘制geojson绘制到前端进行修改
    const getTextProps = (features: any, content?: string) => {
      let objectIdProps: any;
      const idSet = new Set();
      for(let f = 0 ; f < features.length; f++) {
        const ftProps = features[f].properties;
        const id = getEntityObjectId(ftProps.objectid);
        if (idSet.has(id)) continue;
        idSet.add(id);
        if (!(ftProps.name == "AcDbText" || ftProps.name == "AcDbMText")) continue;
        const isText = ftProps.name == "AcDbText";
        const props: Record<string, any> = isText
          ? {
              text: content ?? ftProps.text, // 单行文本
              isText: true,
            }
          : {
              contents: content ?? ftProps.text, // 多行文本
              isMText: true
         };
         // 增加要导出dwg时，必要的一些参数
         props.export = {
          position: vjmap.GeoPoint.fromString(ftProps.location || ftProps.position),
          height: ftProps.height || ftProps.textHeight,
          contents: content,
          cloneObjectId: getEntityObjectId(ftProps.objectid),
          textRotate: ftProps.rotate || 0
         }
         objectIdProps = objectIdProps ?? {};
         objectIdProps[idSet.size - 1] = props;
      }
      return objectIdProps
    }
    if (!isDelete && 
      memoryObjectidSet.size == 1 &&
      (selected[0].properties.name == "AcDbText" ||
        selected[0].properties.name == "AcDbMText")
    ) {
      const content = prompt(
        "请输入要修改的文字内容",
        selected[0].properties.text
      );
      if (content == "" || content == null) {
        onCancel();
        return; // 没有改变
      } else {
        
        await onOk(getTextProps(selected, content), true); // 通过要修改的属性去后台获取实体绘制geojson绘制到前端进行修改
      }
    } else {
      // 直接获取实体绘制geojson绘制到前端进行修改
      if (!dlgConfirmInfo) {
        await onOk();
      } else {
        let isOk = await dlgConfirmInfo(`你确定要${isDelete ? "删除" : "修改"} 这 ${
            memoryObjectidSet.size
          } 个cad实体对象 ?`);
        if (isOk) {
            await onOk(getTextProps(selected));
        } else {
            onCancel();
        }
      }
    }
  };
  
  // 删除cad底图的实体元素，先通过修改样式的方式，使之在前端不可见。然后最后导出为dwg的时候，再从底图删除
  export const deleteCadEntity = async (
    map: Map, // 地图对象
    draw: IDrawTool, // 绘图对象
    updateMapStyleObj: any, // 通过 createUpdateMapStyleObj 获取
    showInfoFunc?: Function, // 显示信息的函数名
    dlgConfirmInfo?: Function, // 显示确认对话框的函数名
    isRectSel?: boolean, /* 点选还是框选 */
  ) => {
    try {
      await deleteOrModifyCadEntity(map, draw, updateMapStyleObj, true, showInfoFunc, dlgConfirmInfo, isRectSel);
    } catch (error) {
      if (showInfoFunc) {
        showInfoFunc(error)
      }
    }
  };
  
  // 删除cad底图的实体元素，先通过修改样式的方式，使之在前端不可见。然后最后导出为dwg的时候，再从底图进行修改
  export const modifyCadEntity = async (
    map: Map, // 地图对象
    draw: IDrawTool, // 绘图对象
    updateMapStyleObj: any, // 通过 createUpdateMapStyleObj 获取
    showInfoFunc?: Function, // 显示信息的函数名
    dlgConfirmInfo?: Function, // 显示确认对话框的函数名
    isRectSel?: boolean, /* 点选还是框选 */
  ) => {
    try {
      await deleteOrModifyCadEntity(map, draw, updateMapStyleObj, false, showInfoFunc, dlgConfirmInfo, isRectSel);
    } catch (error) {
      if (showInfoFunc) {
        showInfoFunc(error)
      }
    }
  };
  

  
// 创建一个几何对象
export const createGeomData = async (
    map: Map, // 地图对象
    entities: any = [], // 实体数组
    docMapBounds: any = null, // 文档范围
    environment: any = null, // 环境参数
    linetypes: any = null, // 线型
    dbFrom: any = null // 数据来源
  ) => {
    let doc = new vjmap.DbDocument();
    if (environment) {
      doc.environment = environment; // 文档环境
    }
    if (linetypes) {
      doc.linetypes = linetypes; // 线型定义
    }
    let param = map.getService().currentMapParam() as any;
    if (!docMapBounds) {
      // 如果文档范围为空，则使用当前地图
      if (!dbFrom) {
        doc.from = `${param.mapid}/${param.version}`; // 从当前图
      } else {
        doc.from = typeof(dbFrom) == "string" ? dbFrom : `${dbFrom.mapid}/${dbFrom.version}`; // 从指定的图
      }
      doc.pickEntitys = entities.map((e: any) => e.objectid);
    } else {
      if (dbFrom) {
        doc.from = dbFrom; // 从指定的图
        doc.pickEntitys = entities.map((e: any) => e.objectid);
      }
    }
    
    doc.appendEntity(entities);
  
    let svc = map.getService();
    let res = await svc.cmdCreateEntitiesGeomData({
      filedoc: doc.toDoc(),
      mapBounds: docMapBounds ? docMapBounds : param.bounds.toArray(), // 如果没有输入文档范围，则使用当前地图的范围
    });
    if (res.error) {
      throw res.error;
    }
    const features = [];
    if (res && res.result && res.result.length > 0) {
      for (let ent of res.result) {
        if (ent.geom && ent.geom.geometries) {
          let clr = map.entColorToHtmlColor(ent.color); // 实体颜色转html颜色
          for (let g = 0; g < ent.geom.geometries.length; g++) {
            let featureAttr: any = {};
            // 因为要组合成一个组合实体，所以线和多边形的颜色得区分
            if (ent.isPolygon) {
              featureAttr.color = clr; // 填充色，只对多边形有效
              featureAttr.noneOutline = true; // 不显示多边形边框，只对多边形有效
            } else {
              featureAttr.color = clr; // 颜色
              featureAttr.line_width = ent.lineWidth; // 线宽
            }
            features.push({
              id: vjmap.RandomID(10),
              type: "Feature",
              properties: {
                objectid: ent.objectid,
                opacity: ent.alpha / 255,
                ...featureAttr,
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

  // 加载数据至绘图对象
export const loadDataToDraw = async (map: Map, draw: IDrawTool, data: string, updateMapStyleObj: any) => {
    data = JSON.parse(data);
    draw.set(map.toLngLat(data));
    if (map.hasVectorLayer()) {
    const hideEntityIds =
        getTrackFeatureProperty(draw, "hideEntityIds") || [];
    if (hideEntityIds) {
        await updateMapStyleObj.addHideObjectIds(hideEntityIds);
    }
    } else {
    const hideEntityObjectIds =
        getTrackFeatureProperty(draw, "hideEntityObjectIds") || [];
    if (hideEntityObjectIds) {
        await updateMapStyleObj.addHideObjectIds(hideEntityObjectIds);
    }
    }
}