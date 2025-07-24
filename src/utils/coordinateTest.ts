import * as THREE from 'three';
import { convertMetashapeToThreeJS } from './coordinateUtils';

/**
 * 坐标系转换测试工具
 */

/**
 * 测试坐标转换的准确性
 */
export function testCoordinateConversion(): void {
  console.group('🧪 Coordinate Conversion Test');

  // 测试用例1：单位矩阵
  const identityMatrix = new THREE.Matrix4().identity();
  const identityResult = convertMetashapeToThreeJS(identityMatrix);
  
  console.log('Test 1 - Identity Matrix:');
  console.log('Input: Identity Matrix');
  console.log('Output Position:', identityResult.position.toArray());
  console.log('Output Rotation:', identityResult.rotation.toArray());

  // 测试用例2：简单平移
  const translationMatrix = new THREE.Matrix4().makeTranslation(1, 2, 3);
  const translationResult = convertMetashapeToThreeJS(translationMatrix);
  
  console.log('Test 2 - Translation (1, 2, 3):');
  console.log('Input: Translation Matrix');
  console.log('Output Position:', translationResult.position.toArray().map(v => v.toFixed(3)));

  // 测试用例3：旋转矩阵
  const rotationMatrix = new THREE.Matrix4().makeRotationY(Math.PI / 4); // 45度绕Y轴
  const rotationResult = convertMetashapeToThreeJS(rotationMatrix);
  
  console.log('Test 3 - Y-axis Rotation (45°):');
  console.log('Input: Y-rotation Matrix');
  console.log('Output Rotation:', rotationResult.rotation.toArray().map(v => v.toFixed(3)));

  console.groupEnd();
}

/**
 * 比较原始Metashape坐标和转换后的Three.js坐标
 */
export function compareCoordinateSystems(
  metashapeMatrix: THREE.Matrix4,
  label: string = ''
): void {
  console.group(`🔄 Coordinate Comparison ${label}`);

  // 原始Metashape分解
  const originalPos = new THREE.Vector3();
  const originalRot = new THREE.Quaternion();
  const originalScale = new THREE.Vector3();
  metashapeMatrix.decompose(originalPos, originalRot, originalScale);

  // 转换后的Three.js坐标
  const converted = convertMetashapeToThreeJS(metashapeMatrix);

  console.log('Original Metashape:');
  console.log('  Position:', originalPos.toArray().map(v => v.toFixed(3)));
  console.log('  Rotation:', originalRot.toArray().map(v => v.toFixed(3)));

  console.log('Converted Three.js:');
  console.log('  Position:', converted.position.toArray().map(v => v.toFixed(3)));
  console.log('  Rotation:', converted.rotation.toArray().map(v => v.toFixed(3)));

  // 计算位置差异
  const positionDiff = originalPos.clone().sub(converted.position);
  console.log('Position Difference:', positionDiff.toArray().map(v => v.toFixed(3)));
  console.log('Position Distance:', positionDiff.length().toFixed(3));

  console.groupEnd();
}

/**
 * 验证坐标转换的一致性
 */
export function validateCoordinateConsistency(cameras: any[]): void {
  if (cameras.length < 2) {
    console.log('Need at least 2 cameras to validate consistency');
    return;
  }

  console.group('✅ Coordinate Consistency Validation');

  // 检查相机位置是否合理分布
  const positions = cameras.map(camera => camera.position);
  
  // 计算边界框
  const bbox = {
    min: new THREE.Vector3(Infinity, Infinity, Infinity),
    max: new THREE.Vector3(-Infinity, -Infinity, -Infinity)
  };

  positions.forEach(pos => {
    bbox.min.min(pos);
    bbox.max.max(pos);
  });

  const size = bbox.max.clone().sub(bbox.min);
  console.log('Bounding Box Size:', size.toArray().map(v => v.toFixed(3)));

  // 检查是否有异常值
  const center = bbox.min.clone().add(bbox.max).multiplyScalar(0.5);
  const maxRadius = size.length() / 2;

  const outliers = cameras.filter(camera => {
    const distance = camera.position.distanceTo(center);
    return distance > maxRadius * 2; // 超过2倍半径的认为是异常值
  });

  if (outliers.length > 0) {
    console.warn('Found potential outliers:', outliers.map(c => c.label));
  } else {
    console.log('✅ All camera positions are within reasonable bounds');
  }

  // 检查相机间距离
  const distances: number[] = [];
  for (let i = 0; i < cameras.length; i++) {
    for (let j = i + 1; j < cameras.length; j++) {
      const dist = cameras[i].position.distanceTo(cameras[j].position);
      distances.push(dist);
    }
  }

  const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);

  console.log('Distance Statistics:');
  console.log(`  Average: ${avgDistance.toFixed(3)}`);
  console.log(`  Min: ${minDistance.toFixed(3)}`);
  console.log(`  Max: ${maxDistance.toFixed(3)}`);

  // 检查是否有相机位置过于接近
  const tooClose = distances.filter(d => d < 0.1); // 小于0.1单位的认为过近
  if (tooClose.length > 0) {
    console.warn(`Found ${tooClose.length} camera pairs that are very close (< 0.1 units)`);
  }

  console.groupEnd();
}

/**
 * 可视化坐标轴方向
 */
export function visualizeCoordinateAxes(): void {
  console.group('🎯 Coordinate Axes Visualization');

  // 创建单位向量来表示坐标轴
  const xAxis = new THREE.Vector3(1, 0, 0);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const zAxis = new THREE.Vector3(0, 0, 1);

  console.log('Metashape Coordinate System (Z-up):');
  console.log('  X-axis (right):', xAxis.toArray());
  console.log('  Y-axis (forward):', yAxis.toArray());
  console.log('  Z-axis (up):', zAxis.toArray());

  // 应用我们的转换矩阵（绕X轴旋转-90度）
  const METASHAPE_TO_THREEJS_MATRIX = new THREE.Matrix4().set(
    1, 0, 0, 0,    // X保持不变
    0, 0, 1, 0,    // Z -> Y (up)
    0, -1, 0, 0,   // Y -> -Z (backward)
    0, 0, 0, 1
  );

  const convertedX = xAxis.clone().applyMatrix4(METASHAPE_TO_THREEJS_MATRIX);
  const convertedY = yAxis.clone().applyMatrix4(METASHAPE_TO_THREEJS_MATRIX);
  const convertedZ = zAxis.clone().applyMatrix4(METASHAPE_TO_THREEJS_MATRIX);

  console.log('Converted to Three.js (Y-up):');
  console.log('  X-axis (right):', convertedX.toArray());
  console.log('  Y-axis (up):', convertedY.toArray());
  console.log('  Z-axis (forward):', convertedZ.toArray());

  console.groupEnd();
}

/**
 * 运行所有坐标系测试
 */
export function runAllCoordinateTests(cameras?: any[]): void {
  console.log('🚀 Running Coordinate System Tests...');
  
  testCoordinateConversion();
  visualizeCoordinateAxes();
  
  if (cameras && cameras.length > 0) {
    validateCoordinateConsistency(cameras);
    
    // 测试前几个相机的转换
    cameras.slice(0, 3).forEach((camera, index) => {
      if (camera.transform) {
        compareCoordinateSystems(camera.transform, `Camera ${index}`);
      }
    });
  }
  
  console.log('✅ Coordinate system tests completed');
}
