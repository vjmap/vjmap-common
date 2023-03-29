import vjmap, { Map } from 'vjmap'
import { sleep } from '../utils';
import { getMapSnapPoints } from './snap';
let snapObj: any; // 设置的捕捉的实体
let curMeasureCmd: string; // 当前测量命令
export async function runMeasureCmd(map: Map, cmd: string) {
  curMeasureCmd = cmd;
  if (cmd != "measureCancel") {
    // 先结束当前测量
    await measureCancel(map);
    if (!snapObj) {
        // 获取地图上的捕捉点
        snapObj = {};
        getMapSnapPoints(map, snapObj);
    }
  }
  switch (cmd) {
    case "measureDist":
      measureDistLoop(map, snapObj);
      break;
    case "measureArea":
      measureAreaLoop(map, snapObj);
      break;
    case "measureAngle":
      measureAngleLoop(map, snapObj);
      break;
    case "measureCoordinate":
      measureCoordinateLoop(map, snapObj);
      break;
    case "measureCancel":
      await measureCancel(map);
      break;
  }
}

// 结束绘制
const measureCancel = async (map: Map)=> {
    // 连续发送取消键，第一次取消当前绘制，第二次退出测量
    map.fire("keyup", {keyCode:27});
    await sleep(100);
    map.fire("keyup", {keyCode:27});
    await sleep(100);
    map.setIsInteracting(false); // 没有进行交互操作了
}

let popup: vjmap.Popup | null;
const setPopupText = (text: string, map: Map) => {
    if (text) {
        if (!popup) {
            popup = new vjmap.Popup({
                className: "my-custom-popup",
                closeOnClick: false,
                closeButton: false
            })
                .setHTML(text)
                .setMaxWidth("500px")
                .trackPointer()
                .addTo(map)
        }
        else {
            popup.setHTML(text);
        }
    } else {
        // 如果为空时，则删除popup
        if (popup) {
            popup.setLngLat([0,0]); // 取消trackPointer
            popup.remove();
            popup = null;
        }
    }

}
// 测量距离循环，直至按ESC键取消，否则测量完一条后，继续测量下一条
const measureDistLoop = async (map: Map, snapObj: any)=> {
    while(true) {
        let res = await measureDist(map, snapObj);
        if (res.exit === true) break;
        if (curMeasureCmd != "measureDist") break;
    }
}

// 测量距离
const measureDist = async (map: Map, snapObj: any)=> {
    let isDrawing = false;
    let line = await vjmap.Draw.actionDrawLineSting(map, {
        api: {
            getSnapFeatures: snapObj //要捕捉的数据项在后面，通过属性features赋值
        },
        updatecoordinate: (e: any) => {
            if (!e.lnglat) return;
            isDrawing = true;
            const co = map.fromLngLat(e.feature.coordinates[e.feature.coordinates.length - 1]);
            let html = `<span style="color: #16417C">【测量距离】当前坐标:<span style="color: #ff0000"> ${co.x.toFixed(2)}, ${co.y.toFixed(2)}</span>`;
            if (e.feature.coordinates.length == 1) {
                html += "<br/>请指定要测量的第一点的坐标位置"
            } else {
                let len = e.feature.coordinates.length;
                html += `<br/>按Alt键取捕捉; Ctrl键启用正交; 退格键删除上一个点`
                html += `<br/>距上一点距离: <span style="color: #ff0000">${getDist(map, [e.feature.coordinates[len - 2], e.feature.coordinates[len -1]])}</span>`
                html += `;  当前总的距离: <span style="color: #ff0000">${getDist(map, e.feature.coordinates)}</span></span>`
            }
            setPopupText(html, map)
        },
        contextMenu: (e: any) => {
            new vjmap.ContextMenu({
                event: e.event.originalEvent,
                theme: "dark", //light
                width: "250px",
                items: [
                    {
                        label: '确认',
                        onClick: () => {
                            // 给地图发送Enter键消息即可取消，模拟按Enter键
                            map.fire("keyup", {keyCode:13})
                            setPopupText("", map);
                        }
                    },
                    {
                        label: '取消',
                        onClick: () => {
                            // 给地图发送ESC键消息即可取消，模拟按ESC键
                            map.fire("keyup", {keyCode:27})
                            setPopupText("", map);
                        }
                    },{
                        label: '删除上一个点',
                        onClick: () => {
                            // 给地图发送退格键Backspace消息即可删除上一个点，模拟按Backspace键
                            map.fire("keyup", {keyCode:8})
                        }
                    },{
                        label: '结束测距',
                        onClick: () => {
                            // 给地图发送ESC键消息即可取消，模拟按ESC键
                            map.fire("keyup", {keyCode:27})
                            isDrawing = false;
                            setPopupText("", map);
                        }
                    }
                ]
            });

        }
    });
    if (line.cancel) {
        setPopupText("", map);
        return {
            cancel: true,
            exit: isDrawing === false // 如果还没有绘制，就取消的话，就结束测距
        };// 取消操作
    }

    let color = vjmap.randomColor();
    let polyline = new vjmap.Polyline({
        data: line.features[0].geometry.coordinates,
        lineColor: color,
        lineWidth: 2
    });
    polyline.addTo(map);
    addMarkersToLine(map, line.features[0].geometry.coordinates, color, polyline.sourceId || "", snapObj);
    return {
        polyline
    };
}


