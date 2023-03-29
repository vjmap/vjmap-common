import { Map } from 'vjmap';
declare const _default: (map: Map, options?: {
    size?: number;
    duration?: number;
    outFillRgb?: [number, number, number];
    innerFillRgb?: [number, number, number];
    innerStrokeStyle?: string;
    innerRadiusRatio?: number;
    outerRadiusRatio?: number;
    innerLineWidth?: number;
}) => {
    width: number;
    height: number;
    data: Uint8Array;
    onAdd: () => void;
    render: () => boolean;
};
export default _default;
