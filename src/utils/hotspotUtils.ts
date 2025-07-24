import * as THREE from 'three';
import { CameraData } from '@/types';

export interface HotspotData {
  camera: CameraData;
  screenPosition: { x: number; y: number };
  distance: number;
  isVisible: boolean;
  isBehind: boolean;
}

/**
 * 计算其他相机位置在当前全景图中的hotspot位置
 * @param currentCamera 当前相机数据
 * @param otherCameras 其他相机数据数组
 * @param panoramaCamera Three.js全景相机
 * @param containerWidth 容器宽度
 * @param containerHeight 容器高度
 * @returns hotspot数据数组
 */
export function calculateHotspots(
  currentCamera: CameraData,
  otherCameras: CameraData[],
  panoramaCamera: THREE.PerspectiveCamera,
  containerWidth: number,
  containerHeight: number
): HotspotData[] {
  const hotspots: HotspotData[] = [];
  
  // 获取当前相机的世界朝向
  const currentDirection = new THREE.Vector3();
  panoramaCamera.getWorldDirection(currentDirection);
  
  for (const otherCamera of otherCameras) {
    if (otherCamera.id === currentCamera.id) continue;
    
    // 计算从当前相机到目标相机的向量
    const targetDirection = new THREE.Vector3()
      .subVectors(otherCamera.position, currentCamera.position)
      .normalize();
    
    // 计算距离
    const distance = currentCamera.position.distanceTo(otherCamera.position);
    
    // 使用更简单直接的方法：
    // 1. 将目标方向投影到当前相机的视图空间
    // 2. 转换为屏幕坐标

    // 创建一个临时的投影矩阵来计算屏幕坐标
    const tempVector = targetDirection.clone();

    // 将目标方向转换为相机空间
    const cameraMatrix = new THREE.Matrix4();
    cameraMatrix.lookAt(
      new THREE.Vector3(0, 0, 0), // 相机位置（原点）
      currentDirection,           // 相机朝向
      new THREE.Vector3(0, 1, 0)  // 上方向
    );

    // 应用相机变换的逆矩阵
    const inverseCameraMatrix = cameraMatrix.clone().invert();
    tempVector.applyMatrix4(inverseCameraMatrix);

    // 转换为球坐标
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(tempVector);

    // 将球坐标转换为屏幕坐标
    // theta: 水平角度 (-π 到 π)
    // phi: 垂直角度 (0 到 π)

    // 标准化角度
    let theta = spherical.theta;
    let phi = spherical.phi - Math.PI / 2; // 调整phi使其以水平面为0

    // 检查是否在相机后方
    const isBehind = Math.abs(theta) > Math.PI / 2;

    // 转换为屏幕坐标
    // 水平：theta映射到屏幕宽度 (-π/2 到 π/2 映射到 0 到 width)
    // 垂直：phi映射到屏幕高度 (-π/2 到 π/2 映射到 0 到 height)
    const screenX = containerWidth / 2 + (theta / (Math.PI / 2)) * (containerWidth / 4);
    const screenY = containerHeight / 2 - (phi / (Math.PI / 2)) * (containerHeight / 4);
    
    // 判断是否可见
    const isInFOV = Math.abs(theta) < Math.PI / 3 && Math.abs(phi) < Math.PI / 3; // 限制视野范围
    const isVisible = isInFOV &&
                     !isBehind &&
                     screenX >= 50 &&
                     screenX <= containerWidth - 50 &&
                     screenY >= 50 &&
                     screenY <= containerHeight - 50 &&
                     distance > 0.5; // 避免显示过近的相机
    
    hotspots.push({
      camera: otherCamera,
      screenPosition: { x: screenX, y: screenY },
      distance,
      isVisible,
      isBehind
    });
  }
  
  return hotspots;
}

/**
 * 根据相机朝向更新hotspot位置
 * 当用户拖拽全景图时调用此函数更新hotspot位置
 */
export function updateHotspotsForCameraRotation(
  hotspots: HotspotData[],
  panoramaCamera: THREE.PerspectiveCamera,
  containerWidth: number,
  containerHeight: number
): HotspotData[] {
  // 获取当前相机朝向
  const cameraDirection = new THREE.Vector3();
  panoramaCamera.getWorldDirection(cameraDirection);
  
  return hotspots.map(hotspot => {
    const { camera } = hotspot;
    
    // 重新计算屏幕位置
    // 这里可以优化：只重新计算屏幕坐标，不重新计算3D关系
    
    return {
      ...hotspot,
      // 更新后的屏幕位置计算逻辑
      // 暂时返回原始数据，后续可以优化
    };
  });
}

/**
 * 过滤距离过近的hotspot，避免重叠
 */
export function filterOverlappingHotspots(
  hotspots: HotspotData[],
  minDistance: number = 50
): HotspotData[] {
  const filtered: HotspotData[] = [];
  
  for (const hotspot of hotspots) {
    if (!hotspot.isVisible) continue;
    
    // 检查是否与已有hotspot重叠
    const isOverlapping = filtered.some(existing => {
      const dx = hotspot.screenPosition.x - existing.screenPosition.x;
      const dy = hotspot.screenPosition.y - existing.screenPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < minDistance;
    });
    
    if (!isOverlapping) {
      filtered.push(hotspot);
    }
  }
  
  return filtered;
}