// 给线的加个点加个测量的结果值
const addMarkersToLine = (map: Map, coordinates: Array<[number, number]>, color: string, sourceId: string, snapObj: any) => {
    let markerTexts: any = [];
    for(let i = 1; i < coordinates.length; i++) {
        let text = new vjmap.Text({
            text: getDist(map, coordinates.slice(0, i + 1)),
            anchor: "left",
            offset: [3, 0], // x,y 方向像素偏移量
            style:{     // 自定义样式
                'cursor': 'pointer',
                'opacity': 0.8,
                'padding': '6px',
                'border-radius': '12px',
                'background-color': color,
                'border-width': 0,
                'box-shadow': '0px 2px 6px 0px rgba(97,113,166,0.2)',
                'text-align': 'center',
                'font-size': '14px',
                'color': `#${color.substring(1).split("").map(c => (15 - parseInt(c,16)).toString(16)).join("")}`,
            }
        });
        text.setLngLat(coordinates[i]).addTo(map);
        markerTexts.push(text);
    }
    // 给第一个点加一个marker用来删除
    const deletePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAbNJREFUWEftlrFOAkEQhv9Z4XgJOCrlTgp5ABOhMBoTCws7EzUaeAx5A0sDiYmFxpLGaAkU2KqFArHi4CU4cMccAQN6HHcIwZi7cnd25tt/5maHsOCPFhwfPoAnBarhQFIIccjAkV3qCMhKKct6q1tym1pPAHVVOWMg6+ScgKuYYR7PBaCmKmw5XgLiy4b5NhzkXVVWP4BXa00zTNcXc21oOR4AjAswaX9M2n4u1yLBIoiSbmV0Zcdc0pqd1HdbWwUWDuDqRjMy8lQDM4o54sYRoJcKq6qHclePKnuScQ0pd/RWt2ztVyOhLUFckIwTvWneDiLYnXdVA18O+r/dcNXXIsozCGsMzuhGJ98DUINpAuUAqmhGe33k/JjiG9g4K2ADUFdDOQan7QAIlI8Z7YwP4CvgK/C/FahFlQcwtm0bEeNFa5qJuSpgdT2AzkFyU290H3udMBzYgBD3gnAQa5iFuQJ4eZB6A8ovW/ETgARLmfIyaPZVSZIQRTBdas326Thwx7fAzRA6SREB2l0x2ndTAfTnwH0CrGk4PinY6D5VQHyhNcwbp3N/eyDxduPprH0FPgHEyH4wGIHUYwAAAABJRU5ErkJggg==";
    let el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage =
        `url(${deletePng})`;
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundSize = '100%';
    el.style.cursor = "pointer";

    el.addEventListener('click', function (e) {
        map.removeSourceEx(sourceId); // 删除绘制的线
        markerTexts.forEach((m: any) => m.remove());
        markerTexts = [];

        // 多点了下，给地图发送退格键Backspace消息即可删除上一个点，模拟按Backspace键
        map.fire("keyup", {keyCode:8})
    });
    // Add markers to the map.
    let deleteMarker = new vjmap.Marker({
        element: el,
        anchor: 'right'
    });
    deleteMarker.setLngLat(coordinates[0])
        .setOffset([-5, 0])
        .addTo(map);
    markerTexts.push(deleteMarker)

    // 把坐标加进捕捉数组中。
    addSnapCoordinates(snapObj, coordinates);
}
// 得到距离值
const getDist = (map: Map, coordinates: Array<[number, number]>) => {
    let result = vjmap.Math2D.lineDist(map.fromLngLat(coordinates));
    let unit = "m";
    if (result >= 1000) {
        result /= 1000;
        unit = "km";
    } else if (result < 0.01) {
        result *= 100;
        unit = "cm";
    }
    return result.toFixed(2) + " " + unit;
}
// 增加捕捉点
const addSnapCoordinates = (snapObj: any, coordinates: Array<[number, number]>) => {
    snapObj.features.push({
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: [...coordinates]
        }
    })
}



