import LayerBase from './base';
declare const providerLayers: Record<string, typeof LayerBase>;
export type providerLayerTypes = keyof typeof providerLayers;
export { providerLayers, LayerBase };
