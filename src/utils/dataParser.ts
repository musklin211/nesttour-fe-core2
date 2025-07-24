import * as THREE from 'three';
import { VirtualTourData, CameraData } from '@/types';
import { convertMetashapeToThreeJS, validateTransformMatrix, debugTransformMatrix } from './coordinateUtils';
import { validateVirtualTourData, calculateCameraStatistics } from './dataValidator';
import { getCachedData, CACHE_KEYS } from './dataCache';
import { runBasicDebugChecks } from './debugTools';

/**
 * 解析4x4变换矩阵获取位置和旋转信息
 */
export function parseTransformMatrix(transformString: string): {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  matrix: THREE.Matrix4;
} {
  const values = transformString.trim().split(/\s+/).map(Number);
  
  if (values.length !== 16) {
    throw new Error(`Invalid transform matrix: expected 16 values, got ${values.length}`);
  }

  // Metashape使用行主序，Three.js使用列主序，需要转置
  // 先创建行主序矩阵，然后转置为列主序
  const matrix = new THREE.Matrix4().set(
    values[0], values[1], values[2], values[3],
    values[4], values[5], values[6], values[7],
    values[8], values[9], values[10], values[11],
    values[12], values[13], values[14], values[15]
  );
  
  // 分解矩阵获取位置、旋转和缩放
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  matrix.decompose(position, rotation, scale);

  // 调试：检查位置是否非零
  if (position.length() > 0.01) {
    console.log('Non-zero position found:', position.toArray().map(v => v.toFixed(3)));
  }

  return { position, rotation, matrix };
}

/**
 * 使用浏览器原生DOMParser解析XML
 */