// 测量面积
const measureArea = async (map: Map, snapObj: any)=> {
    let isDrawing = false;
    let poly = await vjmap.Draw.actionDrawPolygon(map, {
        api: {
            getSnapFeatures: snapObj //要捕捉的数据项在后面，通过属性features赋值
        },
        updatecoordinate: (e: any) => {
            if (!e.lnglat) return;
            isDrawing = true;
            const co = map.fromLngLat(e.feature.coordinates[0][e.feature.coordinates.length - 1]);
            let html = `<span style="color: #16417C">【测量面积】当前坐标:<span style="color: #ff0000"> ${co.x.toFixed(2)}, ${co.y.toFixed(2)}</span>`;
            if (e.feature.coordinates[0].length == 1) {
                html += "<br/>请指定要测量的第一点的坐标位置"
            } else {
                html += `<br/>按Alt键取捕捉; Ctrl键启用正交; 退格键删除上一个点`
                html += `<br/>当前面积: <span style="color: #ff0000">${getArea(map, e.feature.coordinates[0])}</span></span>`
            }
            setPopupText(html, map)
        },
        contextMenu: (e: any) => {
            new vjmap.ContextMenu({
                event: e.event.originalEvent,
                theme: "dark", //light
                width: "250px",
                items: [
                    {
                        label: '确认',
                        onClick: () => {
                            // 给地图发送Enter键消息即可取消，模拟按Enter键
                            map.fire("keyup", {keyCode:13})
                            setPopupText("", map);
                        }
                    },
                    {
                        label: '取消',
                        onClick: () => {
                            // 给地图发送ESC键消息即可取消，模拟按ESC键
                            map.fire("keyup", {keyCode:27})
                            setPopupText("", map);
                        }
                    },{
                        label: '删除上一个点',
                        onClick: () => {
                            // 给地图发送退格键Backspace消息即可删除上一个点，模拟按Backspace键
                            map.fire("keyup", {keyCode:8})
                        }
                    },{
                        label: '结束测面积',
                        onClick: () => {
                            // 给地图发送ESC键消息即可取消，模拟按ESC键
                            map.fire("keyup", {keyCode:27})
                            isDrawing = false;
                            setPopupText("", map);
                        }
                    }
                ]
            });

        }
    });
    if (poly.cancel) {
        setPopupText("", map);
        return {
            cancel: true,
            exit: isDrawing === false // 如果还没有绘制，就取消的话，就结束测距
        };// 取消操作
    }

    let color = vjmap.randomColor();
    let polygon = new vjmap.Polygon({
        data: poly.features[0].geometry.coordinates[0],
        fillColor: color,
        fillOpacity: 0.4,
        fillOutlineColor: color,
    });
    polygon.addTo(map);
    addMarkersToPolygon(map, poly.features[0].geometry.coordinates[0], color, polygon.sourceId || "", snapObj);
    return {
        polygon
    };
}

// 测量面积循环，直至按ESC键取消，否则测量完一条后，继续测量下一条
const measureAreaLoop = async (map: Map, snapObj: any)=> {
    while(true) {
        let res = await measureArea(map, snapObj);
        if (res.exit === true) break;
        if (curMeasureCmd != "measureArea") break;
    }
}

