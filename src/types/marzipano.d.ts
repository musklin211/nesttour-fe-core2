/**
 * Marzipano TypeScript 类型定义
 * 基于 Marzipano 0.10.2 API
 */

declare module 'marzipano' {
  export interface ViewerOptions {
    controls?: {
      mouseViewMode?: string;
    };
    stage?: {
      preserveDrawingBuffer?: boolean;
    };
  }

  export interface ViewLimiter {
    yaw?: { min: number; max: number };
    pitch?: { min: number; max: number };
    fov?: { min: number; max: number };
  }

  export interface ViewParameters {
    yaw?: number;
    pitch?: number;
    fov?: number;
  }

  export interface SourceOptions {
    cubeMapPreviewUrl?: string;
  }

  export interface GeometryOptions {
    tileSize?: number;
    size?: number;
  }

  export interface LayerOptions {
    effects?: {
      opacity?: number;
    };
  }

  export class Viewer {
    constructor(element: HTMLElement, options?: ViewerOptions);
    createScene(options?: any): Scene;
    destroyScene(scene: Scene): void;
    dispose(): void;
    stage(): Stage;
  }

  export class Scene {
    createLayer(source: Source, geometry: Geometry, view: View, options?: LayerOptions): Layer;
    destroyLayer(layer: Layer): void;
    listLayers(): Layer[];
    switchTo(options?: { transitionDuration?: number }): Promise<void>;
    hotspotContainer(): HotspotContainer;
  }

  export class Stage {
    width(): number;
    height(): number;
    setSize(size: { width: number; height: number }): void;
  }

  export class Layer {
    source(): Source;
    geometry(): Geometry;
    view(): View;
    effects(): Effects;
    mergeEffects(effects: any): void;
    pinFirstLevel(): void;
    unpinFirstLevel(): void;
  }

  export class Effects {
    opacity(): number;
    opacity(value: number): void;
  }

  export class Source {
    static fromString(url: string, options?: SourceOptions): Source;
  }

  export class ImageUrlSource extends Source {
    static fromString(url: string, options?: SourceOptions): ImageUrlSource;
  }

  export class Geometry {
    // Base geometry class
  }

  export class EquirectGeometry extends Geometry {
    constructor(levelList: Array<{ width: number; height?: number }>, options?: GeometryOptions);
  }

  export class CubeGeometry extends Geometry {
    constructor(levelList: Array<{ tileSize: number; size: number }>, options?: GeometryOptions);
  }

  export class View {
    yaw(): number;
    yaw(value: number): void;
    pitch(): number;
    pitch(value: number): void;
    fov(): number;
    fov(value: number): void;
    setParameters(params: ViewParameters): void;
    addEventListener(event: string, handler: Function): void;
    removeEventListener(event: string, handler: Function): void;
  }

  export class RectilinearView extends View {
    constructor(params?: ViewParameters, limiter?: ViewLimiter);
    static limit: {
      traditional(maxResolution: number, maxVfov: number): ViewLimiter;
      vfov(min: number, max: number): ViewLimiter;
      hfov(min: number, max: number): ViewLimiter;
      pitch(min: number, max: number): ViewLimiter;
      yaw(min: number, max: number): ViewLimiter;
    };
  }

  export class FlatView extends View {
    constructor(params?: ViewParameters, limiter?: ViewLimiter);
  }

  export class HotspotContainer {
    createHotspot(element: HTMLElement, coords?: { yaw: number; pitch: number }): Hotspot;
    destroyHotspot(hotspot: Hotspot): void;
    listHotspots(): Hotspot[];
    hide(): void;
    show(): void;
  }

  export class Hotspot {
    setPosition(coords: { yaw: number; pitch: number }): void;
    domElement(): HTMLElement;
    destroy(): void;
  }

  export interface Controls {
    enabled(): boolean;
    enabled(value: boolean): void;
  }

  // 工具函数
  export const util: {
    async: {
      series(tasks: Function[], callback: Function): void;
      parallel(tasks: Function[], callback: Function): void;
    };
    dom: {
      element(tag: string, className?: string, parent?: HTMLElement): HTMLElement;
    };
  };

  // 常量
  export const dependencies: string[];
}
