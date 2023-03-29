# vjcommon

主要是对唯杰地图常用的功能做了一定程度的封装，方便其他工程共用

如果此工程需要在其他项目中引用，可进入`packages/common`运行 `npm run build`在 html 中引入`vjcommon.min.js`即可，或`npm install vjcommon`通过`import vjcommon from 'vjcommon'`引入

如果是`monorepo`项目，可直接通过引用项目源码目录的方式进行引入

此项目源码地址: 

[https://github.com/vjmap/vjmap-common](https://github.com/vjmap/vjmap-common)

# 唯杰地图介绍

`唯杰地图VJMAP`为用户`自定义地图格式`WebGIS`可视化`显示开发提供的一站式解决方案，支持的格式如常用的`AutoCAD`的`DWG`格式文件、`GeoJSON`等常用`GIS`文件格式，它使用WebGL`矢量图块`和`自定义样式`呈现交互式地图, 提供了全新的`大数据可视化`、`实时流数据`可视化功能，通过本产品可快速实现浏览器和移动端上美观、流畅的地图呈现与空间分析，可帮助您在网站中构建功能丰富、交互性强、可定制的地图应用。

# 唯杰地图特点

- 完全兼容`AutoCAD`格式的`DWG`文件，无需转换
- 绘图技术先进：采用WebGL技术，支持`矢量地图`渲染，支持栅格、图片、视频等图形渲染，支持3D模型渲染；
- 个性化地图：服务端渲染和前端渲染都支持自定义样式表达式，灵活强大；
- 多视角模式：支持2D、3D视角，支持垂直视角、360度旋转视角；
- 视觉特性：支持无极缩放、支持粒子、航线等动画效果、支持飞行、平移等运动特效；
- 功能完善：支持所有常见的地图功能，提供丰富的js接口；
- 交互控制：支持鼠标/单指拖拽、上下左右按键进行地图平移，支持鼠标滚轮、双击、双指进行地图缩放，支持Shift+拉框放大；
- 大数据可视化：性能卓越，支持大数据可视化展示
- 跨平台支持(支持`windows`,`linux`); 支持`docker`部署;支持`私有化`部署;支持桌面端语言开发(如`C#`、`Java`、`C++`语言)
- 全面支持用第三方开源的[openlayers](https://vjmap.com/demo/#/demo/map/openlayers/01olraster) 、[leaflet](https://vjmap.com/demo/#/demo/map/leaflet/01leafletraster) 、[maptalks](https://vjmap.com/demo/#/demo/map/maptalks/01maptalksraster) 来加载CAD地图进行开发
- 支持对图像格式如tiff,jpg,png等常用图像格式进行切片处理,实现几百M以上的图片前端秒开