// 给加个测量的结果值
const addMarkersToPolygon = (map: Map, coordinates: Array<[number, number]>, color: string, sourceId: string, snapObj: any) => {
    let markerTexts: any = [];
    const center = vjmap.polygonCentroid(map.fromLngLat(coordinates));
    let text = new vjmap.Text({
        text: getArea(map, coordinates),
        anchor: "center",
        offset: [0, 0], // x,y 方向像素偏移量
        style:{     // 自定义样式
            'cursor': 'pointer',
            'opacity': 0.8,
            'padding': '6px',
            'border-radius': '12px',
            'background-color': `#${color.substring(1).split("").map(c => (15 - parseInt(c,16)).toString(16)).join("")}`,
            'border-width': 0,
            'box-shadow': '0px 2px 6px 0px rgba(97,113,166,0.2)',
            'text-align': 'center',
            'font-size': '14px',
            'color': color,
        }
    });
    text.setLngLat(map.toLngLat(center)).addTo(map);
    markerTexts.push(text);
    // 给第一个点加一个marker用来删除
    const deletePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAbNJREFUWEftlrFOAkEQhv9Z4XgJOCrlTgp5ABOhMBoTCws7EzUaeAx5A0sDiYmFxpLGaAkU2KqFArHi4CU4cMccAQN6HHcIwZi7cnd25tt/5maHsOCPFhwfPoAnBarhQFIIccjAkV3qCMhKKct6q1tym1pPAHVVOWMg6+ScgKuYYR7PBaCmKmw5XgLiy4b5NhzkXVVWP4BXa00zTNcXc21oOR4AjAswaX9M2n4u1yLBIoiSbmV0Zcdc0pqd1HdbWwUWDuDqRjMy8lQDM4o54sYRoJcKq6qHclePKnuScQ0pd/RWt2ztVyOhLUFckIwTvWneDiLYnXdVA18O+r/dcNXXIsozCGsMzuhGJ98DUINpAuUAqmhGe33k/JjiG9g4K2ADUFdDOQan7QAIlI8Z7YwP4CvgK/C/FahFlQcwtm0bEeNFa5qJuSpgdT2AzkFyU290H3udMBzYgBD3gnAQa5iFuQJ4eZB6A8ovW/ETgARLmfIyaPZVSZIQRTBdas326Thwx7fAzRA6SREB2l0x2ndTAfTnwH0CrGk4PinY6D5VQHyhNcwbp3N/eyDxduPprH0FPgHEyH4wGIHUYwAAAABJRU5ErkJggg==";
    let el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage =
        `url(${deletePng})`;
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundSize = '100%';
    el.style.cursor = "pointer";

    el.addEventListener('click', function (e) {
        map.removeSourceEx(sourceId); // 删除绘制的线
        markerTexts.forEach((m: any) => m.remove());
        markerTexts = [];
    });
    // Add markers to the map.
    let deleteMarker = new vjmap.Marker({
        element: el,
        anchor: 'right'
    });
    deleteMarker.setLngLat(coordinates[0])
        .setOffset([-5, 0])
        .addTo(map);
    markerTexts.push(deleteMarker)

    // 把坐标加进捕捉数组中。
    addSnapCoordinates(snapObj, coordinates);
}
// 得到面积值
const getArea = (map: Map, coordinates: Array<[number, number]>) => {
    let result = vjmap.calcPolygonArea(map.fromLngLat(coordinates));
    let unit = "m²";
    if (result >= 1e6) {
        result /= 1e6;
        unit = "km²";
    } else if (result < 1.0/1e4) {
        result *= 1e4;
        unit = "cm²";
    }
    return result.toFixed(2) + " " + unit;
}



// 测量角度
const measureAngle = async (map: Map, snapObj: any)=> {
    let isDrawing = false;
    let line = await vjmap.Draw.actionDrawLineSting(map, {
        pointCount: 3,// 只需三个点，绘制完三个点后，自动结束
        api: {
            getSnapFeatures: snapObj //要捕捉的数据项在后面，通过属性features赋值
        },
        updatecoordinate: (e: any) => {
            if (!e.lnglat) return;
            isDrawing = true;
            const co = map.fromLngLat(e.feature.coordinates[e.feature.coordinates.length - 1]);
            let html = `<span style="color: #16417C">【测量角度】当前坐标:<span style="color: #ff0000"> ${co.x.toFixed(2)}, ${co.y.toFixed(2)}</span>`;
            if (e.feature.coordinates.length == 1) {
                html += "<br/>请指定要测量的第一点的坐标位置"
            } else {
                let len = e.feature.coordinates.length;
                html += `<br/>按Alt键取捕捉; Ctrl键启用正交; 退格键删除上一个点`
                html += `<br/>当前角度: <span style="color: #ff0000">${getAngle(map, e.feature.coordinates).angle}</span></span>`
            }
            setPopupText(html, map)
        },
        contextMenu: (e: any) => {
            new vjmap.ContextMenu({
                event: e.event.originalEvent,
                theme: "dark", //light
                width: "250px",
                items: [
                    {
                        label: '确认',
                        onClick: () => {
                            // 给地图发送Enter键消息即可取消，模拟按Enter键
                            map.fire("keyup", {keyCode:13})
                            setPopupText("", map);
                        }
                    },
                    {
                        label: '取消',
                        onClick: () => {
                            // 给地图发送ESC键消息即可取消，模拟按ESC键
                            map.fire("keyup", {keyCode:27})
                            setPopupText("", map);
                        }
                    },{
                        label: '删除上一个点',
                        onClick: () => {
                            // 给地图发送退格键Backspace消息即可删除上一个点，模拟按Backspace键
                            map.fire("keyup", {keyCode:8})
                        }
                    },{
                        label: '结束测角度',
                        onClick: () => {
                            // 给地图发送ESC键消息即可取消，模拟按ESC键
                            map.fire("keyup", {keyCode:27})
                            isDrawing = false;
                            setPopupText("", map);
                        }
                    }
                ]
            });

        }
    });
    if (line.cancel) {
        setPopupText("", map);
        return {
            cancel: true,
            exit: isDrawing === false // 如果还没有绘制，就取消的话，就结束测距
        };// 取消操作
    }

    let color = vjmap.randomColor();
    let polyline = new vjmap.Polyline({
        data: line.features[0].geometry.coordinates,
        lineColor: color,
        lineWidth: 2
    });
    polyline.addTo(map);
    addMarkersToAngle(map, line.features[0].geometry.coordinates, color, polyline.sourceId || "", snapObj);
    return {
        polyline
    };
}