function parseXMLString(xmlString: string): Document {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // 检查解析错误
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parsing error: ${parseError.textContent}`);
  }

  return xmlDoc;
}

/**
 * 解析cameras.xml文件
 */
export async function parseCamerasXML(): Promise<CameraData[]> {
  try {
    const response = await fetch('/data/cameras.xml');
    if (!response.ok) {
      throw new Error(`Failed to fetch cameras.xml: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const xmlDoc = parseXMLString(xmlText);

    const cameras: CameraData[] = [];
    const cameraElements = xmlDoc.querySelectorAll('camera');

    console.log(`Found ${cameraElements.length} camera elements in XML`);

    cameraElements.forEach((cameraElement, index) => {
      const xmlId = parseInt(cameraElement.getAttribute('id') || '0');
      const label = cameraElement.getAttribute('label') || '';

      // 从label中解析真实的camera_id
      // 格式: <group_number>_frame_<camera_id>
      const match = label.match(/(\d+)_frame_(\d+)/);
      if (!match) {
        console.warn(`Invalid label format: ${label}, expected format: <group>_frame_<id>`);
        return;
      }

      const groupNumber = parseInt(match[1]);
      const cameraId = parseInt(match[2]);

      console.log(`Processing camera ${index}: xmlId=${xmlId}, label=${label}, parsed cameraId=${cameraId}`);

      const transformElement = cameraElement.querySelector('transform');
      if (!transformElement || !transformElement.textContent) {
        console.warn(`No transform data found for camera ${cameraId} (${label})`);
        return;
      }

      const transformString = transformElement.textContent.trim();
      console.log(`Transform string for camera ${cameraId}:`, transformString.substring(0, 50) + '...');

      try {
        const { position, rotation, matrix } = parseTransformMatrix(transformString);

        // 验证变换矩阵
        if (!validateTransformMatrix(matrix)) {
          console.warn(`Invalid transform matrix for camera ${cameraId}, skipping`);
          return;
        }

        // 分解原始矩阵获取Metashape坐标
        const originalPos = new THREE.Vector3();
        const originalRot = new THREE.Quaternion();
        const originalScale = new THREE.Vector3();
        matrix.decompose(originalPos, originalRot, originalScale);

        // 应用坐标系转换
        const converted = convertMetashapeToThreeJS(matrix);

        // 构建图片URL
        const imageUrl = `/data/frames/${label}.JPG`;

        cameras.push({
          id: cameraId, // 使用从label解析出的真实camera_id
          label,
          position: converted.position,
          rotation: converted.rotation,
          transform: matrix, // 保留原始矩阵用于调试
          imageUrl,
        });

        // 移除冗余的相机映射日志
        // console.log(`✅ Camera ${cameraId} (${label}) mapped correctly:`);
        // console.log(`  XML ID: ${xmlId} → Real Camera ID: ${cameraId}`);
        // console.log(`  Image: ${imageUrl}`);
        // console.log(`  🎯 FINAL POSITION AFTER SCENE ROTATION: (${converted.position.x.toFixed(3)}, ${converted.position.y.toFixed(3)}, ${converted.position.z.toFixed(3)})`);

        // 调试模式下打印详细信息
        // if (process.env.NODE_ENV === 'development' && cameras.length < 3) {
        //   debugTransformMatrix(matrix, `Camera ${cameraId} (${label})`);
        // }
      } catch (error) {
        console.error(`Error parsing camera ${cameraId}:`, error);
      }
    });

    // 移除冗余的解析统计日志
    // console.log(`Parsed ${cameras.length} cameras from XML`);

    // 计算并显示统计信息
    // if (cameras.length > 0) {
    //   const stats = calculateCameraStatistics(cameras);
    //   console.log('Camera Statistics:', {
    //     count: stats.count,
    //     boundingBox: {
    //       min: `(${stats.boundingBox.min.x.toFixed(3)}, ${stats.boundingBox.min.y.toFixed(3)}, ${stats.boundingBox.min.z.toFixed(3)})`,
    //       max: `(${stats.boundingBox.max.x.toFixed(3)}, ${stats.boundingBox.max.y.toFixed(3)}, ${stats.boundingBox.max.z.toFixed(3)})`
    //     },
    //     center: `(${stats.center.x.toFixed(3)}, ${stats.center.y.toFixed(3)}, ${stats.center.z.toFixed(3)})`,
    //     averageDistance: stats.averageDistance.toFixed(3)
    //   });

      // 检查是否所有相机都在同一位置
      const size = {
        x: stats.boundingBox.max.x - stats.boundingBox.min.x,
        y: stats.boundingBox.max.y - stats.boundingBox.min.y,
        z: stats.boundingBox.max.z - stats.boundingBox.min.z
      };

      console.log('Bounding box size:', `(${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)})`);

      if (size.x < 0.001 && size.y < 0.001 && size.z < 0.001) {
        console.warn('⚠️ All cameras appear to be at the same position! This suggests a coordinate conversion issue.');
      }
    }

    return cameras;
  } catch (error) {
    throw new Error(`Failed to load cameras.xml: ${error}`);
  }
}

/**
 * 解析完整的虚拟漫游数据（带缓存）
 */
export async function parseVirtualTourData(): Promise<VirtualTourData> {
  return getCachedData(
    CACHE_KEYS.VIRTUAL_TOUR_DATA,
    async () => {
      // 移除冗余的解析开始日志
      // console.log('Starting to parse virtual tour data...');

      // 解析相机数据
      const cameras = await parseCamerasXML();

      // 模型数据配置
      const model = {
        url: '/data/model.glb',
        texture: '/data/texture.jpg',
      };
    
    const tourData: VirtualTourData = {
      cameras,
      model,
    };

    // 验证数据完整性
    const validation = validateVirtualTourData(tourData);
    if (!validation.isValid) {
      console.error('Data validation failed:', validation.errors);
      throw new Error(`Data validation failed: ${validation.errors.join('; ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('Data validation warnings:', validation.warnings);
    }

      // 移除冗余的解析完成日志
      // console.log('Virtual tour data parsed and validated successfully:', {
      //   cameras: tourData.cameras.length,
      //   model: tourData.model.url
      // });

      // 运行调试检查
      runBasicDebugChecks(tourData);

      return tourData;
    },
    10 * 60 * 1000 // 缓存10分钟
  );
}
