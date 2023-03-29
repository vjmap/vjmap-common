import { Map } from 'vjmap';
export default (map: Map, options: {
    size?: number
    duration?: number
    rgb?: [number, number, number]
} = {}) => {
    const size = options.size ?? 100;
    const scatterDot = {
        width: size,
        height: size,
        data: new Uint8Array(size * size * 4),
        //将图层添加到地图时获取地图画布的渲染上下文
        onAdd: function () {
            let canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.height;
            // @ts-ignore
            this.context = canvas.getContext('2d');
        },
    
        // 在将使用图标的每一帧之前调用一次
        render: function () {
            const duration = options.duration ?? 1500;
            const colorList = options.rgb ?? [0,150,0];
            let t = (performance.now() % duration) / duration;
    
            let radius = (size / 2) * 0.3;
            let outerRadius = (size / 2) * 0.7 * t + radius;
            // @ts-ignore
            let context = this.context;
            context.clearRect(0, 0, this.width, this.height);
            context.beginPath();
            context.arc(
                this.width / 2,
                this.height / 2,
                outerRadius,
                0,
                Math.PI * 2
            );
            context.fillStyle = 'rgba(' + colorList[0] + ',' + colorList[1] + ',' + colorList[2] + ',' + (1 - t) + ' )';
            context.fill();
    
            // draw inner circle
            context.beginPath();
            context.arc(
                this.width / 2,
                this.height / 2,
                radius,
                0,
                Math.PI * 2
            );
            this.data = context.getImageData(
                0,
                0,
                this.width,
                this.height
            ).data;
    
            // 不断地重绘地图，导致圆点的平滑动画
            map.triggerRepaint();
    
            // 返回 `true` 让地图知道图像已更新
            return true;
    
        }
    };
    return scatterDot;
}

