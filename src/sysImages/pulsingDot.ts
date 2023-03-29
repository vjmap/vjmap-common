import { Map } from 'vjmap';
export default (map: Map, options: {
    size?: number
    duration?: number
    outFillRgb?: [number, number, number],
    innerFillRgb?: [number, number, number],
    innerStrokeStyle?: string,
    innerRadiusRatio?: number
    outerRadiusRatio?: number
    innerLineWidth?: number
} = {}) => {
    const size = options.size ?? 100;
    const pulsingDot = {
        width: size,
        height: size,
        data: new Uint8Array(size * size * 4),
    
        // 将图层添加到地图时获取地图画布的渲染上下文
        onAdd: function() {
            const canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.height;
            // @ts-ignore
            this.context = canvas.getContext('2d');
        },
    
        // 在将使用图标的每一帧之前调用一次
        render: function() {
            const duration = options.duration ?? 1000;
            const t = (performance.now() % duration) / duration;
            const outFillRgb = options.outFillRgb ?? [255, 200, 200];
            const innerFillRgb = options.innerFillRgb ?? [255, 100, 100];
            const radius = (size / 2) * (options.innerRadiusRatio ?? 0.3);
            const outerRadius = (size / 2) * (options.outerRadiusRatio ?? 0.7) * t + radius;
            // @ts-ignore
            const context = this.context;
    
            // draw outer circle
            context.clearRect(0, 0, this.width, this.height);
            context.beginPath();
            context.arc(
                this.width / 2,
                this.height / 2,
                outerRadius,
                0,
                Math.PI * 2
            );
            context.fillStyle = 'rgba(' + outFillRgb[0] + ',' + outFillRgb[1] + ',' + outFillRgb[2] + ',' + (1 - t) + ' )';
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
            context.fillStyle = 'rgba(' + innerFillRgb[0] + ',' + innerFillRgb[1] + ',' + innerFillRgb[2] + ',1)';
            context.strokeStyle = options.innerStrokeStyle ?? 'white';
            context.lineWidth = 2 + (options.innerLineWidth ?? 4) * (1 - t);
            context.fill();
            context.stroke();
    
            // 使用画布中的数据更新此图像的数据
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
    return pulsingDot;
}

