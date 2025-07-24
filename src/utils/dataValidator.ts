import { CameraData, VirtualTourData } from '@/types';

/**
 * 数据验证工具
 */

/**
 * 验证相机数据的完整性
 */
export function validateCameraData(camera: CameraData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 检查基本属性
  if (typeof camera.id !== 'number' || camera.id < 0) {
    errors.push(`Invalid camera ID: ${camera.id}`);
  }

  if (!camera.label || typeof camera.label !== 'string') {
    errors.push(`Invalid camera label: ${camera.label}`);
  }

  if (!camera.imageUrl || typeof camera.imageUrl !== 'string') {
    errors.push(`Invalid image URL: ${camera.imageUrl}`);
  }

  // 检查位置数据
  if (!camera.position) {
    errors.push('Missing position data');
  } else {
    if (!isFinite(camera.position.x) || !isFinite(camera.position.y) || !isFinite(camera.position.z)) {
      errors.push(`Invalid position values: (${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);
    }
  }

  // 检查旋转数据
  if (!camera.rotation) {
    errors.push('Missing rotation data');
  } else {
    if (!isFinite(camera.rotation.x) || !isFinite(camera.rotation.y) || 
        !isFinite(camera.rotation.z) || !isFinite(camera.rotation.w)) {
      errors.push(`Invalid rotation values: (${camera.rotation.x}, ${camera.rotation.y}, ${camera.rotation.z}, ${camera.rotation.w})`);
    }
  }

  // 检查变换矩阵
  if (!camera.transform) {
    errors.push('Missing transform matrix');
  } else {
    const determinant = camera.transform.determinant();
    if (Math.abs(determinant) < 1e-10) {
      errors.push(`Singular transform matrix (determinant: ${determinant})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证虚拟漫游数据的完整性
 */
export function validateVirtualTourData(tourData: VirtualTourData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查相机数据
  if (!tourData.cameras || !Array.isArray(tourData.cameras)) {
    errors.push('Missing or invalid cameras array');
  } else {
    if (tourData.cameras.length === 0) {
      errors.push('No cameras found');
    } else if (tourData.cameras.length < 2) {
      warnings.push('Only one camera found, navigation will be limited');
    }

    // 验证每个相机
    tourData.cameras.forEach((camera, index) => {
      const validation = validateCameraData(camera);
      if (!validation.isValid) {
        errors.push(`Camera ${index} (${camera.label}): ${validation.errors.join(', ')}`);
      }
    });

    // 检查相机ID唯一性
    const ids = tourData.cameras.map(c => c.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push('Duplicate camera IDs found');
    }

    // 检查相机标签唯一性
    const labels = tourData.cameras.map(c => c.label);
    const uniqueLabels = new Set(labels);
    if (labels.length !== uniqueLabels.size) {
      warnings.push('Duplicate camera labels found');
    }
  }

  // 检查模型数据
  if (!tourData.model) {
    errors.push('Missing model data');
  } else {
    if (!tourData.model.url || typeof tourData.model.url !== 'string') {
      errors.push('Invalid model URL');
    }
    if (!tourData.model.texture || typeof tourData.model.texture !== 'string') {
      warnings.push('Missing or invalid texture URL');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 检查图片文件是否存在
 */
export async function validateImageExists(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 批量验证图片文件
 */
export async function validateAllImages(cameras: CameraData[]): Promise<{
  validImages: string[];
  invalidImages: string[];
}> {
  const validImages: string[] = [];
  const invalidImages: string[] = [];

  const promises = cameras.map(async (camera) => {
    const exists = await validateImageExists(camera.imageUrl);
    if (exists) {
      validImages.push(camera.imageUrl);
    } else {
      invalidImages.push(camera.imageUrl);
    }
  });

  await Promise.all(promises);

  return { validImages, invalidImages };
}

/**
 * 计算相机分布统计信息
 */
export function calculateCameraStatistics(cameras: CameraData[]): {
  count: number;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  center: { x: number; y: number; z: number };
  averageDistance: number;
} {
  if (cameras.length === 0) {
    return {
      count: 0,
      boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
      center: { x: 0, y: 0, z: 0 },
      averageDistance: 0
    };
  }

  // 计算边界框
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let sumX = 0, sumY = 0, sumZ = 0;

  cameras.forEach(camera => {
    const pos = camera.position;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    minZ = Math.min(minZ, pos.z);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
    maxZ = Math.max(maxZ, pos.z);
    sumX += pos.x;
    sumY += pos.y;
    sumZ += pos.z;
  });

  // 计算中心点
  const center = {
    x: sumX / cameras.length,
    y: sumY / cameras.length,
    z: sumZ / cameras.length
  };

  // 计算平均距离（到中心点）
  const totalDistance = cameras.reduce((sum, camera) => {
    const dx = camera.position.x - center.x;
    const dy = camera.position.y - center.y;
    const dz = camera.position.z - center.z;
    return sum + Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, 0);

  return {
    count: cameras.length,
    boundingBox: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    },
    center,
    averageDistance: totalDistance / cameras.length
  };
}
