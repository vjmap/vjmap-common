import { Map } from 'vjmap';
declare const _default: (map: Map, options?: {
    size?: number;
    duration?: number;
    rgb?: [number, number, number];
}) => {
    width: number;
    height: number;
    data: Uint8Array;
    onAdd: () => void;
    render: () => boolean;
};
export default _default;