// 测量角度循环，直至按ESC键取消，否则测量完一条后，继续测量下一条
const measureAngleLoop = async (map: Map, snapObj: any)=> {
    while(true) {
        let res = await measureAngle(map, snapObj);
        if (res.exit === true) break;
        if (curMeasureCmd != "measureAngle") break;
    }
}



// 给加个测量的结果值
const addMarkersToAngle = (map: Map, coordinates: Array<[number, number]>, color: string, sourceId: string, snapObj: any) => {
    if (coordinates.length < 3) return;
    let markerTexts: any = [];
    let points = map.fromLngLat(coordinates);
    let textPoint = coordinates[1];
    let ang = getAngle(map, coordinates);
    // 绘制注记圆弧
    const cirleArcPath = vjmap.getCirclePolygonCoordinates(
        points[1],
        points[1].distanceTo(points[0]) / 4.0, 36,
        ang.startAngle,  ang.endAngle, false);
    let path = new vjmap.Polyline({
        data: map.toLngLat(cirleArcPath),
        lineColor: color,
        lineWidth: 2
    });
    path.addTo(map);
    markerTexts.push(path)

    // @ts-ignore
    let arcPoints = path.getData().features[0].geometry.coordinates;
    let arcMid = arcPoints[Math.ceil(arcPoints.length / 2)];// 取中点
    let textAngle = vjmap.radiansToDegrees(-map.fromLngLat(arcMid).angleTo(points[1])) + 90;
    if (textAngle > 90) textAngle += 180;
    else if (textAngle > 270) textAngle -= 180;
    let text = new vjmap.Text({
        text: ang.angle as string,
        anchor: "center",
        rotation: textAngle,
        offset: [0, 0], // x,y 方向像素偏移量
        style:{     // 自定义样式
            'cursor': 'pointer',
            'opacity': 0.8,
            'padding': '6px',
            'border-radius': '12px',
            'background-color': color,
            'border-width': 0,
            'box-shadow': '0px 2px 6px 0px rgba(97,113,166,0.2)',
            'text-align': 'center',
            'font-size': '14px',
            'color': `#${color.substring(1).split("").map(c => (15 - parseInt(c,16)).toString(16)).join("")}`,
        }
    });
    text.setLngLat(arcMid).addTo(map);
    markerTexts.push(text);
    // 给第一个点加一个marker用来删除
    const deletePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAbNJREFUWEftlrFOAkEQhv9Z4XgJOCrlTgp5ABOhMBoTCws7EzUaeAx5A0sDiYmFxpLGaAkU2KqFArHi4CU4cMccAQN6HHcIwZi7cnd25tt/5maHsOCPFhwfPoAnBarhQFIIccjAkV3qCMhKKct6q1tym1pPAHVVOWMg6+ScgKuYYR7PBaCmKmw5XgLiy4b5NhzkXVVWP4BXa00zTNcXc21oOR4AjAswaX9M2n4u1yLBIoiSbmV0Zcdc0pqd1HdbWwUWDuDqRjMy8lQDM4o54sYRoJcKq6qHclePKnuScQ0pd/RWt2ztVyOhLUFckIwTvWneDiLYnXdVA18O+r/dcNXXIsozCGsMzuhGJ98DUINpAuUAqmhGe33k/JjiG9g4K2ADUFdDOQan7QAIlI8Z7YwP4CvgK/C/FahFlQcwtm0bEeNFa5qJuSpgdT2AzkFyU290H3udMBzYgBD3gnAQa5iFuQJ4eZB6A8ovW/ETgARLmfIyaPZVSZIQRTBdas326Thwx7fAzRA6SREB2l0x2ndTAfTnwH0CrGk4PinY6D5VQHyhNcwbp3N/eyDxduPprH0FPgHEyH4wGIHUYwAAAABJRU5ErkJggg==";
    let el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage =
        `url(${deletePng})`;
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundSize = '100%';
    el.style.cursor = "pointer";

    el.addEventListener('click', function (e) {
        map.removeSourceEx(sourceId); // 删除绘制的线
        markerTexts.forEach((m: any) => m.remove());
        markerTexts = [];
    });
    // Add markers to the map.
    let deleteMarker = new vjmap.Marker({
        element: el,
        anchor: 'right'
    });
    deleteMarker.setLngLat(coordinates[1])
        .setOffset([-5, 0])
        .addTo(map);
    markerTexts.push(deleteMarker)

    // 把坐标加进捕捉数组中。
    addSnapCoordinates(snapObj, coordinates);
}
// 得到角度值
const getAngle = (map: Map, coordinates: Array<[number, number]>) => {
    let points = map.fromLngLat(coordinates);
    if (points.length < 3) return {  angle: 0.0 }
    let angle1 = points[0].angleTo(points[1]);
    let angle2 = points[2].angleTo(points[1]);
    let angle = angle1 - angle2;
    let deg = vjmap.radiansToDegrees(angle);//弧度转角度
    let dir = true;
    if (deg < 0) {
        deg = -deg;
        dir = !dir;
    }
    if (deg > 180) {
        deg = 360 - deg;
        dir = !dir;
    }
    let startAngle = !dir ? vjmap.radiansToDegrees(angle1) : vjmap.radiansToDegrees(angle2);
    let endAngle = dir ? vjmap.radiansToDegrees(angle1) : vjmap.radiansToDegrees(angle2);
    startAngle = startAngle < 0 ? 360 + startAngle : startAngle;
    endAngle = endAngle < 0 ? 360 + endAngle : endAngle;
    if (endAngle < startAngle) {
        endAngle += 360;
    }
    return {
        angle: deg.toFixed(2) + "°",
        dir,
        startAngle,
        endAngle
    }
}


