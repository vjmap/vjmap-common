import type { Map } from "vjmap";
export declare const createUpdateMapStyleObj: (map: Map, option?: Record<string, any>) => {
    addHideObjectIds: (objectIds: string[], noUpdate?: boolean, isClear?: boolean) => Promise<void>;
    refresh: () => Promise<void>;
    hideObjectIds: Set<string>;
    getClipBounds: () => any;
};
export declare const createUpdateMapStyleRasterObj: (map: Map, option?: Record<string, any>) => {
    addHideObjectIds: (objectIds: string[], noUpdate?: boolean, isClear?: boolean) => Promise<void>;
    refresh: () => Promise<void>;
    hideObjectIds: Set<string>;
    getClipBounds: () => any;
};
export declare const createUpdateMapStyleVectorObj: (map: Map, option?: Record<string, any>) => {
    addHideObjectIds: (objectIds: string[], noUpdate?: boolean, isClear?: boolean) => Promise<void>;
    refresh: () => Promise<void>;
    hideObjectIds: Set<string>;
    getClipBounds: () => any;
};
