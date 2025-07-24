import { CameraData, VirtualTourData } from '@/types';
import { debugCache } from './dataCache';
import { runAllCoordinateTests } from './coordinateTest';

/**
 * 调试工具集合
 */

/**
 * 在控制台中可视化相机位置分布
 */
export function visualizeCameraPositions(cameras: CameraData[]): void {
  if (cameras.length === 0) {
    console.log('No cameras to visualize');
    return;
  }

  console.group('📷 Camera Positions Visualization');
  
  // 创建简单的ASCII图表
  const positions = cameras.map(camera => ({
    id: camera.id,
    label: camera.label,
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  }));

  // 按位置排序显示
  positions.sort((a, b) => a.x - b.x);

  console.table(positions);

  // 显示位置范围
  const xValues = positions.map(p => p.x);
  const yValues = positions.map(p => p.y);
  const zValues = positions.map(p => p.z);

  console.log('Position Ranges:');
  console.log(`X: ${Math.min(...xValues).toFixed(2)} to ${Math.max(...xValues).toFixed(2)}`);
  console.log(`Y: ${Math.min(...yValues).toFixed(2)} to ${Math.max(...yValues).toFixed(2)}`);
  console.log(`Z: ${Math.min(...zValues).toFixed(2)} to ${Math.max(...zValues).toFixed(2)}`);

  console.groupEnd();
}

/**
 * 分析相机间距离
 */
export function analyzeCameraDistances(cameras: CameraData[]): void {
  if (cameras.length < 2) {
    console.log('Need at least 2 cameras to analyze distances');
    return;
  }

  console.group('📏 Camera Distance Analysis');

  const distances: Array<{
    from: string;
    to: string;
    distance: number;
  }> = [];

  // 计算所有相机间的距离
  for (let i = 0; i < cameras.length; i++) {
    for (let j = i + 1; j < cameras.length; j++) {
      const cam1 = cameras[i];
      const cam2 = cameras[j];
      const distance = cam1.position.distanceTo(cam2.position);
      
      distances.push({
        from: cam1.label,
        to: cam2.label,
        distance: parseFloat(distance.toFixed(2))
      });
    }
  }

  // 排序并显示
  distances.sort((a, b) => a.distance - b.distance);

  console.log('Closest cameras:');
  console.table(distances.slice(0, 5));

  console.log('Farthest cameras:');
  console.table(distances.slice(-5));

  const avgDistance = distances.reduce((sum, d) => sum + d.distance, 0) / distances.length;
  console.log(`Average distance: ${avgDistance.toFixed(2)}`);

  console.groupEnd();
}

/**
 * 检查数据完整性
 */
export function checkDataIntegrity(tourData: VirtualTourData): void {
  console.group('🔍 Data Integrity Check');

  // 检查相机数据
  console.log(`Total cameras: ${tourData.cameras.length}`);
  
  const invalidCameras = tourData.cameras.filter(camera => {
    return !isFinite(camera.position.x) || 
           !isFinite(camera.position.y) || 
           !isFinite(camera.position.z);
  });

  if (invalidCameras.length > 0) {
    console.warn(`Found ${invalidCameras.length} cameras with invalid positions:`, invalidCameras);
  } else {
    console.log('✅ All camera positions are valid');
  }

  // 检查图片URL
  const missingImages = tourData.cameras.filter(camera => !camera.imageUrl);
  if (missingImages.length > 0) {
    console.warn(`Found ${missingImages.length} cameras without image URLs:`, missingImages);
  } else {
    console.log('✅ All cameras have image URLs');
  }

  // 检查模型数据
  if (tourData.model.url) {
    console.log('✅ Model URL is present');
  } else {
    console.warn('❌ Model URL is missing');
  }

  if (tourData.model.texture) {
    console.log('✅ Texture URL is present');
  } else {
    console.warn('⚠️ Texture URL is missing');
  }

  console.groupEnd();
}

/**
 * 性能分析工具
 */
