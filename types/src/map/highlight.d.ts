import { Map } from "vjmap";
import type { IConditionQueryFeatures } from "vjmap";
export declare const addHighLightSourceLayer: (map: Map, layerId?: string, highlightColor?: string) => void;
export declare const clearHighLightSourceLayer: (map: Map, layerId?: string) => void;
export declare const getHighlightEntities: (map: Map, bounds: [number, number, number, number] | undefined, useGeomCoord?: boolean, queryParam?: IConditionQueryFeatures, includeWholeEntity?: boolean, disableSelectEntities?: Set<String>, isClearOld?: boolean, layerId?: string, highlightColor?: string) => Promise<{
    features: never[];
    type: string;
}>;
export declare const clearHighlight: (map: Map, layerId?: string) => void;
