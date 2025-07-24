import * as THREE from 'three';

/**
 * 坐标系转换工具
 * Metashape使用右手坐标系，Three.js也使用右手坐标系
 * 但可能存在轴向差异，需要根据实际情况调整
 */

/**
 * Metashape到Three.js的坐标系转换矩阵
 * Metashape: X-right, Y-forward, Z-up (右手坐标系)
 * Three.js: X-right, Y-up, Z-forward (右手坐标系)
 * 转换：绕X轴旋转-90度，使Z轴变为Y轴
 */
const METASHAPE_TO_THREEJS_MATRIX = new THREE.Matrix4().set(
  1, 0, 0, 0,    // X轴保持不变 (右)
  0, 0, 1, 0,    // Metashape的Z轴 -> Three.js的Y轴 (上)
  0, -1, 0, 0,   // Metashape的Y轴 -> Three.js的-Z轴 (向后)
  0, 0, 0, 1
);

/**
 * 场景旋转矩阵：绕X轴旋转90度
 * 这是为了让模型正确显示（天花板在上，地面在下）
 * 相机节点也需要应用同样的旋转以保持坐标一致性
 */
const SCENE_ROTATION_MATRIX = new THREE.Matrix4().makeRotationX(Math.PI / 2);

/**
 * 将Metashape的4x4变换矩阵转换为Three.js坐标系
 */
export function convertMetashapeToThreeJS(metashapeMatrix: THREE.Matrix4): {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
} {
  // 先分解原始Metashape矩阵
  const originalPos = new THREE.Vector3();
  const originalRot = new THREE.Quaternion();
  const originalScale = new THREE.Vector3();
  metashapeMatrix.decompose(originalPos, originalRot, originalScale);

  // 应用坐标系转换：只做Metashape->Three.js转换
  // 不需要额外的场景旋转，因为相机节点在contentGroup中会自动跟着旋转
  const convertedMatrix = new THREE.Matrix4()
    .multiplyMatrices(METASHAPE_TO_THREEJS_MATRIX, metashapeMatrix);

  // 分解转换后的矩阵
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  convertedMatrix.decompose(position, rotation, scale);

  // 移除冗余的坐标转换日志
  // console.log('🔄 Metashape->Three.js conversion:', {
  //   original: originalPos.toArray().map(v => v.toFixed(3)),
  //   converted: position.toArray().map(v => v.toFixed(3))
  // });

  // 简化调试信息
  if (originalPos.length() > 0.01 && position.length() < 0.01) {
    console.warn('Position lost in conversion!', {
      original: originalPos.toArray().map(v => v.toFixed(3)),
      converted: position.toArray().map(v => v.toFixed(3))
    });
  }

  return { position, rotation, scale };
}

/**
 * 验证变换矩阵的有效性
 */
export function validateTransformMatrix(matrix: THREE.Matrix4): boolean {
  const elements = matrix.elements;
  
  // 检查是否包含NaN或无穷大
  for (let i = 0; i < 16; i++) {
    if (!isFinite(elements[i])) {
      return false;
    }
  }
  
  // 检查行列式是否接近0（奇异矩阵）
  const determinant = matrix.determinant();
  if (Math.abs(determinant) < 1e-10) {
    return false;
  }
  
  return true;
}

/**
 * 计算两个位置之间的距离
 */
export function calculateDistance(pos1: THREE.Vector3, pos2: THREE.Vector3): number {
  return pos1.distanceTo(pos2);
}

/**
 * 计算从一个位置到另一个位置的方向向量
 */
export function calculateDirection(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
  return to.clone().sub(from).normalize();
}

/**
 * 将3D位置转换为球坐标（用于hotspot计算）
 */
export function cartesianToSpherical(position: THREE.Vector3): {
  radius: number;
  azimuth: number;  // 水平角度 (yaw)
  elevation: number; // 俯仰角度 (pitch)
} {
  const radius = position.length();
  const azimuth = Math.atan2(position.x, position.z);
  const elevation = Math.asin(position.y / radius);
  
  return { radius, azimuth, elevation };
}

/**
 * 计算相机间的相对位置（用于hotspot定位）
 */
export function calculateRelativePosition(
  fromCamera: THREE.Vector3,
  toCamera: THREE.Vector3,
  fromRotation: THREE.Quaternion
): { yaw: number; pitch: number; distance: number } {
  // 计算相对位置向量
  const relativePos = toCamera.clone().sub(fromCamera);
  
  // 应用相机旋转的逆变换，转换到相机本地坐标系
  const inverseRotation = fromRotation.clone().invert();
  relativePos.applyQuaternion(inverseRotation);
  
  // 转换为球坐标
  const spherical = cartesianToSpherical(relativePos);
  
  return {
    yaw: spherical.azimuth,
    pitch: spherical.elevation,
    distance: spherical.radius
  };
}

/**
 * 将Three.js坐标转换为模型坐标系坐标
 * 模型坐标系是通过contentGroup绕X轴旋转90°后的坐标系
 * 要得到模型坐标系下的坐标，需要应用绕X轴旋转-90°的变换
 */
export function convertThreeJSToModelCoordinates(threeJSPosition: THREE.Vector3): THREE.Vector3 {
  // 绕X轴旋转-90°的变换矩阵
  const THREEJS_TO_MODEL_MATRIX = new THREE.Matrix4().set(
    1,  0,  0, 0,    // X轴保持不变
    0,  0,  1, 0,    // Three.js的Z轴 -> 模型的Y轴
    0, -1,  0, 0,    // Three.js的Y轴 -> 模型的-Z轴
    0,  0,  0, 1
  );

  const modelPosition = threeJSPosition.clone().applyMatrix4(THREEJS_TO_MODEL_MATRIX);

  // 移除冗余的坐标转换日志
  // console.log('🔄 Three.js->Model coordinate conversion:', {
  //   threeJS: threeJSPosition.toArray().map(v => v.toFixed(3)),
  //   model: modelPosition.toArray().map(v => v.toFixed(3))
  // });

  return modelPosition;
}

/**
 * 调试工具：打印变换矩阵信息
 */
export function debugTransformMatrix(matrix: THREE.Matrix4, label: string = ''): void {
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  matrix.decompose(position, rotation, scale);

  const euler = new THREE.Euler().setFromQuaternion(rotation);

  console.group(`Transform Matrix Debug ${label}`);
  console.log('Position:', position.toArray().map(v => v.toFixed(3)));
  console.log('Rotation (Euler):', [
    THREE.MathUtils.radToDeg(euler.x).toFixed(1),
    THREE.MathUtils.radToDeg(euler.y).toFixed(1),
    THREE.MathUtils.radToDeg(euler.z).toFixed(1)
  ]);
  console.log('Scale:', scale.toArray().map(v => v.toFixed(3)));
  console.log('Determinant:', matrix.determinant().toFixed(6));
  console.groupEnd();
}