// 测量坐标
const measureCoordinate = async (map: Map, snapObj: any)=> {
    let isDrawing = false;
    let point = await vjmap.Draw.actionDrawPoint(map, {
        api: {
            getSnapFeatures: snapObj //要捕捉的数据项在后面，通过属性features赋值
        },
        updatecoordinate: (e: any) => {
            if (!e.lnglat) return;
            isDrawing = true;
            const co = map.fromLngLat(e.lnglat);
            let html = `<span style="color: #16417C">【测量坐标】当前坐标:<span style="color: #ff0000"> ${co.x.toFixed(2)}, ${co.y.toFixed(2)}</span></span>`;
            setPopupText(html, map)
        },
        contextMenu: (e: any) => {
            new vjmap.ContextMenu({
                event: e.event.originalEvent,
                theme: "dark", //light
                width: "250px",
                items: [
                    {
                        label: '确认',
                        onClick: () => {
                            // 给地图发送Enter键消息即可取消，模拟按Enter键
                            map.fire("keyup", {keyCode:13})
                            setPopupText("", map);
                        }
                    },
                    {
                        label: '取消',
                        onClick: () => {
                            // 给地图发送ESC键消息即可取消，模拟按ESC键
                            map.fire("keyup", {keyCode:27})
                            setPopupText("", map);
                        }
                    },
                    {
                        label: '结束测坐标',
                        onClick: () => {
                            // 给地图发送ESC键消息即可取消，模拟按ESC键
                            map.fire("keyup", {keyCode:27})
                            isDrawing = false;
                            setPopupText("", map);
                        }
                    }
                ]
            });

        }
    });
    if (point.cancel) {
        setPopupText("", map);
        return {
            cancel: true,
            exit: isDrawing === false
        };// 取消操作
    }

    addMarkersToCoord(map, point.features[0].geometry.coordinates);
    return {
        point
    };
}

// 测量坐标循环，直至按ESC键取消
const measureCoordinateLoop = async (map: Map, snapObj: any)=> {
    while(true) {
        let res = await measureCoordinate(map, snapObj);
        if (res.exit === true) break;
        if (curMeasureCmd != "measureCoordinate") break;
    }
}



