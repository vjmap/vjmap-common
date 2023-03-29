import { MapLayer } from "../types";
import vjmap, { Map, Marker, MarkerClusterData } from "vjmap";
import LayerBase from "./base";
import { toMapLayer } from "../utils";
export class MarkerClusterLayer extends LayerBase {
  markerCluster!: vjmap.MarkerCluster;
  popupInfo: vjmap.Popup | null;
  constructor() {
    super();
    this.popupInfo = null;
  }
  getColor(textColors: any, num: number, isText?: boolean) {
    textColors = textColors ?? [
      [0, "#00FFFF", "#00FFFF"],
      [5, "#F0F", "#80FF00"],
      [10, "#00F", "#FFFF00"],
      [1000, "#FFF", "#FF3D3D"],
    ];
    for (let i = 0; i < textColors.length; i++) {
      if (num <= textColors[i][0]) {
        return isText ? textColors[i][1] : textColors[i][2];
      }
    }
    if (textColors.length == 0) return "#00FFFF";
    return isText
      ? textColors[textColors.length - 1][1]
      : textColors[textColors.length - 1][2]; // 没找到返回最后一个
  }

  async addLayer(map: Map, mapLayer: MapLayer) {
    super.addLayer(map, mapLayer);
    let featureCollection = map.getSourceData(mapLayer.sourceId);
    let features = featureCollection.features;
    let data = [];

    for (let i = 0; i < features.length; i++) {
      let geometry = features[i].geometry;
      if (geometry.type == "Point") {
        data.push({
          point: map.fromLngLat(geometry.coordinates),
          properties: {
            ...features[i].properties,
          },
        });
      }
      if (mapLayer.isDrawLinePoint) {
        let coordinates = [];
        if (geometry.type == "LineString") {
          coordinates = geometry.coordinates;
        } else if (geometry.type == "Polygon") {
          coordinates = geometry.coordinates[0];
        }
        for (let co of coordinates) {
          data.push({
            point: map.fromLngLat(co),
            properties: {
              ...features[i].properties,
            },
          });
        }
      }
    }

    // 创建Marker回调，必须返回一个Marker或从Marker派生的对象
    // curMarkerData 当前要显示的marker的数据， clusterMarkersData 当前聚合的maker的数据，包括当前要显示的)
    const createMarker = (
      curMarkerData: MarkerClusterData,
      clusterMarkersData: MarkerClusterData[]
    ) => {
      if (clusterMarkersData.length <= 1) {
        // 只有一个，没有聚合的实体，直接用Marker来绘制
        let options = { ...mapLayer };
        // @ts-ignore
        options = this.evalValue(options, curMarkerData.properties, this.map);
        let marker = new vjmap.Marker({
          ...mapLayer,
          color: this.getColor(options.textColors, clusterMarkersData.length),
        }).setLngLat(this.map.toLngLat(curMarkerData.point));

        if (options.popupHtml) {
          // 给marker增加点击事件
          marker.on("click", (e) => {
            if (!this.popupInfo) {
              this.popupInfo = new vjmap.Popup({
                offset: options.popupOffset ?? [0, 0],
                anchor: options.popupAnchor,
                closeButton: options.closeButton,
                closeOnClick: options.closeOnClick,
                closeOnMove: options.closeOnMove,
                focusAfterOpen: options.focusAfterOpen,
                className: options.className,
                maxWidth: options.maxWidth,
              });
            } else {
              this.popupInfo.remove();
            }
            let html = options.popupHtml; //"<h3 style='color:red'>index ${props.index}</h3>"
            // @ts-ignore
            let htmlValue = this.evalValue("return `" + html + "`", marker.clusterMarkersData[0].properties, this.map);
            this.popupInfo.setHTML(htmlValue);
            this.popupInfo.setLngLat(marker.getLngLat()).addTo(this.map);
          });
        }
        return marker;
      } else {
        // 如果有聚合的实体，则显示聚合数
        // vjmap.Text是从Marker派生的对象，具有Marker对象的方法，所以可以返回Text对象
        let text = new vjmap.Text({
          text: clusterMarkersData.length + "", //总共聚合的个数
          anchor: "center",
          offset: [0, 0], // x,y 方向像素偏移量
          style: {
            // 自定义样式
            "background-color": this.getColor(
              mapLayer.textColors,
              clusterMarkersData.length
            ),
            color: this.getColor(
              mapLayer.textColors,
              clusterMarkersData.length,
              true
            ),
            ...mapLayer.textStyle,
          },
        });
        text.setLngLat(this.map.toLngLat(curMarkerData.point)).addTo(this.map);
        text.on("click", (e) => {
          // @ts-ignore
          if (text.clusterMarkersData.length === 1) return;
          // 获取所有聚合的点何地
          // @ts-ignore
          let pts = text.clusterMarkersData.map((c) => c.point);
          let showBounds = vjmap.geoBounds();
          showBounds.update(pts); //得到所有点坐标的范围
          let lngLatBounds = this.map.toLngLat(showBounds);
          this.map.fitBounds(lngLatBounds, {
            padding: 40, //旁边留几十个像素，方便全部看到
          });
        });
        return text;
      }
    };
    // 更新Marker回调，如果返回空，则表示只更新Marker内容，如果返回了Marker对象，表示要替换之前的Marker对象
    // curMarkerData 当前要显示的marker的数据， clusterMarkersData 当前聚合的maker的数据，包括当前要显示的; marker当前的实例对象)
    const updateMarker = (
      curMarkerData: MarkerClusterData,
      clusterMarkersData: MarkerClusterData[],
      marker: Marker
    ) => {
      if (marker instanceof vjmap.Text) {
        // 如果是文本对象
        if (clusterMarkersData.length > 1) {
          // 还是聚合对象，只要改变文本就可以
          marker.setText(clusterMarkersData.length + "");
          // 修改的话，不用返回
        } else {
          //  要变成marker对象才可以了
          // 先删除自己，再创建marker
          marker.remove();
          return createMarker(curMarkerData, clusterMarkersData);
        }
      } else {
        // 如果是marker
        if (clusterMarkersData.length > 1) {
          // 如果数量大于1，表示需要聚合，先删除自己的Marker对象，再创建text
          marker.remove();
          return createMarker(curMarkerData, clusterMarkersData);
        }
      }
    };
    this.markerCluster = new vjmap.MarkerCluster({
      /** 数据内容.(传入坐标为CAD地理坐标) */
      data,
      // 创建Marker回调，必须返回一个Marker或从Marker派生的对象 (curMarkerData 当前要显示的marker的数据， clusterMarkersData 当前聚合的maker的数据，包括当前要显示的)
      createMarker,
      // 更新Marker回调，如果返回空，则表示只更新Marker内容，如果返回了Marker对象，表示要替换之前的Marker对象 (curMarkerData 当前要显示的marker的数据， clusterMarkersData 当前聚合的maker的数据，包括当前要显示的; marker当前的实例对象)
      updateMarker,
      /** 是否允许重叠，默认false. */
      allowOverlap: mapLayer.allowOverlap ?? false,
      /** 允许重叠的最大缩放级别，小于或等于此级别才会处理重叠，超过此级时会全部显示当前所有的(如果不允许重叠时有效).默认4级*/
      allowOverlapMaxZoom: mapLayer.allowOverlapMaxZoom ?? 4,
      /** marker div的像素宽，用于计算重叠时需要，默认40. 如果在data的properties设置了属性markerWidth，则以data设置的为准*/
      markerWidth: mapLayer.markerWidth ?? 28,
      /** marker div的像素高，用于计算重叠时需要，默认40. 如果在data的properties设置了属性markerHeight，则以data设置的为准 */
      markerHeight: mapLayer.markerHeight ?? 40,
    });
    this.markerCluster.addTo(map);
  }
  setLayerStyle(
    map: Map,
    layerId: string,
    layerProps: Record<string, any>,
    oldLayer: MapLayer
  ) {
    super.setLayerStyle(map, layerId, layerProps, oldLayer);
    this.removeLayer(map, layerId);
    this.addLayer(map, toMapLayer(oldLayer, layerProps));
  }
  setVisible(map: Map, layerId: string, visibleOff?: boolean) {
    super.setVisible(map, layerId, visibleOff);
    if (visibleOff) {
      this.markerCluster.hide();
    } else {
      this.markerCluster.show();
    }
  }
  removeLayer(map: Map, layerId: string) {
    this.markerCluster.remove();
    if (this.popupInfo) {
      this.popupInfo.remove();
      this.popupInfo = null;
    }
    super.removeLayer(map, layerId);
  }
}
