import LayerBase from './base';
import { LineLayer } from './line';
import { FillLayer } from './fill';
import { SymbolLayer } from './symbol';
import { CircleLayer } from './circle';
import { FillExtrusionLayer } from './fillExtrusion';
import { HeatmapLayer } from './heatmap';
import { MarkerLayer } from './marker';
import { PopupLayer } from './popup';
import { AnimateLineLayer } from './animateLine';
import { AnimateSymbolLayer } from './animateSymbol';
import { AnimateFillLayer } from './animateFill';
import { SymbolClusterLayer } from './symbolCluster';
import { MarkerClusterLayer } from './markerCluster';
import { TextLayer } from './text';
import { BreathingMarkerLayer } from './breathingMarker';
import { RotatingMarkerLayer } from './rotatingMarker';
import { HaloRingMarkerLayer } from './haloRingMarker';
import { DiffusedMarkerLayer } from './diffusedMarker';
import { TextBorderMarkerLayer } from './textBorderMarker';
import { FluorescenceMarkerLayer } from './fluorescenceMarker';
import { CurveLayer } from './curve';
import { LineExtrusionsLayer } from './lineExtrusions';
import { ArrowLineLayer } from './arrowLine';
import { PathAnimateLayer } from './pathAnimate'
import { SymbolPathAnimateLayer} from './symbolPathAnimate'
import { FillExtrusionsAnimateLayer } from './fillExtrusionsAnimate'
import { GeojsonLayer } from './geojson'
import { DrawLayer } from './draw';
import { RasterLayer } from './raster'
import { VectorLayer } from './vector'
import { DivOverlayLayer } from './divOverlay'
import { SvgOverlayLayer } from './svgOverlay'
import { BackgroundLayer } from './background'
import { SkyLayer } from './sky'

const providerLayers = {
    "line": LineLayer,
    "fill": FillLayer,
    "symbol": SymbolLayer,
    "marker": MarkerLayer,
    "popup": PopupLayer,
    "circle": CircleLayer,
    "fillExtrusion": FillExtrusionLayer,
    "heatmap": HeatmapLayer,
    "animateLine": AnimateLineLayer,
    "animateSymbol": AnimateSymbolLayer,
    "animateFill": AnimateFillLayer,
    "symbolCluster": SymbolClusterLayer,
    "markerCluster": MarkerClusterLayer,
    "text": TextLayer,
    "breathingMarker": BreathingMarkerLayer,
    "rotatingMarker": RotatingMarkerLayer,
    "haloRingMarker": HaloRingMarkerLayer,
    "diffusedMarker": DiffusedMarkerLayer,
    "textBorderMarker": TextBorderMarkerLayer,
    "fluorescenceMarker": FluorescenceMarkerLayer,
    "curve": CurveLayer,
    "lineExtrusions": LineExtrusionsLayer,
    "arrowLine": ArrowLineLayer,
    "pathAnimate": PathAnimateLayer,
    "symbolPathAnimate": SymbolPathAnimateLayer,
    "fillExtrusionsAnimate": FillExtrusionsAnimateLayer,
    "geojson": GeojsonLayer,
    "draw": DrawLayer,
    'raster': RasterLayer,
    'vector': VectorLayer,
    'divOverlay': DivOverlayLayer,
    'svgOverlay': SvgOverlayLayer,
    "background": BackgroundLayer,
    "sky": SkyLayer,
} as Record<string, typeof LayerBase>

export type providerLayerTypes = keyof typeof providerLayers
export {
    providerLayers,
    LayerBase
}