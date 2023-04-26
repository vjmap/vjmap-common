import vjmap, { IDrawTool } from "vjmap";
import type { Map } from "vjmap";
import { exportDwg } from "./export";
export { exportDwg };
export declare const setFeatureProperty: (feature: any, drawProperty?: Record<string, any>) => void;
export declare const cancelDraw: (map: Map) => void;
export declare const drawPoint: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>) => Promise<void>;
export declare const drawLineSting: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>) => Promise<void>;
export declare const drawPolygon: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>) => Promise<void>;
export declare const drawFillExrusion: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>) => Promise<void>;
export declare const polygonToPolyline: (feature: any) => any;
export declare const drawCircle: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, isFill?: boolean) => Promise<void>;
export declare const drawRectangle: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, isFill?: boolean) => Promise<void>;
export declare const drawSlantRectangle: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, isFill?: boolean) => Promise<void>;
export declare const selectRotate: (map: Map, draw: IDrawTool, options?: Record<string, any>, showInfoFunc?: Function) => Promise<void>;
export declare const toBezierCurve: (map: Map, draw: IDrawTool) => void;
export declare const drawEllipseFill: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function) => void;
export declare const drawEllipseEdge: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function) => void;
export declare const drawEllipseFillArc: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function) => void;
export declare const drawEllipseArc: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function) => void;
export declare const getGeoJsonBounds: (data: any) => vjmap.GeoBounds;
export declare const interactiveCreateGeom: (data: any, map: Map, options?: Record<string, any>, showInfoFunc?: Function, param?: {
    disableScale?: boolean;
    disableRotate?: boolean;
    drawInitPixelLength?: number;
    tempLineColor?: string;
    baseAlign?: "leftBottom" | "center" | "leftTop";
    keepGeoSize?: boolean;
}) => Promise<{
    feature: any;
    rotation: number;
} | undefined>;
export declare const drawArrow: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function, param?: Record<string, any>) => Promise<void>;
export declare const createLineTypePolyline: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function, param?: Record<string, any>) => Promise<void>;
export declare const createLineTypeCurve: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function, param?: Record<string, any>) => Promise<void>;
export declare const createHatch: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function, param?: Record<string, any>) => Promise<void>;
export declare const getQueryGeomData: (map: Map, queryParam: any, propData?: Record<string, any>) => Promise<{
    type: string;
    features: {
        id: string;
        type: string;
        properties: {
            objectid: string;
            color: string;
            alpha: number;
            lineWidth: number;
            name: any;
            isline: any;
            layerindex: any;
        };
        geometry: any;
    }[];
}>;
export declare const createOutSymbol: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function, param?: Record<string, any>) => Promise<void>;
export declare const drawText: (map: Map, draw: IDrawTool, options?: Record<string, any>, drawProperty?: Record<string, any>, showInfoFunc?: Function) => Promise<void>;
export declare const addFeaturesToDraw: (data: any, drawLayer: any, combineInObject?: boolean) => any;
export declare const getPointOnePixelDrawStyleOption: () => any;