export function analyzePerformance(): void {
  console.group('⚡ Performance Analysis');

  // 内存使用情况
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:');
    console.log(`Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
  }

  // 缓存状态
  debugCache();

  console.groupEnd();
}

/**
 * 导出调试数据到JSON
 */
export function exportDebugData(tourData: VirtualTourData): string {
  const debugData = {
    timestamp: new Date().toISOString(),
    cameras: tourData.cameras.map(camera => ({
      id: camera.id,
      label: camera.label,
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      rotation: {
        x: camera.rotation.x,
        y: camera.rotation.y,
        z: camera.rotation.z,
        w: camera.rotation.w
      },
      imageUrl: camera.imageUrl
    })),
    model: tourData.model,
    metadata: {
      totalCameras: tourData.cameras.length,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    }
  };

  const jsonString = JSON.stringify(debugData, null, 2);
  console.log('Debug data exported to JSON:', jsonString.length, 'characters');
  
  return jsonString;
}

/**
 * 创建调试面板
 */
export function createDebugPanel(sceneManager: any, cameraVisualizer: any): void {
  // 移除环境检查，让调试面板在所有环境中都可用
  // if (process.env.NODE_ENV !== 'development') {
  //   return;
  // }

  // 添加全局调试函数
  (window as any).debugVirtualTour = {
    visualizeCameras: () => console.log('Use cameraVisualizer methods for camera visualization'),
    analyzeDistances: () => console.log('Distance analysis not available in this context'),
    checkIntegrity: () => console.log('Data integrity check not available in this context'),
    analyzePerformance: () => analyzePerformance(),
    exportData: () => console.log('Export data not available in this context'),
    showCache: () => debugCache(),
    testCoordinates: () => console.log('Coordinate tests not available in this context'),
    // 坐标轴控制
    showAxes: () => {
      if (sceneManager) {
        sceneManager.setCoordinateAxesVisible(true);
        console.log('Coordinate axes shown');
      } else {
        console.log('Scene manager not available');
      }
    },
    hideAxes: () => {
      if (sceneManager) {
        sceneManager.setCoordinateAxesVisible(false);
        console.log('Coordinate axes hidden');
      } else {
        console.log('Scene manager not available');
      }
    },
    scaleAxes: (scale: number) => {
      if (sceneManager) {
        sceneManager.setCoordinateAxesScale(scale);
        console.log(`Coordinate axes scaled to ${scale}`);
      } else {
        console.log('Scene manager not available');
      }
    },
    // 内容组旋转控制（模型+相机节点整体）
    rotateContent: (x: number, y: number, z: number) => {
      console.log(`To rotate content: sceneManager.setContentRotation(${x}, ${y}, ${z})`);
    },
    rotateContentX: (degrees: number) => {
      const radians = degrees * Math.PI / 180;
      console.log(`To rotate content around X-axis: sceneManager.rotateContentAroundX(${radians})`);
    },
    resetContentRotation: () => {
      console.log('To reset content rotation: sceneManager.resetContentRotation()');
    },
    // 验证坐标系
    verifyCoordinateSystem: () => {
      console.log('Expected coordinate system:');
      console.log('- Red X-axis: pointing right');
      console.log('- Green Y-axis: pointing up');
      console.log('- Blue Z-axis: pointing toward camera');
      console.log('- Model should be lying flat with floor horizontal');
      console.log('- Grid should be visible at Y=0 (ground plane)');
    },
    // 网格控制
    showGrid: () => console.log('Use sceneManager.setGridVisible(true)'),
    hideGrid: () => console.log('Use sceneManager.setGridVisible(false)'),
    setGridOpacity: (opacity: number) => console.log(`Use sceneManager.setGridOpacity(${opacity})`),
    // 相机节点控制
    showDirectionIndicators: () => {
      if (cameraVisualizer) {
        cameraVisualizer.toggleDirectionIndicators(true);
        console.log('Direction indicators enabled');
      } else {
        console.log('Camera visualizer not available');
      }
    },
    hideDirectionIndicators: () => {
      if (cameraVisualizer) {
        cameraVisualizer.toggleDirectionIndicators(false);
        console.log('Direction indicators disabled');
      } else {
        console.log('Camera visualizer not available');
      }
    },
    // 场景信息
    sceneInfo: () => console.log('Use sceneManager.getSceneInfo()'),
    // 材质和纹理调试
    checkTextures: () => {
      console.log('Checking model textures...');
      if ((window as any).sceneManager) {
        const sceneManager = (window as any).sceneManager;
        sceneManager.modelGroup.traverse((child: any) => {
          if (child.isMesh) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat: any, index: number) => {
              console.log(`Material ${index}:`, {
                type: mat.type,
                hasMap: !!mat.map,
                mapUrl: mat.map?.image?.src,
                color: mat.color?.getHexString(),
                roughness: mat.roughness,
                metalness: mat.metalness
              });
            });
          }
        });
      }
    },
    // 光照调试
    checkLighting: () => {
      console.log('Checking scene lighting...');
      if ((window as any).sceneManager) {
        const sceneManager = (window as any).sceneManager;
        sceneManager.lightsGroup.children.forEach((light: any, index: number) => {
          console.log(`Light ${index}:`, {
            type: light.type,
            intensity: light.intensity,
            color: light.color?.getHexString(),
            position: light.position?.toArray()
          });
        });
      }
    }
  };

  // 移除冗余的调试面板创建日志
  // console.log('🛠️ Debug panel created! Use window.debugVirtualTour to access debug functions:');
  // console.log('- debugVirtualTour.visualizeCameras()');
  // console.log('- debugVirtualTour.analyzeDistances()');
  // console.log('- debugVirtualTour.checkIntegrity()');
  // console.log('- debugVirtualTour.analyzePerformance()');
  // console.log('- debugVirtualTour.exportData()');
  // console.log('- debugVirtualTour.showCache()');
  // console.log('- debugVirtualTour.testCoordinates()');
  // console.log('- debugVirtualTour.showAxes() / hideAxes()');
  // console.log('- debugVirtualTour.scaleAxes(scale)');
  // console.log('- debugVirtualTour.rotateContent(x, y, z)');
  // console.log('- debugVirtualTour.rotateContentX(degrees)');
  // console.log('- debugVirtualTour.showDirectionIndicators() / hideDirectionIndicators()');
  // console.log('- debugVirtualTour.checkTextures()');
  // console.log('- debugVirtualTour.checkLighting()');
}

/**
 * 自动运行基础调试检查
 */
export function runBasicDebugChecks(tourData: VirtualTourData): void {
  if (process.env.NODE_ENV === 'development') {
    // 移除冗余的调试检查日志
    // console.log('🔧 Running basic debug checks...');
    // checkDataIntegrity(tourData);
    // visualizeCameraPositions(tourData.cameras);
    createDebugPanel(tourData);
  }
}
