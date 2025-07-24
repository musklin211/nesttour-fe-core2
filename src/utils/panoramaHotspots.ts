import * as THREE from 'three';
import { CameraData } from '@/types';

export interface PanoramaHotspot3D {
  camera: CameraData;
  group: THREE.Group; // 改为Group，包含球体和文字
  distance: number;
}

/**
 * 在全景图中管理3D相机球体
 */
export class PanoramaHotspotManager {
  private scene: THREE.Scene;
  private currentCameraId: number;
  private hotspots: PanoramaHotspot3D[] = [];
  private onCameraClick?: (cameraId: number, targetViewAngle?: { lon: number; lat: number }) => void;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor(scene: THREE.Scene, onCameraClick?: (cameraId: number, targetViewAngle?: { lon: number; lat: number }) => void) {
    this.scene = scene;
    this.onCameraClick = onCameraClick;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.currentCameraId = -1;
  }

  /**
   * 将Three.js坐标转换为模型坐标系
   * Bird-view中的contentGroup绕X轴旋转了90°，我们需要反向转换
   */
  private convertToModelCoordinates(threeJSPosition: THREE.Vector3): THREE.Vector3 {
    // 绕X轴旋转-90°的变换矩阵（与contentGroup的旋转相反）
    const THREEJS_TO_MODEL_MATRIX = new THREE.Matrix4().set(
      1,  0,  0, 0,    // X轴保持不变
      0,  0,  1, 0,    // Three.js的Z轴 -> 模型的Y轴
      0, -1,  0, 0,    // Three.js的Y轴 -> 模型的-Z轴
      0,  0,  0, 1
    );

    return threeJSPosition.clone().applyMatrix4(THREEJS_TO_MODEL_MATRIX);
  }