// 给加个点加个测量的结果值
const addMarkersToCoord = (map: Map, coordinates: [number, number]) => {
    let markerTexts: any = [];
    let co = map.fromLngLat(coordinates);
    let content = `X: ${co.x.toFixed(2)}, Y: ${co.y.toFixed(2)}`
    let marker = createLeaderMarker(map, coordinates, content);
    markerTexts.push(marker);

    // 给第一个点加一个marker用来删除
    const deletePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAbNJREFUWEftlrFOAkEQhv9Z4XgJOCrlTgp5ABOhMBoTCws7EzUaeAx5A0sDiYmFxpLGaAkU2KqFArHi4CU4cMccAQN6HHcIwZi7cnd25tt/5maHsOCPFhwfPoAnBarhQFIIccjAkV3qCMhKKct6q1tym1pPAHVVOWMg6+ScgKuYYR7PBaCmKmw5XgLiy4b5NhzkXVVWP4BXa00zTNcXc21oOR4AjAswaX9M2n4u1yLBIoiSbmV0Zcdc0pqd1HdbWwUWDuDqRjMy8lQDM4o54sYRoJcKq6qHclePKnuScQ0pd/RWt2ztVyOhLUFckIwTvWneDiLYnXdVA18O+r/dcNXXIsozCGsMzuhGJ98DUINpAuUAqmhGe33k/JjiG9g4K2ADUFdDOQan7QAIlI8Z7YwP4CvgK/C/FahFlQcwtm0bEeNFa5qJuSpgdT2AzkFyU290H3udMBzYgBD3gnAQa5iFuQJ4eZB6A8ovW/ETgARLmfIyaPZVSZIQRTBdas326Thwx7fAzRA6SREB2l0x2ndTAfTnwH0CrGk4PinY6D5VQHyhNcwbp3N/eyDxduPprH0FPgHEyH4wGIHUYwAAAABJRU5ErkJggg==";
    let el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage =
        `url(${deletePng})`;
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundSize = '100%';
    el.style.cursor = "pointer";

    el.addEventListener('click', function (e) {
        markerTexts.forEach((m: any) => m.remove());
        markerTexts = [];

    });
    // Add markers to the map.
    let deleteMarker = new vjmap.Marker({
        element: el,
        anchor: 'right'
    });
    deleteMarker.setLngLat(coordinates)
        .setOffset([-5, 0])
        .addTo(map);
    markerTexts.push(deleteMarker)

}

