import * as THREE from 'three';

// 相机数据类型
export interface CameraData {
  id: number;
  label: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  transform: THREE.Matrix4;
  imageUrl: string;
}

// 3D模型数据类型
export interface ModelData {
  url: string;
  texture: string;
}

// 虚拟漫游数据类型
export interface VirtualTourData {
  cameras: CameraData[];
  model: ModelData;
}

// 视图模式类型
export type ViewMode = 'bird-view' | 'panoramic-view';

// Hotspot位置类型
export interface HotspotPosition {
  yaw: number;
  pitch: number;
}

// 应用状态类型
export interface AppState {
  viewMode: ViewMode;
  currentCameraId: number | null;
  isLoading: boolean;
  error: string | null;
}

// XML解析相关类型（使用浏览器原生DOMParser）
export interface ParsedCameraData {
  id: number;
  label: string;
  transform: string;
}
