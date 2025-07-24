import * as THREE from 'three';

/**
 * 测试矩阵解析
 */
export function testMatrixParsing(): void {
  console.group('🧪 Matrix Parsing Test');

  // 第一个相机的实际数据
  const testTransform = "0.99079849598186032 0.0064307342615107675 0.13519240369540544 -0.85943409388018854 0.0043084621532663049 -0.99986295090109856 0.01598488564929167 -0.20760903109663459 0.13527667025011192 -0.015255329305029455 -0.99069041451597672 -2.9496325931535079 0 0 0 1";

  console.log('Testing transform string:', testTransform);

  // 解析数值
  const values = testTransform.trim().split(/\s+/).map(Number);
  console.log('Parsed values count:', values.length);
  console.log('First few values:', values.slice(0, 4));
  console.log('Translation values (should be position):', [values[3], values[7], values[11]]);

  // 创建矩阵（行主序）
  const matrix = new THREE.Matrix4().set(
    values[0], values[1], values[2], values[3],
    values[4], values[5], values[6], values[7],
    values[8], values[9], values[10], values[11],
    values[12], values[13], values[14], values[15]
  );

  console.log('Matrix elements:', matrix.elements);

  // 分解矩阵
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  
  matrix.decompose(position, rotation, scale);

  console.log('Decomposed position:', position.toArray());
  console.log('Decomposed scale:', scale.toArray());

  // 测试不同的矩阵创建方法
  console.log('\n--- Testing different matrix creation methods ---');

  // 方法1：fromArray（列主序）
  const matrix1 = new THREE.Matrix4().fromArray(values);
  const pos1 = new THREE.Vector3();
  matrix1.decompose(pos1, new THREE.Quaternion(), new THREE.Vector3());
  console.log('Method 1 (fromArray):', pos1.toArray());

  // 方法2：直接设置（行主序）
  const matrix2 = new THREE.Matrix4().set(
    values[0], values[1], values[2], values[3],
    values[4], values[5], values[6], values[7],
    values[8], values[9], values[10], values[11],
    values[12], values[13], values[14], values[15]
  );
  const pos2 = new THREE.Vector3();
  matrix2.decompose(pos2, new THREE.Quaternion(), new THREE.Vector3());
  console.log('Method 2 (set row-major):', pos2.toArray());

  // 方法3：转置
  const matrix3 = new THREE.Matrix4().fromArray(values).transpose();
  const pos3 = new THREE.Vector3();
  matrix3.decompose(pos3, new THREE.Quaternion(), new THREE.Vector3());
  console.log('Method 3 (fromArray + transpose):', pos3.toArray());

  console.groupEnd();
}

// 添加到全局调试工具
if (typeof window !== 'undefined') {
  (window as any).testMatrixParsing = testMatrixParsing;
}