// 引线标记
const createLeaderMarker = (map: Map, lnglat: [number, number], content: string) => {
    let el = document.createElement('div');
    el.className = 'marker';
    el.style.position = 'absolute'

    let img = document.createElement("div");
    img.style.backgroundImage =
        'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAB4AAAAAlCAYAAACj1PQVAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQ1IDc5LjE2MzQ5OSwgMjAxOC8wOC8xMy0xNjo0MDoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MTJFMTU1RjExN0UzMTFFOTg3RTBFODdGNTY0NThGQkUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MTJFMTU1RjIxN0UzMTFFOTg3RTBFODdGNTY0NThGQkUiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoxMkUxNTVFRjE3RTMxMUU5ODdFMEU4N0Y1NjQ1OEZCRSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDoxMkUxNTVGMDE3RTMxMUU5ODdFMEU4N0Y1NjQ1OEZCRSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pj97JFoAAAV9SURBVHja7N1faJ1nHQfw33nzpuekaZfWNFmbLHXWdf7DWgvebF4M0SEZhTG8mKvFyzG9UJFKh9peVGnd0DkE/10Ic6s6BBEGbshggho3BVGnRnC2s1n/ras2J2uzc05PXp+3yZzSm7XJkvfi84HveZ9z3ve8F7/bL8/71oqiiMs8NhCLsCllfcpfAwAAAAAAAIDlsXM68jfgtl9K2Z3Sa8IAAAAAAAAAb7hjKW8uF9kS3/jdKR9PaZkxAAAAAAAAwPJa6h3A96X0pBxK+bLxAgAAAAAAACyfpSyAP5jy4ZQXUh747687p00ZAAAAAAAAYBlkS3if+xfW+1MuGC0AAAAAAADA8lqqAnh3yvaUZ1MeMlYAAAAAAACA5bcUBXBfyoGF9edSusYKAAAAAAAAsPyWogD+VMpYypMpTxgpAAAAAAAAwMpYbAG8IWVvylzKHuMEAAAAAAAAWDmLLYC/mDKQ8nDKH4wTAAAAAAAAYOUspgC+IeWelNmYL4IBAAAAAAAAWEGLKYAPpfSmfD1lyigBAAAAAAAAVtbVFsA3pdyR8lLMF8EAAAAAAAAArLCrKYBrKfcvHA+kNI0RAAAAAAAAYOVdTQFc7vwtdwA/l/ItIwQAAAAAAACohistgMt3/h5cWO9N6RghAAAAAAAAQDVcaQF8d8rWlImUnxgfAAAAAAAAQHVcSQF8Tcq+lCJlz8IRAAAAAAAAgIq4kgK4fOTzUMzv/J0wOgAAAAAAAIBqeb0F8FjKp2P+nb97jQ0AAAAAAACgel5vAXwgpS/l2ynPGRsAAAAAAABA9eSjd370sh+P7/q/r9tTdqc0Y74IBgAAAAAAAKCC8v9Zl7uB6yn9o4fHG+lYS2n/867Hv5bXivLcoZQzRgYAAAAAAABQTfnw5nvjxWMHe9N6cP+OyVtv2nj2ruFG6209WbGqM5c181rx9m5RO/ngn2/4zlf/tLV2fNfPCmMDAAAAAAAAqJ68LH+HGq2xRz7wu2+8a31zvCgiLs5FlC3vqp4YKS8638mzqZf7tqXlb1MuGBsAAAAAAABA9ZSPdh58tfyd7UScOh9xYjqLszNZlGVwN6U/71z7hR1/e/g9g9NbRg+P9xobAAAAAAAAQPVk+3ZMfujV8vf0TC3WXWzE9ZveHyNjt0UxOxCnp7NotiPWr2pfl67dk/6zxtgAAAAAAAAAqie7eePZXeVO33OtiOGsHqtvfjDi1scibnkkesafipHVI3HuQi3a3Yh3rpsZT/+5ZvTweM3oAAAAAAAAAKolH2q0byzf+dtuZ9G/8b0RW+587ezat0a84xPR+8z+aHU7MVDvbLhl05lrf3FyaGr08Hj5muA4/qMfmiIAAAAAAABABWS1KPJLTW75UR+8/Ir6uksvCi6K+a/Dfa26sQEAAAAAAABUT/ZyJz+Z19IiL6J7eiLi/NRrZ4tuxNEfRzvmorcnoj2XvfL41MZTMV8XAwAAAAAAAFAh2eS5tU9kWcRAo4ipC9MRP98ZMfnNiH/8IOLJO+LMC7+ORl83Gj0RR5r9z8x08nOhAAYAAAAAAAConPyzT2976H1D//7YYL21ZW5NN442n4/ep/ddeuxzK+air68bb2pEdCN75dEj192Xfp4xNgAAAAAAAIDqyWY6+akHnt16d7Oz6uRAPWJkoIi1azuxek0nhge6MdQXUatlrZ8+P/L5706+ZSLKXhgAAAAAAACAyik3+s5+/++bJ+751fbbfv/S+kc7c/l0WQSva0TUe2rtIzNrJr7yxxs/8pnfbPteurY5vPlej38GAAAAAAAAqKC8LHRfPHZw9penNvwl5ZP1nrmB268/MdafX+x96sTQ8aMz/f9K102ntJS/AAAAAAAAANX1HwEGAM75MhcANnAkAAAAAElFTkSuQmCC")';
    img.style.backgroundRepeat = "no-repeat"
    img.style.height = '37px';
    img.style.width = '100px';
    img.style.position = 'absolute';
    img.style.left = '-3px';
    img.style.bottom = '-3px';
    img.style.right = "0px"
    el.appendChild(img);

    let panel = document.createElement("div");
    panel.style.height = '50px';
    panel.style.width = '350px';
    panel.style.position = 'absolute';
    panel.style.left = '97px';
    panel.style.top = '-60px';
    panel.style.border = "solid 1px #8E0EFF";
    panel.style.background = 'linear-gradient(#00ffff, #00ffff) left top,  linear-gradient(#00ffff, #00ffff) left top,     linear-gradient(#00ffff, #00ffff) right bottom,    linear-gradient(#00ffff, #00ffff) right bottom';
    panel.style.backgroundRepeat = 'no-repeat';
    panel.style.backgroundColor ='rgba(87,255,255, 0.3)'
    panel.style.backgroundSize = '1px 6px, 6px 1px';
    panel.style.fontSize = '18px';
    panel.style.color = '#ffffff';
    panel.innerHTML =  `<div style='margin: 15px 5px 15px 5px'>${content}</div>`;
    el.appendChild(panel);

    // Add markers to the map.
    let marker = new vjmap.Marker({
        element: el,
        anchor: "bottom-left"
    })
    marker.setLngLat(lnglat)
        .addTo(map);
    return marker
}


const clearAll  = (map: Map)=> {
    // 清空绘制的图层，如果怕误删除，每次绘制完成，把相关的 sourceId和marker记录下来。然后依次删除
    // @ts-ignore
    Object.keys(map.getStyle().sources).filter(e=>e.indexOf("custom_") == 0).forEach(e=> map.removeSourceEx(e));
    // 清除marker
    map.removeMarkers();
}

