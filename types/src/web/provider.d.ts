import { MapAppConfig } from '../types';
import { Map } from 'vjmap';
export declare const osmProviderTiles: () => string[];
export declare const tiandituProviderTiles: (isImageUrl?: boolean) => string[];
export declare const gaodeProviderTiles: (isImageUrl?: boolean) => string[];
export declare const loadWebMap: (map: Map, config: MapAppConfig) => void;