  /**
   * 创建文字纹理
   */
  private createTextTexture(text: string, size: number): THREE.CanvasTexture {
    // 使用简单的平面几何体作为文字背景
    // 在实际项目中，可以使用TextGeometry或者Canvas纹理
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // 设置canvas大小 - 缩小宽度
    canvas.width = 80;
    canvas.height = 40;

    // 绘制文字
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'white';
    context.font = 'bold 16px Arial'; // 缩小字体
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * 更新hotspot显示
   * @param currentCamera 当前相机数据
   * @param allCameras 所有相机数据
   * @param maxCount 最大显示数量
   */
  public updateHotspots(currentCamera: CameraData, allCameras: CameraData[], maxCount: number = 5): void {
    // 清理现有hotspot
    this.clearHotspots();

    this.currentCameraId = currentCamera.id;

    // 计算其他相机到当前相机的距离
    const otherCameras = allCameras
      .filter(cam => cam.id !== currentCamera.id)
      .map(cam => ({
        camera: cam,
        distance: currentCamera.position.distanceTo(cam.position)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxCount); // 只取最近的N个

    console.log(`🎯 Creating ${otherCameras.length} 3D hotspots for camera ${currentCamera.id}`);
    console.log(`📍 Current camera position: (${currentCamera.position.x.toFixed(2)}, ${currentCamera.position.y.toFixed(2)}, ${currentCamera.position.z.toFixed(2)})`);

    // 为每个相机创建3D球体
    otherCameras.forEach(({ camera, distance }) => {
      const hotspot = this.createHotspot3D(currentCamera, camera, distance);
      this.hotspots.push(hotspot);
      this.scene.add(hotspot.group);

      console.log(`✅ Added hotspot ${camera.id} to scene, children count: ${this.scene.children.length}`);
    });
  }

  /**
   * 创建单个3D hotspot球体
   */
  private createHotspot3D(currentCamera: CameraData, targetCamera: CameraData, distance: number): PanoramaHotspot3D {
    // 根据距离计算球体大小 - 与Bird-view中一致
    const baseSize = 0.15; // 与Bird-view中的nodeSize一致
    const minSize = 0.08;  // 最小尺寸
    const maxSize = 0.25;  // 最大尺寸
    const size = Math.max(minSize, Math.min(maxSize, baseSize / (distance * 0.3 + 1)));

    // 创建球体几何体
    const geometry = new THREE.SphereGeometry(size, 16, 12);
    
    // 根据距离计算透明度 - 极其明显的对比度
    const maxDistance = 2.5; // 进一步减小最大距离，增强变化
    const minOpacity = 0.08; // 极低的最小透明度（远距离几乎透明）
    const maxOpacity = 0.98; // 极高的最大透明度（近距离几乎不透明）
    // 使用更强的指数函数增强对比度
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    const opacity = maxOpacity - (maxOpacity - minOpacity) * Math.pow(normalizedDistance, 0.5);
    
    // 创建材质
    const material = new THREE.MeshBasicMaterial({
      color: 0x4a90e2, // 蓝色
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide
    });

    // 创建球体网格
    const sphereMesh = new THREE.Mesh(geometry, material);

    // 创建文字标签 - 使用Sprite确保始终朝向相机
    const labelText = targetCamera.label.replace('1_frame_', ''); // 简化标签
    const textTexture = this.createTextTexture(labelText, size);
    const textMaterial = new THREE.SpriteMaterial({
      map: textTexture,
      transparent: true,
      opacity: opacity
    });
    const textSprite = new THREE.Sprite(textMaterial);

    // 文字位置：在球体上方
    textSprite.position.set(0, size * 2.0, 0);
    // 设置标签大小 - 进一步缩小标签宽度
    textSprite.scale.set(size * 1.8, size * 0.9, 1);

    // 禁用标签的射线检测，避免hover时影响球体
    textSprite.raycast = () => {};

    console.log(`🔵 Creating sphere and label for camera ${targetCamera.id}, size: ${size}, opacity: ${opacity}`);

    // 创建组合对象
    const hotspotGroup = new THREE.Group();
    hotspotGroup.add(sphereMesh);
    hotspotGroup.add(textSprite);

    // 直接使用Three.js坐标，但需要正确处理全景图的坐标系
    // 在全景图中，我们需要将世界坐标转换为以当前相机为中心的坐标系

    let relativePosition = new THREE.Vector3()
      .subVectors(targetCamera.position, currentCamera.position);

    // 先映射坐标轴
    let mappedPosition = new THREE.Vector3(
      -relativePosition.x,  // X翻转（镜像）
      relativePosition.z,   // Z->Y（向上）
      -relativePosition.y   // Y->-Z（向前，需要负号）
    );

    // 然后绕Y轴旋转-90度
    const rotationMatrix = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
    mappedPosition.applyMatrix4(rotationMatrix);

    console.log(`📐 Camera ${targetCamera.id}:`);
    console.log(`  Original relative: (${relativePosition.x.toFixed(2)}, ${relativePosition.y.toFixed(2)}, ${relativePosition.z.toFixed(2)})`);
    console.log(`  Mapped position: (${mappedPosition.x.toFixed(2)}, ${mappedPosition.y.toFixed(2)}, ${mappedPosition.z.toFixed(2)})`);

    relativePosition = mappedPosition;

    // 设置位置（相对于全景图中心，即当前相机位置）
    hotspotGroup.position.copy(relativePosition);

    // 添加用户数据用于点击检测
    hotspotGroup.userData = {
      type: 'panorama-hotspot',
      cameraId: targetCamera.id,
      cameraData: targetCamera
    };

    // 也给球体添加用户数据，方便点击检测
    sphereMesh.userData = {
      type: 'panorama-hotspot',
      cameraId: targetCamera.id,
      cameraData: targetCamera
    };

    // 添加hover效果
    sphereMesh.onBeforeRender = () => {
      // 可以在这里添加动画效果
    };

    console.log(`✅ Created hotspot for camera ${targetCamera.id} at relative position (${relativePosition.x.toFixed(2)}, ${relativePosition.y.toFixed(2)}, ${relativePosition.z.toFixed(2)}) with size ${size.toFixed(2)} and opacity ${opacity.toFixed(2)}`);

    return {
      camera: targetCamera,
      group: hotspotGroup,
      distance
    };
  }

  /**
   * 处理鼠标点击事件
   */
  public handleClick(event: MouseEvent, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    // 计算鼠标位置
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 射线检测
    this.raycaster.setFromCamera(this.mouse, camera);
    const hotspotObjects = this.hotspots.map(h => h.group);
    const intersects = this.raycaster.intersectObjects(hotspotObjects, true); // recursive=true 检测子对象

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const cameraId = clickedMesh.userData.cameraId;

      // 找到对应的hotspot
      const hotspot = this.hotspots.find(h => h.camera.id === cameraId);
      if (!hotspot) return;

      console.log(`🎯 Hotspot clicked: camera ${cameraId}, starting rotation animation`);

      // 计算球体在3D空间中的位置
      const ballPosition = hotspot.group.position.clone();

      console.log(`🎯 Ball position: (${ballPosition.x.toFixed(2)}, ${ballPosition.y.toFixed(2)}, ${ballPosition.z.toFixed(2)})`);

      // 将3D位置转换为视角角度
      // 关键发现：全景图的正前方是+X方向！（从lookAt(1,0,0)可以看出）
      // 球体(1.10, -0.08, 0.17)中，X=1.10是主要分量，说明它几乎在正前方
      // 所以应该用Z作为"左右偏移"，X作为"前后距离"
      const targetLon = Math.atan2(ballPosition.z, ballPosition.x) * 180 / Math.PI;
      const distance = Math.sqrt(ballPosition.x * ballPosition.x + ballPosition.z * ballPosition.z);
      const targetLat = Math.atan2(ballPosition.y, distance) * 180 / Math.PI;

      console.log(`🎯 Target view angle: lon=${targetLon.toFixed(1)}°, lat=${targetLat.toFixed(1)}°`);

      if (this.onCameraClick) {
        this.onCameraClick(cameraId, { lon: targetLon, lat: targetLat });
      }
    }
  }

  /**
   * 更新hotspot的视觉效果（如hover状态）
   */
  public updateHover(event: MouseEvent, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    // 计算鼠标位置
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 射线检测
    this.raycaster.setFromCamera(this.mouse, camera);
    const hotspotObjects = this.hotspots.map(h => h.group);
    const intersects = this.raycaster.intersectObjects(hotspotObjects, true);

    // 重置所有hotspot的状态
    this.hotspots.forEach(hotspot => {
      const sphereMesh = hotspot.group.children[0] as THREE.Mesh; // 第一个子对象是球体
      const material = sphereMesh.material as THREE.MeshBasicMaterial;
      material.color.setHex(0x4a90e2); // 蓝色
      canvas.style.cursor = 'grab';
    });

    // 高亮hover的hotspot
    if (intersects.length > 0) {
      const hoveredObject = intersects[0].object;
      // 找到对应的hotspot组
      let hotspotGroup = hoveredObject.parent;
      while (hotspotGroup && hotspotGroup.userData.type !== 'panorama-hotspot') {
        hotspotGroup = hotspotGroup.parent;
      }

      if (hotspotGroup) {
        const sphereMesh = hotspotGroup.children[0] as THREE.Mesh;
        const material = sphereMesh.material as THREE.MeshBasicMaterial;
        material.color.setHex(0xff6b6b); // 红色
        canvas.style.cursor = 'pointer';
      }
    }
  }

  /**
   * 清理所有hotspot
   */
  public clearHotspots(): void {
    this.hotspots.forEach(hotspot => {
      this.scene.remove(hotspot.group);

      // 清理组中的所有对象
      hotspot.group.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
          // 如果材质有纹理，也要清理
          if (child.material instanceof THREE.MeshBasicMaterial && child.material.map) {
            child.material.map.dispose();
          }
        } else if (child instanceof THREE.Sprite) {
          if (child.material instanceof THREE.SpriteMaterial && child.material.map) {
            child.material.map.dispose();
          }
          child.material.dispose();
        }
      });
    });
    this.hotspots = [];
  }

  /**
   * 销毁管理器
   */
  public dispose(): void {
    this.clearHotspots();
  }
}
